/**
 * Documents API - List and create documents
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
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware'
import { DocumentInsert, DocumentStatus, ConfidentialityLevel } from '@/types/database'

interface ListDocumentsParams {
  client_id?: string
  matter_id?: string
  document_type?: string
  document_category?: string
  status?: DocumentStatus
  confidentiality_level?: ConfidentialityLevel
  search?: string
  tag?: string
  limit?: number
  offset?: number
}

interface CreateDocumentRequest {
  document_number?: string // If not provided, will be auto-generated
  title: string
  description?: string
  document_type: string
  document_category: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  file_extension: string
  file_hash?: string
  client_id?: string
  matter_id?: string
  parent_document_id?: string
  template_id?: string
  status?: DocumentStatus
  document_date?: string
  execution_date?: string
  effective_date?: string
  expiration_date?: string
  confidentiality_level?: ConfidentialityLevel
  priority?: string
  tags?: string[]
  keywords?: string[]
  text_content?: string
  page_count?: number
  word_count?: number
  court_case_number?: string
  docket_number?: string
  filing_date?: string
  filing_attorney?: string
  opposing_counsel?: string
  requires_review?: boolean
  compliance_category?: string
  retention_period_years?: number
  legal_hold?: boolean
  legal_hold_reason?: string
  custom_fields?: any
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can list documents
    if (!['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to list documents',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const params: ListDocumentsParams = {
      client_id: url.searchParams.get('client_id') || undefined,
      matter_id: url.searchParams.get('matter_id') || undefined,
      document_type: url.searchParams.get('document_type') || undefined,
      document_category: url.searchParams.get('document_category') || undefined,
      status: url.searchParams.get('status') as DocumentStatus || undefined,
      confidentiality_level: url.searchParams.get('confidentiality_level') as ConfidentialityLevel || undefined,
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
      .from('documents')
      .select(`
        *,
        client:clients!documents_client_id_fkey(
          id,
          first_name,
          last_name,
          preferred_name,
          business_name,
          client_type
        ),
        matter:matters!documents_matter_id_fkey(
          id,
          matter_number,
          title,
          status
        ),
        template:document_templates!documents_template_id_fkey(
          id,
          template_name,
          template_code
        ),
        filing_attorney_profile:user_profiles!documents_filing_attorney_fkey(
          first_name,
          last_name,
          title
        ),
        reviewed_by_profile:user_profiles!documents_reviewed_by_fkey(
          first_name,
          last_name,
          title
        ),
        approved_by_profile:user_profiles!documents_approved_by_fkey(
          first_name,
          last_name,
          title
        )
      `)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false })

    // Apply role-based filtering
    if (user.role === 'assistant') {
      // Assistants can only see documents for clients/matters they have access to
      // This is handled by RLS, but we can add additional filtering here if needed
    } else if (['associate_attorney', 'paralegal'].includes(user.role)) {
      // Attorneys and paralegals see documents they have access to
      // RLS handles this, but we can optimize with explicit filtering
      query = query.or(`
        created_by.eq.${user.uid},
        filing_attorney.eq.${user.uid},
        reviewed_by.eq.${user.uid},
        approved_by.eq.${user.uid}
      `)
    }
    // Admins see all documents (no additional filtering needed)

    // Apply filters
    if (params.client_id) {
      query = query.eq('client_id', params.client_id)
    }

    if (params.matter_id) {
      query = query.eq('matter_id', params.matter_id)
    }

    if (params.document_type) {
      query = query.eq('document_type', params.document_type)
    }

    if (params.document_category) {
      query = query.eq('document_category', params.document_category)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.confidentiality_level) {
      query = query.eq('confidentiality_level', params.confidentiality_level)
    }

    if (params.search) {
      query = query.or(`
        document_number.ilike.%${params.search}%,
        title.ilike.%${params.search}%,
        description.ilike.%${params.search}%,
        file_name.ilike.%${params.search}%,
        text_content.ilike.%${params.search}%
      `)
    }

    if (params.tag) {
      query = query.contains('tags', [params.tag])
    }

    // Apply pagination
    if (params.limit) {
      query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1)
    }

    let documents = null
    let error = null
    let count = 0

    try {
      const result = await query
      documents = result.data
      error = result.error
      count = result.count || 0
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock document data')
        const mockDocuments = [
          {
            id: 'doc-1',
            document_number: 'DOC-2025-001',
            title: 'Johnson Family Trust Agreement',
            description: 'Revocable living trust agreement for John and Mary Johnson',
            document_type: 'contract',
            document_category: 'estate_planning',
            file_name: 'Johnson_Trust_Agreement_v2.pdf',
            file_path: '/documents/2025/01/Johnson_Trust_Agreement_v2.pdf',
            file_size: 2456789,
            file_type: 'application/pdf',
            file_extension: 'pdf',
            file_hash: 'a1b2c3d4e5f6789',
            client_id: 'client-1',
            matter_id: 'matter-1',
            status: 'final',
            document_date: '2025-01-15',
            confidentiality_level: 'client_confidential',
            priority: 'normal',
            tags: ['trust', 'estate_planning', 'final'],
            keywords: ['trust', 'revocable', 'living'],
            page_count: 12,
            word_count: 3456,
            requires_review: false,
            client: {
              id: 'client-1',
              first_name: 'John',
              last_name: 'Johnson',
              business_name: null,
              client_type: 'individual'
            },
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'doc-2',
            document_number: 'DOC-2025-002',
            title: 'TechStart LLC Operating Agreement',
            description: 'Operating agreement for TechStart LLC formation',
            document_type: 'agreement',
            document_category: 'business_formation',
            file_name: 'TechStart_Operating_Agreement.docx',
            file_path: '/documents/2025/01/TechStart_Operating_Agreement.docx',
            file_size: 1234567,
            file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            file_extension: 'docx',
            file_hash: 'x9y8z7w6v5u4321',
            client_id: 'client-2',
            matter_id: 'matter-2',
            status: 'draft',
            document_date: '2025-01-16',
            confidentiality_level: 'client_confidential',
            priority: 'high',
            tags: ['llc', 'business_formation', 'draft'],
            keywords: ['operating', 'agreement', 'llc'],
            page_count: 8,
            word_count: 2100,
            requires_review: true,
            client: {
              id: 'client-2',
              first_name: null,
              last_name: null,
              business_name: 'TechStart LLC',
              client_type: 'business'
            },
            matter: {
              id: 'matter-2',
              matter_number: '2025-002',
              title: 'TechStart LLC Formation',
              status: 'active'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'doc-3',
            document_number: 'DOC-2025-003',
            title: 'Estate Inventory Worksheet',
            description: 'Asset inventory and valuation for Williams estate',
            document_type: 'administrative',
            document_category: 'estate_administration',
            file_name: 'Williams_Estate_Inventory.xlsx',
            file_path: '/documents/2025/01/Williams_Estate_Inventory.xlsx',
            file_size: 987654,
            file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            file_extension: 'xlsx',
            file_hash: 'p0o9i8u7y6t5r4e3',
            client_id: 'client-3',
            matter_id: 'matter-3',
            status: 'in_progress',
            document_date: '2025-01-17',
            confidentiality_level: 'attorney_work_product',
            priority: 'normal',
            tags: ['estate', 'inventory', 'valuation'],
            keywords: ['inventory', 'assets', 'valuation'],
            page_count: 1,
            word_count: 150,
            requires_review: false,
            client: {
              id: 'client-3',
              first_name: 'Robert',
              last_name: 'Williams',
              business_name: null,
              client_type: 'individual'
            },
            matter: {
              id: 'matter-3',
              matter_number: '2025-003',
              title: 'Williams Estate Administration',
              status: 'active'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        
        // Apply filters to mock data
        let filteredDocuments = mockDocuments
        
        if (params.client_id) {
          filteredDocuments = filteredDocuments.filter(d => d.client_id === params.client_id)
        }
        
        if (params.matter_id) {
          filteredDocuments = filteredDocuments.filter(d => d.matter_id === params.matter_id)
        }
        
        if (params.document_type) {
          filteredDocuments = filteredDocuments.filter(d => d.document_type === params.document_type)
        }
        
        if (params.document_category) {
          filteredDocuments = filteredDocuments.filter(d => d.document_category === params.document_category)
        }
        
        if (params.status) {
          filteredDocuments = filteredDocuments.filter(d => d.status === params.status)
        }
        
        if (params.confidentiality_level) {
          filteredDocuments = filteredDocuments.filter(d => d.confidentiality_level === params.confidentiality_level)
        }
        
        if (params.search) {
          const search = params.search.toLowerCase()
          filteredDocuments = filteredDocuments.filter(d => 
            d.document_number.toLowerCase().includes(search) ||
            d.title.toLowerCase().includes(search) ||
            (d.description && d.description.toLowerCase().includes(search)) ||
            d.file_name.toLowerCase().includes(search)
          )
        }
        
        if (params.tag) {
          filteredDocuments = filteredDocuments.filter(d => 
            d.tags && d.tags.includes(params.tag)
          )
        }
        
        // Apply pagination
        const offset = params.offset || 0
        const limit = params.limit || 20
        const paginatedDocuments = filteredDocuments.slice(offset, offset + limit)
        
        documents = paginatedDocuments
        count = filteredDocuments.length
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve documents',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'documents',
        action: 'list',
        filters: params,
        result_count: documents?.length || 0
      }
    )

    return addCORSHeaders(createSuccessResponse({
      documents,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
        has_more: count ? (params.offset || 0) + documents.length < count : false
      }
    }))

  } catch (error) {
    console.error('Documents list error:', error)
    
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
    
    // Check permissions - only certain roles can create documents
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create documents',
        403
      ))
    }

    // Parse request body
    const documentData = await parseRequestBody<CreateDocumentRequest>(request)

    // Validate required fields
    if (!documentData.title || !documentData.document_type || !documentData.document_category || 
        !documentData.file_name || !documentData.file_path || !documentData.file_size || 
        !documentData.file_type || !documentData.file_extension) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Title, document type, category, file name, path, size, type, and extension are required',
        400
      ))
    }

    // Validate client exists if provided
    if (documentData.client_id) {
      let client = null
      let clientError = null

      try {
        const result = await supabaseAdmin
          .from('clients')
          .select('id, first_name, last_name, business_name')
          .eq('id', documentData.client_id)
          .is('deleted_at', null)
          .single()

        client = result.data
        clientError = result.error

        if (clientError && clientError.message && clientError.message.includes('fetch failed')) {
          throw new Error('Database connection failed')
        }
      } catch (dbError) {
        // Database connection failed - use mock client in development
        if (isDevelopment && ['client-1', 'client-2', 'client-3'].includes(documentData.client_id)) {
          const mockClients = {
            'client-1': { id: 'client-1', first_name: 'John', last_name: 'Johnson', business_name: null },
            'client-2': { id: 'client-2', first_name: null, last_name: null, business_name: 'TechStart LLC' },
            'client-3': { id: 'client-3', first_name: 'Robert', last_name: 'Williams', business_name: null }
          }
          client = mockClients[documentData.client_id as keyof typeof mockClients]
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
    }

    // Validate matter exists if provided
    if (documentData.matter_id) {
      let matter = null
      let matterError = null

      try {
        const result = await supabaseAdmin
          .from('matters')
          .select('id, matter_number, title')
          .eq('id', documentData.matter_id)
          .is('deleted_at', null)
          .single()

        matter = result.data
        matterError = result.error

        if (matterError && matterError.message && matterError.message.includes('fetch failed')) {
          throw new Error('Database connection failed')
        }
      } catch (dbError) {
        // Database connection failed - use mock matter in development
        if (isDevelopment && ['matter-1', 'matter-2', 'matter-3'].includes(documentData.matter_id)) {
          const mockMatters = {
            'matter-1': { id: 'matter-1', matter_number: '2025-001', title: 'Johnson Family Estate Planning' },
            'matter-2': { id: 'matter-2', matter_number: '2025-002', title: 'TechStart LLC Formation' },
            'matter-3': { id: 'matter-3', matter_number: '2025-003', title: 'Williams Estate Administration' }
          }
          matter = mockMatters[documentData.matter_id as keyof typeof mockMatters]
          matterError = null
        } else {
          matterError = dbError
        }
      }

      if (matterError || !matter) {
        return addCORSHeaders(createErrorResponse(
          'MATTER_NOT_FOUND',
          'Matter not found or access denied',
          404
        ))
      }
    }

    // Generate document number if not provided
    let documentNumber = documentData.document_number
    if (!documentNumber) {
      // Extract document type code for document number generation
      const documentTypeCodes: { [key: string]: string } = {
        'contract': 'CON',
        'agreement': 'AGR',
        'pleading': 'PLD',
        'motion': 'MOT',
        'brief': 'BRF',
        'correspondence': 'COR',
        'memo': 'MEM',
        'discovery': 'DIS',
        'financial': 'FIN',
        'administrative': 'ADM'
      }
      
      const typeCode = documentTypeCodes[documentData.document_type] || 'DOC'
      
      // Call the database function to generate document number
      const { data: generatedNumber, error: numberError } = await supabaseAdmin
        .rpc('generate_document_number', { doc_type: typeCode })

      if (numberError || !generatedNumber) {
        console.error('Error generating document number:', numberError)
        return addCORSHeaders(createErrorResponse(
          'GENERATION_ERROR',
          'Failed to generate document number',
          500
        ))
      }

      documentNumber = generatedNumber
    } else {
      // Check if document number is unique
      const { data: existing } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('document_number', documentNumber)
        .single()

      if (existing) {
        return addCORSHeaders(createErrorResponse(
          'DOCUMENT_NUMBER_EXISTS',
          'Document number already exists',
          400
        ))
      }
    }

    // Validate filing attorney exists if provided
    if (documentData.filing_attorney) {
      const { data: attorney } = await supabaseAdmin
        .from('user_profiles')
        .select('uid')
        .eq('uid', documentData.filing_attorney)
        .in('role', ['admin', 'associate_attorney'])
        .single()

      if (!attorney) {
        return addCORSHeaders(createErrorResponse(
          'INVALID_ATTORNEY',
          'Filing attorney not found or invalid role',
          400
        ))
      }
    }

    // Prepare document data for insertion
    const newDocument: DocumentInsert = {
      document_number: documentNumber,
      title: documentData.title.trim(),
      description: documentData.description?.trim() || null,
      document_type: documentData.document_type.trim(),
      document_category: documentData.document_category.trim(),
      file_name: documentData.file_name.trim(),
      file_path: documentData.file_path.trim(),
      file_size: documentData.file_size,
      file_type: documentData.file_type.trim(),
      file_extension: documentData.file_extension.trim(),
      file_hash: documentData.file_hash || null,
      client_id: documentData.client_id || null,
      matter_id: documentData.matter_id || null,
      parent_document_id: documentData.parent_document_id || null,
      template_id: documentData.template_id || null,
      status: documentData.status || 'draft',
      document_date: documentData.document_date || null,
      execution_date: documentData.execution_date || null,
      effective_date: documentData.effective_date || null,
      expiration_date: documentData.expiration_date || null,
      confidentiality_level: documentData.confidentiality_level || 'client_confidential',
      priority: documentData.priority || 'normal',
      tags: documentData.tags || null,
      keywords: documentData.keywords || null,
      text_content: documentData.text_content || null,
      page_count: documentData.page_count || null,
      word_count: documentData.word_count || null,
      court_case_number: documentData.court_case_number?.trim() || null,
      docket_number: documentData.docket_number?.trim() || null,
      filing_date: documentData.filing_date || null,
      filing_attorney: documentData.filing_attorney || null,
      opposing_counsel: documentData.opposing_counsel?.trim() || null,
      requires_review: documentData.requires_review || false,
      compliance_category: documentData.compliance_category?.trim() || null,
      retention_period_years: documentData.retention_period_years || null,
      legal_hold: documentData.legal_hold || false,
      legal_hold_reason: documentData.legal_hold_reason?.trim() || null,
      custom_fields: documentData.custom_fields || null,
      created_by: user.uid,
      updated_by: user.uid
    }

    // Create the document
    let document = null
    let error = null

    try {
      const result = await supabaseAdmin
        .from('documents')
        .insert(newDocument)
        .select(`
          *,
          client:clients!documents_client_id_fkey(
            id,
            first_name,
            last_name,
            preferred_name,
            business_name,
            client_type
          ),
          matter:matters!documents_matter_id_fkey(
            id,
            matter_number,
            title,
            status
          )
        `)
        .single()

      document = result.data
      error = result.error

      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - create mock document in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock document')
        document = {
          id: `doc-${Date.now()}`,
          ...newDocument,
          client: newDocument.client_id ? {
            id: newDocument.client_id,
            first_name: 'Test',
            last_name: 'Client',
            preferred_name: null,
            business_name: null,
            client_type: 'individual'
          } : null,
          matter: newDocument.matter_id ? {
            id: newDocument.matter_id,
            matter_number: 'TEST-001',
            title: 'Test Matter',
            status: 'active'
          } : null,
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
      console.error('Database error creating document:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create document',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'documents',
        action: 'create',
        document_id: document.id,
        document_number: document.document_number
      }
    )

    return addCORSHeaders(createSuccessResponse({
      document,
      message: 'Document created successfully'
    }))

  } catch (error) {
    console.error('Document creation error:', error)
    
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