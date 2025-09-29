import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface AccountingProvider {
  id: string
  name: string
  type: 'quickbooks' | 'xero' | 'freshbooks'
  user_id: string
  company_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  base_url: string
  sync_enabled: boolean
  last_sync: string
  created_at: string
  updated_at: string
  settings: {
    auto_sync_invoices: boolean
    auto_sync_payments: boolean
    auto_sync_expenses: boolean
    auto_sync_clients: boolean
    sync_frequency: 'real-time' | 'hourly' | 'daily' | 'weekly'
    default_income_account: string
    default_expense_account: string
    default_tax_rate: number
    invoice_prefix: string
    payment_terms: string
  }
}

interface AccountingInvoice {
  id: string
  provider_id: string
  external_id: string
  invoice_number: string
  client_id: string
  client_name: string
  client_email: string
  case_id?: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  currency: string
  line_items: Array<{
    id: string
    description: string
    quantity: number
    rate: number
    amount: number
    tax_rate?: number
    account_id?: string
  }>
  payments: Array<{
    id: string
    date: string
    amount: number
    method: string
    reference?: string
  }>
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
  last_synced?: string
}

interface AccountingClient {
  id: string
  provider_id: string
  external_id: string
  name: string
  email?: string
  phone?: string
  billing_address?: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  payment_terms?: string
  tax_id?: string
  currency: string
  balance: number
  credit_limit?: number
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
  last_synced?: string
}

interface SyncResult {
  provider_id: string
  sync_type: 'full' | 'incremental'
  sync_started: string
  sync_completed: string
  invoices_synced: number
  clients_synced: number
  payments_synced: number
  expenses_synced: number
  errors: Array<{
    type: string
    id: string
    error: string
    details: string
  }>
  status: 'success' | 'partial' | 'failed'
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  meta?: {
    version: string
    timestamp: string
    request_id: string
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Mock accounting providers
const mockProviders: AccountingProvider[] = [
  {
    id: '1',
    name: 'QuickBooks Online - Main Company',
    type: 'quickbooks',
    user_id: '1',
    company_id: 'qb_company_123456789',
    access_token: 'qb_access_token_mock',
    refresh_token: 'qb_refresh_token_mock',
    expires_at: '2024-12-31T23:59:59Z',
    base_url: 'https://sandbox-quickbooks.api.intuit.com',
    sync_enabled: true,
    last_sync: '2024-03-01T10:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    settings: {
      auto_sync_invoices: true,
      auto_sync_payments: true,
      auto_sync_expenses: false,
      auto_sync_clients: true,
      sync_frequency: 'daily',
      default_income_account: 'Legal Services Income',
      default_expense_account: 'Operating Expenses',
      default_tax_rate: 8.25,
      invoice_prefix: 'JA-',
      payment_terms: 'Net 30'
    }
  }
]

// Mock accounting data
const mockInvoices: AccountingInvoice[] = [
  {
    id: '1',
    provider_id: '1',
    external_id: 'qb_invoice_789',
    invoice_number: 'JA-2024-001',
    client_id: '1',
    client_name: 'TechStartup Inc.',
    client_email: 'legal@techstartup.com',
    case_id: '1',
    status: 'paid',
    issue_date: '2024-02-01T00:00:00Z',
    due_date: '2024-03-02T00:00:00Z',
    subtotal: 20250.00,
    tax_amount: 1670.63,
    total_amount: 21920.63,
    currency: 'USD',
    line_items: [
      {
        id: '1',
        description: 'Corporate Formation Services - 45 hours @ $450/hr',
        quantity: 45,
        rate: 450.00,
        amount: 20250.00,
        tax_rate: 8.25,
        account_id: 'legal_services_income'
      }
    ],
    payments: [
      {
        id: '1',
        date: '2024-02-28T00:00:00Z',
        amount: 21920.63,
        method: 'ACH Transfer',
        reference: 'ACH_REF_12345'
      }
    ],
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-28T15:30:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T10:00:00Z'
  },
  {
    id: '2',
    provider_id: '1',
    external_id: 'qb_invoice_790',
    invoice_number: 'JA-2024-002',
    client_id: '2',
    client_name: 'John Smith',
    client_email: 'john.smith@email.com',
    case_id: '3',
    status: 'sent',
    issue_date: '2024-02-15T00:00:00Z',
    due_date: '2024-03-17T00:00:00Z',
    subtotal: 9100.00,
    tax_amount: 750.75,
    total_amount: 9850.75,
    currency: 'USD',
    line_items: [
      {
        id: '2',
        description: 'Family Law Services - Divorce Proceedings',
        quantity: 28,
        rate: 325.00,
        amount: 9100.00,
        tax_rate: 8.25,
        account_id: 'legal_services_income'
      }
    ],
    payments: [],
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T10:00:00Z'
  }
]

const mockClients: AccountingClient[] = [
  {
    id: '1',
    provider_id: '1',
    external_id: 'qb_customer_456',
    name: 'TechStartup Inc.',
    email: 'legal@techstartup.com',
    phone: '+1-555-0123',
    billing_address: {
      street: '123 Innovation Drive',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA'
    },
    payment_terms: 'Net 30',
    tax_id: '12-3456789',
    currency: 'USD',
    balance: 0.00,
    credit_limit: 50000.00,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-02-28T15:30:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T10:00:00Z'
  },
  {
    id: '2',
    provider_id: '1',
    external_id: 'qb_customer_457',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0456',
    billing_address: {
      street: '456 Oak Street',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
      country: 'USA'
    },
    payment_terms: 'Due on Receipt',
    currency: 'USD',
    balance: 9850.75,
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T10:00:00Z'
  }
]

async function authenticateRequest(_request: NextRequest) {
  const headersList = headers()
  const authorization = headersList.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.substring(7)

  try {
    const decoded = verify(token, JWT_SECRET) as { user_id: string; permissions: string[]; [key: string]: unknown }
    return decoded
  } catch (_error) {
    return null
  }
}

function checkPermission(user: { permissions: string[] }, permission: string): boolean {
  if (user.permissions.includes('*')) return true
  return user.permissions.includes(permission)
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function createResponse<T>(data: T, pagination?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      request_id: generateRequestId()
    }
  }
}

function createErrorResponse(error: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    message,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      request_id: generateRequestId()
    }
  }, { status })
}

// Simulate OAuth flow for accounting providers
async function exchangeCodeForTokens(provider: string, _code: string, _redirectUri: string) {
  const mockTokens = {
    access_token: `mock_access_token_${provider}_${Date.now()}`,
    refresh_token: `mock_refresh_token_${provider}_${Date.now()}`,
    expires_in: 3600,
    token_type: 'Bearer',
    company_id: `${provider}_company_${Date.now()}`,
    base_url: provider === 'quickbooks' ? 
      'https://sandbox-quickbooks.api.intuit.com' : 
      'https://api.xero.com'
  }

  return mockTokens
}

// Simulate accounting sync
async function syncAccountingData(provider: AccountingProvider, syncType: 'full' | 'incremental' = 'incremental'): Promise<SyncResult> {
  const syncStart = new Date().toISOString()
  
  // Simulate API calls and processing time
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const syncResult: SyncResult = {
    provider_id: provider.id,
    sync_type: syncType,
    sync_started: syncStart,
    sync_completed: new Date().toISOString(),
    invoices_synced: Math.floor(Math.random() * 20) + 5,
    clients_synced: Math.floor(Math.random() * 10) + 2,
    payments_synced: Math.floor(Math.random() * 15) + 3,
    expenses_synced: Math.floor(Math.random() * 8) + 1,
    errors: [],
    status: 'success'
  }

  // Simulate occasional errors
  if (Math.random() < 0.15) {
    syncResult.errors.push({
      type: 'invoice',
      id: 'inv_error_123',
      error: 'duplicate_invoice_number',
      details: 'Invoice number already exists in QuickBooks'
    })
    syncResult.status = 'partial'
  }

  return syncResult
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:accounting')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read accounting integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'providers') {
    const userProviders = mockProviders.filter(p => p.user_id === user.user_id)
    return NextResponse.json(createResponse(userProviders))
  }

  if (action === 'invoices') {
    const providerId = searchParams.get('provider_id')
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let filteredInvoices = [...mockInvoices]

    if (providerId) {
      filteredInvoices = filteredInvoices.filter(i => i.provider_id === providerId)
    }

    if (status) {
      filteredInvoices = filteredInvoices.filter(i => i.status === status)
    }

    if (clientId) {
      filteredInvoices = filteredInvoices.filter(i => i.client_id === clientId)
    }

    if (startDate) {
      filteredInvoices = filteredInvoices.filter(i => i.issue_date >= startDate)
    }

    if (endDate) {
      filteredInvoices = filteredInvoices.filter(i => i.issue_date <= endDate)
    }

    // Apply pagination
    const total = filteredInvoices.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex)

    const pagination = {
      page,
      limit,
      total,
      total_pages: totalPages
    }

    return NextResponse.json(createResponse(paginatedInvoices, pagination))
  }

  if (action === 'clients') {
    const providerId = searchParams.get('provider_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let filteredClients = [...mockClients]

    if (providerId) {
      filteredClients = filteredClients.filter(c => c.provider_id === providerId)
    }

    // Apply pagination
    const total = filteredClients.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedClients = filteredClients.slice(startIndex, endIndex)

    const pagination = {
      page,
      limit,
      total,
      total_pages: totalPages
    }

    return NextResponse.json(createResponse(paginatedClients, pagination))
  }

  if (action === 'auth_url') {
    const provider = searchParams.get('provider')
    const redirectUri = searchParams.get('redirect_uri')

    if (!provider || !['quickbooks', 'xero'].includes(provider)) {
      return createErrorResponse('validation_error', 'Valid provider (quickbooks, xero) is required', 400)
    }

    if (!redirectUri) {
      return createErrorResponse('validation_error', 'redirect_uri is required', 400)
    }

    const state = Buffer.from(JSON.stringify({ 
      user_id: user.user_id, 
      provider, 
      timestamp: Date.now() 
    })).toString('base64')

    let authUrl: string
    if (provider === 'quickbooks') {
      const params = new URLSearchParams({
        client_id: 'mock_qb_client_id',
        scope: 'com.intuit.quickbooks.accounting',
        redirect_uri: redirectUri,
        response_type: 'code',
        access_type: 'offline',
        state
      })
      authUrl = `https://appcenter.intuit.com/connect/oauth2?${params}`
    } else {
      const params = new URLSearchParams({
        client_id: 'mock_xero_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'accounting.transactions accounting.contacts offline_access',
        state
      })
      authUrl = `https://login.xero.com/identity/connect/authorize?${params}`
    }

    return NextResponse.json(createResponse({
      auth_url: authUrl,
      state,
      expires_in: 600
    }))
  }

  if (action === 'sync_status') {
    const providerId = searchParams.get('provider_id')
    
    if (!providerId) {
      return createErrorResponse('validation_error', 'provider_id is required', 400)
    }

    const provider = mockProviders.find(p => p.id === providerId && p.user_id === user.user_id)
    if (!provider) {
      return createErrorResponse('not_found', 'Accounting provider not found', 404)
    }

    // Mock sync status
    const syncStatus = {
      provider_id: providerId,
      last_sync: provider.last_sync,
      sync_enabled: provider.sync_enabled,
      next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      sync_frequency: provider.settings.sync_frequency,
      pending_items: {
        invoices: Math.floor(Math.random() * 5),
        clients: Math.floor(Math.random() * 3),
        payments: Math.floor(Math.random() * 7)
      },
      recent_errors: [],
      statistics: {
        total_invoices_synced: 45,
        total_clients_synced: 12,
        total_payments_synced: 38,
        total_sync_operations: 95,
        average_sync_time: '2.3s',
        success_rate: '97.2%'
      }
    }

    return NextResponse.json(createResponse(syncStatus))
  }

  return createErrorResponse('invalid_action', 'Valid action parameter is required', 400)
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:accounting')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to manage accounting integrations', 403)
  }

  try {
    const { action, ...data } = await request.json()

    if (action === 'connect') {
      const { provider, code, redirect_uri, state } = data

      if (!provider || !code || !redirect_uri) {
        return createErrorResponse('validation_error', 'provider, code, and redirect_uri are required', 400)
      }

      // Verify state parameter
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        if (stateData.user_id !== user.user_id) {
          return createErrorResponse('invalid_state', 'Invalid state parameter', 400)
        }
      } catch {
        return createErrorResponse('invalid_state', 'Invalid state parameter', 400)
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(provider, code, redirect_uri)

      // Create new accounting provider
      const newProvider: AccountingProvider = {
        id: String(mockProviders.length + 1),
        name: `${provider === 'quickbooks' ? 'QuickBooks' : 'Xero'} - ${tokens.company_id}`,
        type: provider as 'quickbooks' | 'xero',
        user_id: user.user_id,
        company_id: tokens.company_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        base_url: tokens.base_url,
        sync_enabled: true,
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          auto_sync_invoices: true,
          auto_sync_payments: true,
          auto_sync_expenses: false,
          auto_sync_clients: true,
          sync_frequency: 'daily',
          default_income_account: 'Legal Services Income',
          default_expense_account: 'Operating Expenses',
          default_tax_rate: 8.25,
          invoice_prefix: 'JA-',
          payment_terms: 'Net 30'
        }
      }

      mockProviders.push(newProvider)

      return NextResponse.json(createResponse(newProvider), { status: 201 })
    }

    if (action === 'sync') {
      const { provider_id, sync_type } = data

      if (!provider_id) {
        return createErrorResponse('validation_error', 'provider_id is required', 400)
      }

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Accounting provider not found', 404)
      }

      if (!provider.sync_enabled) {
        return createErrorResponse('sync_disabled', 'Sync is disabled for this provider', 400)
      }

      const syncResult = await syncAccountingData(provider, sync_type || 'incremental')

      // Update last sync time
      provider.last_sync = syncResult.sync_completed

      return NextResponse.json(createResponse(syncResult))
    }

    if (action === 'create_invoice') {
      const { provider_id, invoice_data } = data

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Accounting provider not found', 404)
      }

      // Create new invoice
      const invoiceNumber = `${provider.settings.invoice_prefix}${new Date().getFullYear()}-${String(mockInvoices.length + 1).padStart(3, '0')}`
      
      const newInvoice: AccountingInvoice = {
        id: String(mockInvoices.length + 1),
        provider_id: provider_id,
        external_id: `external_${Date.now()}`,
        invoice_number: invoiceNumber,
        client_id: invoice_data.client_id,
        client_name: invoice_data.client_name,
        client_email: invoice_data.client_email,
        case_id: invoice_data.case_id,
        status: 'draft',
        issue_date: invoice_data.issue_date || new Date().toISOString(),
        due_date: invoice_data.due_date,
        subtotal: invoice_data.line_items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0),
        tax_amount: invoice_data.line_items.reduce((sum: number, item: { amount: number; tax_rate?: number }) => 
          sum + (item.amount * (item.tax_rate || provider.settings.default_tax_rate) / 100), 0
        ),
        total_amount: 0, // Will be calculated
        currency: invoice_data.currency || 'USD',
        line_items: invoice_data.line_items,
        payments: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending',
      }

      // Calculate total
      newInvoice.total_amount = newInvoice.subtotal + newInvoice.tax_amount

      mockInvoices.push(newInvoice)

      return NextResponse.json(createResponse(newInvoice), { status: 201 })
    }

    return createErrorResponse('invalid_action', 'Valid action is required', 400)
  } catch (error) {
    console.error('Accounting integration error:', error)
    return createErrorResponse('internal_error', 'Failed to process accounting request', 500)
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:accounting')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update accounting integrations', 403)
  }

  try {
    const { provider_id, settings, sync_enabled } = await request.json()

    if (!provider_id) {
      return createErrorResponse('validation_error', 'provider_id is required', 400)
    }

    const providerIndex = mockProviders.findIndex(p => 
      p.id === provider_id && p.user_id === user.user_id
    )

    if (providerIndex === -1) {
      return createErrorResponse('not_found', 'Accounting provider not found', 404)
    }

    const provider = mockProviders[providerIndex]

    // Update provider settings
    if (settings) {
      provider.settings = { ...provider.settings, ...settings }
    }

    if (typeof sync_enabled === 'boolean') {
      provider.sync_enabled = sync_enabled
    }

    provider.updated_at = new Date().toISOString()

    return NextResponse.json(createResponse(provider))
  } catch (error) {
    console.error('Accounting provider update error:', error)
    return createErrorResponse('internal_error', 'Failed to update accounting provider', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:accounting')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete accounting integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')

  if (!providerId) {
    return createErrorResponse('validation_error', 'provider_id is required', 400)
  }

  const providerIndex = mockProviders.findIndex(p => 
    p.id === providerId && p.user_id === user.user_id
  )

  if (providerIndex === -1) {
    return createErrorResponse('not_found', 'Accounting provider not found', 404)
  }

  // Remove provider
  mockProviders.splice(providerIndex, 1)

  // Remove associated data
  const invoiceIndicesToRemove = mockInvoices
    .map((invoice, index) => invoice.provider_id === providerId ? index : -1)
    .filter(index => index !== -1)
    .reverse()

  const clientIndicesToRemove = mockClients
    .map((client, index) => client.provider_id === providerId ? index : -1)
    .filter(index => index !== -1)
    .reverse()

  invoiceIndicesToRemove.forEach(index => mockInvoices.splice(index, 1))
  clientIndicesToRemove.forEach(index => mockClients.splice(index, 1))

  return NextResponse.json(createResponse({
    deleted: true,
    provider_id: providerId,
    invoices_removed: invoiceIndicesToRemove.length,
    clients_removed: clientIndicesToRemove.length
  }))
}