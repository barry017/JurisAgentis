import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface PushSubscription {
  id: string
  user_id: string
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
  user_agent: string
  device_type: 'mobile' | 'desktop' | 'tablet'
  created_at: string
  updated_at: string
  last_used: string
  is_active: boolean
  preferences: {
    deadlines: boolean
    case_updates: boolean
    client_messages: boolean
    system_notifications: boolean
    marketing: boolean
    sound_enabled: boolean
    vibration_enabled: boolean
    quiet_hours: {
      enabled: boolean
      start: string // HH:MM format
      end: string   // HH:MM format
    }
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, Record<string, unknown>>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  urgent?: boolean
  silent?: boolean
  timestamp?: number
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

// Mock push subscriptions database
const mockSubscriptions: PushSubscription[] = [
  {
    id: '1',
    user_id: '1',
    endpoint: 'https://fcm.googleapis.com/fcm/send/mock_endpoint_123',
    keys: {
      p256dh: 'BK8Qbj8hX7Q8gJ1vC5yF3zN9pL2mK8xR4qW6tE5uI7oA3sD9fG2hJ5kL8nM1qP4rT6vY9zA2cF5hI8kN1pS4vW7z',
      auth: 'abc123def456ghi789jkl012mno345pq'
    },
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
    device_type: 'mobile',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-01T12:00:00Z',
    last_used: '2024-03-01T11:45:00Z',
    is_active: true,
    preferences: {
      deadlines: true,
      case_updates: true,
      client_messages: true,
      system_notifications: true,
      marketing: false,
      sound_enabled: true,
      vibration_enabled: true,
      quiet_hours: {
        enabled: true,
        start: '22:00',
        end: '08:00'
      }
    }
  }
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

function detectDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
  const ua = userAgent.toLowerCase()
  
  if (/ipad|android(?!.*mobile)|tablet/.test(ua)) {
    return 'tablet'
  }
  
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/.test(ua)) {
    return 'mobile'
  }
  
  return 'desktop'
}

function isQuietHours(preferences: PushSubscription['preferences']): boolean {
  if (!preferences.quiet_hours.enabled) return false
  
  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  
  const [startHour, startMin] = preferences.quiet_hours.start.split(':').map(Number)
  const [endHour, endMin] = preferences.quiet_hours.end.split(':').map(Number)
  
  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin
  
  // Handle quiet hours that span midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime
  } else {
    return currentTime >= startTime && currentTime <= endTime
  }
}

async function sendPushNotification(
  subscription: PushSubscription, 
  payload: NotificationPayload
): Promise<boolean> {
  try {
    // In a real implementation, this would use web-push library
    console.log('Sending push notification:', {
      endpoint: subscription.endpoint,
      payload
    })
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate 95% success rate
    return Math.random() > 0.05
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:notifications')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read notifications', 403)
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'subscriptions') {
    const userSubscriptions = mockSubscriptions.filter(s => s.user_id === user.user_id)
    return NextResponse.json(createResponse(userSubscriptions))
  }

  if (action === 'preferences') {
    const subscription = mockSubscriptions.find(s => s.user_id === user.user_id && s.is_active)
    return NextResponse.json(createResponse(subscription?.preferences || null))
  }

  if (action === 'vapid-key') {
    // Return VAPID public key for client-side subscription
    const vapidKey = 'BM8Qbj8hX7Q8gJ1vC5yF3zN9pL2mK8xR4qW6tE5uI7oA3sD9fG2hJ5kL8nM1qP4rT6vY9zA2cF5hI8kN1pS4vW7z'
    return NextResponse.json(createResponse({ public_key: vapidKey }))
  }

  return createErrorResponse('invalid_action', 'Valid action parameter is required', 400)
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:notifications')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to manage notifications', 403)
  }

  try {
    const { action, ...data } = await request.json()

    if (action === 'subscribe') {
      const { endpoint, keys } = data

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return createErrorResponse('validation_error', 'endpoint and keys (p256dh, auth) are required', 400)
      }

      // Check if subscription already exists
      const existingIndex = mockSubscriptions.findIndex(s => 
        s.user_id === user.user_id && s.endpoint === endpoint
      )

      const userAgent = request.headers.get('user-agent') || ''
      const deviceType = detectDeviceType(userAgent)

      const subscription: PushSubscription = {
        id: existingIndex >= 0 ? mockSubscriptions[existingIndex].id : String(mockSubscriptions.length + 1),
        user_id: user.user_id,
        endpoint,
        keys,
        user_agent: userAgent,
        device_type: deviceType,
        created_at: existingIndex >= 0 ? mockSubscriptions[existingIndex].created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
        is_active: true,
        preferences: existingIndex >= 0 ? mockSubscriptions[existingIndex].preferences : {
          deadlines: true,
          case_updates: true,
          client_messages: true,
          system_notifications: true,
          marketing: false,
          sound_enabled: true,
          vibration_enabled: true,
          quiet_hours: {
            enabled: false,
            start: '22:00',
            end: '08:00'
          }
        }
      }

      if (existingIndex >= 0) {
        mockSubscriptions[existingIndex] = subscription
      } else {
        mockSubscriptions.push(subscription)
      }

      return NextResponse.json(createResponse(subscription), { status: 201 })
    }

    if (action === 'send') {
      const { 
        title, 
        body, 
        icon, 
        badge, 
        tag, 
        data: notificationData, 
        actions, 
        urgent, 
        silent,
        target_users,
        notification_type 
      } = data

      if (!title || !body) {
        return createErrorResponse('validation_error', 'title and body are required', 400)
      }

      const payload: NotificationPayload = {
        title,
        body,
        icon: icon || '/icons/icon-192x192.png',
        badge: badge || '/icons/badge-72x72.png',
        tag: tag || 'default',
        data: notificationData || {},
        actions: actions || [],
        urgent: urgent || false,
        silent: silent || false,
        timestamp: Date.now()
      }

      // Determine target subscriptions
      let targetSubscriptions = mockSubscriptions.filter(s => s.is_active)

      if (target_users && Array.isArray(target_users)) {
        targetSubscriptions = targetSubscriptions.filter(s => target_users.includes(s.user_id))
      } else if (user.user_id) {
        targetSubscriptions = targetSubscriptions.filter(s => s.user_id === user.user_id)
      }

      // Filter by notification type preferences
      if (notification_type) {
        targetSubscriptions = targetSubscriptions.filter(s => {
          switch (notification_type) {
            case 'deadline': return s.preferences.deadlines
            case 'case_update': return s.preferences.case_updates
            case 'client_message': return s.preferences.client_messages
            case 'system': return s.preferences.system_notifications
            case 'marketing': return s.preferences.marketing
            default: return true
          }
        })
      }

      // Filter out quiet hours (unless urgent)
      if (!urgent) {
        targetSubscriptions = targetSubscriptions.filter(s => !isQuietHours(s.preferences))
      }

      // Send notifications
      const results = await Promise.allSettled(
        targetSubscriptions.map(subscription => sendPushNotification(subscription, payload))
      )

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
      const failed = results.length - successful

      return NextResponse.json(createResponse({
        sent: successful,
        failed,
        total: results.length,
        payload
      }))
    }

    if (action === 'test') {
      // Send test notification to user's devices
      const userSubscriptions = mockSubscriptions.filter(s => 
        s.user_id === user.user_id && s.is_active
      )

      if (userSubscriptions.length === 0) {
        return createErrorResponse('no_subscriptions', 'No active push subscriptions found', 404)
      }

      const testPayload: NotificationPayload = {
        title: '🧪 Test Notification',
        body: 'This is a test notification from JurisAgentis',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'test',
        data: { type: 'test', timestamp: Date.now() },
        timestamp: Date.now()
      }

      const results = await Promise.allSettled(
        userSubscriptions.map(subscription => sendPushNotification(subscription, testPayload))
      )

      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length

      return NextResponse.json(createResponse({
        sent: successful,
        total: userSubscriptions.length,
        message: 'Test notification sent'
      }))
    }

    return createErrorResponse('invalid_action', 'Valid action is required', 400)
  } catch (error) {
    console.error('Push notification error:', error)
    return createErrorResponse('internal_error', 'Failed to process push notification request', 500)
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:notifications')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update notifications', 403)
  }

  try {
    const { subscription_id, preferences } = await request.json()

    if (!subscription_id) {
      return createErrorResponse('validation_error', 'subscription_id is required', 400)
    }

    const subscriptionIndex = mockSubscriptions.findIndex(s => 
      s.id === subscription_id && s.user_id === user.user_id
    )

    if (subscriptionIndex === -1) {
      return createErrorResponse('not_found', 'Push subscription not found', 404)
    }

    const subscription = mockSubscriptions[subscriptionIndex]

    // Update preferences
    if (preferences) {
      subscription.preferences = { ...subscription.preferences, ...preferences }
    }

    subscription.updated_at = new Date().toISOString()

    return NextResponse.json(createResponse(subscription))
  } catch (error) {
    console.error('Push subscription update error:', error)
    return createErrorResponse('internal_error', 'Failed to update push subscription', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:notifications')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete notifications', 403)
  }

  const { searchParams } = new URL(request.url)
  const subscriptionId = searchParams.get('subscription_id')
  const endpoint = searchParams.get('endpoint')

  if (!subscriptionId && !endpoint) {
    return createErrorResponse('validation_error', 'subscription_id or endpoint is required', 400)
  }

  let subscriptionIndex = -1

  if (subscriptionId) {
    subscriptionIndex = mockSubscriptions.findIndex(s => 
      s.id === subscriptionId && s.user_id === user.user_id
    )
  } else if (endpoint) {
    subscriptionIndex = mockSubscriptions.findIndex(s => 
      s.endpoint === endpoint && s.user_id === user.user_id
    )
  }

  if (subscriptionIndex === -1) {
    return createErrorResponse('not_found', 'Push subscription not found', 404)
  }

  const subscription = mockSubscriptions[subscriptionIndex]
  
  // Soft delete - mark as inactive
  subscription.is_active = false
  subscription.updated_at = new Date().toISOString()

  return NextResponse.json(createResponse({
    deleted: true,
    subscription_id: subscription.id
  }))
}