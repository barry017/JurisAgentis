/**
 * Cases API - CRUD operations for case management
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const caseType = searchParams.get('case_type') || 'all'
    const assignedAttorney = searchParams.get('assigned_attorney') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build the query
    let query = supabase
      .from('cases')
      .select(`
        *,
        primary_client:clients!primary_client_id(
          id,
          first_name,
          last_name,
          entity_name,
          email,
          phone_primary
        ),
        assigned_attorney_profile:user_profiles!assigned_attorney(
          uid,
          first_name,
          last_name,
          email
        ),
        assigned_paralegal_profile:user_profiles!assigned_paralegal(
          uid,
          first_name,
          last_name,
          email
        )
      `)

    // Apply filters
    if (search) {
      query = query.or(`case_number.ilike.%${search}%,title.ilike.%${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (caseType !== 'all') {
      query = query.eq('case_type', caseType)
    }

    if (assignedAttorney !== 'all') {
      query = query.eq('assigned_attorney', assignedAttorney)
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: cases, error, count } = await query
    
    // Count would be used for pagination metadata in a full implementation
    console.log('Total cases count:', count)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: { message: 'Failed to fetch cases', details: error.message }
      }, { status: 500 })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      success: true,
      data: {
        cases: cases || [],
        pagination: {
          limit,
          offset,
          total: totalCount || 0,
          has_more: (offset + limit) < (totalCount || 0)
        }
      }
    })

  } catch (error) {
    console.error('Cases API error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.title || !body.primary_client_id || !body.case_type) {
      return NextResponse.json({
        success: false,
        error: { message: 'Missing required fields: title, primary_client_id, case_type' }
      }, { status: 400 })
    }

    // Generate case number
    const { data: lastCase } = await supabase
      .from('cases')
      .select('case_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let caseNumber = 'CASE-2025-001'
    if (lastCase?.case_number) {
      const match = lastCase.case_number.match(/CASE-(\d{4})-(\d{3})/)
      if (match) {
        const year = new Date().getFullYear()
        const currentYear = parseInt(match[1])
        const number = parseInt(match[2])
        
        if (year === currentYear) {
          caseNumber = `CASE-${year}-${String(number + 1).padStart(3, '0')}`
        } else {
          caseNumber = `CASE-${year}-001`
        }
      }
    }

    const caseData = {
      case_number: caseNumber,
      title: body.title,
      description: body.description || null,
      case_type: body.case_type,
      status: body.status || 'intake',
      primary_client_id: body.primary_client_id,
      assigned_attorney: body.assigned_attorney || null,
      assigned_paralegal: body.assigned_paralegal || null,
      assigned_assistant: body.assigned_assistant || null,
      opened_date: body.opened_date || new Date().toISOString().split('T')[0],
      statute_of_limitations: body.statute_of_limitations || null,
      estimated_completion: body.estimated_completion || null,
      flat_fee_amount: body.flat_fee_amount || null,
      hourly_rate: body.hourly_rate || null,
      retainer_amount: body.retainer_amount || null,
      billing_type: body.billing_type || 'flat_fee',
      court_case_number: body.court_case_number || null,
      opposing_party: body.opposing_party || null,
      opposing_counsel: body.opposing_counsel || null,
      jurisdiction: body.jurisdiction || null,
      priority: body.priority || 'normal',
      complexity: body.complexity || 'medium',
      tags: body.tags || null,
      custom_fields: body.custom_fields || {},
      notes: body.notes || null,
      internal_notes: body.internal_notes || null,
      created_by: body.created_by || null
    }

    const { data, error } = await supabase
      .from('cases')
      .insert(caseData)
      .select(`
        *,
        primary_client:clients!primary_client_id(
          id,
          first_name,
          last_name,
          entity_name,
          email,
          phone_primary
        )
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: { message: 'Failed to create case', details: error.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { case: data }
    }, { status: 201 })

  } catch (error) {
    console.error('Cases API POST error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}