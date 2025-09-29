import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'
import crypto from 'crypto'

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

async function authenticateRequest(_request: NextRequest) {
  const headersList = headers()
  const authorization = headersList.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.substring(7)

  try {
    const decoded = verify(token, JWT_SECRET) as Record<string, unknown>
    return decoded
  } catch (_error) {
    return null
  }
}

function checkPermission(user: Record<string, unknown>, permission: string): boolean {
  const permissions = (user.permissions as string[]) || []
  if (permissions.includes('*')) return true
  return permissions.includes(permission)
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

function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

async function deliverWebhook(url: string, payload: Record<string, unknown>, secret: string, headers_: Record<string, string> = {}) {
  const payloadString = JSON.stringify(payload)
  const signature = generateWebhookSignature(payloadString, secret)
  
  const _requestHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'JurisAgentis-Webhook/1.0',
    'X-JurisAgentis-Signature': `sha256=${signature}`,
    'X-JurisAgentis-Event': payload.event,
    'X-JurisAgentis-Delivery': crypto.randomBytes(16).toString('hex'),
    ...headers_
  }

  try {
    const startTime = Date.now()
    
    // In a real implementation, this would make an actual HTTP request
    // For this mock, we'll simulate different scenarios
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100))
    
    const endTime = Date.now()
    const responseTime = endTime - startTime

    // Simulate different response scenarios based on URL
    if (url.includes('timeout')) {
      throw new Error('Request timeout')
    } else if (url.includes('500')) {
      return {
        success: false,
        status: 500,
        response: '{"error": "Internal server error"}',
        responseTime,
        error: 'HTTP 500: Internal Server Error'
      }
    } else if (url.includes('404')) {
      return {
        success: false,
        status: 404,
        response: '{"error": "Not found"}',
        responseTime,
        error: 'HTTP 404: Not Found'
      }
    } else {
      return {
        success: true,
        status: 200,
        response: '{"received": true, "processed": true}',
        responseTime,
        headers: {
          'content-type': 'application/json',
          'x-request-id': crypto.randomBytes(8).toString('hex')
        }
      }
    }
  } catch (error: unknown) {
    return {
      success: false,
      status: 0,
      response: '',
      responseTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'test:webhooks')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to test webhooks', 403)
  }

  try {
    const { webhook_id, event_type, test_data } = await request.json()

    if (!webhook_id) {
      return createErrorResponse('validation_error', 'webhook_id is required', 400)
    }

    // Mock webhook lookup
    const webhook = {
      id: webhook_id,
      url: 'https://api.example.com/webhooks/test',
      events: ['client.created', 'case.updated', 'document.uploaded'],
      secret: 'wh_secret_test12345',
      active: true,
      headers: {
        'User-Agent': 'JurisAgentis-Webhook/1.0',
        'Content-Type': 'application/json'
      }
    }

    if (!webhook) {
      return createErrorResponse('not_found', 'Webhook not found', 404)
    }

    if (!webhook.active) {
      return createErrorResponse('webhook_inactive', 'Webhook is not active', 400)
    }

    // Create test payload
    const testEvent = event_type || 'webhook.test'
    const testPayload = {
      event: testEvent,
      data: test_data || {
        test: true,
        webhook_id: webhook_id,
        message: 'This is a test webhook delivery'
      },
      timestamp: new Date().toISOString(),
      webhook_id: webhook_id,
      test_mode: true
    }

    // Deliver webhook
    const deliveryResult = await deliverWebhook(
      webhook.url,
      testPayload,
      webhook.secret,
      webhook.headers
    )

    const testResult = {
      webhook_id: webhook_id,
      event_type: testEvent,
      url: webhook.url,
      payload: testPayload,
      delivery: {
        success: deliveryResult.success,
        status: deliveryResult.status,
        response_time: deliveryResult.responseTime,
        response_body: deliveryResult.response,
        error: deliveryResult.error,
        headers: deliveryResult.headers
      },
      signature_verification: {
        algorithm: 'sha256',
        header: 'X-JurisAgentis-Signature',
        secret_used: webhook.secret.substring(0, 8) + '...'
      },
      timestamp: new Date().toISOString()
    }

    const status = deliveryResult.success ? 200 : 422
    return NextResponse.json(createResponse(testResult), { status })

  } catch (error) {
    console.error('Webhook test error:', error)
    return createErrorResponse('internal_error', 'Failed to test webhook', 500)
  }
}

// Webhook signature verification endpoint
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'verify_signature') {
    const payload = searchParams.get('payload')
    const signature = searchParams.get('signature')
    const secret = searchParams.get('secret')

    if (!payload || !signature || !secret) {
      return createErrorResponse('validation_error', 'payload, signature, and secret are required', 400)
    }

    try {
      const expectedSignature = generateWebhookSignature(payload, secret)
      const providedSignature = signature.startsWith('sha256=') ? signature.substring(7) : signature
      
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      )

      return NextResponse.json(createResponse({
        valid: isValid,
        expected_signature: `sha256=${expectedSignature}`,
        provided_signature: signature,
        algorithm: 'sha256'
      }))
    } catch (_error) {
      return createErrorResponse('verification_error', 'Failed to verify signature', 400)
    }
  }

  // Return webhook test information
  return NextResponse.json(createResponse({
    available_actions: ['verify_signature'],
    test_events: [
      'webhook.test',
      'client.created',
      'client.updated',
      'case.created',
      'case.updated',
      'document.uploaded',
      'invoice.created'
    ],
    signature_verification: {
      algorithm: 'HMAC-SHA256',
      header: 'X-JurisAgentis-Signature',
      format: 'sha256={signature}',
      example: 'sha256=a7b2c8d4e5f6...'
    },
    delivery_headers: [
      'Content-Type: application/json',
      'User-Agent: JurisAgentis-Webhook/1.0',
      'X-JurisAgentis-Signature: sha256={signature}',
      'X-JurisAgentis-Event: {event_type}',
      'X-JurisAgentis-Delivery: {delivery_id}'
    ]
  }))
}