/**
 * POST /api/auth/logout
 * 
 * Handles user logout and session invalidation
 */

import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  parseRequestBody,
  addCORSHeaders
} from '@/lib/api/response'
import { 
  authenticate,
  AuthenticationError,
  AuthorizationError,
  logAuditEvent 
} from '@/lib/auth/middleware'

interface LogoutRequest {
  allSessions?: boolean
}

interface LogoutResponse {
  success: true
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)

    // Parse request body (optional)
    let allSessions = false
    try {
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 0) {
        const body = await parseRequestBody<LogoutRequest>(request)
        
        // Validate request structure
        const validKeys = ['allSessions']
        const bodyKeys = Object.keys(body)
        const invalidKeys = bodyKeys.filter(key => !validKeys.includes(key))
        
        if (invalidKeys.length > 0) {
          return createErrorResponse(
            'VALIDATION_ERROR',
            `Invalid fields in request: ${invalidKeys.join(', ')}`,
            400
          )
        }

        allSessions = body.allSessions === true
      }
    } catch (parseError) {
      console.error('Body parsing failed:', parseError)
      // If body parsing fails but we have content, return error
      const contentLength = request.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > 0) {
        return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400)
      }
      // Otherwise continue with default values
    }

    // Invalidate sessions
    if (allSessions) {
      await invalidateAllUserSessions(user.uid)
      await logAuditEvent('AUTH_LOGOUT_ALL_SESSIONS', user.uid, request)
    } else {
      await invalidateCurrentSession(user.uid)
      await logAuditEvent('AUTH_LOGOUT_SINGLE_SESSION', user.uid, request)
    }

    // Sign out from Supabase
    await supabaseServer.auth.signOut()

    const message = allSessions 
      ? 'Successfully logged out from all sessions'
      : 'Successfully logged out'

    const logoutResponse: LogoutResponse = {
      success: true,
      message
    }

    const response = createSuccessResponse(undefined, undefined, logoutResponse)
    
    // Clear any auth-related cookies
    response.headers.set(
      'Set-Cookie',
      'auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
    )

    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      // For logout, we want to be idempotent - even if token is invalid/expired
      // we should return success
      if (error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_TOKEN') {
        const response: LogoutResponse = {
          success: true,
          message: 'Successfully logged out'
        }
        
        return createSuccessResponse(undefined, undefined, response)
      }
      
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    console.error('Logout error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred',
      500
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function OPTIONS(request: NextRequest) {
  const response = new Response(null, { status: 200 })
  return addCORSHeaders(response, request.headers.get('origin') || undefined)
}

/**
 * Invalidate current user session
 */
async function invalidateCurrentSession(uid: string) {
  try {
    // Mark current session as inactive
    await supabaseAdmin
      .from('user_sessions')
      .update({ 
        active: false,
        ended_at: new Date().toISOString()
      })
      .eq('uid', uid)
      .eq('active', true)
      .order('last_activity', { ascending: false })
      .limit(1)
  } catch (error) {
    console.error('Failed to invalidate current session:', error)
    // Don't fail logout if session invalidation fails
  }
}

/**
 * Invalidate all user sessions
 */
async function invalidateAllUserSessions(uid: string) {
  try {
    // Mark all user sessions as inactive
    await supabaseAdmin
      .from('user_sessions')
      .update({ 
        active: false,
        ended_at: new Date().toISOString()
      })
      .eq('uid', uid)
      .eq('active', true)
  } catch (error) {
    console.error('Failed to invalidate all sessions:', error)
    // Don't fail logout if session invalidation fails
  }
}