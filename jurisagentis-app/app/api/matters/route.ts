/**
 * Matters API - List and create matters/cases
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
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware'
import { MatterInsert, MatterStatus, MatterPriority, BillingMethod } from '@/types/database'

interface ListMattersParams {
  client_id?: string
  status?: MatterStatus
  practice_area?: string
  responsible_attorney?: string
  search?: string
  tag?: string
  limit?: number
  offset?: number
}

interface CreateMatterRequest {
  matter_number?: string // If not provided, will be auto-generated
  title: string
  description?: string
  matter_type: string
  practice_area: string
  client_id: string
  status?: MatterStatus
  priority?: MatterPriority
  date_opened?: string
  statute_of_limitations?: string
  next_review_date?: string
  court_name?: string
  case_number?: string
  judge_name?: string
  opposing_counsel?: string
  opposing_party?: string
  hourly_rate?: number
  flat_fee?: number
  retainer_amount?: number
  billing_method?: BillingMethod
  responsible_attorney?: string
  assisting_paralegal?: string
  originating_attorney?: string
  complexity_level?: number
  estimated_hours?: number
  tags?: string[]
  keywords?: string[]
  internal_notes?: string
  client_notes?: string
  custom_fields?: Record<string, unknown>
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can list matters
    if (!['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to list matters',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const params: ListMattersParams = {
      client_id: url.searchParams.get('client_id') || undefined,
      status: url.searchParams.get('status') as MatterStatus || undefined,
      practice_area: url.searchParams.get('practice_area') || undefined,
      responsible_attorney: url.searchParams.get('responsible_attorney') || undefined,
      search: url.searchParams.get('search') || undefined,
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

    // Build query based on user role and permissions
    let query = supabaseAdmin
      .from('matters')
      .select(`
        *,
        client:clients!matters_client_id_fkey(
          id,
          first_name,
          last_name,
          preferred_name,
          business_name,
          client_type,
          email
        ),
        responsible_attorney_profile:user_profiles!matters_responsible_attorney_fkey(
          first_name,
          last_name,
          title
        ),
        assisting_paralegal_profile:user_profiles!matters_assisting_paralegal_fkey(
          first_name,
          last_name,
          title
        ),
        matter_tasks!matter_tasks_matter_id_fkey(
          id,
          title,
          status,
          priority,
          due_date,
          assigned_to
        )
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    // Apply role-based filtering
    if (user.role === 'assistant') {
      // Assistants can only see matters for clients they have access to
      // This is handled by RLS, but we can add additional filtering here if needed
    } else if (['associate_attorney', 'paralegal'].includes(user.role)) {
      // Attorneys and paralegals see matters they're assigned to or involved with
      // RLS handles this, but we can optimize with explicit filtering
      query = query.or(`
        responsible_attorney.eq.${user.uid},
        assisting_paralegal.eq.${user.uid},
        originating_attorney.eq.${user.uid},
        created_by.eq.${user.uid}
      `)
    }
    // Admins see all matters (no additional filtering needed)

    // Apply filters
    if (params.client_id) {
      query = query.eq('client_id', params.client_id)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.practice_area) {
      query = query.eq('practice_area', params.practice_area)
    }

    if (params.responsible_attorney) {
      query = query.eq('responsible_attorney', params.responsible_attorney)
    }

    if (params.search) {
      query = query.or(`
        matter_number.ilike.%${params.search}%,
        title.ilike.%${params.search}%,
        description.ilike.%${params.search}%,
        case_number.ilike.%${params.search}%
      `)
    }

    if (params.tag) {
      query = query.contains('tags', [params.tag])
    }

    // Apply pagination
    if (params.limit) {
      query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1)
    }

    let matters = null
    let error = null
    let count = 0

    try {
      const result = await query
      matters = result.data
      error = result.error
      count = result.count || 0
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock matter data')
        const mockMatters = [
          {
            id: 'matter-1',
            matter_number: '2025-001',
            title: 'Johnson Family Estate Planning',
            description: 'Complete estate planning package including revocable living trust, pour-over will, and powers of attorney',
            matter_type: 'estate_planning',
            practice_area: 'estate_planning',
            status: 'active',
            priority: 'normal',
            date_opened: '2025-01-12',
            client: {
              id: 'client-1',
              first_name: 'John',
              last_name: 'Johnson',
              preferred_name: null,
              business_name: null,
              client_type: 'individual',
              email: 'john.johnson@example.com'
            },
            responsible_attorney_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            matter_tasks: [
              {
                id: 'task-1',
                title: 'Review trust documents',
                status: 'in_progress',
                priority: 'high',
                due_date: '2025-01-20',
                assigned_to: 'Luke Barry'
              },
              {
                id: 'task-2',
                title: 'Schedule client meeting',
                status: 'completed',
                priority: 'normal',
                due_date: '2025-01-15',
                assigned_to: 'Luke Barry'
              }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'matter-2',
            matter_number: '2025-002',
            title: 'TechStart LLC Formation',
            description: 'Standard LLC formation with operating agreement',
            matter_type: 'business_formation',
            practice_area: 'business_law',
            status: 'funding',
            priority: 'high',
            date_opened: '2025-01-09',
            client: {
              id: 'client-2',
              first_name: 'Jane',
              last_name: 'Doe',
              preferred_name: null,
              business_name: 'TechStart Innovations',
              client_type: 'business',
              email: 'jane.doe@techstart.com'
            },
            responsible_attorney_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            matter_tasks: [
              {
                id: 'task-3',
                title: 'File LLC documents',
                status: 'pending',
                priority: 'urgent',
                due_date: '2025-01-18',
                assigned_to: 'Luke Barry'
              }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'matter-3',
            matter_number: '2025-003',
            title: 'Williams Estate Administration',
            description: 'Probate administration for deceased client',
            matter_type: 'estate_planning',
            practice_area: 'probate',
            status: 'active',
            priority: 'normal',
            date_opened: '2025-01-06',
            client: {
              id: 'client-3',
              first_name: 'Robert',
              last_name: 'Williams',
              preferred_name: 'Bob',
              business_name: null,
              client_type: 'individual',
              email: 'bob.williams@example.com'
            },
            responsible_attorney_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            matter_tasks: [
              {
                id: 'task-4',
                title: 'File probate petition',
                status: 'pending',
                priority: 'normal',
                due_date: '2025-01-22',
                assigned_to: 'Luke Barry'
              }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        
        // Apply filters to mock data
        let filteredMatters = mockMatters
        
        if (params.status && params.status !== 'all') {
          filteredMatters = filteredMatters.filter(m => m.status === params.status)
        }
        
        if (params.practice_area && params.practice_area !== 'all') {
          filteredMatters = filteredMatters.filter(m => m.practice_area === params.practice_area)
        }
        
        if (params.search) {
          const search = params.search.toLowerCase()
          filteredMatters = filteredMatters.filter(m => 
            m.matter_number.toLowerCase().includes(search) ||
            m.title.toLowerCase().includes(search) ||
            (m.description && m.description.toLowerCase().includes(search)) ||
            (m.client.first_name && m.client.first_name.toLowerCase().includes(search)) ||
            (m.client.last_name && m.client.last_name.toLowerCase().includes(search)) ||
            (m.client.business_name && m.client.business_name.toLowerCase().includes(search))
          )
        }
        
        // Apply pagination
        const offset = params.offset || 0
        const limit = params.limit || 20
        const paginatedMatters = filteredMatters.slice(offset, offset + limit)
        
        matters = paginatedMatters
        count = filteredMatters.length
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve matters',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'matters',
        action: 'list',
        filters: params,
        result_count: matters?.length || 0
      }
    )

    return addCORSHeaders(createSuccessResponse({
      matters,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
        has_more: count ? (params.offset || 0) + matters.length < count : false
      }
    }))

  } catch (error) {
    console.error('Matters list error:', error)
    
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

    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Allow creation when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can create matters
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create matters',
        403
      ))
    }

    // Parse request body
    const matterData = await parseRequestBody<CreateMatterRequest>(request)

    // Validate required fields
    if (!matterData.title || !matterData.matter_type || !matterData.practice_area || !matterData.client_id) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Title, matter type, practice area, and client ID are required',
        400
      ))
    }

    // Validate client exists and user has access
    let client = null
    let clientError = null

    try {
      const result = await supabaseAdmin
        .from('clients')
        .select('id, first_name, last_name, business_name')
        .eq('id', matterData.client_id)
        .is('deleted_at', null)
        .single()
      
      client = result.data
      clientError = result.error
      
      // Check if database connection failed
      if (clientError && clientError.message && clientError.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock client in development
      if (isDevelopment && ['client-1', 'client-2', 'client-3'].includes(matterData.client_id)) {
        const mockClients = {
          'client-1': { id: 'client-1', first_name: 'John', last_name: 'Johnson', business_name: null },
          'client-2': { id: 'client-2', first_name: 'Jane', last_name: 'Doe', business_name: 'TechStart Innovations' },
          'client-3': { id: 'client-3', first_name: 'Robert', last_name: 'Williams', business_name: null }
        }
        client = mockClients[matterData.client_id as keyof typeof mockClients]
        clientError = null
      } else {
        clientError = dbError
      }
    }

    if (clientError || !client) {
      return addCORSHeaders(createErrorResponse(
        'CLIENT_NOT_FOUND',
        'Client not found or access denied',
        404
      ))
    }

    // Generate matter number if not provided
    let matterNumber = matterData.matter_number
    if (!matterNumber) {
      // Extract practice area code for matter number generation
      const practiceAreaCodes: { [key: string]: string } = {
        'estate_planning': 'EST',
        'trusts': 'TRS',
        'wills': 'WIL',
        'business_law': 'BUS',
        'litigation': 'LIT',
        'real_estate': 'REL',
        'contracts': 'CON',
        'corporate': 'CRP',
        'tax': 'TAX',
        'employment': 'EMP'
      }
      
      const areaCode = practiceAreaCodes[matterData.practice_area] || 'GEN'
      
      // Call the database function to generate matter number
      try {
        const { data: generatedNumber, error: numberError } = await supabaseAdmin
          .rpc('generate_matter_number', { practice_area_code: areaCode })

        if (numberError || !generatedNumber) {
          throw new Error('Failed to generate matter number')
        }

        matterNumber = generatedNumber
      } catch (error) {
        // In development mode, generate a simple matter number
        if (isDevelopment) {
          matterNumber = `${areaCode}-${Date.now()}`
        } else {
          console.error('Error generating matter number:', error)
          return addCORSHeaders(createErrorResponse(
            'GENERATION_ERROR',
            'Failed to generate matter number',
            500
          ))
        }
      }
    } else {
      // Check if matter number is unique
      const { data: existing } = await supabaseAdmin
        .from('matters')
        .select('id')
        .eq('matter_number', matterNumber)
        .single()

      if (existing) {
        return addCORSHeaders(createErrorResponse(
          'MATTER_NUMBER_EXISTS',
          'Matter number already exists',
          400
        ))
      }
    }

    // Validate assignees exist if provided
    if (matterData.responsible_attorney) {
      const { data: attorney } = await supabaseAdmin
        .from('user_profiles')
        .select('uid')
        .eq('uid', matterData.responsible_attorney)
        .in('role', ['admin', 'associate_attorney'])
        .single()

      if (!attorney) {
        return addCORSHeaders(createErrorResponse(
          'INVALID_ATTORNEY',
          'Responsible attorney not found or invalid role',
          400
        ))
      }
    }

    if (matterData.assisting_paralegal) {
      const { data: paralegal } = await supabaseAdmin
        .from('user_profiles')
        .select('uid')
        .eq('uid', matterData.assisting_paralegal)
        .in('role', ['admin', 'associate_attorney', 'paralegal'])
        .single()

      if (!paralegal) {
        return addCORSHeaders(createErrorResponse(
          'INVALID_PARALEGAL',
          'Assisting paralegal not found or invalid role',
          400
        ))
      }
    }

    // Prepare matter data for insertion
    const newMatter: MatterInsert = {
      matter_number: matterNumber,
      title: matterData.title.trim(),
      description: matterData.description?.trim() || null,
      matter_type: matterData.matter_type.trim(),
      practice_area: matterData.practice_area.trim(),
      client_id: matterData.client_id,
      status: matterData.status || 'new',
      priority: matterData.priority || 'normal',
      date_opened: matterData.date_opened || new Date().toISOString().split('T')[0],
      statute_of_limitations: matterData.statute_of_limitations || null,
      next_review_date: matterData.next_review_date || null,
      court_name: matterData.court_name?.trim() || null,
      case_number: matterData.case_number?.trim() || null,
      judge_name: matterData.judge_name?.trim() || null,
      opposing_counsel: matterData.opposing_counsel?.trim() || null,
      opposing_party: matterData.opposing_party?.trim() || null,
      hourly_rate: matterData.hourly_rate || null,
      flat_fee: matterData.flat_fee || null,
      retainer_amount: matterData.retainer_amount || null,
      billing_method: matterData.billing_method || 'hourly',
      responsible_attorney: matterData.responsible_attorney || null,
      assisting_paralegal: matterData.assisting_paralegal || null,
      originating_attorney: matterData.originating_attorney || null,
      complexity_level: matterData.complexity_level || null,
      estimated_hours: matterData.estimated_hours || null,
      tags: matterData.tags || null,
      keywords: matterData.keywords || null,
      internal_notes: matterData.internal_notes?.trim() || null,
      client_notes: matterData.client_notes?.trim() || null,
      custom_fields: matterData.custom_fields || null,
      created_by: user.uid,
      updated_by: user.uid
    }

    // Create the matter
    let matter = null
    let error = null

    try {
      const result = await supabaseAdmin
        .from('matters')
        .insert(newMatter)
        .select(`
          *,
          client:clients!matters_client_id_fkey(
            id,
            first_name,
            last_name,
            preferred_name,
            business_name,
            client_type,
            email
          ),
          responsible_attorney_profile:user_profiles!matters_responsible_attorney_fkey(
            first_name,
            last_name,
            title
          )
        `)
        .single()

      matter = result.data
      error = result.error
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - create mock matter in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock matter')
        matter = {
          id: `matter-${Date.now()}`,
          ...newMatter,
          client,
          responsible_attorney_profile: { first_name: 'Test', last_name: 'User', title: 'Attorney' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null
        }
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error creating matter:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create matter',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'matters',
        action: 'create',
        matter_id: matter.id, 
        matter_number: matter.matter_number
      }
    )

    return addCORSHeaders(createSuccessResponse({
      matter,
      message: 'Matter created successfully'
    }))

  } catch (error) {
    console.error('Matter creation error:', error)
    
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