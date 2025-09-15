/**
 * Workflow Templates API
 * 
 * Handles CRUD operations for workflow templates
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const practice_area = searchParams.get('practice_area')
    const active_only = searchParams.get('active') === 'true'

    let query = supabaseServer
      .from('workflow_templates')
      .select(`
        *,
        created_by:users!workflow_templates_created_by_fkey(
          first_name,
          last_name
        )
      `)

    if (category) {
      query = query.eq('category', category)
    }

    if (practice_area) {
      query = query.eq('practice_area', practice_area)
    }

    if (active_only) {
      query = query.eq('is_active', true)
    }

    try {
      const { data: templates, error } = await query.order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({
          success: true,
          templates: getMockWorkflowTemplates()
        })
      }

      return NextResponse.json({
        success: true,
        templates: templates || getMockWorkflowTemplates()
      })

    } catch (dbError) {
      console.error('Database connection error:', dbError)
      return NextResponse.json({
        success: true,
        templates: getMockWorkflowTemplates()
      })
    }

  } catch (error) {
    console.error('Workflow templates API error:', error)
    return NextResponse.json({
      success: true,
      templates: getMockWorkflowTemplates()
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      template_name,
      template_code,
      description,
      category,
      practice_area,
      trigger_event,
      workflow_definition,
      auto_execute = false,
      is_active = true
    } = body

    // Validate required fields
    if (!template_name || !template_code || !category || !practice_area || !trigger_event || !workflow_definition) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get user from auth token (simplified for demo)
    const created_by = '11111111-1111-1111-1111-111111111111' // Mock admin user ID

    const { data: template, error } = await supabaseAdmin
      .from('workflow_templates')
      .insert({
        template_name,
        template_code,
        description,
        category,
        practice_area,
        trigger_event,
        workflow_definition,
        auto_execute,
        is_active,
        created_by,
        execution_count: 0,
        success_count: 0,
        failure_count: 0
      })
      .select(`
        *,
        created_by:users!workflow_templates_created_by_fkey(
          first_name,
          last_name
        )
      `)
      .single()

    if (error) {
      console.error('Error creating workflow template:', error)
      return NextResponse.json(
        { error: 'Failed to create workflow template' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      template
    }, { status: 201 })

  } catch (error) {
    console.error('Workflow templates POST API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Mock data for development/fallback
function getMockWorkflowTemplates() {
  return [
    {
      id: '1',
      template_name: 'New Client Onboarding',
      template_code: 'CLIENT_ONBOARDING_v1',
      description: 'Automated workflow for onboarding new clients with document collection, intake forms, and initial consultation scheduling',
      category: 'client_management',
      practice_area: 'estate_planning',
      trigger_event: 'client_created',
      workflow_definition: {
        steps: [
          {
            id: 1,
            name: 'Send Welcome Email',
            type: 'email_template',
            config: {
              template_id: 'welcome_new_client',
              delay_minutes: 0
            }
          },
          {
            id: 2,
            name: 'Create Client Portal Access',
            type: 'system_action',
            config: {
              action: 'create_portal_access',
              delay_minutes: 5
            }
          },
          {
            id: 3,
            name: 'Schedule Initial Consultation',
            type: 'calendar_action',
            config: {
              appointment_type: 'initial_consultation',
              delay_hours: 2
            }
          },
          {
            id: 4,
            name: 'Send Document Checklist',
            type: 'email_template',
            config: {
              template_id: 'document_checklist',
              delay_hours: 24
            }
          }
        ],
        conditions: [
          {
            step_id: 2,
            condition: 'email_opened',
            wait_for: true
          }
        ]
      },
      auto_execute: true,
      is_active: true,
      created_by: {
        first_name: 'Sarah',
        last_name: 'Johnson'
      },
      created_at: '2024-12-15T10:00:00Z',
      updated_at: '2025-01-10T14:30:00Z',
      execution_count: 47,
      success_count: 44,
      failure_count: 3,
      last_executed: '2025-01-13T09:15:00Z'
    },
    {
      id: '2',
      template_name: 'Trust Funding Reminder Sequence',
      template_code: 'TRUST_FUNDING_REMINDER_v2',
      description: 'Follow-up sequence for clients who need to complete trust funding with asset transfers',
      category: 'follow_up',
      practice_area: 'estate_planning',
      trigger_event: 'trust_created',
      workflow_definition: {
        steps: [
          {
            id: 1,
            name: 'Initial Funding Instructions',
            type: 'email_template',
            config: {
              template_id: 'trust_funding_instructions',
              delay_days: 3
            }
          },
          {
            id: 2,
            name: 'First Follow-up Reminder',
            type: 'email_template',
            config: {
              template_id: 'funding_reminder_1',
              delay_days: 14
            }
          },
          {
            id: 3,
            name: 'Personal Call Task',
            type: 'task_creation',
            config: {
              task_type: 'follow_up_call',
              assigned_to: 'attorney',
              delay_days: 21
            }
          },
          {
            id: 4,
            name: 'Final Notice',
            type: 'email_template',
            config: {
              template_id: 'funding_final_notice',
              delay_days: 35
            }
          }
        ],
        exit_conditions: [
          {
            condition: 'funding_completed',
            exit_workflow: true
          }
        ]
      },
      auto_execute: false,
      is_active: true,
      created_by: {
        first_name: 'Michael',
        last_name: 'Chen'
      },
      created_at: '2024-11-20T16:45:00Z',
      updated_at: '2025-01-05T11:20:00Z',
      execution_count: 23,
      success_count: 19,
      failure_count: 4,
      last_executed: '2025-01-12T15:30:00Z'
    },
    {
      id: '3',
      template_name: 'Document Review & Signing',
      template_code: 'DOC_REVIEW_SIGNING_v1',
      description: 'Streamlined workflow for document review, revisions, and electronic signing coordination',
      category: 'document_management',
      practice_area: 'general',
      trigger_event: 'documents_ready',
      workflow_definition: {
        steps: [
          {
            id: 1,
            name: 'Send Review Notification',
            type: 'email_template',
            config: {
              template_id: 'document_review_ready',
              delay_minutes: 30
            }
          },
          {
            id: 2,
            name: 'Schedule Signing Appointment',
            type: 'calendar_action',
            config: {
              appointment_type: 'document_signing',
              delay_hours: 1
            }
          },
          {
            id: 3,
            name: 'Send Signing Reminder',
            type: 'email_template',
            config: {
              template_id: 'signing_reminder',
              delay_hours: 24
            }
          },
          {
            id: 4,
            name: 'Complete Case File',
            type: 'system_action',
            config: {
              action: 'archive_case_file',
              delay_hours: 1
            }
          }
        ],
        parallel_steps: [
          {
            step_ids: [1, 2],
            run_parallel: true
          }
        ]
      },
      auto_execute: true,
      is_active: true,
      created_by: {
        first_name: 'Sarah',
        last_name: 'Johnson'
      },
      created_at: '2024-10-10T13:20:00Z',
      updated_at: '2024-12-28T09:45:00Z',
      execution_count: 156,
      success_count: 148,
      failure_count: 8,
      last_executed: '2025-01-13T11:00:00Z'
    }
  ]
}