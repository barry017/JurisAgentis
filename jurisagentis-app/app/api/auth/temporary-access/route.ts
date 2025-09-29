/**
 * Temporary Access Management API - Handle temporary access grants and revocations
 */

import { NextRequest } from 'next/server'
import { /* supabaseServer, */ supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'
import { logAuditEvent } from '@/lib/auth/middleware'
import crypto from 'crypto'

interface TemporaryAccessRequest {
  user_id: string
  access_type: 'full' | 'read_only' | 'specific_feature'
  features?: string[]
  reason: string
  duration_hours: number
  granted_by?: string
}

interface TemporaryAccessRevoke {
  access_id: string
  reason: string
}

// POST /api/auth/temporary-access - Grant or revoke temporary access
export async function POST(request: NextRequest) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    const { action } = await parseRequestBody<{ action: string }>(request)

    if (action === 'grant') {
      return handleGrantTemporaryAccess(request)
    } else if (action === 'revoke') {
      return handleRevokeTemporaryAccess(request)
    } else if (action === 'list') {
      return handleListTemporaryAccess(request)
    } else {
      return addCORSHeaders(createErrorResponse(
        'INVALID_ACTION',
        'Action must be "grant", "revoke", or "list"',
        400
      ))
    }

  } catch (error) {
    console.error('Temporary access error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

async function handleGrantTemporaryAccess(request: NextRequest) {
  try {
    const { user_id, access_type, features, reason, duration_hours, granted_by } = 
      await parseRequestBody<TemporaryAccessRequest>(request)

    // Validate required fields
    if (!user_id || !access_type || !reason || !duration_hours) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_FIELDS',
        'User ID, access type, reason, and duration are required',
        400
      ))
    }

    // Validate access type
    const validAccessTypes = ['full', 'read_only', 'specific_feature']
    if (!validAccessTypes.includes(access_type)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_ACCESS_TYPE',
        'Access type must be: full, read_only, or specific_feature',
        400
      ))
    }

    // Validate duration (max 7 days)
    if (duration_hours < 1 || duration_hours > 168) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_DURATION',
        'Duration must be between 1 hour and 7 days (168 hours)',
        400
      ))
    }

    // Validate features if specific_feature access
    if (access_type === 'specific_feature' && (!features || features.length === 0)) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_FEATURES',
        'Features list is required for specific_feature access type',
        400
      ))
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, first_name, last_name, status')
      .eq('id', user_id)
      .single()

    if (userError || !user) {
      return addCORSHeaders(createErrorResponse(
        'USER_NOT_FOUND',
        'User not found',
        400
      ))
    }

    // Generate unique access token
    const accessToken = crypto.randomBytes(32).toString('hex')
    const now = new Date()
    const expiresAt = new Date(now.getTime() + duration_hours * 60 * 60 * 1000)

    // Check for existing active temporary access
    const { data: existingAccess } = await supabaseAdmin
      .from('temporary_access')
      .select('id, expires_at')
      .eq('user_id', user_id)
      .eq('revoked', false)
      .gte('expires_at', now.toISOString())

    if (existingAccess && existingAccess.length > 0) {
      // Revoke existing access first
      await supabaseAdmin
        .from('temporary_access')
        .update({
          revoked: true,
          revoked_at: now.toISOString(),
          revoked_reason: 'replaced_by_new_grant'
        })
        .eq('user_id', user_id)
        .eq('revoked', false)
    }

    // Create temporary access record
    const { data: temporaryAccess, error: accessError } = await supabaseAdmin
      .from('temporary_access')
      .insert({
        user_id,
        access_token: accessToken,
        access_type,
        features: features || [],
        reason,
        duration_hours,
        granted_by: granted_by || 'system',
        granted_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        revoked: false
      })
      .select('*')
      .single()

    if (accessError) {
      console.error('Error creating temporary access:', accessError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to grant temporary access',
        500
      ))
    }

    // Send notification email to user
    try {
      await sendTemporaryAccessNotification(
        user.email,
        user.first_name,
        access_type,
        duration_hours,
        expiresAt,
        reason
      )
    } catch (emailError) {
      console.error('Error sending temporary access notification:', emailError)
      // Continue - email failure shouldn't fail the access grant
    }

    // Log the temporary access grant
    await logAuditEvent(
      'temporary_access_granted',
      user_id,
      request,
      {
        access_type,
        features,
        duration_hours,
        expires_at: expiresAt.toISOString(),
        granted_by
      }
    )

    return addCORSHeaders(createSuccessResponse({
      access_id: temporaryAccess.id,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`
      },
      access_type,
      features: features || [],
      duration_hours,
      expires_at: expiresAt.toISOString(),
      message: 'Temporary access granted successfully'
    }))

  } catch (error) {
    console.error('Grant temporary access error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to grant temporary access',
      500
    ))
  }
}

async function handleRevokeTemporaryAccess(request: NextRequest) {
  try {
    const { access_id, reason } = await parseRequestBody<TemporaryAccessRevoke>(request)

    if (!access_id || !reason) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_FIELDS',
        'Access ID and reason are required',
        400
      ))
    }

    // Find the temporary access record
    const { data: temporaryAccess, error: fetchError } = await supabaseAdmin
      .from('temporary_access')
      .select('*, user_profiles(email, first_name, last_name)')
      .eq('id', access_id)
      .eq('revoked', false)
      .single()

    if (fetchError || !temporaryAccess) {
      return addCORSHeaders(createErrorResponse(
        'ACCESS_NOT_FOUND',
        'Temporary access record not found or already revoked',
        400
      ))
    }

    const now = new Date()

    // Revoke the temporary access
    const { error: revokeError } = await supabaseAdmin
      .from('temporary_access')
      .update({
        revoked: true,
        revoked_at: now.toISOString(),
        revoked_reason: reason
      })
      .eq('id', access_id)

    if (revokeError) {
      console.error('Error revoking temporary access:', revokeError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to revoke temporary access',
        500
      ))
    }

    // Send notification email to user
    try {
      await sendTemporaryAccessRevokedNotification(
        temporaryAccess.user_profiles.email,
        temporaryAccess.user_profiles.first_name,
        temporaryAccess.access_type,
        reason
      )
    } catch (emailError) {
      console.error('Error sending revocation notification:', emailError)
      // Continue - email failure shouldn't fail the revocation
    }

    // Log the temporary access revocation
    await logAuditEvent(
      'temporary_access_revoked',
      temporaryAccess.user_id,
      request,
      {
        access_id,
        access_type: temporaryAccess.access_type,
        revoked_reason: reason
      }
    )

    return addCORSHeaders(createSuccessResponse({
      message: 'Temporary access revoked successfully',
      access_id,
      revoked_at: now.toISOString()
    }))

  } catch (error) {
    console.error('Revoke temporary access error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to revoke temporary access',
      500
    ))
  }
}

async function handleListTemporaryAccess(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    const status = url.searchParams.get('status') || 'active'
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('temporary_access')
      .select(`
        *,
        user_profiles(id, email, first_name, last_name)
      `)
      .range(offset, offset + limit - 1)
      .order('granted_at', { ascending: false })

    // Filter by user if specified
    if (userId) {
      query = query.eq('user_id', userId)
    }

    // Filter by status
    if (status === 'active') {
      const now = new Date().toISOString()
      query = query.eq('revoked', false).gte('expires_at', now)
    } else if (status === 'expired') {
      const now = new Date().toISOString()
      query = query.eq('revoked', false).lt('expires_at', now)
    } else if (status === 'revoked') {
      query = query.eq('revoked', true)
    }

    const { data: temporaryAccessList, error } = await query

    if (error) {
      console.error('Error listing temporary access:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve temporary access records',
        500
      ))
    }

    const formattedList = temporaryAccessList?.map(access => ({
      id: access.id,
      user: {
        id: access.user_profiles.id,
        email: access.user_profiles.email,
        name: `${access.user_profiles.first_name} ${access.user_profiles.last_name}`
      },
      access_type: access.access_type,
      features: access.features,
      reason: access.reason,
      duration_hours: access.duration_hours,
      granted_at: access.granted_at,
      expires_at: access.expires_at,
      granted_by: access.granted_by,
      revoked: access.revoked,
      revoked_at: access.revoked_at,
      revoked_reason: access.revoked_reason,
      status: access.revoked ? 'revoked' : 
              new Date(access.expires_at) < new Date() ? 'expired' : 'active'
    })) || []

    return addCORSHeaders(createSuccessResponse({
      temporary_access: formattedList,
      total: formattedList.length,
      offset,
      limit
    }))

  } catch (error) {
    console.error('List temporary access error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to list temporary access records',
      500
    ))
  }
}

// Helper function to send temporary access notification
async function sendTemporaryAccessNotification(
  email: string,
  firstName: string,
  accessType: string,
  durationHours: number,
  expiresAt: Date,
  reason: string
) {
  const accessTypeDisplay = accessType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  const durationDisplay = durationHours === 1 ? '1 hour' : 
                         durationHours < 24 ? `${durationHours} hours` :
                         `${Math.round(durationHours / 24)} day(s)`

  console.log(`Temporary access notification would be sent to ${email}:`)
  
  const emailContent = {
    to: email,
    subject: 'Temporary Access Granted - JurisAgentis',
    body: `
      Hi ${firstName},
      
      You have been granted temporary access to JurisAgentis with the following details:
      
      Access Type: ${accessTypeDisplay}
      Duration: ${durationDisplay}
      Expires: ${expiresAt.toLocaleString()}
      Reason: ${reason}
      
      This temporary access will automatically expire at the specified time. If you need extended access, please contact your administrator.
      
      You can now log in to your account with your regular credentials.
      
      Best regards,
      The JurisAgentis Team
    `
  }
  
  console.log('Temporary access notification content:', emailContent)
  
  // TODO: Implement actual email sending
}

// Helper function to send temporary access revoked notification
async function sendTemporaryAccessRevokedNotification(
  email: string,
  firstName: string,
  accessType: string,
  reason: string
) {
  const accessTypeDisplay = accessType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())

  console.log(`Temporary access revoked notification would be sent to ${email}:`)
  
  const emailContent = {
    to: email,
    subject: 'Temporary Access Revoked - JurisAgentis',
    body: `
      Hi ${firstName},
      
      Your temporary access to JurisAgentis has been revoked.
      
      Access Type: ${accessTypeDisplay}
      Reason: ${reason}
      
      If you believe this was done in error or if you need continued access, please contact your administrator.
      
      Best regards,
      The JurisAgentis Team
    `
  }
  
  console.log('Temporary access revoked notification content:', emailContent)
  
  // TODO: Implement actual email sending
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

// Handle unsupported methods
export async function GET() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}

export async function PUT() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}