/**
 * GET /api/auth/user
 * 
 * Returns the current authenticated user's profile and permissions
 */

import { NextRequest } from 'next/server'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  addCORSHeaders
} from '@/lib/api/response'
import { 
  authenticate,
  AuthenticationError,
  AuthorizationError,
  logAuditEvent 
} from '@/lib/auth/middleware'

interface UserResponse {
  success: true
  user: {
    uid: string
    email: string
    role: string
    profile: {
      firstName: string
      lastName: string
      title?: string
    }
    mfaEnabled: boolean
    status: string
    lastLogin: string
    temporaryAccess?: {
      grantedBy: string
      grantedAt: string
      expiresAt: string
      scope: string
      justification: string
    }
  }
  permissions: {
    financial: string
    clients: string
    documents: string
    administrative: string
  }
  session: {
    sessionId: string
    createdAt: string
    lastActivity: string
    expiresAt: string
    deviceInfo: {
      platform: string
      browser: string
      mobile: boolean
    }
    current: true
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)

    // Get current session info
    const sessionInfo = await getCurrentSession(user.uid)

    // Log profile access
    await logAuditEvent('AUTH_PROFILE_ACCESS', user.uid, request)

    // Build user response
    const userResponse: UserResponse = {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        profile: user.profile,
        mfaEnabled: user.mfaEnabled,
        status: user.status,
        lastLogin: await getLastLogin(user.uid),
        ...(user.temporaryAccess && { temporaryAccess: user.temporaryAccess })
      },
      permissions: user.permissions,
      session: sessionInfo
    }

    const response = createSuccessResponse(undefined, undefined, userResponse)
    
    // Add ETag for conditional requests
    const etag = `"${user.uid}-${Date.now()}"`
    response.headers.set('ETag', etag)
    
    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    console.error('User profile error:', error)
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

/**
 * Get current session information
 */
async function getCurrentSession(uid: string) {
  const { supabaseAdmin } = await import('@/lib/supabase')
  
  const { data: session } = await supabaseAdmin
    .from('user_sessions')
    .select('*')
    .eq('uid', uid)
    .eq('active', true)
    .order('last_activity', { ascending: false })
    .limit(1)
    .single()

  if (!session) {
    // Return default session info if none found
    return {
      sessionId: 'unknown',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      deviceInfo: {
        platform: 'Unknown',
        browser: 'Unknown',
        mobile: false
      },
      current: true
    }
  }

  return {
    sessionId: session.session_id,
    createdAt: session.created_at,
    lastActivity: session.last_activity,
    expiresAt: session.expires_at,
    deviceInfo: session.device_info || {
      platform: 'Unknown',
      browser: 'Unknown',
      mobile: false
    },
    current: true
  }
}

/**
 * Get user's last login timestamp
 */
async function getLastLogin(uid: string): Promise<string> {
  const { supabaseAdmin } = await import('@/lib/supabase')
  
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('last_login')
    .eq('uid', uid)
    .single()

  return profile?.last_login || new Date().toISOString()
}