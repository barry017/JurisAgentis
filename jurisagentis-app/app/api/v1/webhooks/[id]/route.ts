import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface Webhook {
  id: string
  url: string
  events: string[]
  secret: string
  active: boolean
  created_at: string
  updated_at: string
  last_delivery?: string
  delivery_count: number
  failure_count: number
  headers?: Record<string, string>
  retry_policy: {
    max_retries: number
    retry_delay: number
    backoff_multiplier: number
  }
}

interface WebhookDelivery {
  id: string
  webhook_id: string
  event_type: string
  payload: Record<string, unknown>
  status: 'pending' | 'delivered' | 'failed' | 'retrying'
  http_status?: number
  response_body?: string
  attempts: number
  created_at: string
  delivered_at?: string
  next_retry?: string
  error_message?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    version: string
    timestamp: string
    request_id: string
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const mockWebhooks: Webhook[] = [
  {
    id: '1',
    url: 'https://api.example.com/webhooks/jurisagentis',
    events: ['client.created', 'case.updated', 'document.uploaded'],
    secret: 'wh_secret_12345abcdef',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-01T12:00:00Z',
    last_delivery: '2024-03-01T11:45:00Z',
    delivery_count: 234,
    failure_count: 12,
    headers: {
      'User-Agent': 'JurisAgentis-Webhook/1.0',
      'Content-Type': 'application/json'
    },
    retry_policy: {
      max_retries: 3,
      retry_delay: 300,
      backoff_multiplier: 2
    }
  }
]

const mockWebhookDeliveries: WebhookDelivery[] = [
  {
    id: '1',
    webhook_id: '1',
    event_type: 'client.created',
    payload: {
      event: 'client.created',
      data: {
        id: '1',
        type: 'business',
        company_name: 'New Client Corp',
        email: 'contact@newclient.com'
      },
      timestamp: '2024-03-01T11:45:00Z'
    },
    status: 'delivered',
    http_status: 200,
    response_body: '{"received": true}',
    attempts: 1,
    created_at: '2024-03-01T11:45:00Z',
    delivered_at: '2024-03-01T11:45:05Z'
  },
  {
    id: '2',
    webhook_id: '1',
    event_type: 'case.updated',
    payload: {
      event: 'case.updated',
      data: {
        id: '2',
        title: 'Contract Review Updated',
        status: 'completed'
      },
      timestamp: '2024-03-01T10:30:00Z'
    },
    status: 'failed',
    http_status: 500,
    response_body: '{"error": "Internal server error"}',
    attempts: 3,
    created_at: '2024-03-01T10:30:00Z',
    error_message: 'HTTP 500: Internal Server Error'
  }
]

const WEBHOOK_EVENTS = [
  'client.created',
  'client.updated', 
  'client.deleted',
  'case.created',
  'case.updated',
  'case.closed',
  'document.uploaded',
  'document.shared',
  'invoice.created',
  'invoice.paid',
  'payment.received',
  'deadline.approaching',
  'user.login',
  'security.violation'
]

async function authenticateRequest(_request: NextRequest) {
  const headersList = headers()
  const authorization = headersList.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.substring(7)

  try {
    const decoded = verify(token, JWT_SECRET) as { user_id: string; permissions: string[]; [key: string]: unknown }
    return decoded
  } catch (_error) {
    return null
  }
}

function checkPermission(user: { permissions: string[] }, permission: string): boolean {
  if (user.permissions.includes('*')) return true
  return user.permissions.includes(permission)
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function createResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      request_id: generateRequestId()
    }
  }
}

function createErrorResponse(error: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    message,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      request_id: generateRequestId()
    }
  }, { status })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webhookId } = await params
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:webhooks')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read webhook details', 403)
  }
  const webhook = mockWebhooks.find(w => w.id === webhookId)

  if (!webhook) {
    return createErrorResponse('not_found', 'Webhook not found', 404)
  }

  // Get related data based on query parameters
  const { searchParams } = new URL(request.url)
  const include = searchParams.get('include')?.split(',') || []

  const responseData: Webhook & { recent_deliveries?: WebhookDelivery[]; stats?: { total_deliveries: number; success_rate: number } } = { ...webhook }

  if (include.includes('deliveries')) {
    const deliveries = mockWebhookDeliveries.filter(d => d.webhook_id === webhookId)
    responseData.recent_deliveries = deliveries.slice(0, 10) // Last 10 deliveries
  }

  if (include.includes('stats')) {
    const deliveries = mockWebhookDeliveries.filter(d => d.webhook_id === webhookId)
    const successfulDeliveries = deliveries.filter(d => d.status === 'delivered').length
    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending' || d.status === 'retrying').length

    responseData.statistics = {
      total_deliveries: deliveries.length,
      successful_deliveries: successfulDeliveries,
      failed_deliveries: failedDeliveries,
      pending_deliveries: pendingDeliveries,
      success_rate: deliveries.length > 0 ? (successfulDeliveries / deliveries.length * 100).toFixed(2) : '0.00',
      average_response_time: '245ms',
      last_successful_delivery: deliveries.find(d => d.status === 'delivered')?.delivered_at,
      last_failed_delivery: deliveries.find(d => d.status === 'failed')?.created_at
    }
  }

  return NextResponse.json(createResponse(responseData))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webhookId } = await params
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:webhooks')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update webhooks', 403)
  }
  const webhookIndex = mockWebhooks.findIndex(w => w.id === webhookId)

  if (webhookIndex === -1) {
    return createErrorResponse('not_found', 'Webhook not found', 404)
  }

  try {
    const updateData = await request.json()
    const existingWebhook = mockWebhooks[webhookIndex]

    // Validate URL if being updated
    if (updateData.url) {
      try {
        new URL(updateData.url)
      } catch {
        return createErrorResponse('validation_error', 'Invalid URL format', 400)
      }

      // Check for duplicate URL (excluding current webhook)
      const duplicateWebhook = mockWebhooks.find(webhook => 
        webhook.id !== webhookId && webhook.url === updateData.url
      )
      if (duplicateWebhook) {
        return createErrorResponse('duplicate_error', 'Webhook with this URL already exists', 409)
      }
    }

    // Validate events if being updated
    if (updateData.events) {
      const invalidEvents = updateData.events.filter((event: string) => 
        !WEBHOOK_EVENTS.includes(event)
      )
      if (invalidEvents.length > 0) {
        return createErrorResponse(
          'validation_error', 
          `Invalid events: ${invalidEvents.join(', ')}. Available events: ${WEBHOOK_EVENTS.join(', ')}`, 
          400
        )
      }
    }

    // Update webhook
    const updatedWebhook: Webhook = {
      ...existingWebhook,
      ...updateData,
      id: existingWebhook.id, // Prevent ID changes
      secret: existingWebhook.secret, // Prevent secret changes via update
      updated_at: new Date().toISOString()
    }

    mockWebhooks[webhookIndex] = updatedWebhook

    return NextResponse.json(createResponse(updatedWebhook))
  } catch (error) {
    console.error('Webhook update error:', error)
    return createErrorResponse('internal_error', 'Failed to update webhook', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webhookId } = await params
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:webhooks')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete webhooks', 403)
  }
  const webhookIndex = mockWebhooks.findIndex(w => w.id === webhookId)

  if (webhookIndex === -1) {
    return createErrorResponse('not_found', 'Webhook not found', 404)
  }

  // Remove webhook
  mockWebhooks.splice(webhookIndex, 1)

  // Remove related deliveries
  const deliveryIndicesToRemove = mockWebhookDeliveries
    .map((delivery, index) => delivery.webhook_id === webhookId ? index : -1)
    .filter(index => index !== -1)
    .reverse() // Remove from end to avoid index shifting

  deliveryIndicesToRemove.forEach(index => mockWebhookDeliveries.splice(index, 1))

  return NextResponse.json(createResponse({ 
    deleted: true, 
    id: webhookId,
    deliveries_removed: deliveryIndicesToRemove.length 
  }))
}