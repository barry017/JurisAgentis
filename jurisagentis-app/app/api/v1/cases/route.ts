import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface Case {
  id: string
  client_id: string
  title: string
  description: string
  practice_area: string
  status: 'active' | 'completed' | 'on_hold' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  created_at: string
  updated_at: string
  due_date?: string
  assigned_attorney: string
  billing_rate: number
  total_hours: number
  total_amount: number
  case_number: string
  court?: string
  judge?: string
  opposing_party?: string
  opposing_counsel?: string
  case_type: string
  estimated_duration: string
  retainer_amount?: number
  hourly_budget?: number
  flat_fee?: number
  contingency_percentage?: number
  billing_method: 'hourly' | 'flat_fee' | 'contingency' | 'retainer'
  tags: string[]
  documents_count: number
  next_deadline?: string
  last_activity: string
}

interface TimeEntry {
  id: string
  case_id: string
  attorney: string
  date: string
  hours: number
  rate: number
  description: string
  billable: boolean
  invoiced: boolean
  task_type: string
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

// Mock cases database
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
    due_date: '2024-03-01T23:59:59Z',
    assigned_attorney: 'Sarah Johnson',
    billing_rate: 450,
    total_hours: 45,
    total_amount: 20250,
    case_number: 'CORP-2024-001',
    case_type: 'Corporate Formation',
    estimated_duration: '6-8 weeks',
    retainer_amount: 15000,
    billing_method: 'hourly',
    tags: ['corporate', 'startup', 'formation', 'delaware'],
    documents_count: 12,
    last_activity: '2024-02-15T16:45:00Z'
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
    due_date: '2024-04-15T23:59:59Z',
    assigned_attorney: 'Sarah Johnson',
    billing_rate: 450,
    total_hours: 12,
    total_amount: 5400,
    case_number: 'TM-2024-002',
    case_type: 'Trademark Application',
    estimated_duration: '4-6 months',
    flat_fee: 8500,
    billing_method: 'flat_fee',
    tags: ['trademark', 'ip', 'application', 'uspto'],
    documents_count: 5,
    next_deadline: '2024-03-15T17:00:00Z',
    last_activity: '2024-03-01T11:30:00Z'
  },
  {
    id: '3',
    client_id: '2',
    title: 'Divorce Settlement Negotiation',
    description: 'Collaborative divorce proceedings with asset division and custody arrangements',
    practice_area: 'Family Law',
    status: 'active',
    priority: 'high',
    created_at: '2024-02-01T09:15:00Z',
    updated_at: '2024-02-28T14:20:00Z',
    due_date: '2024-05-01T23:59:59Z',
    assigned_attorney: 'Michael Chen',
    billing_rate: 325,
    total_hours: 28,
    total_amount: 9100,
    case_number: 'FAM-2024-003',
    court: 'Suffolk County Family Court',
    opposing_party: 'Jane Smith',
    opposing_counsel: 'Wilson & Associates',
    case_type: 'Dissolution of Marriage',
    estimated_duration: '8-12 weeks',
    retainer_amount: 12000,
    billing_method: 'hourly',
    tags: ['divorce', 'family', 'collaborative', 'custody'],
    documents_count: 18,
    next_deadline: '2024-03-10T14:00:00Z',
    last_activity: '2024-02-28T14:20:00Z'
  },
  {
    id: '4',
    client_id: '3',
    title: 'Employment Contract Review',
    description: 'Reviewing and negotiating executive employment agreements',
    practice_area: 'Employment Law',
    status: 'on_hold',
    priority: 'medium',
    created_at: '2024-02-20T15:45:00Z',
    updated_at: '2024-02-25T10:15:00Z',
    assigned_attorney: 'David Rodriguez',
    billing_rate: 400,
    total_hours: 6,
    total_amount: 2400,
    case_number: 'EMP-2024-004',
    case_type: 'Contract Review',
    estimated_duration: '2-3 weeks',
    hourly_budget: 8000,
    billing_method: 'hourly',
    tags: ['employment', 'contract', 'executive', 'negotiation'],
    documents_count: 3,
    last_activity: '2024-02-25T10:15:00Z'
  }
]

const mockTimeEntries: TimeEntry[] = [
  {
    id: '1',
    case_id: '1',
    attorney: 'Sarah Johnson',
    date: '2024-01-15',
    hours: 3.5,
    rate: 450,
    description: 'Initial client consultation and corporate structure analysis',
    billable: true,
    invoiced: true,
    task_type: 'consultation'
  },
  {
    id: '2',
    case_id: '1',
    attorney: 'Sarah Johnson',
    date: '2024-01-20',
    hours: 8.0,
    rate: 450,
    description: 'Drafting articles of incorporation and bylaws',
    billable: true,
    invoiced: true,
    task_type: 'document_preparation'
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

  if (!checkPermission(user, 'read:cases')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read cases', 403)
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')
  const practice_area = searchParams.get('practice_area')
  const assigned_attorney = searchParams.get('assigned_attorney')
  const client_id = searchParams.get('client_id')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'updated_at'
  const order = searchParams.get('order') || 'desc'
  const include = searchParams.get('include')?.split(',') || []

  let filteredCases = [...mockCases]

  // Apply filters
  if (status) {
    filteredCases = filteredCases.filter(case_ => case_.status === status)
  }

  if (priority) {
    filteredCases = filteredCases.filter(case_ => case_.priority === priority)
  }

  if (practice_area) {
    filteredCases = filteredCases.filter(case_ => case_.practice_area === practice_area)
  }

  if (assigned_attorney) {
    filteredCases = filteredCases.filter(case_ => case_.assigned_attorney === assigned_attorney)
  }

  if (client_id) {
    filteredCases = filteredCases.filter(case_ => case_.client_id === client_id)
  }

  if (search) {
    const searchTerm = search.toLowerCase()
    filteredCases = filteredCases.filter(case_ => 
      case_.title.toLowerCase().includes(searchTerm) ||
      case_.description.toLowerCase().includes(searchTerm) ||
      case_.case_number.toLowerCase().includes(searchTerm) ||
      case_.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    )
  }

  // Apply sorting
  filteredCases.sort((a, b) => {
    let aValue: unknown = a[sort as keyof Case]
    let bValue: unknown = b[sort as keyof Case]

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
  const total = filteredCases.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedCases = filteredCases.slice(startIndex, endIndex)

  // Include additional data if requested
  if (include.includes('time_entries')) {
    paginatedCases.forEach(case_ => {
      (case_ as Case & { time_entries: TimeEntry[] }).time_entries = mockTimeEntries.filter(entry => entry.case_id === case_.id)
    })
  }

  if (include.includes('client')) {
    // This would typically join with client data
    paginatedCases.forEach(case_ => {
      (case_ as Case & { client: { id: string; name: string } }).client = {
        id: case_.client_id,
        name: case_.client_id === '1' ? 'TechStartup Inc.' : 
              case_.client_id === '2' ? 'John Smith' : 'Global Manufacturing Corp'
      }
    })
  }

  const pagination = {
    page,
    limit,
    total,
    total_pages: totalPages
  }

  return NextResponse.json(createResponse(paginatedCases, pagination))
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:cases')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to create cases', 403)
  }

  try {
    const caseData = await request.json()

    // Validate required fields
    const requiredFields = ['client_id', 'title', 'practice_area', 'assigned_attorney', 'billing_method']
    for (const field of requiredFields) {
      if (!caseData[field]) {
        return createErrorResponse('validation_error', `Field '${field}' is required`, 400)
      }
    }

    // Generate case number
    const practiceAreaCode = caseData.practice_area.replace(/\s+/g, '').substring(0, 3).toUpperCase()
    const year = new Date().getFullYear()
    const caseCount = mockCases.filter(c => c.practice_area === caseData.practice_area).length + 1
    const caseNumber = `${practiceAreaCode}-${year}-${caseCount.toString().padStart(3, '0')}`

    // Create new case
    const newCase: Case = {
      id: String(mockCases.length + 1),
      client_id: caseData.client_id,
      title: caseData.title,
      description: caseData.description || '',
      practice_area: caseData.practice_area,
      status: caseData.status || 'active',
      priority: caseData.priority || 'medium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      due_date: caseData.due_date,
      assigned_attorney: caseData.assigned_attorney,
      billing_rate: caseData.billing_rate || 0,
      total_hours: 0,
      total_amount: 0,
      case_number: caseNumber,
      court: caseData.court,
      judge: caseData.judge,
      opposing_party: caseData.opposing_party,
      opposing_counsel: caseData.opposing_counsel,
      case_type: caseData.case_type || caseData.practice_area,
      estimated_duration: caseData.estimated_duration || '',
      retainer_amount: caseData.retainer_amount,
      hourly_budget: caseData.hourly_budget,
      flat_fee: caseData.flat_fee,
      contingency_percentage: caseData.contingency_percentage,
      billing_method: caseData.billing_method,
      tags: caseData.tags || [],
      documents_count: 0,
      next_deadline: caseData.next_deadline,
      last_activity: new Date().toISOString()
    }

    mockCases.push(newCase)

    return NextResponse.json(createResponse(newCase), { status: 201 })
  } catch (error) {
    console.error('Case creation error:', error)
    return createErrorResponse('internal_error', 'Failed to create case', 500)
  }
}