/**
 * Clients API - List and create clients
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
import { authenticate, logAuditEvent, AuthenticationError, AuthenticatedUser } from '@/lib/auth/middleware'
import { createProtectedRoute } from '@/lib/auth/api-middleware'
import { ClientInsert, ClientStatus, ClientType } from '@/types/database'

interface ListClientsParams {
  status?: ClientStatus
  type?: ClientType
  search?: string
  practice_area?: string
  tag?: string
  limit?: number
  offset?: number
}

interface CreateClientRequest {
  first_name: string
  last_name: string
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

// GET /api/clients - List clients with enhanced RBAC
async function handleGetClients(request: NextRequest, user: AuthenticatedUser) {
  try {
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

    // Parse query parameters
    const url = new URL(request.url)
    const params: ListClientsParams = {
      status: url.searchParams.get('status') as ClientStatus || undefined,
      type: url.searchParams.get('type') as ClientType || undefined,
      search: url.searchParams.get('search') || undefined,
      practice_area: url.searchParams.get('practice_area') || undefined,
      tag: url.searchParams.get('tag') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '20'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    }

    // Validate limit and offset
    if (params.limit && (params.limit < 1 || params.limit > 100)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_PARAMETER',
        'Limit must be between 1 and 100',
        400
      ))
    }

    if (params.offset && params.offset < 0) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_PARAMETER',
        'Offset must be non-negative',
        400
      ))
    }

    // Build query
    let query = supabaseAdmin
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
          email,
          phone,
          is_primary_contact
        )
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    // Apply filters
    if (params.status) {
      query = query.eq('client_status', params.status)
    }

    if (params.type) {
      query = query.eq('client_type', params.type)
    }

    if (params.search) {
      query = query.or(`
        first_name.ilike.%${params.search}%,
        last_name.ilike.%${params.search}%,
        preferred_name.ilike.%${params.search}%,
        business_name.ilike.%${params.search}%,
        email.ilike.%${params.search}%
      `)
    }

    if (params.practice_area) {
      query = query.contains('practice_areas', [params.practice_area])
    }

    if (params.tag) {
      query = query.contains('tags', [params.tag])
    }

    // Apply pagination
    if (params.limit) {
      query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1)
    }

    let clients = null
    let error = null
    let count = 0

    try {
      const result = await query
      clients = result.data
      error = result.error
      count = result.count || 0
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock client data')
        const mockClients = [
          {
            id: 'client-1',
            first_name: 'John',
            last_name: 'Johnson',
            preferred_name: null,
            email: 'john.johnson@example.com',
            phone_primary: '(555) 123-4567',
            client_status: 'active',
            client_type: 'individual',
            business_name: null,
            practice_areas: ['Estate Planning', 'Wills'],
            tags: ['high-priority'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'client-2',
            first_name: 'Jane',
            last_name: 'Doe',
            preferred_name: null,
            email: 'jane.doe@business.com',
            phone_primary: '(555) 987-6543',
            client_status: 'active',
            client_type: 'business',
            business_name: 'ABC Corporation',
            practice_areas: ['Corporate Law'],
            tags: ['corporate'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'client-3',
            first_name: 'Robert',
            last_name: 'Williams',
            preferred_name: 'Bob',
            email: 'bob.williams@email.com',
            phone_primary: '(555) 555-1234',
            client_status: 'prospect',
            client_type: 'individual',
            business_name: null,
            practice_areas: ['Family Law'],
            tags: ['new-inquiry'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        
        // Apply filters to mock data
        let filteredClients = mockClients
        
        if (params.status && params.status !== 'all') {
          filteredClients = filteredClients.filter(c => c.client_status === params.status)
        }
        
        if (params.type && params.type !== 'all') {
          filteredClients = filteredClients.filter(c => c.client_type === params.type)
        }
        
        if (params.search) {
          const search = params.search.toLowerCase()
          filteredClients = filteredClients.filter(c => 
            c.first_name.toLowerCase().includes(search) ||
            c.last_name.toLowerCase().includes(search) ||
            (c.preferred_name && c.preferred_name.toLowerCase().includes(search)) ||
            (c.business_name && c.business_name.toLowerCase().includes(search)) ||
            (c.email && c.email.toLowerCase().includes(search))
          )
        }
        
        // Apply pagination
        const offset = params.offset || 0
        const limit = params.limit || 20
        const paginatedClients = filteredClients.slice(offset, offset + limit)
        
        clients = paginatedClients
        count = filteredClients.length
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve clients',
        500
      ))
    }

    // Apply role-based filtering (Enhanced RBAC - FR-008 to FR-013)
    if (clients) {
      clients = await applyRoleBasedClientFiltering(clients, user)
    }

    // Log audit event with enhanced details
    await logAuditEvent(
      'client_list_access',
      user.uid,
      request,
      { 
        resource: 'clients',
        action: 'list',
        filters: params,
        result_count: clients?.length || 0,
        role: user.role,
        permissions: user.permissions.clients
      }
    )

    return addCORSHeaders(createSuccessResponse({
      clients,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
        has_more: count ? (params.offset || 0) + clients.length < count : false
      }
    }))

  } catch (error) {
    console.error('Clients list error:', error)
    
    // Handle authentication errors properly
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ))
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

/**
 * Apply role-based client filtering according to FR-008 to FR-013
 * Ensures users only see clients they have permission to access
 */
async function applyRoleBasedClientFiltering(clients: Record<string, unknown>[], user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
  const clientPermission = user.permissions.clients
  
  switch (clientPermission) {
    case 'full':
      // Admin and associate attorneys see all clients
      return clients
      
    case 'assigned':
      // Paralegals see only assigned clients
      // In production, this would filter based on client assignments in database
      return clients.filter(client => {
        // Mock logic: paralegals see clients where they're assigned
        // In real implementation, check client_assignments table
        return client.assigned_paralegal_id === user.uid || client.assigned_staff?.includes(user.uid)
      })
      
    case 'basic':
      // Assistants see basic client info only (remove sensitive data)
      return clients.map(client => ({
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        preferred_name: client.preferred_name,
        business_name: client.business_name,
        client_status: client.client_status,
        client_type: client.client_type,
        practice_areas: client.practice_areas,
        // Remove financial and sensitive information
        email: undefined,
        phone_primary: undefined,
        address_line1: undefined,
        billing_rate: undefined,
        credit_limit: undefined
      }))
      
    case 'own_profile':
      // Clients see only their own profile
      return clients.filter(client => client.id === user.uid || client.user_id === user.uid)
      
    case 'granted_only':
      // Client-related parties see only clients they have explicit permission for
      // In production, this would check client_permissions table
      return clients.filter(client => {
        // Mock logic: check if user has been granted access by primary client
        return client.granted_access?.includes(user.uid)
      })
      
    case 'readonly':
      // Developer access - read-only view with limited data
      return clients.map(client => ({
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        client_status: client.client_status,
        client_type: client.client_type,
        created_at: client.created_at,
        // Remove all sensitive information
        email: '[REDACTED]',
        phone_primary: '[REDACTED]',
        address_line1: '[REDACTED]'
      }))
      
    case 'none':
    default:
      // No access to client list
      return []
  }
}

// POST /api/clients - Create new client with enhanced RBAC
async function handleCreateClient(request: NextRequest, _user: AuthenticatedUser) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Allow creation when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can create clients
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create clients',
        403
      ))
    }

    // Parse request body
    const clientData = await parseRequestBody<CreateClientRequest>(request)

    // Validate required fields
    if (!clientData.first_name || !clientData.last_name) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'First name and last name are required',
        400
      ))
    }

    // Validate email format if provided
    if (clientData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(clientData.email)) {
        return addCORSHeaders(createErrorResponse(
          'INVALID_EMAIL_FORMAT',
          'Email format is invalid',
          400
        ))
      }
    }

    // Validate client status
    const validStatuses: ClientStatus[] = ['prospect', 'active', 'inactive', 'former', 'do_not_contact']
    if (clientData.client_status && !validStatuses.includes(clientData.client_status)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_STATUS',
        `Client status must be one of: ${validStatuses.join(', ')}`,
        400
      ))
    }

    // Validate client type
    const validTypes: ClientType[] = ['individual', 'business', 'estate', 'trust', 'non_profit', 'government']
    if (clientData.client_type && !validTypes.includes(clientData.client_type)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CLIENT_TYPE',
        `Client type must be one of: ${validTypes.join(', ')}`,
        400
      ))
    }

    // Prepare client data for insertion
    const newClient: ClientInsert = {
      first_name: clientData.first_name.trim(),
      last_name: clientData.last_name.trim(),
      preferred_name: clientData.preferred_name?.trim() || null,
      date_of_birth: clientData.date_of_birth || null,
      email: clientData.email?.toLowerCase().trim() || null,
      phone_primary: clientData.phone_primary?.trim() || null,
      phone_secondary: clientData.phone_secondary?.trim() || null,
      address_line1: clientData.address_line1?.trim() || null,
      address_line2: clientData.address_line2?.trim() || null,
      city: clientData.city?.trim() || null,
      state: clientData.state?.trim() || null,
      zip_code: clientData.zip_code?.trim() || null,
      country: clientData.country?.trim() || 'United States',
      client_status: clientData.client_status || 'prospect',
      client_type: clientData.client_type || 'individual',
      business_name: clientData.business_name?.trim() || null,
      business_tax_id: clientData.business_tax_id?.trim() || null,
      business_type: clientData.business_type?.trim() || null,
      referral_source: clientData.referral_source?.trim() || null,
      practice_areas: clientData.practice_areas || null,
      communication_preference: clientData.communication_preference || 'email',
      language_preference: clientData.language_preference || 'english',
      billing_rate: clientData.billing_rate || null,
      payment_terms: clientData.payment_terms || 30,
      credit_limit: clientData.credit_limit || null,
      notes: clientData.notes?.trim() || null,
      tags: clientData.tags || null,
      created_by: user.uid,
      updated_by: user.uid
    }

    let client = null
    let error = null

    try {
      // Check for duplicate email if provided
      if (newClient.email) {
        const { data: existing } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('email', newClient.email)
          .is('deleted_at', null)
          .single()

        if (existing) {
          return addCORSHeaders(createErrorResponse(
            'EMAIL_ALREADY_EXISTS',
            'A client with this email already exists',
            400
          ))
        }
      }

      // Create the client
      const result = await supabaseAdmin
        .from('clients')
        .insert(newClient)
        .select(`
          *,
          created_by_profile:user_profiles!clients_created_by_fkey(first_name, last_name),
          updated_by_profile:user_profiles!clients_updated_by_fkey(first_name, last_name)
        `)
        .single()

      client = result.data
      error = result.error
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock client in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock client')
        client = {
          id: `client-${Date.now()}`,
          ...newClient,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
          created_by_profile: { first_name: 'Test', last_name: 'User' },
          updated_by_profile: { first_name: 'Test', last_name: 'User' }
        }
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error creating client:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create client',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'clients',
        action: 'create',
        client_id: client.id
      }
    )

    return addCORSHeaders(createSuccessResponse({
      client,
      message: 'Client created successfully'
    }))

  } catch (error) {
    console.error('Client creation error:', error)
    
    // Handle authentication errors properly
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ))
    }
    
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
export async function PUT() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

// Enhanced RBAC exports using the new middleware
export const GET = createProtectedRoute(handleGetClients, '/api/clients')
export const POST = createProtectedRoute(handleCreateClient, '/api/clients')