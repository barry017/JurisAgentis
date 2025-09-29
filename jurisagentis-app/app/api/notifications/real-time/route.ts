/**
 * Real-time Notifications API
 * 
 * Provides Server-Sent Events (SSE) for real-time notification updates
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'default-user'

  // Set up Server-Sent Events headers
  const responseHeaders = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  })

  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initMessage = `data: ${JSON.stringify({
        type: 'connected',
        message: 'Real-time notifications connected',
        timestamp: new Date().toISOString()
      })}\n\n`
      
      controller.enqueue(encoder.encode(initMessage))

      // Send periodic heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(encoder.encode(heartbeat))
        } catch (error) {
          console.error('Heartbeat error:', error)
          clearInterval(heartbeatInterval)
          controller.close()
        }
      }, 30000) // Every 30 seconds

      // Simulate real-time notifications
      const notificationInterval = setInterval(() => {
        try {
          // 20% chance of sending a notification every 10 seconds
          if (Math.random() > 0.8) {
            const mockNotifications = [
              {
                type: 'info',
                category: 'client',
                title: 'New Client Inquiry',
                message: 'A new potential client has submitted an estate planning inquiry through the website.',
                priority: 'normal'
              },
              {
                type: 'warning',
                category: 'calendar',
                title: 'Upcoming Appointment',
                message: 'You have an appointment with John Smith in 15 minutes.',
                priority: 'high'
              },
              {
                type: 'success',
                category: 'document',
                title: 'Document Signed',
                message: 'Trust agreement has been successfully signed by all parties.',
                priority: 'normal'
              },
              {
                type: 'deadline',
                category: 'matter',
                title: 'Court Filing Due',
                message: 'Probate documents must be filed within 2 hours.',
                priority: 'urgent'
              },
              {
                type: 'message',
                category: 'client',
                title: 'Client Response Received',
                message: 'Client has responded to your document review request.',
                priority: 'high'
              }
            ]

            const randomNotification = mockNotifications[Math.floor(Math.random() * mockNotifications.length)]
            
            const notification = {
              id: crypto.randomUUID(),
              ...randomNotification,
              timestamp: new Date().toISOString(),
              isRead: false,
              isArchived: false,
              actionUrl: `/${randomNotification.category}s`,
              actionLabel: 'View',
              metadata: {
                userId,
                source: 'real-time'
              },
              requiresAction: randomNotification.priority === 'urgent' || randomNotification.priority === 'high',
              canDismiss: true,
              soundEnabled: true
            }

            const notificationMessage = `data: ${JSON.stringify({
              type: 'notification',
              notification,
              timestamp: new Date().toISOString()
            })}\n\n`
            
            controller.enqueue(encoder.encode(notificationMessage))
          }
        } catch (error) {
          console.error('Notification broadcast error:', error)
          clearInterval(notificationInterval)
          controller.close()
        }
      }, 10000) // Every 10 seconds

      // Clean up on close
      const cleanup = () => {
        clearInterval(heartbeatInterval)
        clearInterval(notificationInterval)
      }

      // Handle client disconnect
      request.signal?.addEventListener('abort', cleanup)

      // Store cleanup function for potential future use
      ;(controller as ReadableStreamDefaultController & { cleanup?: () => void }).cleanup = cleanup
    },

    cancel() {
      console.log('SSE connection cancelled for user:', userId)
      // Cleanup will be handled by the abort event listener
    }
  })

  return new NextResponse(stream, { headers: responseHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data, userId = 'default-user' } = body

    // Handle different types of real-time events
    switch (type) {
      case 'broadcast':
        // Broadcast a notification to all connected clients
        // In a real implementation, you'd use a pub/sub system like Redis or WebSocket manager
        console.log(`Broadcasting notification to user ${userId}:`, data)
        
        return NextResponse.json({
          success: true,
          message: 'Notification broadcast initiated'
        })

      case 'status':
        // Update connection status
        return NextResponse.json({
          success: true,
          status: 'connected',
          connections: 1, // Mock connection count
          uptime: Date.now() - (Date.now() % 86400000) // Mock uptime
        })

      default:
        return NextResponse.json(
          { error: 'Invalid event type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Real-time notifications POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}