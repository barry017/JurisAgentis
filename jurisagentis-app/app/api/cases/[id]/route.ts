/**
 * Individual Case API - CRUD operations for specific cases
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: caseData, error } = await supabase
      .from('cases')
      .select(`
        *,
        primary_client:clients!primary_client_id(
          id,
          first_name,
          last_name,
          entity_name,
          email,
          phone_primary,
          phone_secondary,
          address_primary
        ),
        assigned_attorney_profile:user_profiles!assigned_attorney(
          uid,
          first_name,
          last_name,
          email,
          title
        ),
        assigned_paralegal_profile:user_profiles!assigned_paralegal(
          uid,
          first_name,
          last_name,
          email,
          title
        ),
        assigned_assistant_profile:user_profiles!assigned_assistant(
          uid,
          first_name,
          last_name,
          email,
          title
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: { message: 'Case not found' }
        }, { status: 404 })
      }

      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: { message: 'Failed to fetch case', details: error.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { case: caseData }
    })

  } catch (error) {
    console.error('Case GET API error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Remove read-only fields
    const { id: _, case_number: _case_number, created_at: _created_at, updated_at: _updated_at, ...updateData } = body

    const { data, error } = await supabase
      .from('cases')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: false,
          error: { message: 'Case not found' }
        }, { status: 404 })
      }

      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: { message: 'Failed to update case', details: error.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { case: data }
    })

  } catch (error) {
    console.error('Case PUT API error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabase
      .from('cases')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        success: false,
        error: { message: 'Failed to delete case', details: error.message }
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Case deleted successfully' }
    })

  } catch (error) {
    console.error('Case DELETE API error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}