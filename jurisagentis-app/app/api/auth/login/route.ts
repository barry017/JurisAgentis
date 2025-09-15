/**
 * POST /api/auth/login
 * 
 * Handles user authentication and session management
 */

import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'
import { getUserProfile, logAuditEvent } from '@/lib/auth/middleware'

interface LoginRequest {
  email: string
  password: string
}

interface LoginResponse {
  success: true
  token: string
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
    expiresAt: string
  }
}

interface MFARequiredResponse {
  success: true
  requiresMFA: true
  tempToken: string
}

export async function POST(request: NextRequest) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      )
    }

    // Parse request body
    const body = await parseRequestBody<LoginRequest>(request)

    // Validate required fields
    if (!body.email) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Email is required',
        400,
        { field: 'email' }
      )
    }

    if (!body.password) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Password is required',
        400,
        { field: 'password' }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid email format',
        400,
        { field: 'email' }
      )
    }

    // Development mode: Allow test users when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    const testUsers = {
      'admin@jurisagentis.com': { role: 'admin', used: false },
      'test@example.com': { role: 'admin', used: false }
    }

    let allowlistEntry = null
    let allowlistError = null

    // Check if email is in allowlist
    try {
      const result = await supabaseAdmin
        .from('email_allowlist')
        .select('email, role, used')
        .eq('email', body.email.toLowerCase())
        .single()
      
      allowlistEntry = result.data
      allowlistError = result.error
      
      // Check if database connection failed (fetch error)
      if (allowlistError && allowlistError.message && allowlistError.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (error) {
      // Database connection failed - use test users in development
      if (isDevelopment && testUsers[body.email.toLowerCase()]) {
        allowlistEntry = {
          email: body.email.toLowerCase(),
          ...testUsers[body.email.toLowerCase()]
        }
        allowlistError = null
      } else {
        allowlistError = error
      }
    }

    if (allowlistError || !allowlistEntry) {
      await logAuditEvent('AUTH_LOGIN_FAILURE', '', request, {
        email: body.email,
        reason: 'Email not in allowlist'
      })

      return createErrorResponse(
        'EMAIL_NOT_ALLOWLISTED',
        'This email is not authorized to access the system',
        403
      )
    }

    // Attempt authentication with Supabase
    let authData = null
    let authError = null
    
    try {
      const result = await supabaseServer.auth.signInWithPassword({
        email: body.email,
        password: body.password
      })
      authData = result.data
      authError = result.error
      
      // Check if auth failed due to connection error
      if (authError && authError.message && authError.message.includes('fetch failed')) {
        throw new Error('Supabase connection failed')
      }
    } catch (error) {
      // Database connection failed - use mock auth in development for test users
      if (isDevelopment && testUsers[body.email.toLowerCase()] && body.password === 'testpass') {
        authData = {
          user: { 
            id: `test-user-${Date.now()}`,
            email: body.email
          },
          session: {
            access_token: `mock-token-${Date.now()}`,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          }
        }
        authError = null
      } else {
        authError = error
      }
    }

    if (authError || !authData.user || !authData.session) {
      await logAuditEvent('AUTH_LOGIN_FAILURE', '', request, {
        email: body.email,
        reason: 'Invalid credentials'
      })

      return createErrorResponse(
        'INVALID_CREDENTIALS',
        'Invalid email or password',
        401
      )
    }

    const user = authData.user
    const session = authData.session

    try {
      // Get user profile
      let userProfile
      try {
        userProfile = await getUserProfile(user.id)
      } catch (profileError) {
        // Database connection failed - use mock profile in development
        if (isDevelopment && testUsers[body.email.toLowerCase()]) {
          userProfile = {
            uid: user.id,
            email: user.email,
            role: allowlistEntry.role,
            profile: { firstName: 'Test', lastName: 'User' },
            mfaEnabled: false,
            status: 'active',
            permissions: {
              financial: allowlistEntry.role === 'admin' ? 'full' : 'read',
              clients: 'full',
              documents: 'full', 
              administrative: allowlistEntry.role === 'admin' ? 'full' : 'none'
            }
          }
        } else {
          throw profileError
        }
      }

      // Check if MFA is enabled
      let mfaEnrollment = null
      try {
        const result = await supabaseAdmin
          .from('mfa_enrollments')
          .select('uid, mfa_enabled, locked_until')
          .eq('uid', user.id)
          .single()
        mfaEnrollment = result.data
      } catch (mfaError) {
        // Database connection failed - assume no MFA in development
        if (isDevelopment) {
          mfaEnrollment = null
        } else {
          throw mfaError
        }
      }

      // Check if account is locked due to MFA failures
      if (mfaEnrollment?.locked_until) {
        const lockedUntil = new Date(mfaEnrollment.locked_until)
        if (lockedUntil > new Date()) {
          await logAuditEvent('AUTH_LOGIN_FAILURE', user.id, request, {
            reason: 'Account locked due to MFA failures'
          })

          const retryAfter = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000)
          
          return createErrorResponse(
            'ACCOUNT_LOCKED',
            'Account is temporarily locked due to multiple failed MFA attempts',
            429,
            { lockedUntil: lockedUntil.toISOString() }
          )
        }
      }

      // If MFA is enabled, return temp token for MFA verification
      if (userProfile.mfaEnabled) {
        await logAuditEvent('AUTH_LOGIN_MFA_REQUIRED', user.id, request, {
          email: body.email
        })

        const response: MFARequiredResponse = {
          success: true,
          requiresMFA: true,
          tempToken: session.access_token // Temporary token for MFA verification
        }

        return createSuccessResponse(undefined, undefined, response)
      }

      // Create user session record
      const deviceInfo = parseUserAgent(request.headers.get('user-agent') || '')
      let sessionRecord
      try {
        sessionRecord = await createUserSession(user.id, session, request, deviceInfo)
      } catch (sessionError) {
        // Database connection failed - use mock session record in development
        if (isDevelopment) {
          sessionRecord = {
            sessionId: `mock-session-${Date.now()}`,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600000).toISOString()
          }
        } else {
          throw sessionError
        }
      }

      // Update last login (optional operation - don't fail if it doesn't work)
      try {
        await supabaseAdmin
          .from('user_profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('uid', user.id)
      } catch (updateError) {
        // Ignore update errors in development mode
        if (!isDevelopment) {
          console.error('Failed to update last login:', updateError)
        }
      }

      // Mark allowlist entry as used (optional operation)
      try {
        if (!allowlistEntry.used) {
          await supabaseAdmin
            .from('email_allowlist')
            .update({ 
              used: true, 
              used_at: new Date().toISOString() 
            })
            .eq('email', body.email.toLowerCase())
        }
      } catch (allowlistUpdateError) {
        // Ignore allowlist update errors in development mode
        if (!isDevelopment) {
          console.error('Failed to update allowlist entry:', allowlistUpdateError)
        }
      }

      // Log successful login
      await logAuditEvent('AUTH_LOGIN_SUCCESS', user.id, request, {
        email: body.email,
        sessionId: sessionRecord.sessionId
      })

      // Return success response
      const loginResponse: LoginResponse = {
        success: true,
        token: session.access_token,
        user: {
          uid: userProfile.uid,
          email: userProfile.email,
          role: userProfile.role,
          profile: userProfile.profile,
          mfaEnabled: userProfile.mfaEnabled,
          status: userProfile.status,
          lastLogin: new Date().toISOString()
        },
        permissions: userProfile.permissions,
        session: {
          sessionId: sessionRecord.sessionId,
          createdAt: sessionRecord.createdAt,
          expiresAt: sessionRecord.expiresAt
        }
      }

      const response = createSuccessResponse(undefined, 'Login successful', loginResponse)
      return addCORSHeaders(response, request.headers.get('origin') || undefined)

    } catch (profileError) {
      await logAuditEvent('AUTH_LOGIN_FAILURE', user.id, request, {
        email: body.email,
        reason: 'Profile lookup failed'
      })

      return createErrorResponse(
        'PROFILE_ERROR',
        'Unable to retrieve user profile',
        500
      )
    }

  } catch (error) {
    console.error('Login error:', error)
    
    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400)
    }

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
 * Create user session record in database
 */
async function createUserSession(
  uid: string, 
  session: any, 
  request: NextRequest,
  deviceInfo: any
) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const expiresAt = new Date(session.expires_at * 1000).toISOString()

  await supabaseAdmin
    .from('user_sessions')
    .insert({
      session_id: sessionId,
      uid: uid,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
      expires_at: expiresAt,
      device_info: deviceInfo,
      ip_address: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      active: true
    })

  return {
    sessionId,
    createdAt: new Date().toISOString(),
    expiresAt
  }
}

/**
 * Parse user agent for device information
 */
function parseUserAgent(userAgent: string) {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent)
  const browser = userAgent.match(/(Chrome|Firefox|Safari|Edge)\/[\d.]+/)?.[1] || 'Unknown'
  
  return {
    platform: browser,
    browser: `${browser} ${userAgent.match(/[\d.]+/)?.[0] || ''}`.trim(),
    mobile: isMobile
  }
}