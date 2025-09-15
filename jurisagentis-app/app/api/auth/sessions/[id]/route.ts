/**
 * DELETE /api/auth/sessions/[id]
 * 
 * Terminates a specific user session
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

interface SessionTerminateResponse {
  success: true
  message: string
  sessionId: string
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user
    const user = await authenticate(request)

    // Validate session ID format (basic validation)
    if (!params.id || params.id.length < 10) {
      return createValidationErrorResponse('sessionId', 'Invalid session ID format')
    }

    // Check if session exists and belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .select('session_id, uid, active, created_at')
      .eq('session_id', params.id)
      .eq('active', true)
      .single()

    if (sessionError || !session) {
      await logAuditEvent('SESSION_TERMINATE_NOT_FOUND', user.uid, request, {
        sessionId: params.id
      })
      return createErrorResponse(
        'SESSION_NOT_FOUND',
        'Session not found or already terminated',
        404
      )
    }

    // Verify the session belongs to the authenticated user
    if (session.uid !== user.uid) {
      await logAuditEvent('SESSION_TERMINATE_UNAUTHORIZED', user.uid, request, {
        sessionId: params.id,
        sessionOwner: session.uid
      })
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'You can only terminate your own sessions',
        403
      )
    }

    // Terminate the session
    const { error: updateError } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        active: false,
        ended_at: new Date().toISOString()
      })
      .eq('session_id', params.id)
      .eq('uid', user.uid)

    if (updateError) {
      console.error('Session termination error:', updateError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to terminate session',
        500
      )
    }

    // Determine if this was the current session
    const isCurrentSession = params.id === user.sessionId
    const message = isCurrentSession 
      ? 'Current session terminated successfully' 
      : 'Session terminated successfully'

    // Log session termination
    await logAuditEvent('SESSION_TERMINATE_SUCCESS', user.uid, request, {
      sessionId: params.id,
      isCurrentSession,
      sessionAge: Date.now() - new Date(session.created_at).getTime()
    })

    const terminateResponse: SessionTerminateResponse = {
      success: true,
      message,
      sessionId: params.id
    }

    const response = createSuccessResponse(undefined, undefined, terminateResponse)
    
    // If this was the current session, clear auth cookies
    if (isCurrentSession) {
      response.headers.set(
        'Set-Cookie',
        'auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
      )
    }

    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    console.error('Session termination error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred',
      500
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return createMethodNotAllowedResponse(['DELETE'])
}

export async function POST() {
  return createMethodNotAllowedResponse(['DELETE'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['DELETE'])
}

export async function OPTIONS(request: NextRequest) {
  const response = new Response(null, { status: 200 })
  return addCORSHeaders(response, request.headers.get('origin') || undefined)
}