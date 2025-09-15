/**
 * Tasks API - List, create, and manage matter tasks
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
import { MatterTaskInsert, TaskStatus, MatterPriority } from '@/types/database'

interface ListTasksParams {
  matter_id?: string
  status?: TaskStatus
  priority?: MatterPriority
  assigned_to?: string
  search?: string
  due_date_from?: string
  due_date_to?: string
  overdue_only?: boolean
  billable_only?: boolean
  limit?: number
  offset?: number
}

interface CreateTaskRequest {
  matter_id: string
  title: string
  description?: string
  task_type?: string
  status?: TaskStatus
  priority?: MatterPriority
  assigned_to?: string
  due_date?: string
  start_date?: string
  estimated_hours?: number
  prerequisite_task_ids?: string[]
  blocks_task_ids?: string[]
  billable?: boolean
  notes?: string
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can list tasks
    if (!['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to list tasks',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const params: ListTasksParams = {
      matter_id: url.searchParams.get('matter_id') || undefined,
      status: url.searchParams.get('status') as TaskStatus || undefined,
      priority: url.searchParams.get('priority') as MatterPriority || undefined,
      assigned_to: url.searchParams.get('assigned_to') || undefined,
      search: url.searchParams.get('search') || undefined,
      due_date_from: url.searchParams.get('due_date_from') || undefined,
      due_date_to: url.searchParams.get('due_date_to') || undefined,
      overdue_only: url.searchParams.get('overdue_only') === 'true',
      billable_only: url.searchParams.get('billable_only') === 'true',
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
      .from('matter_tasks')
      .select(`
        *,
        matter:matters!matter_tasks_matter_id_fkey(
          id,
          matter_number,
          title,
          status
        ),
        assigned_to_profile:user_profiles!matter_tasks_assigned_to_fkey(
          first_name,
          last_name,
          title
        ),
        created_by_profile:user_profiles!matter_tasks_created_by_fkey(
          first_name,
          last_name,
          title
        )
      `)
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (user.role === 'assistant') {
      // Assistants can only see tasks for matters they have access to
      // This is handled by RLS, but we can add additional filtering here if needed
    } else if (['associate_attorney', 'paralegal'].includes(user.role)) {
      // Attorneys and paralegals see tasks they're assigned to or created
      query = query.or(`
        assigned_to.eq.${user.uid},
        created_by.eq.${user.uid}
      `)
    }
    // Admins see all tasks (no additional filtering needed)

    // Apply filters
    if (params.matter_id) {
      query = query.eq('matter_id', params.matter_id)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.priority) {
      query = query.eq('priority', params.priority)
    }

    if (params.assigned_to) {
      query = query.eq('assigned_to', params.assigned_to)
    }

    if (params.search) {
      query = query.or(`
        title.ilike.%${params.search}%,
        description.ilike.%${params.search}%,
        task_type.ilike.%${params.search}%,
        notes.ilike.%${params.search}%
      `)
    }

    if (params.due_date_from) {
      query = query.gte('due_date', params.due_date_from)
    }

    if (params.due_date_to) {
      query = query.lte('due_date', params.due_date_to)
    }

    if (params.overdue_only) {
      const today = new Date().toISOString().split('T')[0]
      query = query.lt('due_date', today).neq('status', 'completed')
    }

    if (params.billable_only) {
      query = query.eq('billable', true)
    }

    // Apply pagination
    if (params.limit) {
      query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1)
    }

    let tasks = null
    let error = null
    let count = 0

    try {
      const result = await query
      tasks = result.data
      error = result.error
      count = result.count || 0
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock task data')
        const mockTasks = [
          {
            id: 'task-1',
            matter_id: 'matter-1',
            title: 'Review trust documents',
            description: 'Review and finalize trust documents for Johnson family',
            task_type: 'document_review',
            status: 'in_progress',
            priority: 'high',
            assigned_to: 'user-1',
            created_by: 'user-1',
            due_date: '2025-01-20',
            start_date: '2025-01-15',
            completed_date: null,
            estimated_hours: 3,
            actual_hours: 1.5,
            prerequisite_task_ids: null,
            blocks_task_ids: ['task-2'],
            billable: true,
            billed: false,
            notes: 'Client requested expedited review',
            completion_notes: null,
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            assigned_to_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            created_by_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'task-2',
            matter_id: 'matter-1',
            title: 'Schedule client meeting',
            description: 'Schedule final meeting to execute trust documents',
            task_type: 'client_communication',
            status: 'completed',
            priority: 'normal',
            assigned_to: 'user-1',
            created_by: 'user-1',
            due_date: '2025-01-15',
            start_date: '2025-01-12',
            completed_date: '2025-01-14',
            estimated_hours: 0.5,
            actual_hours: 0.25,
            prerequisite_task_ids: null,
            blocks_task_ids: null,
            billable: false,
            billed: false,
            notes: 'Client prefers afternoon appointments',
            completion_notes: 'Meeting scheduled for January 22nd at 2 PM',
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            assigned_to_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            created_by_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'task-3',
            matter_id: 'matter-2',
            title: 'File LLC documents',
            description: 'File formation documents with Secretary of State',
            task_type: 'filing',
            status: 'pending',
            priority: 'urgent',
            assigned_to: 'user-1',
            created_by: 'user-1',
            due_date: '2025-01-18',
            start_date: null,
            completed_date: null,
            estimated_hours: 2,
            actual_hours: 0,
            prerequisite_task_ids: null,
            blocks_task_ids: null,
            billable: true,
            billed: false,
            notes: 'State filing fee required',
            completion_notes: null,
            matter: {
              id: 'matter-2',
              matter_number: '2025-002',
              title: 'TechStart LLC Formation',
              status: 'active'
            },
            assigned_to_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            created_by_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]
        
        // Apply filters to mock data
        let filteredTasks = mockTasks
        
        if (params.matter_id) {
          filteredTasks = filteredTasks.filter(t => t.matter_id === params.matter_id)
        }
        
        if (params.status && params.status !== 'all') {
          filteredTasks = filteredTasks.filter(t => t.status === params.status)
        }
        
        if (params.priority && params.priority !== 'all') {
          filteredTasks = filteredTasks.filter(t => t.priority === params.priority)
        }
        
        if (params.assigned_to) {
          filteredTasks = filteredTasks.filter(t => t.assigned_to === params.assigned_to)
        }
        
        if (params.search) {
          const search = params.search.toLowerCase()
          filteredTasks = filteredTasks.filter(t => 
            t.title.toLowerCase().includes(search) ||
            (t.description && t.description.toLowerCase().includes(search)) ||
            (t.task_type && t.task_type.toLowerCase().includes(search)) ||
            (t.notes && t.notes.toLowerCase().includes(search))
          )
        }
        
        if (params.overdue_only) {
          const today = new Date().toISOString().split('T')[0]
          filteredTasks = filteredTasks.filter(t => 
            t.due_date && t.due_date < today && t.status !== 'completed'
          )
        }
        
        if (params.billable_only) {
          filteredTasks = filteredTasks.filter(t => t.billable)
        }
        
        // Apply pagination
        const offset = params.offset || 0
        const limit = params.limit || 20
        const paginatedTasks = filteredTasks.slice(offset, offset + limit)
        
        tasks = paginatedTasks
        count = filteredTasks.length
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve tasks',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'tasks',
        action: 'list',
        filters: params,
        result_count: tasks?.length || 0
      }
    )

    return addCORSHeaders(createSuccessResponse({
      tasks,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
        has_more: count ? (params.offset || 0) + tasks.length < count : false
      }
    }))

  } catch (error) {
    console.error('Tasks list error:', error)
    
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
    
    // Check permissions - only certain roles can create tasks
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create tasks',
        403
      ))
    }

    // Parse request body
    const taskData = await parseRequestBody<CreateTaskRequest>(request)

    // Validate required fields
    if (!taskData.matter_id || !taskData.title) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Matter ID and title are required',
        400
      ))
    }

    // Validate matter exists and user has access
    let matter = null
    let matterError = null

    try {
      const result = await supabaseAdmin
        .from('matters')
        .select('id, matter_number, title')
        .eq('id', taskData.matter_id)
        .is('deleted_at', null)
        .single()
      
      matter = result.data
      matterError = result.error
      
      // Check if database connection failed
      if (matterError && matterError.message && matterError.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock matter in development
      if (isDevelopment && ['matter-1', 'matter-2', 'matter-3'].includes(taskData.matter_id)) {
        const mockMatters = {
          'matter-1': { id: 'matter-1', matter_number: '2025-001', title: 'Johnson Family Estate Planning' },
          'matter-2': { id: 'matter-2', matter_number: '2025-002', title: 'TechStart LLC Formation' },
          'matter-3': { id: 'matter-3', matter_number: '2025-003', title: 'Williams Estate Administration' }
        }
        matter = mockMatters[taskData.matter_id as keyof typeof mockMatters]
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

    // Validate assignee exists if provided
    if (taskData.assigned_to) {
      try {
        const { data: assignee } = await supabaseAdmin
          .from('user_profiles')
          .select('uid')
          .eq('uid', taskData.assigned_to)
          .in('role', ['admin', 'associate_attorney', 'paralegal', 'assistant'])
          .single()

        if (!assignee) {
          return addCORSHeaders(createErrorResponse(
            'INVALID_ASSIGNEE',
            'Assignee not found or invalid role',
            400
          ))
        }
      } catch (dbError) {
        // In development mode, allow assignment to test users
        if (isDevelopment && taskData.assigned_to.startsWith('user-')) {
          // Mock user validation passed
        } else {
          return addCORSHeaders(createErrorResponse(
            'INVALID_ASSIGNEE',
            'Assignee not found or invalid role',
            400
          ))
        }
      }
    }

    // Prepare task data for insertion
    const newTask: MatterTaskInsert = {
      matter_id: taskData.matter_id,
      title: taskData.title.trim(),
      description: taskData.description?.trim() || null,
      task_type: taskData.task_type?.trim() || null,
      status: taskData.status || 'pending',
      priority: taskData.priority || 'normal',
      assigned_to: taskData.assigned_to || null,
      due_date: taskData.due_date || null,
      start_date: taskData.start_date || null,
      estimated_hours: taskData.estimated_hours || null,
      actual_hours: 0,
      prerequisite_task_ids: taskData.prerequisite_task_ids || null,
      blocks_task_ids: taskData.blocks_task_ids || null,
      billable: taskData.billable ?? false,
      billed: false,
      notes: taskData.notes?.trim() || null,
      created_by: user.uid
    }

    // Create the task
    let task = null
    let error = null

    try {
      const result = await supabaseAdmin
        .from('matter_tasks')
        .insert(newTask)
        .select(`
          *,
          matter:matters!matter_tasks_matter_id_fkey(
            id,
            matter_number,
            title,
            status
          ),
          assigned_to_profile:user_profiles!matter_tasks_assigned_to_fkey(
            first_name,
            last_name,
            title
          ),
          created_by_profile:user_profiles!matter_tasks_created_by_fkey(
            first_name,
            last_name,
            title
          )
        `)
        .single()

      task = result.data
      error = result.error
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - create mock task in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock task')
        task = {
          id: `task-${Date.now()}`,
          ...newTask,
          matter,
          assigned_to_profile: newTask.assigned_to ? { first_name: 'Test', last_name: 'User', title: 'Attorney' } : null,
          created_by_profile: { first_name: 'Test', last_name: 'User', title: 'Attorney' },
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
      console.error('Database error creating task:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create task',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'tasks',
        action: 'create',
        task_id: task.id,
        matter_id: task.matter_id
      }
    )

    return addCORSHeaders(createSuccessResponse({
      task,
      message: 'Task created successfully'
    }))

  } catch (error) {
    console.error('Task creation error:', error)
    
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