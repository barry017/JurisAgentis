/**
 * Workflow Run API
 * 
 * Handles running/executing workflow templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'

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
    if (!template_id) {
      return NextResponse.json(
        { error: 'template_id is required' },
        { status: 400 }
      )
    }

    // Get template
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

    // Generate execution name if not provided
    const finalExecutionName = execution_name || 
      `${template.template_name} - ${new Date().toLocaleString()}`

    // Calculate total steps
    const workflowSteps = template.workflow_definition?.steps || []
    const total_steps = workflowSteps.length

    // Create execution record
    const { data: execution, error: executionError } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        template_id,
        client_id,
        matter_id,
        execution_name: finalExecutionName,
        status: 'running',
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
          category,
          workflow_definition
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

    if (executionError) {
      console.error('Error creating workflow execution:', executionError)
      return NextResponse.json(
        { error: 'Failed to create workflow execution' },
        { status: 500 }
      )
    }

    // Create initial workflow steps
    if (workflowSteps.length > 0) {
      const steps = workflowSteps.map((step: { name: string; type: string; config?: Record<string, unknown> }, index: number) => ({
        execution_id: execution.id,
        step_number: index + 1,
        step_name: step.name,
        step_type: step.type,
        step_config: step.config || {},
        status: index === 0 ? 'pending' : 'waiting',
        created_at: new Date().toISOString()
      }))

      await supabaseAdmin
        .from('workflow_execution_steps')
        .insert(steps)
    }

    // Log execution start
    await supabaseAdmin
      .from('workflow_execution_logs')
      .insert({
        execution_id: execution.id,
        level: 'info',
        message: 'Workflow execution started',
        logged_at: new Date().toISOString()
      })

    // Update template stats
    await supabaseAdmin
      .from('workflow_templates')
      .update({
        execution_count: template.execution_count + 1,
        last_executed_at: new Date().toISOString()
      })
      .eq('id', template_id)

    // In a real implementation, this would trigger the workflow engine
    // For demo purposes, we'll simulate the first step completion
    if (workflowSteps.length > 0) {
      setTimeout(async () => {
        try {
          // Simulate first step completion after 2 seconds
          const completion = Math.round((1 / total_steps) * 100)
          
          await supabaseAdmin
            .from('workflow_executions')
            .update({
              current_step: 1,
              completion_percentage: completion
            })
            .eq('id', execution.id)

          await supabaseAdmin
            .from('workflow_execution_steps')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('execution_id', execution.id)
            .eq('step_number', 1)

          await supabaseAdmin
            .from('workflow_execution_logs')
            .insert({
              execution_id: execution.id,
              level: 'info',
              message: `Step 1 completed: ${workflowSteps[0].name}`,
              logged_at: new Date().toISOString()
            })
        } catch (error) {
          console.error('Error simulating step completion:', error)
        }
      }, 2000)
    }

    return NextResponse.json({
      success: true,
      execution,
      message: 'Workflow execution started successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Workflow run API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}