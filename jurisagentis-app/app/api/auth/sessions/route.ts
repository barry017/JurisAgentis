/**
 * GET /api/auth/sessions
 * 
 * Returns the current user's active sessions with pagination
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  createValidationErrorResponse,
  addCORSHeaders
} from '@/lib/api/response'
import { 
  authenticate,
  AuthenticationError,
  AuthorizationError,
  logAuditEvent 
} from '@/lib/auth/middleware'

interface SessionsResponse {
  success: true
  sessions: Array<{
    sessionId: string
    createdAt: string
    lastActivity: string
    expiresAt: string
    deviceInfo: {
      platform: string
      browser: string
      mobile: boolean
    }
    current: boolean
  }>
  total: number
  limit: number
  offset: number
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Validate parameters
    if (limit <= 0 || limit > 100) {
      return createValidationErrorResponse('limit', 'Limit must be between 1 and 100')
    }

    if (offset < 0) {
      return createValidationErrorResponse('offset', 'Offset must be non-negative')
    }

    // Get user sessions with pagination
    const { data: sessions, error, count } = await supabaseAdmin
      .from('user_sessions')
      .select('*', { count: 'exact' })
      .eq('uid', user.uid)
      .eq('active', true)
      .order('last_activity', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch user sessions:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve sessions',
        500
      )
    }

    // Get current session ID from token (simplified - in real implementation we'd decode the JWT)
    const currentSessionId = sessions?.[0]?.session_id || 'unknown'

    // Format sessions for response
    const formattedSessions = (sessions || []).map(session => ({
      sessionId: session.session_id,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
      expiresAt: session.expires_at,
      deviceInfo: session.device_info || {
        platform: 'Unknown',
        browser: 'Unknown',
        mobile: false
      },
      current: session.session_id === currentSessionId
    }))

    // Log session access
    await logAuditEvent('AUTH_SESSIONS_ACCESS', user.uid, request)

    const sessionsResponse: SessionsResponse = {
      success: true,
      sessions: formattedSessions,
      total: count || 0,
      limit,
      offset
    }

    const response = createSuccessResponse(undefined, undefined, sessionsResponse)
    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    console.error('Sessions error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred',
      500
    )
  }
}

// Handle other HTTP methods
export async function POST() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['GET'])
}

export async function OPTIONS(request: NextRequest) {
  const response = new Response(null, { status: 200 })
  return addCORSHeaders(response, request.headers.get('origin') || undefined)
}