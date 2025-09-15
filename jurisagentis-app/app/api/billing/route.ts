/**
 * Billing API - Comprehensive invoice and payment management
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

interface ListInvoicesParams {
  matter_id?: string
  client_id?: string
  status?: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue'
  type?: 'retainer' | 'service_fee' | 'final_bill' | 'expense_reimbursement'
  date_from?: string
  date_to?: string
  overdue_only?: boolean
  limit?: number
  offset?: number
}

interface CreateInvoiceRequest {
  matter_id: string
  client_id: string
  invoice_date: string
  due_date: string
  description?: string
  type: 'retainer' | 'service_fee' | 'final_bill' | 'expense_reimbursement'
  line_items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
    type: 'service_fee' | 'expense' | 'retainer' | 'discount'
    date?: string
  }>
  payment_terms?: number
  late_fee_rate?: number
  notes?: string
  discount_amount?: number
  tax_rate?: number
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can list invoices
    if (!['admin', 'associate_attorney', 'billing_admin'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to list invoices',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const params: ListInvoicesParams = {
      matter_id: url.searchParams.get('matter_id') || undefined,
      client_id: url.searchParams.get('client_id') || undefined,
      status: url.searchParams.get('status') as ListInvoicesParams['status'] || undefined,
      type: url.searchParams.get('type') as ListInvoicesParams['type'] || undefined,
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
      overdue_only: url.searchParams.get('overdue_only') === 'true',
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

    let invoices = null
    let error = null

    try {
      // Build query
      let query = supabaseAdmin
        .from('invoices')
        .select(`
          *,
          matter:matters!invoices_matter_id_fkey(
            id,
            matter_number,
            title,
            status
          ),
          client:clients!invoices_client_id_fkey(
            id,
            first_name,
            last_name,
            company_name,
            email
          )
        `)
        .is('deleted_at', null)
        .order('invoice_date', { ascending: false })

      // Apply role-based filtering
      if (user.role === 'associate_attorney') {
        // Attorneys see invoices for matters they're assigned to
        query = query.in('matter_id', []) // Would be populated with user's matters
      }
      // Admins and billing admins see all invoices

      // Apply filters
      if (params.matter_id) {
        query = query.eq('matter_id', params.matter_id)
      }

      if (params.client_id) {
        query = query.eq('client_id', params.client_id)
      }

      if (params.status) {
        query = query.eq('status', params.status)
      }

      if (params.type) {
        query = query.eq('type', params.type)
      }

      if (params.date_from) {
        query = query.gte('invoice_date', params.date_from)
      }

      if (params.date_to) {
        query = query.lte('invoice_date', params.date_to)
      }

      if (params.overdue_only) {
        const today = new Date().toISOString().split('T')[0]
        query = query.lt('due_date', today).neq('status', 'paid').gt('balance_due', 0)
      }

      // Apply pagination
      if (params.limit) {
        query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1)
      }

      const result = await query
      invoices = result.data
      error = result.error
      
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock invoice data')
        const mockInvoices = [
          {
            id: 'inv-1',
            invoice_number: 'INV-2025-001',
            matter_id: 'matter-1',
            client_id: 'client-1',
            invoice_date: '2025-01-01',
            due_date: '2025-01-31',
            status: 'partial_payment',
            type: 'retainer',
            description: 'Estate planning retainer - comprehensive trust and will preparation',
            subtotal: 5000.00,
            discount_amount: 0.00,
            tax_amount: 0.00,
            total_amount: 5000.00,
            amount_paid: 2500.00,
            balance_due: 2500.00,
            payment_terms: 30,
            late_fee_rate: 1.5,
            notes: null,
            line_items: [
              {
                id: '1',
                description: 'Estate Planning Retainer',
                quantity: 1,
                rate: 5000.00,
                amount: 5000.00,
                type: 'retainer'
              }
            ],
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            client: {
              id: 'client-1',
              first_name: 'John',
              last_name: 'Smith',
              company_name: null,
              email: 'john.smith@example.com'
            },
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-05T12:00:00Z'
          },
          {
            id: 'inv-2',
            invoice_number: 'INV-2025-002',
            matter_id: 'matter-1',
            client_id: 'client-1',
            invoice_date: '2025-01-15',
            due_date: '2025-02-15',
            status: 'sent',
            type: 'service_fee',
            description: 'Additional services - trust funding assistance',
            subtotal: 1200.00,
            discount_amount: 0.00,
            tax_amount: 0.00,
            total_amount: 1200.00,
            amount_paid: 0.00,
            balance_due: 1200.00,
            payment_terms: 30,
            late_fee_rate: 1.5,
            notes: null,
            line_items: [
              {
                id: '1',
                description: 'Trust Funding Consultation',
                quantity: 3,
                rate: 300.00,
                amount: 900.00,
                type: 'service_fee',
                date: '2025-01-10'
              },
              {
                id: '2',
                description: 'Document Preparation - Asset Transfers',
                quantity: 1,
                rate: 300.00,
                amount: 300.00,
                type: 'service_fee',
                date: '2025-01-12'
              }
            ],
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            client: {
              id: 'client-1',
              first_name: 'John',
              last_name: 'Smith',
              company_name: null,
              email: 'john.smith@example.com'
            },
            created_at: '2025-01-15T00:00:00Z',
            updated_at: '2025-01-15T00:00:00Z'
          },
          {
            id: 'inv-3',
            invoice_number: 'INV-2025-003',
            matter_id: 'matter-2',
            client_id: 'client-2',
            invoice_date: '2025-01-10',
            due_date: '2025-01-20',
            status: 'overdue',
            type: 'service_fee',
            description: 'Business formation services',
            subtotal: 2500.00,
            discount_amount: 250.00,
            tax_amount: 0.00,
            total_amount: 2250.00,
            amount_paid: 0.00,
            balance_due: 2250.00,
            payment_terms: 10,
            late_fee_rate: 2.0,
            notes: 'LLC formation and operating agreement',
            line_items: [
              {
                id: '1',
                description: 'LLC Formation Services',
                quantity: 1,
                rate: 1500.00,
                amount: 1500.00,
                type: 'service_fee'
              },
              {
                id: '2',
                description: 'Operating Agreement Drafting',
                quantity: 1,
                rate: 1000.00,
                amount: 1000.00,
                type: 'service_fee'
              },
              {
                id: '3',
                description: 'Early Payment Discount',
                quantity: 1,
                rate: -250.00,
                amount: -250.00,
                type: 'discount'
              }
            ],
            matter: {
              id: 'matter-2',
              matter_number: '2025-002',
              title: 'TechStart LLC Formation',
              status: 'active'
            },
            client: {
              id: 'client-2',
              first_name: 'Sarah',
              last_name: 'Williams',
              company_name: 'TechStart Inc.',
              email: 'sarah@techstart.com'
            },
            created_at: '2025-01-10T00:00:00Z',
            updated_at: '2025-01-10T00:00:00Z'
          }
        ]
        
        // Apply filters to mock data
        let filteredInvoices = mockInvoices
        
        if (params.matter_id) {
          filteredInvoices = filteredInvoices.filter(inv => inv.matter_id === params.matter_id)
        }
        
        if (params.client_id) {
          filteredInvoices = filteredInvoices.filter(inv => inv.client_id === params.client_id)
        }
        
        if (params.status) {
          filteredInvoices = filteredInvoices.filter(inv => inv.status === params.status)
        }
        
        if (params.type) {
          filteredInvoices = filteredInvoices.filter(inv => inv.type === params.type)
        }
        
        if (params.overdue_only) {
          const today = new Date().toISOString().split('T')[0]
          filteredInvoices = filteredInvoices.filter(inv => 
            inv.due_date < today && inv.balance_due > 0 && inv.status !== 'paid'
          )
        }
        
        // Apply pagination
        const offset = params.offset || 0
        const limit = params.limit || 20
        const paginatedInvoices = filteredInvoices.slice(offset, offset + limit)
        
        invoices = paginatedInvoices
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve invoices',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'invoices',
        action: 'list',
        filters: params,
        result_count: invoices?.length || 0
      }
    )

    return addCORSHeaders(createSuccessResponse({
      invoices,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: invoices?.length || 0,
        has_more: false // Would calculate based on total count
      }
    }))

  } catch (error) {
    console.error('Invoices list error:', error)
    
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
    
    // Check permissions - only certain roles can create invoices
    if (!['admin', 'billing_admin', 'associate_attorney'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create invoices',
        403
      ))
    }

    // Parse request body
    const invoiceData = await parseRequestBody<CreateInvoiceRequest>(request)

    // Validate required fields
    if (!invoiceData.matter_id || !invoiceData.client_id || !invoiceData.line_items || invoiceData.line_items.length === 0) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Matter ID, client ID, and line items are required',
        400
      ))
    }

    // Calculate totals
    const subtotal = invoiceData.line_items.reduce((sum, item) => sum + item.amount, 0)
    const discount_amount = invoiceData.discount_amount || 0
    const tax_amount = invoiceData.tax_rate ? (subtotal - discount_amount) * (invoiceData.tax_rate / 100) : 0
    const total_amount = subtotal - discount_amount + tax_amount

    // Generate invoice number
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // Prepare invoice data for insertion
    const newInvoice = {
      invoice_number: invoiceNumber,
      matter_id: invoiceData.matter_id,
      client_id: invoiceData.client_id,
      invoice_date: invoiceData.invoice_date,
      due_date: invoiceData.due_date,
      status: 'draft' as const,
      type: invoiceData.type,
      description: invoiceData.description || null,
      subtotal,
      discount_amount,
      tax_amount,
      total_amount,
      amount_paid: 0,
      balance_due: total_amount,
      payment_terms: invoiceData.payment_terms || 30,
      late_fee_rate: invoiceData.late_fee_rate || 1.5,
      notes: invoiceData.notes || null,
      line_items: invoiceData.line_items,
      created_by: user.uid
    }

    let invoice = null
    let error = null

    try {
      const result = await supabaseAdmin
        .from('invoices')
        .insert(newInvoice)
        .select(`
          *,
          matter:matters!invoices_matter_id_fkey(
            id,
            matter_number,
            title,
            status
          ),
          client:clients!invoices_client_id_fkey(
            id,
            first_name,
            last_name,
            company_name,
            email
          )
        `)
        .single()

      invoice = result.data
      error = result.error
      
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - create mock invoice in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock invoice')
        invoice = {
          id: `inv-${Date.now()}`,
          ...newInvoice,
          matter: {
            id: invoiceData.matter_id,
            matter_number: '2025-001',
            title: 'Mock Matter',
            status: 'active'
          },
          client: {
            id: invoiceData.client_id,
            first_name: 'Test',
            last_name: 'Client',
            company_name: null,
            email: 'test@example.com'
          },
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
      console.error('Database error creating invoice:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create invoice',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'invoices',
        action: 'create',
        invoice_id: invoice.id,
        matter_id: invoice.matter_id,
        client_id: invoice.client_id,
        total_amount: invoice.total_amount
      }
    )

    return addCORSHeaders(createSuccessResponse({
      invoice,
      message: 'Invoice created successfully'
    }))

  } catch (error) {
    console.error('Invoice creation error:', error)
    
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