/**
 * Calendar Events API Endpoints
 * 
 * Handles calendar events with mock data fallback
 */

import { NextRequest, NextResponse } from 'next/server'

// GET /api/calendar/events - List calendar events with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const eventType = searchParams.get('event_type')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const matterId = searchParams.get('matter_id')
    const clientId = searchParams.get('client_id')
    const assignedAttorney = searchParams.get('assigned_attorney')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Log filter parameters for development/debugging
    console.log('Calendar events filter params:', { matterId, clientId, assignedAttorney })
    
    // Use mock data for development
    const mockEvents = getMockCalendarEvents()
    const filteredMockEvents = mockEvents.filter(event => {
      if (eventType && eventType !== 'all' && event.event_type !== eventType) return false
      if (status && status !== 'all' && event.status !== status) return false
      if (priority && priority !== 'all' && event.priority !== priority) return false
      if (startDate && new Date(event.start_datetime) < new Date(startDate)) return false
      if (endDate && new Date(event.start_datetime) > new Date(endDate)) return false
      return true
    })
    
    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Calendar events retrieved successfully',
      data: filteredMockEvents.slice(offset, offset + limit),
      total_count: filteredMockEvents.length,
      limit,
      offset
    })

  } catch (error) {
    console.error('Calendar events API error:', error)
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Internal server error',
        data: []
      },
      { status: 500 }
    )
  }
}

// POST /api/calendar/events - Create new calendar event
export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json()
    
    // Simple validation
    if (!eventData.title || !eventData.start_datetime || !eventData.event_type) {
      return NextResponse.json(
        { 
          status: 'ERROR',
          message: 'Missing required fields: title, start_datetime, event_type',
          data: null
        },
        { status: 400 }
      )
    }
    
    // Mock created event
    const newEvent = {
      id: Date.now().toString(),
      ...eventData,
      created_at: new Date().toISOString()
    }
    
    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Calendar event created successfully',
      data: newEvent
    }, { status: 201 })

  } catch (error) {
    console.error('Calendar events POST API error:', error)
    return NextResponse.json(
      { 
        status: 'ERROR',
        message: 'Internal server error',
        data: null
      },
      { status: 500 }
    )
  }
}

// Mock calendar events for development/fallback
function getMockCalendarEvents() {
  return [
    {
      id: '1',
      title: 'Smith Trust Signing Ceremony',
      description: 'Final execution of revocable living trust documents with John and Mary Smith',
      event_type: 'client_meeting',
      event_category: 'client',
      start_datetime: '2025-01-16T14:00:00Z',
      end_datetime: '2025-01-16T15:30:00Z',
      all_day: false,
      location: 'JurisAgentis Conference Room',
      location_type: 'office',
      virtual_meeting_url: null,
      matter: {
        id: 'matter-1',
        matter_number: '2025-001',
        title: 'Smith Family Estate Planning'
      },
      client: {
        id: 'client-1',
        first_name: 'John',
        last_name: 'Smith',
        business_name: null
      },
      case_number: null,
      judge_name: null,
      court_name: null,
      hearing_type: null,
      deadline_type: null,
      is_hard_deadline: false,
      status: 'confirmed',
      priority: 'high',
      reminder_enabled: true,
      billable: true,
      visibility: 'internal',
      assigned_attorney: {
        first_name: 'Sarah',
        last_name: 'Johnson'
      },
      created_at: '2025-01-10T09:00:00Z'
    },
    {
      id: '2',
      title: 'Probate Court Hearing - Johnson Estate',
      description: 'Initial probate hearing for the estate of Robert Johnson',
      event_type: 'court_date',
      event_category: 'court',
      start_datetime: '2025-01-17T10:00:00Z',
      end_datetime: '2025-01-17T11:00:00Z',
      all_day: false,
      location: 'Jefferson County Probate Court',
      location_type: 'courthouse',
      virtual_meeting_url: null,
      matter: {
        id: 'matter-2',
        matter_number: '2025-002',
        title: 'Johnson Estate Administration'
      },
      client: {
        id: 'client-2',
        first_name: 'Linda',
        last_name: 'Johnson',
        business_name: null
      },
      case_number: 'PR-2025-00123',
      judge_name: 'Hon. Patricia Williams',
      court_name: 'Jefferson County Probate Court',
      hearing_type: 'Initial Hearing',
      deadline_type: null,
      is_hard_deadline: true,
      status: 'scheduled',
      priority: 'urgent',
      reminder_enabled: true,
      billable: true,
      visibility: 'internal',
      assigned_attorney: {
        first_name: 'Michael',
        last_name: 'Chen'
      },
      created_at: '2025-01-08T16:30:00Z'
    },
    {
      id: '3',
      title: 'Federal Tax Return Deadline',
      description: 'Final deadline for filing estate tax return for Thompson Estate',
      event_type: 'deadline',
      event_category: 'deadline',
      start_datetime: '2025-01-20T23:59:00Z',
      end_datetime: null,
      all_day: true,
      location: null,
      location_type: null,
      virtual_meeting_url: null,
      matter: {
        id: 'matter-3',
        matter_number: '2024-087',
        title: 'Thompson Estate Tax Planning'
      },
      client: {
        id: 'client-3',
        first_name: 'Estate of William',
        last_name: 'Thompson',
        business_name: null
      },
      case_number: null,
      judge_name: null,
      court_name: null,
      hearing_type: null,
      deadline_type: 'tax_filing',
      is_hard_deadline: true,
      status: 'scheduled',
      priority: 'urgent',
      reminder_enabled: true,
      billable: true,
      visibility: 'internal',
      assigned_attorney: {
        first_name: 'Sarah',
        last_name: 'Johnson'
      },
      created_at: '2024-12-20T10:15:00Z'
    },
    {
      id: '4',
      title: 'Client Consultation - Business Formation',
      description: 'Initial consultation with Tech Startup LLC for business formation and investment agreements',
      event_type: 'client_meeting',
      event_category: 'client',
      start_datetime: '2025-01-18T09:30:00Z',
      end_datetime: '2025-01-18T10:30:00Z',
      all_day: false,
      location: 'Video Conference',
      location_type: 'virtual',
      virtual_meeting_url: 'https://zoom.us/j/123456789',
      matter: null,
      client: {
        id: 'client-4',
        first_name: 'David',
        last_name: 'Rodriguez',
        business_name: 'Tech Startup LLC'
      },
      case_number: null,
      judge_name: null,
      court_name: null,
      hearing_type: null,
      deadline_type: null,
      is_hard_deadline: false,
      status: 'confirmed',
      priority: 'normal',
      reminder_enabled: true,
      billable: true,
      visibility: 'internal',
      assigned_attorney: {
        first_name: 'Maria',
        last_name: 'Rodriguez'
      },
      created_at: '2025-01-12T14:20:00Z'
    },
    {
      id: '5',
      title: 'Internal Team Meeting',
      description: 'Weekly case review and workflow planning session',
      event_type: 'internal_meeting',
      event_category: 'administrative',
      start_datetime: '2025-01-21T16:00:00Z',
      end_datetime: '2025-01-21T17:00:00Z',
      all_day: false,
      location: 'Main Conference Room',
      location_type: 'office',
      virtual_meeting_url: null,
      matter: null,
      client: null,
      case_number: null,
      judge_name: null,
      court_name: null,
      hearing_type: null,
      deadline_type: null,
      is_hard_deadline: false,
      status: 'scheduled',
      priority: 'normal',
      reminder_enabled: true,
      billable: false,
      visibility: 'internal',
      assigned_attorney: null,
      created_at: '2025-01-13T11:45:00Z'
    },
    {
      id: '6',
      title: 'Document Review Deadline',
      description: 'Final review of merger agreement documents before client signature',
      event_type: 'task_due',
      event_category: 'deadline',
      start_datetime: '2025-01-19T17:00:00Z',
      end_datetime: null,
      all_day: false,
      location: null,
      location_type: null,
      virtual_meeting_url: null,
      matter: {
        id: 'matter-4',
        matter_number: '2025-004',
        title: 'ABC Corp Merger Agreement'
      },
      client: {
        id: 'client-5',
        first_name: 'Corporate',
        last_name: 'Client',
        business_name: 'ABC Corporation'
      },
      case_number: null,
      judge_name: null,
      court_name: null,
      hearing_type: null,
      deadline_type: 'document_review',
      is_hard_deadline: false,
      status: 'scheduled',
      priority: 'high',
      reminder_enabled: true,
      billable: true,
      visibility: 'internal',
      assigned_attorney: {
        first_name: 'Michael',
        last_name: 'Chen'
      },
      created_at: '2025-01-11T13:00:00Z'
    }
  ]
}