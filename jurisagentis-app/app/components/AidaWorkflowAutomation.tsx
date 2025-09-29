'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BellIcon,
  ArrowRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

// Workflow types and interfaces
interface WorkflowStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'waiting'
  completedAt?: string
  estimatedDuration?: string
  dependencies?: string[]
  automatedAction?: boolean
  requiresHumanInput?: boolean
  details?: string
}

interface ClientEngagementWorkflow {
  id: string
  clientName: string
  practiceArea: string
  trigger: string
  startedAt: string
  estimatedCompletion: string
  priority: 'high' | 'medium' | 'low'
  currentStep: string
  steps: WorkflowStep[]
  automatedActions: number
  humanInterventions: number
}

interface AidaMonitoringEvent {
  id: string
  timestamp: string
  type: 'document_signed' | 'email_sent' | 'payment_received' | 'deadline_approaching' | 'client_response' | 'task_completed'
  description: string
  workflowId: string
  automated: boolean
  nextActions: string[]
}

export function AidaWorkflowDashboard() {
  const [activeWorkflows, setActiveWorkflows] = useState<ClientEngagementWorkflow[]>([])
  const [recentEvents, setRecentEvents] = useState<AidaMonitoringEvent[]>([])
  const [isMonitoring] = useState(true)

  useEffect(() => {
    // Initialize with mock workflow data
    setActiveWorkflows([
      {
        id: 'wf_001',
        clientName: 'John & Mary Smith',
        practiceArea: 'Estate Planning',
        trigger: 'Email: "We need help with our will and trust"',
        startedAt: '2024-01-20T10:30:00Z',
        estimatedCompletion: '2024-02-15T17:00:00Z',
        priority: 'high',
        currentStep: 'awaiting_engagement_signature',
        steps: [
          {
            id: 'lead_qualification',
            title: 'Lead Qualification',
            description: 'Analyzed email content and determined service needs',
            status: 'completed',
            completedAt: '2024-01-20T10:35:00Z',
            automatedAction: true,
            details: 'AI detected estate planning needs from email keywords and client profile analysis'
          },
          {
            id: 'engagement_letter',
            title: 'Generate Engagement Letter',
            description: 'Created personalized engagement agreement',
            status: 'completed',
            completedAt: '2024-01-20T10:45:00Z',
            automatedAction: true,
            details: 'Auto-populated client information and estate planning service terms'
          },
          {
            id: 'send_engagement',
            title: 'Send for E-Signature',
            description: 'Engagement letter sent to clients for signature',
            status: 'completed',
            completedAt: '2024-01-20T10:50:00Z',
            automatedAction: true,
            details: 'Sent via DocuSign with 7-day deadline and automated reminders'
          },
          {
            id: 'awaiting_engagement_signature',
            title: 'Awaiting Engagement Signature',
            description: 'Monitoring signature status and sending reminders',
            status: 'in_progress',
            estimatedDuration: '3-7 days',
            automatedAction: true,
            details: 'Automated reminders scheduled for day 3 and day 5'
          },
          {
            id: 'welcome_sequence',
            title: 'Client Welcome & Onboarding',
            description: 'Send welcome email and setup client portal access',
            status: 'pending',
            dependencies: ['awaiting_engagement_signature'],
            automatedAction: true,
            details: 'Will trigger automatically upon signature completion'
          },
          {
            id: 'initial_consultation',
            title: 'Schedule Initial Consultation',
            description: 'Calendar coordination and intake form completion',
            status: 'pending',
            dependencies: ['welcome_sequence'],
            requiresHumanInput: true,
            details: 'Requires attorney availability confirmation'
          },
          {
            id: 'payment_setup',
            title: 'Payment Processing Setup',
            description: 'Configure retainer and payment schedule',
            status: 'pending',
            dependencies: ['welcome_sequence'],
            automatedAction: true,
            details: 'Will setup automatic payment processing based on engagement terms'
          }
        ],
        automatedActions: 6,
        humanInterventions: 1
      },
      {
        id: 'wf_002',
        clientName: 'TechStart Corp',
        practiceArea: 'Business Formation',
        trigger: 'Call transcript: Business incorporation needs',
        startedAt: '2024-01-21T14:15:00Z',
        estimatedCompletion: '2024-02-05T17:00:00Z',
        priority: 'medium',
        currentStep: 'document_drafting',
        steps: [
          {
            id: 'needs_analysis',
            title: 'Business Needs Analysis',
            description: 'Analyzed call transcript and client requirements',
            status: 'completed',
            completedAt: '2024-01-21T14:20:00Z',
            automatedAction: true
          },
          {
            id: 'engagement_signed',
            title: 'Engagement Letter Signed',
            description: 'Client signed engagement agreement',
            status: 'completed',
            completedAt: '2024-01-21T16:30:00Z',
            automatedAction: false
          },
          {
            id: 'document_drafting',
            title: 'Corporate Documents Drafting',
            description: 'Preparing articles of incorporation and bylaws',
            status: 'in_progress',
            estimatedDuration: '5-7 days',
            requiresHumanInput: true,
            details: 'Attorney review required for complex business structure'
          }
        ],
        automatedActions: 3,
        humanInterventions: 2
      }
    ])

    // Initialize recent monitoring events
    setRecentEvents([
      {
        id: 'evt_001',
        timestamp: '2024-01-22T09:15:00Z',
        type: 'email_sent',
        description: 'Sent signature reminder to John & Mary Smith',
        workflowId: 'wf_001',
        automated: true,
        nextActions: ['Monitor response', 'Send follow-up if no response in 2 days']
      },
      {
        id: 'evt_002',
        timestamp: '2024-01-22T08:30:00Z',
        type: 'document_signed',
        description: 'TechStart Corp signed engagement agreement',
        workflowId: 'wf_002',
        automated: false,
        nextActions: ['Trigger welcome sequence', 'Schedule consultation', 'Setup payment processing']
      },
      {
        id: 'evt_003',
        timestamp: '2024-01-21T17:45:00Z',
        type: 'deadline_approaching',
        description: 'Smith engagement signature deadline in 5 days',
        workflowId: 'wf_001',
        automated: true,
        nextActions: ['Send reminder', 'Schedule follow-up call']
      }
    ])

    // Simulate real-time monitoring
    const monitoringInterval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance of new event
        const newEvent: AidaMonitoringEvent = {
          id: `evt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'client_response',
          description: 'Client opened engagement agreement email',
          workflowId: 'wf_001',
          automated: true,
          nextActions: ['Update engagement status', 'Prepare follow-up']
        }
        setRecentEvents(prev => [newEvent, ...prev.slice(0, 9)])
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(monitoringInterval)
  }, [])

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed': return CheckCircleIcon
      case 'in_progress': return ClockIcon
      case 'failed': return ExclamationTriangleIcon
      default: return ClockIcon
    }
  }

  const getStepColor = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed': return 'text-green-600 bg-green-50 border-green-200'
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed': return 'text-red-600 bg-red-50 border-red-200'
      case 'waiting': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getEventIcon = (event: AidaMonitoringEvent) => {
    switch (event.type) {
      case 'document_signed': return DocumentTextIcon
      case 'email_sent': return EnvelopeIcon
      case 'payment_received': return CreditCardIcon
      case 'deadline_approaching': return ExclamationTriangleIcon
      case 'client_response': return EyeIcon
      default: return BellIcon
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <SparklesIcon className="h-8 w-8 mr-3" />
              🤖 Aida&apos;s Workflow Automation
            </h2>
            <p className="mt-2 opacity-90">
              Intelligent client engagement and practice management automation
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{activeWorkflows.length}</div>
            <div className="text-sm opacity-90">Active Workflows</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Workflows */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Active Client Workflows</h3>
          
          {activeWorkflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{workflow.clientName}</h4>
                  <p className="text-sm text-gray-600">{workflow.practiceArea}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Triggered by: {workflow.trigger}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    workflow.priority === 'high' ? 'bg-red-100 text-red-800' :
                    workflow.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {workflow.priority} priority
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    Est. completion: {new Date(workflow.estimatedCompletion).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Progress Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-600">{workflow.automatedActions}</div>
                  <div className="text-xs text-gray-600">Automated Actions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-orange-600">{workflow.humanInterventions}</div>
                  <div className="text-xs text-gray-600">Human Interventions</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">
                    {Math.round((workflow.steps.filter(s => s.status === 'completed').length / workflow.steps.length) * 100)}%
                  </div>
                  <div className="text-xs text-gray-600">Complete</div>
                </div>
              </div>

              {/* Workflow Steps */}
              <div className="space-y-3">
                {workflow.steps.map((step, _index) => {
                  const Icon = getStepIcon(step)
                  const isActive = workflow.currentStep === step.id
                  
                  return (
                    <div key={step.id} className={`flex items-start space-x-3 p-3 rounded-lg border ${
                      isActive ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-gray-50'
                    } ${getStepColor(step)}`}>
                      <div className="flex-shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-gray-900">{step.title}</h5>
                          <div className="flex items-center space-x-2">
                            {step.automatedAction && (
                              <span className="inline-flex items-center text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                🤖 Auto
                              </span>
                            )}
                            {step.requiresHumanInput && (
                              <span className="inline-flex items-center text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                👤 Human
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                        
                        {step.details && (
                          <p className="text-xs text-gray-500 mt-1 italic">{step.details}</p>
                        )}
                        
                        {step.completedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Completed: {new Date(step.completedAt).toLocaleString()}
                          </p>
                        )}
                        
                        {step.estimatedDuration && step.status === 'in_progress' && (
                          <p className="text-xs text-blue-600 mt-1">
                            Estimated: {step.estimatedDuration}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Monitoring */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Live Monitoring</h3>
            <div className={`flex items-center space-x-2 ${isMonitoring ? 'text-green-600' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-sm font-medium">
                {isMonitoring ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
            {recentEvents.map((event) => {
              const Icon = getEventIcon(event)
              
              return (
                <div key={event.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 p-2 rounded-full ${
                      event.automated ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        event.automated ? 'text-purple-600' : 'text-blue-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {event.description}
                        </p>
                        {event.automated && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            🤖 Auto
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(event.timestamp).toLocaleString()}
                      </p>
                      
                      {event.nextActions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700">Next Actions:</p>
                          <ul className="text-xs text-gray-600 ml-2">
                            {event.nextActions.map((action, index) => (
                              <li key={index} className="flex items-center space-x-1">
                                <ArrowRightIcon className="h-3 w-3" />
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-4">
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              🤖 Aida&apos;s Insights
            </h4>
            
            <div className="space-y-2 text-sm text-blue-800">
              <p>• Smith engagement signature is 85% likely to be completed within 2 days based on client behavior patterns</p>
              <p>• TechStart Corp workflow is ahead of schedule by 1.5 days</p>
              <p>• Recommend scheduling follow-up call with Smith family if no signature by Thursday</p>
              <p>• 3 new potential leads detected in email inbox requiring qualification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for triggering Aida workflows from other components
export function useAidaWorkflows() {
  const [activeWorkflows] = useState<ClientEngagementWorkflow[]>([])

  const triggerNewClientWorkflow = async (trigger: {
    type: 'email' | 'call' | 'form_submission' | 'referral'
    content: string
    clientInfo: {
      name?: string
      email?: string
      phone?: string
      practiceArea?: string
    }
  }) => {
    console.log('🤖 Aida: Starting new client engagement workflow...')
    
    // This would actually call your workflow API
    const workflowId = `wf_${Date.now()}`
    
    // Simulate AI analysis of trigger content
    const analysis = {
      practiceArea: trigger.clientInfo.practiceArea || 'General Legal Services',
      urgency: 'medium',
      estimatedValue: '$5,000',
      requiredDocuments: ['Engagement Agreement', 'Retainer Agreement'],
      estimatedTimeline: '2-3 weeks'
    }

    console.log('🤖 Aida: Workflow analysis complete:', analysis)
    
    return {
      workflowId,
      analysis,
      nextSteps: [
        'Generate engagement letter',
        'Send for e-signature',
        'Setup client portal access',
        'Schedule initial consultation'
      ]
    }
  }

  const monitorESignatureStatus = async (documentId: string) => {
    // This would integrate with your e-signature service
    console.log('🤖 Aida: Monitoring e-signature status for document:', documentId)
    
    // Simulate checking DocuSign or similar service
    const status = {
      documentId,
      status: 'sent',
      signers: [
        { email: 'client@example.com', status: 'pending', lastViewed: new Date() }
      ],
      remindersScheduled: 2,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    }

    return status
  }

  const updateWorkflowProgress = async (workflowId: string, stepId: string, status: string) => {
    console.log(`🤖 Aida: Updating workflow ${workflowId}, step ${stepId} to ${status}`)
    
    // This would update your workflow database
    // and potentially trigger next steps
    
    if (status === 'completed') {
      // Check for dependent steps and auto-trigger them
      console.log('🤖 Aida: Checking for next automated steps...')
    }
  }

  return {
    activeWorkflows,
    triggerNewClientWorkflow,
    monitorESignatureStatus,
    updateWorkflowProgress
  }
}