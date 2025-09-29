/**
 * PUT /api/admin/users/[uid]
 * 
 * Updates user role and status (admin only)
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
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

interface UserUpdateRequest {
  role?: string
  status?: string
}

interface UserUpdateResponse {
  success: true
  user: {
    uid: string
    role: string
    status: string
    updatedAt: string
  }
  message: string
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params
    // Authenticate user
    const user = await authenticate(request)

    // Check admin permissions
    try {
      requireRole(user, ['admin'])
      requirePermission(user, 'administrative', ['all'])
    } catch {
      await logAuditEvent('ADMIN_USER_UPDATE_DENIED', user.uid, request, {
        reason: 'Insufficient permissions',
        targetUid: uid,
        userRole: user.role
      })
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'Admin access required for user management',
        403
      )
    }

    // Validate content type
    if (!validateContentType(request)) {
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      )
    }

    // Parse request body
    const body = await parseRequestBody<UserUpdateRequest>(request)

    // Validate request data
    const validRoles = ['admin', 'associate_attorney', 'paralegal', 'assistant', 'client', 'client_related_party']
    const validStatuses = ['active', 'inactive', 'suspended']

    if (body.role && !validRoles.includes(body.role)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid role value',
        400,
        { field: 'role', validValues: validRoles }
      )
    }

    if (body.status && !validStatuses.includes(body.status)) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid status value',
        400,
        { field: 'status', validValues: validStatuses }
      )
    }

    // Check if user exists
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('uid, email, role, status, first_name, last_name')
      .eq('uid', uid)
      .single()

    if (userError || !targetUser) {
      await logAuditEvent('ADMIN_USER_UPDATE_NOT_FOUND', user.uid, request, {
        targetUid: uid
      })
      return createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        404
      )
    }

    // Prevent self-modification of critical attributes
    if (uid === user.uid && body.role && body.role !== user.role) {
      await logAuditEvent('ADMIN_USER_UPDATE_SELF_ROLE_CHANGE', user.uid, request, {
        attemptedRole: body.role
      })
      return createErrorResponse(
        'INVALID_OPERATION',
        'Cannot change your own role',
        400
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (body.role) {
      updateData.role = body.role
    }

    if (body.status) {
      updateData.status = body.status
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData)
      .eq('uid', uid)
      .select('uid, role, status, updated_at')
      .single()

    if (updateError || !updatedUser) {
      console.error('User update error:', updateError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to update user',
        500
      )
    }

    // Log the changes
    const changes: Record<string, { from: string; to: string }> = {}
    if (body.role && body.role !== targetUser.role) {
      changes.role = { from: targetUser.role, to: body.role }
    }
    if (body.status && body.status !== targetUser.status) {
      changes.status = { from: targetUser.status, to: body.status }
    }

    await logAuditEvent('ADMIN_USER_UPDATE', user.uid, request, {
      targetUid: uid,
      targetEmail: targetUser.email,
      changes
    }, uid)

    const updateResponse: UserUpdateResponse = {
      success: true,
      user: {
        uid: updatedUser.uid,
        role: updatedUser.role,
        status: updatedUser.status,
        updatedAt: updatedUser.updated_at
      },
      message: 'User updated successfully'
    }

    const response = createSuccessResponse(undefined, undefined, updateResponse)
    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400)
    }

    console.error('Admin user update error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred',
      500
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return createMethodNotAllowedResponse(['PUT'])
}

export async function POST() {
  return createMethodNotAllowedResponse(['PUT'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['PUT'])
}

export async function OPTIONS(request: NextRequest) {
  const response = new Response(null, { status: 200 })
  return addCORSHeaders(response, request.headers.get('origin') || undefined)
}