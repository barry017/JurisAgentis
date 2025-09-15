/**
 * Deadline Calculation API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDatabaseResponse } from '@/lib/utils/api-helpers'

// POST /api/calendar/deadlines/calculate - Calculate deadline dates
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
      trigger_date,
      deadline_days,
      business_days_only = true,
      jurisdiction = 'federal'
    } = await request.json()

    // Validate required fields
    if (!trigger_date || !deadline_days) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Missing required fields: trigger_date, deadline_days', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // Use the database function to calculate deadline
    const { data: result, error } = await supabase
      .rpc('calculate_deadline_date', {
        trigger_date,
        deadline_days,
        business_days_only,
        jurisdiction_param: jurisdiction
      })

    if (error) {
      console.error('Database error calculating deadline:', error)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to calculate deadline', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    // Also calculate business days for reference
    const { data: businessDays, error: businessDaysError } = await supabase
      .rpc('calculate_business_days', {
        start_date: trigger_date,
        end_date: result,
        jurisdiction_param: jurisdiction,
        exclude_holidays: true
      })

    if (businessDaysError) {
      console.error('Error calculating business days:', businessDaysError)
    }

    // Get holidays that affect this period
    const { data: affectingHolidays } = await supabase
      .from('holidays')
      .select('holiday_name, holiday_date, holiday_type')
      .gte('holiday_date', trigger_date)
      .lte('holiday_date', result)
      .eq('is_active', true)
      .or(`jurisdiction.eq.${jurisdiction},jurisdiction.eq.federal`)
      .eq('affects_filing_deadlines', true)
      .order('holiday_date')

    return NextResponse.json(
      createDatabaseResponse(
        {
          deadline_date: result,
          trigger_date,
          deadline_days,
          business_days_only,
          jurisdiction,
          actual_business_days: businessDays || 0,
          affecting_holidays: affectingHolidays || []
        },
        'Deadline calculated successfully',
        'SUCCESS'
      )
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/calendar/deadlines/calculate:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}