/**
 * Workflow Automation Management Page
 */

'use client'

import { useState, useEffect } from 'react'
// import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  Cog6ToothIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  ChartBarIcon,
  EyeIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface WorkflowTemplate {
  id: string
  template_name: string
  template_code: string
  description?: string
  category: string
  practice_area: string
  trigger_event: string
  is_active: boolean
  auto_execute: boolean
  execution_count: number
  success_count: number
  failure_count: number
  last_executed_at?: string
  created_at: string
  created_by: {
    first_name: string
    last_name: string
  }
}

interface WorkflowExecution {
  id: string
  execution_name: string
  status: string
  current_step: number
  total_steps: number
  completion_percentage: number
  started_at?: string
  completed_at?: string
  estimated_duration_minutes: number
  actual_duration_minutes?: number
  workflow_template: {
    template_name: string
    category: string
  }
  client?: {
    first_name: string
    last_name: string
    business_name?: string
  }
  matter?: {
    matter_number: string
    title: string
  }
}

export default function WorkflowsPage() {
  // const { user } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState<'templates' | 'executions'>('templates')
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])

  // Mock user for demo
  const user = { role: 'admin' }

  // Check permissions
  const canManageWorkflows = user && ['admin', 'associate_attorney'].includes(user.role)

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        if (activeTab === 'templates') {
          // Load workflow templates from API
          const response = await fetch('/api/workflows')
          if (response.ok) {
            const data = await response.json()
            setTemplates(data.templates || [])
          } else {
            // Fallback to mock data on API failure
            setTemplates(getMockTemplates())
          }
        } else {
          // Load workflow executions from API
          const response = await fetch('/api/workflows/executions')
          if (response.ok) {
            const data = await response.json()
            setExecutions(data.executions || [])
          } else {
            // Fallback to mock data on API failure
            setExecutions(getMockExecutions())
          }
        }
      } catch (error) {
        console.error('Error loading workflow data:', error)
        // Set mock data on error
        if (activeTab === 'templates') {
          setTemplates(getMockTemplates())
        } else {
          setExecutions(getMockExecutions())
        }
      }
    }

    loadData()
  }, [activeTab])

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      running: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
      paused: 'bg-orange-100 text-orange-800 border-orange-200'
    }

    const icons = {
      pending: ClockIcon,
      running: BoltIcon,
      completed: CheckCircleIcon,
      failed: ExclamationTriangleIcon,
      cancelled: StopIcon,
      paused: PauseIcon
    }

    const StatusIcon = icons[status as keyof typeof icons] || ClockIcon
    const statusStyle = styles[status as keyof typeof styles] || styles.pending

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyle}`}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }

  const getSuccessRate = (template: WorkflowTemplate) => {
    if (template.execution_count === 0) return 100
    return Math.round((template.success_count / template.execution_count) * 100)
  }

  const handleRunWorkflow = async (templateId: string, templateName: string) => {
    try {
      const response = await fetch('/api/workflows/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          execution_name: `${templateName} - ${new Date().toLocaleString()}`
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Workflow started:', data)
        // Refresh executions if on executions tab
        if (activeTab === 'executions') {
          const execResponse = await fetch('/api/workflows/executions')
          if (execResponse.ok) {
            const execData = await execResponse.json()
            setExecutions(execData.executions || [])
          }
        }
        // Show success message (could add toast notification)
        alert('Workflow started successfully!')
      } else {
        console.error('Failed to start workflow')
        alert('Failed to start workflow')
      }
    } catch (error) {
      console.error('Error starting workflow:', error)
      alert('Error starting workflow')
    }
  }

  const handleExecutionAction = async (executionId: string, action: string) => {
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Execution updated:', data)
        // Refresh executions
        const execResponse = await fetch('/api/workflows/executions')
        if (execResponse.ok) {
          const execData = await execResponse.json()
          setExecutions(execData.executions || [])
        }
        // Show success message
        alert(`Execution ${action}d successfully!`)
      } else {
        console.error(`Failed to ${action} execution`)
        alert(`Failed to ${action} execution`)
      }
    } catch (error) {
      console.error(`Error ${action}ing execution:`, error)
      alert(`Error ${action}ing execution`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Cog6ToothIcon className="h-8 w-8 mr-3 text-blue-600" />
                Workflow Automation
              </h1>
              <p className="text-gray-600 mt-1">
                Automate repetitive legal tasks and streamline your practice
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {canManageWorkflows && (
                <button
                  onClick={() => router.push('/workflows/new')}
                  className="btn-primary flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Workflow
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Workflow Templates
              </button>
              <button
                onClick={() => setActiveTab('executions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'executions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Active Executions
              </button>
            </nav>
          </div>

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="p-6">
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {template.template_name}
                          </h3>
                          <span className="text-sm text-gray-500">
                            ({template.template_code})
                          </span>
                          {template.is_active ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                          {template.auto_execute && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Auto-Execute
                            </span>
                          )}
                        </div>

                        {template.description && (
                          <p className="text-gray-600 mb-3">{template.description}</p>
                        )}

                        <div className="flex items-center space-x-6 text-sm text-gray-500">
                          <span className="flex items-center">
                            <ChartBarIcon className="h-4 w-4 mr-1" />
                            {template.execution_count} executions
                          </span>
                          <span className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
                            {getSuccessRate(template)}% success rate
                          </span>
                          <span>
                            Category: {template.category.replace('_', ' ')}
                          </span>
                          <span>
                            Trigger: {template.trigger_event.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-4 mt-3 text-xs text-gray-400">
                          <span>
                            Created by {template.created_by.first_name} {template.created_by.last_name}
                          </span>
                          {template.last_executed_at && (
                            <span>
                              Last run: {new Date(template.last_executed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => router.push(`/workflows/templates/${template.id}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Template"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handleRunWorkflow(template.id, template.template_name)}
                          className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                          title="Run Workflow"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>

                        {canManageWorkflows && (
                          <>
                            <button
                              onClick={() => router.push(`/workflows/templates/${template.id}/edit`)}
                              className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                              title="Edit Template"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => console.log('Duplicate template:', template.id)}
                              className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                              title="Duplicate Template"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="text-center py-12">
                  <Cog6ToothIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No workflow templates</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first automated workflow to streamline repetitive tasks
                  </p>
                  {canManageWorkflows && (
                    <button
                      onClick={() => router.push('/workflows/new')}
                      className="btn-primary"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Create First Workflow
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Executions Tab */}
          {activeTab === 'executions' && (
            <div className="p-6">
              <div className="space-y-4">
                {executions.map((execution) => (
                  <div key={execution.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {execution.execution_name}
                          </h3>
                          {getStatusBadge(execution.status)}
                        </div>

                        <div className="space-y-2">
                          {/* Progress Bar */}
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500">Progress:</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                style={{ width: `${execution.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {execution.completion_percentage.toFixed(0)}%
                            </span>
                          </div>

                          <div className="text-sm text-gray-600">
                            Step {execution.current_step} of {execution.total_steps} • 
                            Category: {execution.workflow_template.category.replace('_', ' ')}
                          </div>

                          {/* Context Information */}
                          {(execution.client || execution.matter) && (
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {execution.client && (
                                <span>
                                  Client: {execution.client.business_name || `${execution.client.first_name} ${execution.client.last_name}`}
                                </span>
                              )}
                              {execution.matter && (
                                <span>
                                  Matter: {execution.matter.matter_number} - {execution.matter.title}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Timing Information */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            {execution.started_at && (
                              <span>
                                Started: {new Date(execution.started_at).toLocaleString()}
                              </span>
                            )}
                            {execution.status === 'running' && (
                              <span>
                                Est. Duration: {formatDuration(execution.estimated_duration_minutes)}
                              </span>
                            )}
                            {execution.completed_at && execution.actual_duration_minutes && (
                              <span>
                                Completed in: {formatDuration(execution.actual_duration_minutes)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                        <button
                          onClick={() => router.push(`/workflows/executions/${execution.id}`)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Execution"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        {execution.status === 'running' && (
                          <button
                            onClick={() => handleExecutionAction(execution.id, 'pause')}
                            className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                            title="Pause Execution"
                          >
                            <PauseIcon className="h-4 w-4" />
                          </button>
                        )}

                        {execution.status === 'paused' && (
                          <button
                            onClick={() => handleExecutionAction(execution.id, 'resume')}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="Resume Execution"
                          >
                            <PlayIcon className="h-4 w-4" />
                          </button>
                        )}

                        {['pending', 'running', 'paused'].includes(execution.status) && (
                          <button
                            onClick={() => handleExecutionAction(execution.id, 'cancel')}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Cancel Execution"
                          >
                            <StopIcon className="h-4 w-4" />
                          </button>
                        )}

                        {execution.status === 'failed' && (
                          <button
                            onClick={() => handleExecutionAction(execution.id, 'retry')}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Retry Execution"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {executions.length === 0 && (
                <div className="text-center py-12">
                  <BoltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active executions</h3>
                  <p className="text-gray-600">
                    Workflow executions will appear here when they are running
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Mock data for demonstration
function getMockTemplates(): WorkflowTemplate[] {
  return [
    {
      id: '1',
      template_name: 'New Client Onboarding',
      template_code: 'CLIENT_ONBOARDING_001',
      description: 'Automated workflow for new client onboarding process including welcome email, intake tasks, and initial consultation scheduling',
      category: 'client_onboarding',
      practice_area: 'general',
      trigger_event: 'client_created',
      is_active: true,
      auto_execute: true,
      execution_count: 47,
      success_count: 45,
      failure_count: 2,
      last_executed_at: '2025-01-12T14:30:00Z',
      created_at: '2024-08-15T09:00:00Z',
      created_by: {
        first_name: 'Sarah',
        last_name: 'Johnson'
      }
    },
    {
      id: '2',
      template_name: 'Estate Planning Matter Setup',
      template_code: 'ESTATE_MATTER_001',
      description: 'Comprehensive workflow for new estate planning matters including document review, asset inventory, and initial drafts',
      category: 'matter_lifecycle',
      practice_area: 'estate_planning',
      trigger_event: 'matter_opened',
      is_active: true,
      auto_execute: false,
      execution_count: 23,
      success_count: 22,
      failure_count: 1,
      last_executed_at: '2025-01-10T16:15:00Z',
      created_at: '2024-09-22T11:30:00Z',
      created_by: {
        first_name: 'Michael',
        last_name: 'Davis'
      }
    },
    {
      id: '3',
      template_name: 'Document Review and Approval',
      template_code: 'DOC_REVIEW_001',
      description: 'Automated document review workflow with paralegal review, attorney approval, and client notification',
      category: 'document_review',
      practice_area: 'general',
      trigger_event: 'document_uploaded',
      is_active: true,
      auto_execute: true,
      execution_count: 156,
      success_count: 152,
      failure_count: 4,
      last_executed_at: '2025-01-13T09:45:00Z',
      created_at: '2024-07-03T14:20:00Z',
      created_by: {
        first_name: 'Lisa',
        last_name: 'Wilson'
      }
    }
  ]
}

function getMockExecutions(): WorkflowExecution[] {
  return [
    {
      id: 'exec-1',
      execution_name: 'New Client Onboarding - Johnson Trust Services',
      status: 'running',
      current_step: 2,
      total_steps: 4,
      completion_percentage: 50,
      started_at: '2025-01-13T10:00:00Z',
      estimated_duration_minutes: 15,
      workflow_template: {
        template_name: 'New Client Onboarding',
        category: 'client_onboarding'
      },
      client: {
        first_name: 'Robert',
        last_name: 'Johnson',
        business_name: 'Johnson Trust Services LLC'
      }
    },
    {
      id: 'exec-2',
      execution_name: 'Estate Planning Matter Setup - Williams Family Estate',
      status: 'pending',
      current_step: 0,
      total_steps: 4,
      completion_percentage: 0,
      estimated_duration_minutes: 45,
      workflow_template: {
        template_name: 'Estate Planning Matter Setup',
        category: 'matter_lifecycle'
      },
      client: {
        first_name: 'Jennifer',
        last_name: 'Williams'
      },
      matter: {
        matter_number: '25-EST-0003',
        title: 'Williams Family Estate Planning'
      }
    },
    {
      id: 'exec-3',
      execution_name: 'Document Review and Approval - Trust Agreement v2.1',
      status: 'completed',
      current_step: 3,
      total_steps: 3,
      completion_percentage: 100,
      started_at: '2025-01-13T08:30:00Z',
      completed_at: '2025-01-13T09:15:00Z',
      estimated_duration_minutes: 30,
      actual_duration_minutes: 45,
      workflow_template: {
        template_name: 'Document Review and Approval',
        category: 'document_review'
      },
      client: {
        first_name: 'Michael',
        last_name: 'Smith'
      },
      matter: {
        matter_number: '25-EST-0001',
        title: 'Smith Family Trust'
      }
    }
  ]
}