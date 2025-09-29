/**
 * Individual Workflow Template API
 * 
 * Handles operations on specific workflow templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: template, error } = await supabaseServer
      .from('workflow_templates')
      .select(`
        *,
        created_by:users!workflow_templates_created_by_fkey(
          first_name,
          last_name
        )
      `)
      .eq('id', id)
      .single()

    if (error || !template) {
      return NextResponse.json(
        { error: 'Workflow template not found' },
        { status: 404 }
      )
    }

    // Get recent executions for this template
    const { data: recentExecutions } = await supabaseServer
      .from('workflow_executions')
      .select(`
        id,
        execution_name,
        status,
        completion_percentage,
        started_at,
        completed_at,
        client:clients(first_name, last_name, business_name)
      `)
      .eq('template_id', id)
      .order('started_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        recent_executions: recentExecutions || []
      }
    })

  } catch (error) {
    console.error('Workflow template GET API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const {
      template_name,
      description,
      category,
      practice_area,
      trigger_event,
      workflow_definition,
      auto_execute,
      is_active
    } = body

    // Get existing template to check permissions
    const { data: existing, error: fetchError } = await supabaseServer
      .from('workflow_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Workflow template not found' },
        { status: 404 }
      )
    }

    // Update template
    const { data: template, error } = await supabaseAdmin
      .from('workflow_templates')
      .update({
        template_name,
        description,
        category,
        practice_area,
        trigger_event,
        workflow_definition,
        auto_execute,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        created_by:users!workflow_templates_created_by_fkey(
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      console.error('Error updating workflow template:', error)
      return NextResponse.json(
        { error: 'Failed to update workflow template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    })

  } catch (error) {
    console.error('Workflow template PUT API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if template has any active executions
    const { data: activeExecutions, error: executionError } = await supabaseServer
      .from('workflow_executions')
      .select('id')
      .eq('template_id', id)
      .in('status', ['pending', 'running', 'paused'])

    if (executionError) {
      console.error('Error checking active executions:', executionError)
      return NextResponse.json(
        { error: 'Failed to check active executions' },
        { status: 500 }
      )
    }

    if (activeExecutions && activeExecutions.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete template with active executions' },
        { status: 400 }
      )
    }

    // Soft delete the template
    const { error } = await supabaseAdmin
      .from('workflow_templates')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error deleting workflow template:', error)
      return NextResponse.json(
        { error: 'Failed to delete workflow template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow template deleted successfully'
    })

  } catch (error) {
    console.error('Workflow template DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}