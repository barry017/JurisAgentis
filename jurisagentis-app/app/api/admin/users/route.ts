/**
 * GET /api/admin/users
 * 
 * Returns paginated list of users with filtering capabilities (admin only)
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
  logAuditEvent,
  requireRole,
  requirePermission
} from '@/lib/auth/middleware'

interface UsersListResponse {
  success: true
  users: Array<{
    uid: string
    email: string
    role: string
    profile: {
      firstName: string
      lastName: string
      title?: string
    }
    status: string
    mfaEnabled: boolean
    lastLogin?: string
    createdAt: string
  }>
  pagination: {
    total: number
    limit: number
    offset: number
    pages: number
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)

    // Check admin permissions
    try {
      requireRole(user, ['admin', 'associate_attorney'])
      requirePermission(user, 'administrative', ['all', 'limited'])
    } catch {
      await logAuditEvent('ADMIN_USERS_ACCESS_DENIED', user.uid, request, {
        reason: 'Insufficient permissions',
        userRole: user.role
      })
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'Administrative access required',
        403
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const roleFilter = searchParams.get('role')
    const statusFilter = searchParams.get('status')

    // Validate parameters
    if (limit <= 0 || limit > 100) {
      return createValidationErrorResponse('limit', 'Limit must be between 1 and 100')
    }

    if (offset < 0) {
      return createValidationErrorResponse('offset', 'Offset must be non-negative')
    }

    if (roleFilter && !['admin', 'associate_attorney', 'paralegal', 'assistant', 'client', 'client_related_party'].includes(roleFilter)) {
      return createValidationErrorResponse('role', 'Invalid role filter')
    }

    if (statusFilter && !['active', 'inactive', 'suspended'].includes(statusFilter)) {
      return createValidationErrorResponse('status', 'Invalid status filter')
    }

    // Build query
    let query = supabaseAdmin
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
        last_login,
        created_at
      `, { count: 'exact' })

    // Apply filters
    if (roleFilter) {
      query = query.eq('role', roleFilter)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    // Apply role-based restrictions
    if (user.role === 'associate_attorney') {
      // Associate attorneys can only see clients and lower roles
      query = query.in('role', ['client', 'client_related_party', 'assistant', 'paralegal'])
    }

    // Apply pagination and ordering
    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Failed to fetch users:', error)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve users',
        500
      )
    }

    // Format users for response
    const formattedUsers = (users || []).map(user => ({
      uid: user.uid,
      email: user.email,
      role: user.role,
      profile: {
        firstName: user.first_name,
        lastName: user.last_name,
        title: user.title || undefined
      },
      status: user.status,
      mfaEnabled: user.mfa_enabled,
      lastLogin: user.last_login || undefined,
      createdAt: user.created_at
    }))

    // Log admin access
    await logAuditEvent('ADMIN_USERS_ACCESS', user.uid, request, {
      filters: { role: roleFilter, status: statusFilter },
      resultCount: formattedUsers.length,
      pagination: { limit, offset }
    })

    const usersResponse: UsersListResponse = {
      success: true,
      users: formattedUsers,
      pagination: {
        total: count || 0,
        limit,
        offset,
        pages: Math.ceil((count || 0) / limit)
      }
    }

    const response = createSuccessResponse(undefined, undefined, usersResponse)
    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    console.error('Admin users list error:', error)
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