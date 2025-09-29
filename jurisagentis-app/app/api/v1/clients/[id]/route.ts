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

interface Case {
  id: string
  client_id: string
  title: string
  description: string
  practice_area: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  assigned_attorney: string
  billing_rate: number
  total_hours: number
  total_amount: number
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    version: string
    timestamp: string
    request_id: string
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Mock data
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
  }
]

const mockCases: Case[] = [
  {
    id: '1',
    client_id: '1',
    title: 'Corporate Formation and Setup',
    description: 'Setting up Delaware C-Corp structure with initial funding round preparation',
    practice_area: 'Corporate Law',
    status: 'completed',
    priority: 'high',
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-02-15T16:45:00Z',
    assigned_attorney: 'Sarah Johnson',
    billing_rate: 450,
    total_hours: 45,
    total_amount: 20250
  },
  {
    id: '2',
    client_id: '1',
    title: 'Trademark Application Filing',
    description: 'Filing trademark applications for company name and logo',
    practice_area: 'IP Law',
    status: 'active',
    priority: 'medium',
    created_at: '2024-02-01T09:15:00Z',
    updated_at: '2024-03-01T11:30:00Z',
    assigned_attorney: 'Sarah Johnson',
    billing_rate: 450,
    total_hours: 12,
    total_amount: 5400
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

function createResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read client details', 403)
  }
  const client = mockClients.find(c => c.id === clientId)

  if (!client) {
    return createErrorResponse('not_found', 'Client not found', 404)
  }

  // Get related data based on query parameters
  const { searchParams } = new URL(request.url)
  const include = searchParams.get('include')?.split(',') || []

  const responseData: Client & { cases?: Case[]; billing_summary?: { total_hours: number; total_amount: number; outstanding_balance: number; last_payment_date: string } } = { ...client }

  if (include.includes('cases')) {
    responseData.cases = mockCases.filter(case_ => case_.client_id === clientId)
  }

  if (include.includes('billing_summary')) {
    const clientCases = mockCases.filter(case_ => case_.client_id === clientId)
    responseData.billing_summary = {
      total_hours: clientCases.reduce((sum, case_) => sum + case_.total_hours, 0),
      total_amount: clientCases.reduce((sum, case_) => sum + case_.total_amount, 0),
      active_cases: clientCases.filter(case_ => case_.status === 'active').length,
      completed_cases: clientCases.filter(case_ => case_.status === 'completed').length,
      average_hourly_rate: client.billing_rate
    }
  }

  if (include.includes('activity')) {
    responseData.recent_activity = [
      {
        id: '1',
        type: 'case_update',
        description: 'Trademark application status updated',
        timestamp: '2024-03-01T11:30:00Z',
        user: 'Sarah Johnson'
      },
      {
        id: '2',
        type: 'communication',
        description: 'Email sent regarding corporate filings',
        timestamp: '2024-02-28T16:45:00Z',
        user: 'Sarah Johnson'
      },
      {
        id: '3',
        type: 'document',
        description: 'Articles of Incorporation filed',
        timestamp: '2024-02-15T14:20:00Z',
        user: 'Sarah Johnson'
      }
    ]
  }

  return NextResponse.json(createResponse(responseData))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update clients', 403)
  }
  const clientIndex = mockClients.findIndex(c => c.id === clientId)

  if (clientIndex === -1) {
    return createErrorResponse('not_found', 'Client not found', 404)
  }

  try {
    const updateData = await request.json()
    const existingClient = mockClients[clientIndex]

    // Validate email uniqueness if email is being updated
    if (updateData.email && updateData.email !== existingClient.email) {
      const emailExists = mockClients.some(client => 
        client.id !== clientId && client.email === updateData.email
      )
      if (emailExists) {
        return createErrorResponse('duplicate_error', 'Client with this email already exists', 409)
      }
    }

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:clients')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete clients', 403)
  }
  const clientIndex = mockClients.findIndex(c => c.id === clientId)

  if (clientIndex === -1) {
    return createErrorResponse('not_found', 'Client not found', 404)
  }

  // Check if client has active cases
  const hasActiveCases = mockCases.some(case_ => 
    case_.client_id === clientId && case_.status === 'active'
  )

  if (hasActiveCases) {
    return createErrorResponse('conflict', 'Cannot delete client with active cases', 409)
  }

  // Get query parameter for soft delete
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  if (force) {
    // Hard delete - remove client and all related data
    mockClients.splice(clientIndex, 1)
    // Remove related cases
    const caseIndicesToRemove = mockCases
      .map((case_, index) => case_.client_id === clientId ? index : -1)
      .filter(index => index !== -1)
      .reverse() // Remove from end to avoid index shifting

    caseIndicesToRemove.forEach(index => mockCases.splice(index, 1))

    return NextResponse.json(createResponse({ 
      deleted: true, 
      id: clientId, 
      type: 'hard_delete',
      related_data_removed: true 
    }))
  } else {
    // Soft delete - mark as inactive
    mockClients[clientIndex].status = 'inactive'
    mockClients[clientIndex].updated_at = new Date().toISOString()

    return NextResponse.json(createResponse({ 
      deleted: true, 
      id: clientId, 
      type: 'soft_delete',
      status: 'inactive' 
    }))
  }
}