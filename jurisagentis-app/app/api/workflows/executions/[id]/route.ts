/**
 * Individual Workflow Execution API
 * 
 * Handles operations on specific workflow executions
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: execution, error } = await supabaseServer
      .from('workflow_executions')
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
          business_name,
          email,
          phone
        ),
        matter:matters(
          matter_number,
          title,
          description
        )
      `)
      .eq('id', id)
      .single()

    if (error || !execution) {
      return NextResponse.json(
        { error: 'Workflow execution not found' },
        { status: 404 }
      )
    }

    // Get execution steps
    const { data: steps } = await supabaseServer
      .from('workflow_execution_steps')
      .select('*')
      .eq('execution_id', id)
      .order('step_number')

    // Get execution logs
    const { data: logs } = await supabaseServer
      .from('workflow_execution_logs')
      .select('*')
      .eq('execution_id', id)
      .order('logged_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      success: true,
      execution: {
        ...execution,
        steps: steps || [],
        logs: logs || []
      }
    })

  } catch (error) {
    console.error('Workflow execution GET API error:', error)
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
    
    const { action } = body

    // Get existing execution
    const { data: execution, error: fetchError } = await supabaseServer
      .from('workflow_executions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !execution) {
      return NextResponse.json(
        { error: 'Workflow execution not found' },
        { status: 404 }
      )
    }

    const updateData: { status?: string; paused_at?: string; resumed_at?: string; completed_at?: string; error?: string } = {}
    let logMessage = ''

    switch (action) {
      case 'pause':
        if (execution.status !== 'running') {
          return NextResponse.json(
            { error: 'Can only pause running executions' },
            { status: 400 }
          )
        }
        updateData.status = 'paused'
        updateData.paused_at = new Date().toISOString()
        logMessage = 'Execution paused by user'
        break

      case 'resume':
        if (execution.status !== 'paused') {
          return NextResponse.json(
            { error: 'Can only resume paused executions' },
            { status: 400 }
          )
        }
        updateData.status = 'running'
        updateData.paused_at = null
        logMessage = 'Execution resumed by user'
        break

      case 'cancel':
        if (!['pending', 'running', 'paused'].includes(execution.status)) {
          return NextResponse.json(
            { error: 'Can only cancel active executions' },
            { status: 400 }
          )
        }
        updateData.status = 'cancelled'
        updateData.completed_at = new Date().toISOString()
        updateData.actual_duration_minutes = execution.started_at 
          ? Math.round((new Date().getTime() - new Date(execution.started_at).getTime()) / (1000 * 60))
          : 0
        logMessage = 'Execution cancelled by user'
        break

      case 'retry':
        if (execution.status !== 'failed') {
          return NextResponse.json(
            { error: 'Can only retry failed executions' },
            { status: 400 }
          )
        }
        updateData.status = 'pending'
        updateData.current_step = 0
        updateData.completion_percentage = 0
        updateData.started_at = new Date().toISOString()
        updateData.completed_at = null
        updateData.error_message = null
        updateData.actual_duration_minutes = null
        logMessage = 'Execution retry initiated by user'
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update execution
    const { data: updatedExecution, error } = await supabaseAdmin
      .from('workflow_executions')
      .update(updateData)
      .eq('id', id)
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
      console.error('Error updating workflow execution:', error)
      return NextResponse.json(
        { error: 'Failed to update workflow execution' },
        { status: 500 }
      )
    }

    // Log the action
    await supabaseAdmin
      .from('workflow_execution_logs')
      .insert({
        execution_id: id,
        level: 'info',
        message: logMessage,
        logged_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      execution: updatedExecution
    })

  } catch (error) {
    console.error('Workflow execution PUT API error:', error)
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

    // Get execution to check status
    const { data: execution, error: fetchError } = await supabaseServer
      .from('workflow_executions')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError || !execution) {
      return NextResponse.json(
        { error: 'Workflow execution not found' },
        { status: 404 }
      )
    }

    // Can only delete completed, failed, or cancelled executions
    if (!['completed', 'failed', 'cancelled'].includes(execution.status)) {
      return NextResponse.json(
        { error: 'Can only delete completed, failed, or cancelled executions' },
        { status: 400 }
      )
    }

    // Delete related records first
    await supabaseAdmin.from('workflow_execution_logs').delete().eq('execution_id', id)
    await supabaseAdmin.from('workflow_execution_steps').delete().eq('execution_id', id)

    // Delete execution
    const { error } = await supabaseAdmin
      .from('workflow_executions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting workflow execution:', error)
      return NextResponse.json(
        { error: 'Failed to delete workflow execution' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Workflow execution deleted successfully'
    })

  } catch (error) {
    console.error('Workflow execution DELETE API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}