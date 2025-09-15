/**
 * Workflow Executions API
 * 
 * Handles workflow execution operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const template_id = searchParams.get('template_id')
    const client_id = searchParams.get('client_id')
    const matter_id = searchParams.get('matter_id')

    let query = supabaseServer
      .from('workflow_executions')
      .select(`
        *,
        workflow_template:workflow_templates(
          template_name,
          category
        ),
        client:clients(
          first_name,
          last_name,
          business_name
        ),
        matter:matters(
          matter_number,
          title
        )
      `)

    if (status) {
      query = query.eq('status', status)
    }

    if (template_id) {
      query = query.eq('template_id', template_id)
    }

    if (client_id) {
      query = query.eq('client_id', client_id)
    }

    if (matter_id) {
      query = query.eq('matter_id', matter_id)
    }

    const { data: executions, error } = await query.order('started_at', { ascending: false })

    if (error) {
      console.error('Error fetching workflow executions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workflow executions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      executions: executions || []
    })

  } catch (error) {
    console.error('Workflow executions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      template_id,
      client_id,
      matter_id,
      execution_name,
      input_data = {},
      priority = 'medium'
    } = body

    // Validate required fields
    if (!template_id || !execution_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get template to validate and extract workflow definition
    const { data: template, error: templateError } = await supabaseServer
      .from('workflow_templates')
      .select('*')
      .eq('id', template_id)
      .single()

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Workflow template not found' },
        { status: 404 }
      )
    }

    if (!template.is_active) {
      return NextResponse.json(
        { error: 'Workflow template is not active' },
        { status: 400 }
      )
    }

    // Calculate total steps from workflow definition
    const workflowSteps = template.workflow_definition?.steps || []
    const total_steps = workflowSteps.length

    // Create execution record
    const { data: execution, error } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        template_id,
        client_id,
        matter_id,
        execution_name,
        status: 'pending',
        current_step: 0,
        total_steps,
        completion_percentage: 0,
        input_data,
        priority,
        estimated_duration_minutes: template.estimated_duration_minutes || 30,
        started_at: new Date().toISOString()
      })
      .select(`
        *,
        workflow_template:workflow_templates(
          template_name,
          category
        ),
        client:clients(
          first_name,
          last_name,
          business_name
        ),
        matter:matters(
          matter_number,
          title
        )
      `)
      .single()

    if (error) {
      console.error('Error creating workflow execution:', error)
      return NextResponse.json(
        { error: 'Failed to create workflow execution' },
        { status: 500 }
      )
    }

    // Update template execution count
    await supabaseAdmin
      .from('workflow_templates')
      .update({
        execution_count: template.execution_count + 1,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', template_id)

    // If auto-execute is enabled, start the workflow immediately
    if (template.auto_execute) {
      // This would trigger the workflow engine in a real implementation
      await supabaseAdmin
        .from('workflow_executions')
        .update({ status: 'running' })
        .eq('id', execution.id)
    }

    return NextResponse.json({
      success: true,
      execution
    }, { status: 201 })

  } catch (error) {
    console.error('Workflow executions POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}