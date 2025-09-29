/**
 * Calendar Events API - List and create calendar events
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
import { CalendarEventInsert, EventStatus, EventType, EventCategory } from '@/types/database'

interface ListEventsParams {
  start_date?: string
  end_date?: string
  matter_id?: string
  client_id?: string
  event_type?: EventType
  event_category?: EventCategory
  status?: EventStatus
  assigned_attorney?: string
  search?: string
  upcoming_only?: boolean
  limit?: number
  offset?: number
}

interface CreateEventRequest {
  title: string
  description?: string
  event_type: EventType
  event_category: EventCategory
  start_datetime: string
  end_datetime?: string
  all_day?: boolean
  timezone?: string
  location?: string
  location_type?: string
  virtual_meeting_url?: string
  virtual_meeting_id?: string
  room_or_courtroom?: string
  matter_id?: string
  client_id?: string
  case_number?: string
  judge_name?: string
  court_name?: string
  hearing_type?: string
  deadline_type?: string
  deadline_description?: string
  is_hard_deadline?: boolean
  deadline_consequence?: string
  is_recurring?: boolean
  recurrence_rule?: string
  recurrence_end_date?: string
  assigned_attorney?: string
  assigned_paralegal?: string
  confirmation_required?: boolean
  preparation_time_minutes?: number
  travel_time_minutes?: number
  estimated_duration_minutes?: number
  preparation_notes?: string
  pre_event_checklist?: string[]
  billable?: boolean
  billable_rate?: number
  estimated_hours?: number
  reminder_enabled?: boolean
  reminder_minutes?: number[]
  tags?: string[]
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can list events
    if (!['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to list calendar events',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const params: ListEventsParams = {
      start_date: url.searchParams.get('start_date') || undefined,
      end_date: url.searchParams.get('end_date') || undefined,
      matter_id: url.searchParams.get('matter_id') || undefined,
      client_id: url.searchParams.get('client_id') || undefined,
      event_type: url.searchParams.get('event_type') as EventType || undefined,
      event_category: url.searchParams.get('event_category') as EventCategory || undefined,
      status: url.searchParams.get('status') as EventStatus || undefined,
      assigned_attorney: url.searchParams.get('assigned_attorney') || undefined,
      search: url.searchParams.get('search') || undefined,
      upcoming_only: url.searchParams.get('upcoming_only') === 'true',
      limit: parseInt(url.searchParams.get('limit') || '100'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    }

    // Validate limit and offset
    if (params.limit && (params.limit < 1 || params.limit > 500)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_PARAMETER',
        'Limit must be between 1 and 500',
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
      .from('calendar_events')
      .select(`
        *,
        matter:matters!calendar_events_matter_id_fkey(
          id,
          matter_number,
          title,
          status
        ),
        client:clients!calendar_events_client_id_fkey(
          id,
          first_name,
          last_name,
          preferred_name,
          business_name,
          client_type
        ),
        organizer_profile:user_profiles!calendar_events_organizer_id_fkey(
          first_name,
          last_name,
          title
        ),
        assigned_attorney_profile:user_profiles!calendar_events_assigned_attorney_fkey(
          first_name,
          last_name,
          title
        ),
        assigned_paralegal_profile:user_profiles!calendar_events_assigned_paralegal_fkey(
          first_name,
          last_name,
          title
        ),
        created_by_profile:user_profiles!calendar_events_created_by_fkey(
          first_name,
          last_name,
          title
        )
      `)
      .is('deleted_at', null)
      .order('start_datetime', { ascending: true })

    // Apply role-based filtering
    if (user.role === 'assistant') {
      // Assistants can only see events for matters they have access to
      // This is handled by RLS, but we can add additional filtering here if needed
    } else if (['associate_attorney', 'paralegal'].includes(user.role)) {
      // Attorneys and paralegals see events they're assigned to or created
      query = query.or(`
        assigned_attorney.eq.${user.uid},
        assigned_paralegal.eq.${user.uid},
        organizer_id.eq.${user.uid},
        created_by.eq.${user.uid}
      `)
    }
    // Admins see all events (no additional filtering needed)

    // Apply filters
    if (params.start_date) {
      query = query.gte('start_datetime', params.start_date)
    }

    if (params.end_date) {
      query = query.lte('start_datetime', params.end_date)
    }

    if (params.matter_id) {
      query = query.eq('matter_id', params.matter_id)
    }

    if (params.client_id) {
      query = query.eq('client_id', params.client_id)
    }

    if (params.event_type) {
      query = query.eq('event_type', params.event_type)
    }

    if (params.event_category) {
      query = query.eq('event_category', params.event_category)
    }

    if (params.status) {
      query = query.eq('status', params.status)
    }

    if (params.assigned_attorney) {
      query = query.eq('assigned_attorney', params.assigned_attorney)
    }

    if (params.search) {
      query = query.or(`
        title.ilike.%${params.search}%,
        description.ilike.%${params.search}%,
        location.ilike.%${params.search}%,
        judge_name.ilike.%${params.search}%,
        court_name.ilike.%${params.search}%
      `)
    }

    if (params.upcoming_only) {
      const now = new Date().toISOString()
      query = query.gte('start_datetime', now)
    }

    // Apply pagination
    if (params.limit) {
      query = query.range(params.offset || 0, (params.offset || 0) + params.limit - 1)
    }

    let events = null
    let error = null
    let count = 0

    try {
      const result = await query
      events = result.data
      error = result.error
      count = result.count || 0
      
      // Check if database connection failed
      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock calendar event data')
        const mockEvents = [
          {
            id: 'event-1',
            title: 'Johnson Trust Signing',
            description: 'Final signing of trust documents with John and Mary Johnson',
            event_type: 'client_meeting',
            event_category: 'client',
            start_datetime: '2025-01-22T14:00:00Z',
            end_datetime: '2025-01-22T15:30:00Z',
            all_day: false,
            timezone: 'America/New_York',
            location: 'Law Office Conference Room A',
            location_type: 'office',
            virtual_meeting_url: null,
            virtual_meeting_id: null,
            room_or_courtroom: 'Conference Room A',
            matter_id: 'matter-1',
            client_id: 'client-1',
            case_number: null,
            judge_name: null,
            court_name: null,
            hearing_type: null,
            deadline_type: null,
            deadline_description: null,
            is_hard_deadline: false,
            deadline_consequence: null,
            is_recurring: false,
            recurrence_rule: null,
            recurrence_end_date: null,
            parent_event_id: null,
            organizer_id: 'user-1',
            assigned_attorney: 'user-1',
            assigned_paralegal: null,
            created_by: 'user-1',
            status: 'scheduled',
            confirmation_required: true,
            confirmed_by: null,
            confirmed_at: null,
            preparation_time_minutes: 30,
            travel_time_minutes: 0,
            estimated_duration_minutes: 90,
            preparation_notes: 'Review trust documents, bring execution copies',
            pre_event_checklist: [
              'Prepare execution copies',
              'Confirm client attendance',
              'Review trust terms'
            ],
            post_event_notes: null,
            outcome_summary: null,
            billable: true,
            billable_rate: 350,
            time_entry_id: null,
            estimated_hours: 1.5,
            actual_hours: null,
            reminder_enabled: true,
            reminder_minutes: [60, 15],
            tags: ['trust', 'signing', 'estate_planning'],
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            client: {
              id: 'client-1',
              first_name: 'John',
              last_name: 'Johnson',
              business_name: null,
              client_type: 'individual'
            },
            organizer_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            assigned_attorney_profile: {
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
            id: 'event-2',
            title: 'TechStart LLC Filing Deadline',
            description: 'Deadline to file LLC formation documents with Secretary of State',
            event_type: 'deadline',
            event_category: 'deadline',
            start_datetime: '2025-01-25T17:00:00Z',
            end_datetime: null,
            all_day: true,
            timezone: 'America/New_York',
            location: null,
            location_type: null,
            virtual_meeting_url: null,
            virtual_meeting_id: null,
            room_or_courtroom: null,
            matter_id: 'matter-2',
            client_id: 'client-2',
            case_number: null,
            judge_name: null,
            court_name: null,
            hearing_type: null,
            deadline_type: 'filing_deadline',
            deadline_description: 'File Articles of Organization with Secretary of State',
            is_hard_deadline: true,
            deadline_consequence: 'Business cannot operate legally',
            is_recurring: false,
            recurrence_rule: null,
            recurrence_end_date: null,
            parent_event_id: null,
            organizer_id: 'user-1',
            assigned_attorney: 'user-1',
            assigned_paralegal: null,
            created_by: 'user-1',
            status: 'scheduled',
            confirmation_required: false,
            confirmed_by: null,
            confirmed_at: null,
            preparation_time_minutes: 60,
            travel_time_minutes: 0,
            estimated_duration_minutes: null,
            preparation_notes: 'Prepare filing documents and fees',
            pre_event_checklist: [
              'Prepare Articles of Organization',
              'Calculate filing fees',
              'Prepare transmittal letter'
            ],
            post_event_notes: null,
            outcome_summary: null,
            billable: true,
            billable_rate: 350,
            time_entry_id: null,
            estimated_hours: 2,
            actual_hours: null,
            reminder_enabled: true,
            reminder_minutes: [1440, 60], // 1 day, 1 hour
            tags: ['deadline', 'filing', 'business_formation'],
            matter: {
              id: 'matter-2',
              matter_number: '2025-002',
              title: 'TechStart LLC Formation',
              status: 'active'
            },
            client: {
              id: 'client-2',
              first_name: null,
              last_name: null,
              business_name: 'TechStart LLC',
              client_type: 'business'
            },
            organizer_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            assigned_attorney_profile: {
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
            id: 'event-3',
            title: 'Probate Court Hearing - Williams Estate',
            description: 'Initial probate hearing for Williams estate administration',
            event_type: 'court_date',
            event_category: 'court',
            start_datetime: '2025-01-28T09:00:00Z',
            end_datetime: '2025-01-28T10:00:00Z',
            all_day: false,
            timezone: 'America/New_York',
            location: 'Probate Court, Room 302',
            location_type: 'courthouse',
            virtual_meeting_url: null,
            virtual_meeting_id: null,
            room_or_courtroom: 'Room 302',
            matter_id: 'matter-3',
            client_id: 'client-3',
            case_number: 'PR-2025-0123',
            judge_name: 'Hon. Sarah Martinez',
            court_name: 'County Probate Court',
            hearing_type: 'status_conference',
            deadline_type: null,
            deadline_description: null,
            is_hard_deadline: false,
            deadline_consequence: null,
            is_recurring: false,
            recurrence_rule: null,
            recurrence_end_date: null,
            parent_event_id: null,
            organizer_id: 'user-1',
            assigned_attorney: 'user-1',
            assigned_paralegal: null,
            created_by: 'user-1',
            status: 'scheduled',
            confirmation_required: true,
            confirmed_by: null,
            confirmed_at: null,
            preparation_time_minutes: 120,
            travel_time_minutes: 30,
            estimated_duration_minutes: 60,
            preparation_notes: 'Review estate inventory, prepare for questions',
            pre_event_checklist: [
              'Review case file',
              'Prepare estate inventory',
              'Check court calendar',
              'Confirm client attendance'
            ],
            post_event_notes: null,
            outcome_summary: null,
            billable: true,
            billable_rate: 350,
            time_entry_id: null,
            estimated_hours: 1,
            actual_hours: null,
            reminder_enabled: true,
            reminder_minutes: [1440, 120, 30], // 1 day, 2 hours, 30 minutes
            tags: ['court', 'probate', 'estate_administration'],
            matter: {
              id: 'matter-3',
              matter_number: '2025-003',
              title: 'Williams Estate Administration',
              status: 'active'
            },
            client: {
              id: 'client-3',
              first_name: 'Robert',
              last_name: 'Williams',
              business_name: null,
              client_type: 'individual'
            },
            organizer_profile: {
              first_name: 'Luke',
              last_name: 'Barry',
              title: 'Attorney'
            },
            assigned_attorney_profile: {
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
        let filteredEvents = mockEvents
        
        if (params.matter_id) {
          filteredEvents = filteredEvents.filter(e => e.matter_id === params.matter_id)
        }
        
        if (params.client_id) {
          filteredEvents = filteredEvents.filter(e => e.client_id === params.client_id)
        }
        
        if (params.event_type) {
          filteredEvents = filteredEvents.filter(e => e.event_type === params.event_type)
        }
        
        if (params.event_category) {
          filteredEvents = filteredEvents.filter(e => e.event_category === params.event_category)
        }
        
        if (params.status && params.status !== 'all') {
          filteredEvents = filteredEvents.filter(e => e.status === params.status)
        }
        
        if (params.assigned_attorney) {
          filteredEvents = filteredEvents.filter(e => e.assigned_attorney === params.assigned_attorney)
        }
        
        if (params.search) {
          const search = params.search.toLowerCase()
          filteredEvents = filteredEvents.filter(e => 
            e.title.toLowerCase().includes(search) ||
            (e.description && e.description.toLowerCase().includes(search)) ||
            (e.location && e.location.toLowerCase().includes(search)) ||
            (e.judge_name && e.judge_name.toLowerCase().includes(search)) ||
            (e.court_name && e.court_name.toLowerCase().includes(search))
          )
        }
        
        if (params.upcoming_only) {
          const now = new Date().toISOString()
          filteredEvents = filteredEvents.filter(e => e.start_datetime >= now)
        }
        
        if (params.start_date) {
          filteredEvents = filteredEvents.filter(e => e.start_datetime >= params.start_date!)
        }
        
        if (params.end_date) {
          filteredEvents = filteredEvents.filter(e => e.start_datetime <= params.end_date!)
        }
        
        // Apply pagination
        const offset = params.offset || 0
        const limit = params.limit || 100
        const paginatedEvents = filteredEvents.slice(offset, offset + limit)
        
        events = paginatedEvents
        count = filteredEvents.length
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve calendar events',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'calendar_events',
        action: 'list',
        filters: params,
        result_count: events?.length || 0
      }
    )

    return addCORSHeaders(createSuccessResponse({
      events,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: count,
        has_more: count ? (params.offset || 0) + events.length < count : false
      }
    }))

  } catch (error) {
    console.error('Calendar events list error:', error)
    
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
    
    // Check permissions - only certain roles can create events
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create calendar events',
        403
      ))
    }

    // Parse request body
    const eventData = await parseRequestBody<CreateEventRequest>(request)

    // Validate required fields
    if (!eventData.title || !eventData.event_type || !eventData.event_category || !eventData.start_datetime) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Title, event type, category, and start datetime are required',
        400
      ))
    }

    // Validate matter exists if provided
    if (eventData.matter_id) {
      let matter = null
      let matterError = null

      try {
        const result = await supabaseAdmin
          .from('matters')
          .select('id, matter_number, title')
          .eq('id', eventData.matter_id)
          .is('deleted_at', null)
          .single()

        matter = result.data
        matterError = result.error

        if (matterError && matterError.message && matterError.message.includes('fetch failed')) {
          throw new Error('Database connection failed')
        }
      } catch (dbError) {
        // Database connection failed - use mock matter in development
        if (isDevelopment && ['matter-1', 'matter-2', 'matter-3'].includes(eventData.matter_id)) {
          const mockMatters = {
            'matter-1': { id: 'matter-1', matter_number: '2025-001', title: 'Johnson Family Estate Planning' },
            'matter-2': { id: 'matter-2', matter_number: '2025-002', title: 'TechStart LLC Formation' },
            'matter-3': { id: 'matter-3', matter_number: '2025-003', title: 'Williams Estate Administration' }
          }
          matter = mockMatters[eventData.matter_id as keyof typeof mockMatters]
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

    // Validate client exists if provided
    if (eventData.client_id) {
      let client = null
      let clientError = null

      try {
        const result = await supabaseAdmin
          .from('clients')
          .select('id, first_name, last_name, business_name')
          .eq('id', eventData.client_id)
          .is('deleted_at', null)
          .single()

        client = result.data
        clientError = result.error

        if (clientError && clientError.message && clientError.message.includes('fetch failed')) {
          throw new Error('Database connection failed')
        }
      } catch (dbError) {
        // Database connection failed - use mock client in development
        if (isDevelopment && ['client-1', 'client-2', 'client-3'].includes(eventData.client_id)) {
          const mockClients = {
            'client-1': { id: 'client-1', first_name: 'John', last_name: 'Johnson', business_name: null },
            'client-2': { id: 'client-2', first_name: null, last_name: null, business_name: 'TechStart LLC' },
            'client-3': { id: 'client-3', first_name: 'Robert', last_name: 'Williams', business_name: null }
          }
          client = mockClients[eventData.client_id as keyof typeof mockClients]
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

    // Prepare event data for insertion
    const newEvent: CalendarEventInsert = {
      title: eventData.title.trim(),
      description: eventData.description?.trim() || null,
      event_type: eventData.event_type,
      event_category: eventData.event_category,
      start_datetime: eventData.start_datetime,
      end_datetime: eventData.end_datetime || null,
      all_day: eventData.all_day ?? false,
      timezone: eventData.timezone || 'America/New_York',
      location: eventData.location?.trim() || null,
      location_type: (eventData.location_type as 'in_person' | 'virtual' | 'hybrid' | 'court' | 'client_office' | 'law_firm') || null,
      virtual_meeting_url: eventData.virtual_meeting_url?.trim() || null,
      virtual_meeting_id: eventData.virtual_meeting_id?.trim() || null,
      room_or_courtroom: eventData.room_or_courtroom?.trim() || null,
      matter_id: eventData.matter_id || null,
      client_id: eventData.client_id || null,
      case_number: eventData.case_number?.trim() || null,
      judge_name: eventData.judge_name?.trim() || null,
      court_name: eventData.court_name?.trim() || null,
      hearing_type: (eventData.hearing_type as 'motion' | 'trial' | 'deposition' | 'conference' | 'hearing' | 'arbitration' | 'mediation') || null,
      deadline_type: (eventData.deadline_type as 'filing' | 'discovery' | 'response' | 'appeal' | 'payment' | 'statutory' | 'court_ordered' | 'contract') || null,
      deadline_description: eventData.deadline_description?.trim() || null,
      is_hard_deadline: eventData.is_hard_deadline ?? false,
      deadline_consequence: eventData.deadline_consequence?.trim() || null,
      is_recurring: eventData.is_recurring ?? false,
      recurrence_rule: eventData.recurrence_rule?.trim() || null,
      recurrence_end_date: eventData.recurrence_end_date || null,
      organizer_id: user.uid,
      assigned_attorney: eventData.assigned_attorney || null,
      assigned_paralegal: eventData.assigned_paralegal || null,
      created_by: user.uid,
      status: 'scheduled',
      confirmation_required: eventData.confirmation_required ?? false,
      preparation_time_minutes: eventData.preparation_time_minutes || 0,
      travel_time_minutes: eventData.travel_time_minutes || 0,
      estimated_duration_minutes: eventData.estimated_duration_minutes || null,
      preparation_notes: eventData.preparation_notes?.trim() || null,
      pre_event_checklist: eventData.pre_event_checklist || null,
      billable: eventData.billable ?? false,
      billable_rate: eventData.billable_rate || null,
      estimated_hours: eventData.estimated_hours || null,
      reminder_enabled: eventData.reminder_enabled ?? true,
      reminder_minutes: eventData.reminder_minutes || null,
      tags: eventData.tags || null
    }

    // Create the event
    let event = null
    let error = null

    try {
      const result = await supabaseAdmin
        .from('calendar_events')
        .insert(newEvent)
        .select(`
          *,
          matter:matters!calendar_events_matter_id_fkey(
            id,
            matter_number,
            title,
            status
          ),
          client:clients!calendar_events_client_id_fkey(
            id,
            first_name,
            last_name,
            preferred_name,
            business_name,
            client_type
          )
        `)
        .single()

      event = result.data
      error = result.error

      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - create mock event in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock calendar event')
        event = {
          id: `event-${Date.now()}`,
          ...newEvent,
          matter: newEvent.matter_id ? {
            id: newEvent.matter_id,
            matter_number: 'TEST-001',
            title: 'Test Matter',
            status: 'active'
          } : null,
          client: newEvent.client_id ? {
            id: newEvent.client_id,
            first_name: 'Test',
            last_name: 'Client',
            preferred_name: null,
            business_name: null,
            client_type: 'individual'
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
      console.error('Database error creating calendar event:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create calendar event',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'calendar_events',
        action: 'create',
        event_id: event.id,
        event_title: event.title
      }
    )

    return addCORSHeaders(createSuccessResponse({
      event,
      message: 'Calendar event created successfully'
    }))

  } catch (error) {
    console.error('Calendar event creation error:', error)
    
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