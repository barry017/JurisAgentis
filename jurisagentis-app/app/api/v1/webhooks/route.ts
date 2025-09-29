import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'
import crypto from 'crypto'

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

interface _WebhookEvent {
  id: string
  type: string
  data: Record<string, unknown>
  created_at: string
  source: string
  user_id?: string
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  meta?: {
    version: string
    timestamp: string
    request_id: string
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Mock webhook database
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

const _mockWebhookDeliveries: WebhookDelivery[] = [
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
  }
]

// Available webhook events
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
    const decoded = verify(token, JWT_SECRET) as { user_id: string; permissions: string[] }
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

function generateWebhookSecret(): string {
  return 'wh_secret_' + crypto.randomBytes(16).toString('hex')
}

function createResponse<T>(data: T, pagination?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
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

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:webhooks')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read webhooks', 403)
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const active = searchParams.get('active')
  const event_type = searchParams.get('event_type')

  let filteredWebhooks = [...mockWebhooks]

  // Apply filters
  if (active !== null) {
    const isActive = active === 'true'
    filteredWebhooks = filteredWebhooks.filter(webhook => webhook.active === isActive)
  }

  if (event_type) {
    filteredWebhooks = filteredWebhooks.filter(webhook => 
      webhook.events.includes(event_type)
    )
  }

  // Apply pagination
  const total = filteredWebhooks.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedWebhooks = filteredWebhooks.slice(startIndex, endIndex)

  const pagination = {
    page,
    limit,
    total,
    total_pages: totalPages
  }

  return NextResponse.json(createResponse(paginatedWebhooks, pagination))
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:webhooks')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to create webhooks', 403)
  }

  try {
    const webhookData = await request.json()

    // Validate required fields
    const requiredFields = ['url', 'events']
    for (const field of requiredFields) {
      if (!webhookData[field]) {
        return createErrorResponse('validation_error', `Field '${field}' is required`, 400)
      }
    }

    // Validate URL format
    try {
      new URL(webhookData.url)
    } catch {
      return createErrorResponse('validation_error', 'Invalid URL format', 400)
    }

    // Validate events
    const invalidEvents = webhookData.events.filter((event: string) => 
      !WEBHOOK_EVENTS.includes(event)
    )
    if (invalidEvents.length > 0) {
      return createErrorResponse(
        'validation_error', 
        `Invalid events: ${invalidEvents.join(', ')}. Available events: ${WEBHOOK_EVENTS.join(', ')}`, 
        400
      )
    }

    // Check for duplicate URL
    const existingWebhook = mockWebhooks.find(webhook => webhook.url === webhookData.url)
    if (existingWebhook) {
      return createErrorResponse('duplicate_error', 'Webhook with this URL already exists', 409)
    }

    // Create new webhook
    const newWebhook: Webhook = {
      id: String(mockWebhooks.length + 1),
      url: webhookData.url,
      events: webhookData.events,
      secret: generateWebhookSecret(),
      active: webhookData.active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      delivery_count: 0,
      failure_count: 0,
      headers: {
        'User-Agent': 'JurisAgentis-Webhook/1.0',
        'Content-Type': 'application/json',
        ...webhookData.headers
      },
      retry_policy: {
        max_retries: webhookData.retry_policy?.max_retries || 3,
        retry_delay: webhookData.retry_policy?.retry_delay || 300,
        backoff_multiplier: webhookData.retry_policy?.backoff_multiplier || 2
      }
    }

    mockWebhooks.push(newWebhook)

    return NextResponse.json(createResponse(newWebhook), { status: 201 })
  } catch (error) {
    console.error('Webhook creation error:', error)
    return createErrorResponse('internal_error', 'Failed to create webhook', 500)
  }
}