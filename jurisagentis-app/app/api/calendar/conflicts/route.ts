/**
 * Calendar Conflicts API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDatabaseResponse } from '@/lib/utils/api-helpers'

// POST /api/calendar/conflicts - Check for calendar conflicts
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Unauthorized', 'AUTH_ERROR'),
        { status: 401 }
      )
    }

    const { 
      event_start,
      event_end,
      attendee_user_ids,
      exclude_event_id 
    } = await request.json()

    // Validate required fields
    if (!event_start || !event_end || !attendee_user_ids || !Array.isArray(attendee_user_ids)) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Missing required fields: event_start, event_end, attendee_user_ids', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // Use the database function to check conflicts
    const { data: conflicts, error } = await supabase
      .rpc('check_calendar_conflicts', {
        event_start,
        event_end,
        attendee_user_ids,
        exclude_event_id: exclude_event_id || null
      })

    if (error) {
      console.error('Database error checking conflicts:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to check calendar conflicts', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    // Group conflicts by attendee
    const conflictsByAttendee = conflicts?.reduce((acc: any, conflict: any) => {
      const attendeeId = conflict.conflicted_attendee_id
      if (!acc[attendeeId]) {
        acc[attendeeId] = []
      }
      acc[attendeeId].push({
        event_id: conflict.conflict_event_id,
        title: conflict.conflict_title,
        start_datetime: conflict.conflict_start,
        end_datetime: conflict.conflict_end
      })
      return acc
    }, {}) || {}

    const hasConflicts = Object.keys(conflictsByAttendee).length > 0

    return NextResponse.json(
      createDatabaseResponse(
        {
          has_conflicts: hasConflicts,
          conflicts_by_attendee: conflictsByAttendee,
          total_conflicts: conflicts?.length || 0
        },
        hasConflicts 
          ? `Found ${conflicts?.length || 0} calendar conflicts`
          : 'No calendar conflicts found',
        'SUCCESS'
      )
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/calendar/conflicts:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}