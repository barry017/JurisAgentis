/**
 * Individual Calendar Event API Endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDatabaseResponse } from '@/lib/utils/api-helpers'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// GET /api/calendar/events/[id] - Get specific calendar event
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      )
    }

    const { data: event, error } = await supabase
      .from('calendar_events')
      .select(`
        *,
        matters:matter_id(id, matter_number, title),
        clients:client_id(id, first_name, last_name, business_name),
        organizer:organizer_id(first_name, last_name, email),
        assigned_attorney_profile:assigned_attorney(first_name, last_name),
        assigned_paralegal_profile:assigned_paralegal(first_name, last_name),
        event_attendees(
          id,
          attendee_type,
          name,
          email,
          attendance_status,
          user_profiles:user_id(first_name, last_name),
          clients:client_id(first_name, last_name, business_name)
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          createDatabaseResponse(null, 'Calendar event not found', 'NOT_FOUND'),
          { status: 404 }
        )
      }
      console.error('Database error fetching event:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to fetch calendar event', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createDatabaseResponse(event, 'Calendar event retrieved successfully', 'SUCCESS')
    )

  } catch (error) {
    console.error('Unexpected error in GET /api/calendar/events/[id]:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

// PUT /api/calendar/events/[id] - Update calendar event
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      )
    }

    // Get user profile for permission check
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('uid', user.id)
      .single()

    if (!userProfile || !['admin', 'associate_attorney', 'paralegal'].includes(userProfile.role)) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Insufficient permissions', 'PERMISSION_DENIED'),
        { status: 403 }
      )
    }

    const eventData = await request.json()

    // Check if event exists and user has access
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, organizer_id, assigned_attorney, created_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Calendar event not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    // Check if user can edit this event (organizer, assigned attorney, or admin)
    const canEdit = userProfile.role === 'admin' || 
                   existingEvent.organizer_id === user.id ||
                   existingEvent.assigned_attorney === user.id ||
                   existingEvent.created_by === user.id

    if (!canEdit) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Cannot edit this calendar event', 'PERMISSION_DENIED'),
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData = {
      ...eventData,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }

    // Remove read-only fields
    delete updateData.id
    delete updateData.created_at
    delete updateData.created_by

    const { data: updatedEvent, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        title,
        description,
        event_type,
        start_datetime,
        end_datetime,
        status,
        updated_at
      `)
      .single()

    if (error) {
      console.error('Database error updating event:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to update calendar event', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createDatabaseResponse(updatedEvent, 'Calendar event updated successfully', 'SUCCESS')
    )

  } catch (error) {
    console.error('Unexpected error in PUT /api/calendar/events/[id]:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

// DELETE /api/calendar/events/[id] - Soft delete calendar event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      )
    }

    // Get user profile for permission check
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('uid', user.id)
      .single()

    if (!userProfile || !['admin', 'associate_attorney'].includes(userProfile.role)) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Insufficient permissions to delete events', 'PERMISSION_DENIED'),
        { status: 403 }
      )
    }

    // Check if event exists
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('id, title')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Calendar event not found', 'NOT_FOUND'),
        { status: 404 }
      )
    }

    // Soft delete the event
    const { error } = await supabase
      .from('calendar_events')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Database error deleting event:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to delete calendar event', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createDatabaseResponse(
        { id: id, title: existingEvent.title }, 
        'Calendar event deleted successfully', 
        'SUCCESS'
      )
    )

  } catch (error) {
    console.error('Unexpected error in DELETE /api/calendar/events/[id]:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}