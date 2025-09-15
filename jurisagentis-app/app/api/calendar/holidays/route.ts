/**
 * Calendar Holidays API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDatabaseResponse } from '@/lib/utils/api-helpers'

// GET /api/calendar/holidays - Get holidays for deadline calculations
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString())
    const jurisdiction = searchParams.get('jurisdiction') || 'federal'
    const holidayType = searchParams.get('type') || 'all'

    let query = supabase
      .from('holidays')
      .select('*')
      .eq('year', year)
      .eq('is_active', true)
      .order('holiday_date', { ascending: true })

    if (jurisdiction !== 'all') {
      query = query.or(`jurisdiction.eq.${jurisdiction},jurisdiction.eq.federal`)
    }

    if (holidayType !== 'all') {
      query = query.eq('holiday_type', holidayType)
    }

    const { data: holidays, error } = await query

    if (error) {
      console.error('Database error fetching holidays:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to fetch holidays', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createDatabaseResponse(holidays, 'Holidays retrieved successfully', 'SUCCESS')
    )

  } catch (error) {
    console.error('Unexpected error in GET /api/calendar/holidays:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

// POST /api/calendar/holidays - Create custom holiday
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

    // Get user profile for permission check
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('uid', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        createDatabaseResponse(null, 'Admin access required', 'PERMISSION_DENIED'),
        { status: 403 }
      )
    }

    const holidayData = await request.json()

    // Validate required fields
    if (!holidayData.holiday_name || !holidayData.holiday_date || !holidayData.holiday_type) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Missing required fields: holiday_name, holiday_date, holiday_type', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // Extract year from holiday date
    const holidayDate = new Date(holidayData.holiday_date)
    const year = holidayDate.getFullYear()

    const newHoliday = {
      holiday_name: holidayData.holiday_name,
      holiday_type: holidayData.holiday_type,
      jurisdiction: holidayData.jurisdiction || 'custom',
      holiday_date: holidayData.holiday_date,
      observed_date: holidayData.observed_date || null,
      year,
      is_recurring: holidayData.is_recurring || false,
      affects_filing_deadlines: holidayData.affects_filing_deadlines ?? true,
      affects_court_sessions: holidayData.affects_court_sessions ?? true,
      court_closed: holidayData.court_closed ?? true,
      created_by: user.id
    }

    const { data: holiday, error } = await supabase
      .from('holidays')
      .insert([newHoliday])
      .select('*')
      .single()

    if (error) {
      console.error('Database error creating holiday:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to create holiday', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    return NextResponse.json(
      createDatabaseResponse(holiday, 'Holiday created successfully', 'SUCCESS'),
      { status: 201 }
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/calendar/holidays:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}