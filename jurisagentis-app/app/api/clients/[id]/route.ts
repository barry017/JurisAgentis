/**
 * Individual Client API - Get, update, and delete specific client
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
import { ClientUpdate, ClientStatus, ClientType } from '@/types/database'

interface UpdateClientRequest {
  first_name?: string
  last_name?: string
  preferred_name?: string
  date_of_birth?: string
  email?: string
  phone_primary?: string
  phone_secondary?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  client_status?: ClientStatus
  client_type?: ClientType
  business_name?: string
  business_tax_id?: string
  business_type?: string
  referral_source?: string
  practice_areas?: string[]
  communication_preference?: 'email' | 'phone' | 'mail' | 'secure_portal' | 'no_contact'
  language_preference?: string
  billing_rate?: number
  payment_terms?: number
  credit_limit?: number
  notes?: string
  tags?: string[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getUserProfile(request)
    
    // Check permissions
    if (!['admin', 'associate_attorney', 'paralegal', 'assistant', 'client'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to view client',
        403
      ))
    }

    const clientId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_ID',
        'Client ID must be a valid UUID',
        400
      ))
    }

    // Get client with related data
    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .select(`
        *,
        created_by_profile:user_profiles!clients_created_by_fkey(first_name, last_name),
        updated_by_profile:user_profiles!clients_updated_by_fkey(first_name, last_name),
        client_contacts!client_contacts_client_id_fkey(
          id,
          first_name,
          last_name,
          relationship,
          title,
          email,
          phone,
          address_line1,
          address_line2,
          city,
          state,
          zip_code,
          is_primary_contact,
          is_authorized_contact,
          communication_preference,
          notes,
          created_at,
          updated_at
        )
      `)
      .eq('id', clientId)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return addCORSHeaders(createErrorResponse(
          'CLIENT_NOT_FOUND',
          'Client not found',
          404
        ))
      }

      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve client',
        500
      ))
    }

    // Additional access control for clients
    if (user.role === 'client') {
      // Clients can only see their own record (email matching)
      if (client.email !== user.email) {
        return addCORSHeaders(createErrorResponse(
          'CLIENT_NOT_FOUND',
          'Client not found',
          404
        ))
      }
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      'clients',
      'view',
      'success',
      { client_id: clientId }
    )

    return addCORSHeaders(createSuccessResponse({ client }))

  } catch (error) {
    console.error('Client retrieval error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate content type
    const contentTypeError = validateContentType(request)
    if (contentTypeError) {
      return addCORSHeaders(contentTypeError)
    }

    // Get authenticated user
    const user = await getUserProfile(request)
    
    // Check permissions - only certain roles can update clients
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to update client',
        403
      ))
    }

    const clientId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_ID',
        'Client ID must be a valid UUID',
        400
      ))
    }

    // Parse request body
    const body = await parseRequestBody(request)
    if (!body.success) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_JSON',
        body.error,
        400
      ))
    }

    const updateData = body.data as UpdateClientRequest

    // Get current client for audit logging
    const { data: currentClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return addCORSHeaders(createErrorResponse(
          'CLIENT_NOT_FOUND',
          'Client not found',
          404
        ))
      }

      console.error('Database error:', fetchError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve client for update',
        500
      ))
    }

    // Validate email format if being updated
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(updateData.email)) {
        return addCORSHeaders(createErrorResponse(
          'INVALID_EMAIL_FORMAT',
          'Email format is invalid',
          400
        ))
      }

      // Check for email conflicts (excluding current client)
      const { data: existing } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('email', updateData.email.toLowerCase().trim())
        .neq('id', clientId)
        .is('deleted_at', null)
        .single()

      if (existing) {
        return addCORSHeaders(createErrorResponse(
          'EMAIL_ALREADY_EXISTS',
          'Another client with this email already exists',
          400
        ))
      }
    }

    // Validate client status
    const validStatuses: ClientStatus[] = ['prospect', 'active', 'inactive', 'former', 'do_not_contact']
    if (updateData.client_status && !validStatuses.includes(updateData.client_status)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_STATUS',
        `Client status must be one of: ${validStatuses.join(', ')}`,
        400
      ))
    }

    // Validate client type
    const validTypes: ClientType[] = ['individual', 'business', 'estate', 'trust', 'non_profit', 'government']
    if (updateData.client_type && !validTypes.includes(updateData.client_type)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_TYPE',
        `Client type must be one of: ${validTypes.join(', ')}`,
        400
      ))
    }

    // Prepare update data
    const clientUpdate: ClientUpdate = {
      ...updateData,
      // Sanitize string fields
      first_name: updateData.first_name?.trim(),
      last_name: updateData.last_name?.trim(),
      preferred_name: updateData.preferred_name?.trim() || null,
      email: updateData.email?.toLowerCase().trim() || null,
      phone_primary: updateData.phone_primary?.trim() || null,
      phone_secondary: updateData.phone_secondary?.trim() || null,
      address_line1: updateData.address_line1?.trim() || null,
      address_line2: updateData.address_line2?.trim() || null,
      city: updateData.city?.trim() || null,
      state: updateData.state?.trim() || null,
      zip_code: updateData.zip_code?.trim() || null,
      country: updateData.country?.trim(),
      business_name: updateData.business_name?.trim() || null,
      business_tax_id: updateData.business_tax_id?.trim() || null,
      business_type: updateData.business_type?.trim() || null,
      referral_source: updateData.referral_source?.trim() || null,
      notes: updateData.notes?.trim() || null,
      updated_by: user.uid
    }

    // Remove undefined values
    Object.keys(clientUpdate).forEach(key => {
      if ((clientUpdate as any)[key] === undefined) {
        delete (clientUpdate as any)[key]
      }
    })

    // Update the client
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update(clientUpdate)
      .eq('id', clientId)
      .select(`
        *,
        created_by_profile:user_profiles!clients_created_by_fkey(first_name, last_name),
        updated_by_profile:user_profiles!clients_updated_by_fkey(first_name, last_name)
      `)
      .single()

    if (updateError) {
      console.error('Database error updating client:', updateError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to update client',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      'clients',
      'update',
      'success',
      { 
        client_id: clientId,
        updated_fields: Object.keys(clientUpdate).filter(k => k !== 'updated_by')
      },
      null,
      currentClient,
      updatedClient
    )

    return addCORSHeaders(createSuccessResponse({
      client: updatedClient,
      message: 'Client updated successfully'
    }))

  } catch (error) {
    console.error('Client update error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getUserProfile(request)
    
    // Check permissions - only certain roles can delete clients
    if (!['admin', 'associate_attorney'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to delete client',
        403
      ))
    }

    const clientId = params.id

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_ID',
        'Client ID must be a valid UUID',
        400
      ))
    }

    // Get current client for audit logging
    const { data: currentClient, error: fetchError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return addCORSHeaders(createErrorResponse(
          'CLIENT_NOT_FOUND',
          'Client not found',
          404
        ))
      }

      console.error('Database error:', fetchError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve client for deletion',
        500
      ))
    }

    // Perform soft delete
    const { error: deleteError } = await supabaseAdmin
      .from('clients')
      .update({ 
        deleted_at: new Date().toISOString(),
        deleted_by: user.uid 
      })
      .eq('id', clientId)

    if (deleteError) {
      console.error('Database error deleting client:', deleteError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to delete client',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      'clients',
      'delete',
      'success',
      { client_id: clientId },
      null,
      currentClient,
      null
    )

    return addCORSHeaders(createSuccessResponse({
      message: 'Client deleted successfully'
    }))

  } catch (error) {
    console.error('Client deletion error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

// Handle unsupported methods
export async function POST() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'PUT', 'DELETE', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'PUT', 'DELETE', 'OPTIONS']))
}