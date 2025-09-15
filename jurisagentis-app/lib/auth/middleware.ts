/**
 * Authentication Middleware
 * 
 * Provides JWT token validation, user session management, and role-based access control
 */

import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'
import { Database } from '@/types/database'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']
type UserRole = Database['public']['Enums']['user_role']
type UserPermissions = {
  financial: 'all' | 'limited' | 'time_only' | 'client_only' | 'none'
  clients: 'all' | 'assigned' | 'own' | 'none'
  documents: 'all' | 'assigned' | 'own' | 'none'
  administrative: 'all' | 'limited' | 'none'
}

export interface AuthenticatedUser {
  uid: string
  email: string
  role: UserRole
  profile: {
    firstName: string
    lastName: string
    title?: string
  }
  permissions: UserPermissions
  mfaEnabled: boolean
  status: 'active' | 'inactive' | 'suspended'
  sessionId?: string
  temporaryAccess?: {
    id: string
    scope: string
    expiresAt: string
    grantedBy: string
    justification: string
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 401
  ) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403
  ) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/**
 * Extract and validate JWT token from request headers
 */
export function extractToken(request: NextRequest): string {
  const authHeader = request.headers.get('Authorization')
  
  if (!authHeader) {
    throw new AuthenticationError('Authentication required', 'AUTHENTICATION_REQUIRED', 401)
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AuthenticationError(
      'Invalid authorization header format', 
      'INVALID_AUTHORIZATION_HEADER',
      401
    )
  }

  return parts[1]
}

/**
 * Verify JWT token and extract user information
 */
export async function verifyToken(token: string): Promise<{ uid: string, email: string }> {
  try {
    // Set user session for Supabase client
    const { data: { user }, error } = await supabaseServer.auth.getUser(token)
    
    if (error || !user) {
      // Check if error is connection related
      if (error?.message?.includes('fetch failed')) {
        throw new Error('Supabase connection failed')
      }
      if (error?.message?.includes('expired')) {
        throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED')
      }
      throw new AuthenticationError('Invalid token', 'INVALID_TOKEN')
    }

    return {
      uid: user.id,
      email: user.email || ''
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    
    // Development mode: Handle connection failures with mock authentication
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    if (isDevelopment && error instanceof Error && error.message.includes('Supabase connection failed')) {
      // Check if token is a mock token from development mode
      if (token.startsWith('mock-token-')) {
        return {
          uid: `test-user-${Date.now()}`,
          email: 'admin@jurisagentis.com'
        }
      }
    }
    
    // Try to decode JWT manually for more specific error handling
    try {
      const decoded = jwt.decode(token) as any
      if (!decoded) {
        throw new AuthenticationError('Invalid token format', 'INVALID_TOKEN')
      }
      
      const now = Math.floor(Date.now() / 1000)
      if (decoded.exp && decoded.exp < now) {
        throw new AuthenticationError('Token expired', 'TOKEN_EXPIRED')
      }
      
      throw new AuthenticationError('Token verification failed', 'INVALID_TOKEN')
    } catch (jwtError) {
      throw new AuthenticationError('Invalid token', 'INVALID_TOKEN')
    }
  }
}

/**
 * Get user profile and permissions from database
 */
export async function getUserProfile(uid: string): Promise<AuthenticatedUser> {
  let profile = null
  let error = null

  try {
    const result = await supabaseAdmin
      .from('user_profiles')
      .select(`
        uid,
        email,
        role,
        first_name,
        last_name,
        title,
        status,
        mfa_enabled,
        created_at,
        updated_at
      `)
      .eq('uid', uid)
      .single()
    
    profile = result.data
    error = result.error
    
    // Check if database connection failed
    if (error && error.message && error.message.includes('fetch failed')) {
      throw new Error('Database connection failed')
    }
  } catch (dbError) {
    // Development mode: Use mock profile when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    if (isDevelopment && dbError instanceof Error && dbError.message.includes('Database connection failed')) {
      profile = {
        uid: uid,
        email: 'admin@jurisagentis.com',
        role: 'admin',
        first_name: 'Test',
        last_name: 'User',
        title: 'System Administrator',
        status: 'active',
        mfa_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      error = null
    } else {
      throw dbError
    }
  }

  if (error || !profile) {
    throw new AuthenticationError('User profile not found', 'USER_NOT_FOUND', 404)
  }

  if (profile.status !== 'active') {
    throw new AuthenticationError(
      `Account is ${profile.status}`, 
      'ACCOUNT_SUSPENDED', 
      403
    )
  }

  // Get permissions based on role
  const permissions = getRolePermissions(profile.role)

  // Check for temporary access
  const { data: tempAccess } = await supabaseAdmin
    .from('temporary_access')
    .select('*')
    .eq('uid', uid)
    .eq('active', true)
    .gte('expires_at', new Date().toISOString())
    .single()

  const user: AuthenticatedUser = {
    uid: profile.uid,
    email: profile.email,
    role: profile.role,
    profile: {
      firstName: profile.first_name,
      lastName: profile.last_name,
      title: profile.title || undefined
    },
    permissions,
    mfaEnabled: profile.mfa_enabled,
    status: profile.status as 'active' | 'inactive' | 'suspended'
  }

  if (tempAccess) {
    user.temporaryAccess = {
      id: tempAccess.id,
      scope: tempAccess.scope,
      expiresAt: tempAccess.expires_at,
      grantedBy: tempAccess.granted_by,
      justification: tempAccess.justification
    }
    
    // Enhance permissions based on temporary access
    if (tempAccess.scope === 'financial') {
      user.permissions.financial = 'all'
    }
  }

  return user
}

/**
 * Get role-based permissions
 */
function getRolePermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'admin':
      return {
        financial: 'all',
        clients: 'all',
        documents: 'all',
        administrative: 'all'
      }
    
    case 'associate_attorney':
      return {
        financial: 'limited',
        clients: 'all',
        documents: 'all',
        administrative: 'limited'
      }
    
    case 'paralegal':
      return {
        financial: 'time_only',
        clients: 'assigned',
        documents: 'assigned',
        administrative: 'none'
      }
    
    case 'assistant':
      return {
        financial: 'none',
        clients: 'assigned',
        documents: 'assigned',
        administrative: 'none'
      }
    
    case 'client':
      return {
        financial: 'client_only',
        clients: 'own',
        documents: 'own',
        administrative: 'none'
      }
    
    case 'client_related_party':
      return {
        financial: 'none',
        clients: 'own',
        documents: 'own',
        administrative: 'none'
      }
    
    default:
      return {
        financial: 'none',
        clients: 'none',
        documents: 'none',
        administrative: 'none'
      }
  }
}

/**
 * Main authentication middleware
 */
export async function authenticate(request: NextRequest): Promise<AuthenticatedUser> {
  try {
    // Extract and verify token
    const token = extractToken(request)
    const { uid } = await verifyToken(token)
    
    // Get user profile and permissions
    const user = await getUserProfile(uid)
    
    // Update last activity in session
    await updateSessionActivity(uid, token, request)
    
    return user
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error
    }
    
    throw new AuthenticationError('Authentication failed', 'AUTHENTICATION_FAILED')
  }
}

/**
 * Update session last activity
 */
async function updateSessionActivity(uid: string, token: string, request: NextRequest) {
  try {
    const userAgent = request.headers.get('user-agent') || ''
    const deviceInfo = parseUserAgent(userAgent)
    
    await supabaseAdmin
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString(),
        device_info: deviceInfo
      })
      .eq('uid', uid)
      .eq('active', true)
  } catch (error) {
    // Non-critical error - don't fail authentication
    console.error('Failed to update session activity:', error)
  }
}

/**
 * Parse user agent for device info
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

/**
 * Check if user has required role
 */
export function requireRole(user: AuthenticatedUser, requiredRoles: UserRole[]): void {
  if (!requiredRoles.includes(user.role)) {
    throw new AuthorizationError(
      'Insufficient permissions',
      'INSUFFICIENT_PERMISSIONS'
    )
  }
}

/**
 * Check if user has required permission level
 */
export function requirePermission(
  user: AuthenticatedUser,
  permission: keyof UserPermissions,
  requiredLevels: string[]
): void {
  const userLevel = user.permissions[permission]
  if (!requiredLevels.includes(userLevel)) {
    throw new AuthorizationError(
      'Insufficient permissions',
      'INSUFFICIENT_PERMISSIONS'
    )
  }
}

/**
 * Log audit event
 */
export async function logAuditEvent(
  eventType: string,
  userId: string,
  request: NextRequest,
  details: Record<string, any> = {},
  targetUserId?: string
) {
  try {
    await supabaseAdmin
      .from('audit_logs')
      .insert({
        event_type: eventType,
        user_id: userId,
        target_user_id: targetUserId,
        ip_address: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        user_agent: request.headers.get('user-agent') || '',
        details,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't fail the main operation if audit logging fails
  }
}