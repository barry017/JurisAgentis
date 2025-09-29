import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface Client {
  id: string
  type: 'individual' | 'business'
  first_name?: string
  last_name?: string
  company_name?: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  status: 'active' | 'inactive' | 'prospect'
  created_at: string
  updated_at: string
  total_cases: number
  total_revenue: number
  last_contact: string
  assigned_attorney: string
  practice_areas: string[]
  billing_rate: number
  payment_terms: string
  tax_id?: string
  industry?: string
  referral_source?: string
  notes: string
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

// Mock clients database
const mockClients: Client[] = [
  {
    id: '1',
    type: 'business',
    company_name: 'TechStartup Inc.',
    email: 'legal@techstartup.com',
    phone: '+1-555-0123',
    address: {
      street: '123 Innovation Drive',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105',
      country: 'USA'
    },
    status: 'active',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-03-01T14:20:00Z',
    total_cases: 5,
    total_revenue: 125000,
    last_contact: '2024-02-28T16:45:00Z',
    assigned_attorney: 'Sarah Johnson',
    practice_areas: ['Corporate Law', 'IP Law'],
    billing_rate: 450,
    payment_terms: 'Net 30',
    tax_id: '12-3456789',
    industry: 'Technology',
    referral_source: 'Website',
    notes: 'High-growth startup, potential for ongoing legal work'
  },
  {
    id: '2',
    type: 'individual',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0456',
    address: {
      street: '456 Oak Street',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
      country: 'USA'
    },
    status: 'active',
    created_at: '2024-02-01T09:15:00Z',
    updated_at: '2024-02-15T11:30:00Z',
    total_cases: 2,
    total_revenue: 15000,
    last_contact: '2024-02-10T13:20:00Z',
    assigned_attorney: 'Michael Chen',
    practice_areas: ['Family Law'],
    billing_rate: 325,
    payment_terms: 'Retainer',
    referral_source: 'Referral',
    notes: 'Divorce proceedings, cooperative parties'
  },
  {
    id: '3',
    type: 'business',
    company_name: 'Global Manufacturing Corp',
    email: 'contracts@globalmanuf.com',
    phone: '+1-555-0789',
    address: {
      street: '789 Industrial Blvd',
      city: 'Detroit',
      state: 'MI',
      zip: '48201',
      country: 'USA'
    },
    status: 'prospect',
    created_at: '2024-02-20T15:45:00Z',
    updated_at: '2024-02-25T10:15:00Z',
    total_cases: 0,
    total_revenue: 0,
    last_contact: '2024-02-25T10:15:00Z',
    assigned_attorney: 'David Rodriguez',
    practice_areas: ['Corporate Law', 'Employment Law'],
    billing_rate: 400,
    payment_terms: 'Net 15',
    tax_id: '98-7654321',
    industry: 'Manufacturing',
    referral_source: 'Cold Outreach',
    notes: 'Potential large client, discussing retainer agreement'
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

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read clients', 403)
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const type = searchParams.get('type')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'desc'

  let filteredClients = [...mockClients]

  // Apply filters
  if (status) {
    filteredClients = filteredClients.filter(client => client.status === status)
  }

  if (type) {
    filteredClients = filteredClients.filter(client => client.type === type)
  }

  if (search) {
    const searchTerm = search.toLowerCase()
    filteredClients = filteredClients.filter(client => 
      (client.first_name?.toLowerCase().includes(searchTerm)) ||
      (client.last_name?.toLowerCase().includes(searchTerm)) ||
      (client.company_name?.toLowerCase().includes(searchTerm)) ||
      client.email.toLowerCase().includes(searchTerm) ||
      client.phone.includes(searchTerm)
    )
  }

  // Apply sorting
  filteredClients.sort((a, b) => {
    let aValue: unknown = a[sort as keyof Client]
    let bValue: unknown = b[sort as keyof Client]

    if (sort === 'name') {
      aValue = a.type === 'business' ? a.company_name : `${a.first_name} ${a.last_name}`
      bValue = b.type === 'business' ? b.company_name : `${b.first_name} ${b.last_name}`
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }

    if (order === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    } else {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    }
  })

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

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to create clients', 403)
  }

  try {
    const clientData = await request.json()

    // Validate required fields
    const requiredFields = ['type', 'email', 'phone']
    for (const field of requiredFields) {
      if (!clientData[field]) {
        return createErrorResponse('validation_error', `Field '${field}' is required`, 400)
      }
    }

    if (clientData.type === 'individual' && (!clientData.first_name || !clientData.last_name)) {
      return createErrorResponse('validation_error', 'First name and last name are required for individual clients', 400)
    }

    if (clientData.type === 'business' && !clientData.company_name) {
      return createErrorResponse('validation_error', 'Company name is required for business clients', 400)
    }

    // Check for duplicate email
    const existingClient = mockClients.find(client => client.email === clientData.email)
    if (existingClient) {
      return createErrorResponse('duplicate_error', 'Client with this email already exists', 409)
    }

    // Create new client
    const newClient: Client = {
      id: String(mockClients.length + 1),
      type: clientData.type,
      first_name: clientData.first_name,
      last_name: clientData.last_name,
      company_name: clientData.company_name,
      email: clientData.email,
      phone: clientData.phone,
      address: clientData.address || {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'USA'
      },
      status: clientData.status || 'prospect',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      total_cases: 0,
      total_revenue: 0,
      last_contact: new Date().toISOString(),
      assigned_attorney: clientData.assigned_attorney || '',
      practice_areas: clientData.practice_areas || [],
      billing_rate: clientData.billing_rate || 0,
      payment_terms: clientData.payment_terms || 'Net 30',
      tax_id: clientData.tax_id,
      industry: clientData.industry,
      referral_source: clientData.referral_source,
      notes: clientData.notes || ''
    }

    mockClients.push(newClient)

    return NextResponse.json(createResponse(newClient), { status: 201 })
  } catch (error) {
    console.error('Client creation error:', error)
    return createErrorResponse('internal_error', 'Failed to create client', 500)
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update clients', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('id')

    if (!clientId) {
      return createErrorResponse('validation_error', 'Client ID is required', 400)
    }

    const clientIndex = mockClients.findIndex(client => client.id === clientId)
    if (clientIndex === -1) {
      return createErrorResponse('not_found', 'Client not found', 404)
    }

    const updateData = await request.json()
    const existingClient = mockClients[clientIndex]

    // Update client
    const updatedClient: Client = {
      ...existingClient,
      ...updateData,
      id: existingClient.id, // Prevent ID changes
      updated_at: new Date().toISOString()
    }

    mockClients[clientIndex] = updatedClient

    return NextResponse.json(createResponse(updatedClient))
  } catch (error) {
    console.error('Client update error:', error)
    return createErrorResponse('internal_error', 'Failed to update client', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete clients', 403)
  }

  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('id')

  if (!clientId) {
    return createErrorResponse('validation_error', 'Client ID is required', 400)
  }

  const clientIndex = mockClients.findIndex(client => client.id === clientId)
  if (clientIndex === -1) {
    return createErrorResponse('not_found', 'Client not found', 404)
  }

  // Check if client has active cases
  const hasActiveCases = mockClients[clientIndex].total_cases > 0
  if (hasActiveCases) {
    return createErrorResponse('conflict', 'Cannot delete client with active cases', 409)
  }

  mockClients.splice(clientIndex, 1)

  return NextResponse.json(createResponse({ deleted: true, id: clientId }))
}