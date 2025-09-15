/**
 * New Task Page - Create tasks with legal workflow templates
 * 
 * Provides task creation with legal-specific templates and workflow automation
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ClipboardDocumentListIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  UserIcon,
  InformationCircleIcon,
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface TaskTemplate {
  id: string
  name: string
  description: string
  category: string
  task_type: string
  default_priority: 'low' | 'normal' | 'high' | 'urgent'
  estimated_hours: number
  billable: boolean
  checklist_items: string[]
  prerequisites: string[]
  icon: string
}

interface TaskFormData {
  matter_id: string
  title: string
  description: string
  task_type: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string
  due_date: string
  start_date: string
  estimated_hours: number
  billable: boolean
  notes: string
  checklist_items: string[]
}

export default function NewTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TaskTemplate | null>(null)
  const [showTemplates, setShowTemplates] = useState(true)
  const [newChecklistItem, setNewChecklistItem] = useState('')
  
  // Form data
  const [formData, setFormData] = useState<TaskFormData>({
    matter_id: searchParams.get('matter_id') || '',
    title: '',
    description: '',
    task_type: 'general',
    status: 'pending',
    priority: 'normal',
    assigned_to: '',
    due_date: '',
    start_date: '',
    estimated_hours: 1,
    billable: false,
    notes: '',
    checklist_items: []
  })

  // Legal task templates
  const taskTemplates: TaskTemplate[] = [
    {
      id: 'estate-planning-intake',
      name: 'Estate Planning Client Intake',
      description: 'Complete intake process for new estate planning client',
      category: 'Estate Planning',
      task_type: 'client_intake',
      default_priority: 'normal',
      estimated_hours: 2,
      billable: true,
      checklist_items: [
        'Schedule initial consultation',
        'Send client intake forms',
        'Collect financial documents',
        'Review existing estate documents',
        'Analyze estate planning needs',
        'Prepare recommendations'
      ],
      prerequisites: [],
      icon: '🏛️'
    },
    {
      id: 'business-formation',
      name: 'Business Formation Package',
      description: 'Complete business entity formation process',
      category: 'Business Law',
      task_type: 'entity_formation',
      default_priority: 'high',
      estimated_hours: 4,
      billable: true,
      checklist_items: [
        'Determine entity type',
        'Reserve business name',
        'Prepare formation documents',
        'File with Secretary of State',
        'Obtain EIN from IRS',
        'Draft operating agreement/bylaws',
        'Set up corporate records'
      ],
      prerequisites: ['Client decides on entity type'],
      icon: '🏢'
    },
    {
      id: 'contract-review',
      name: 'Contract Review and Analysis',
      description: 'Comprehensive contract review and risk analysis',
      category: 'Contract Law',
      task_type: 'document_review',
      default_priority: 'normal',
      estimated_hours: 3,
      billable: true,
      checklist_items: [
        'Initial contract review',
        'Identify key terms and risks',
        'Research applicable law',
        'Draft revision recommendations',
        'Prepare client memo',
        'Schedule review meeting'
      ],
      prerequisites: ['Client provides contract document'],
      icon: '📄'
    },
    {
      id: 'probate-administration',
      name: 'Probate Administration Setup',
      description: 'Initiate probate administration process',
      category: 'Probate',
      task_type: 'probate_administration',
      default_priority: 'high',
      estimated_hours: 6,
      billable: true,
      checklist_items: [
        'Gather death certificate and will',
        'Identify estate assets',
        'Prepare probate petition',
        'File petition with court',
        'Publish notice to creditors',
        'Obtain letters of administration',
        'Open estate bank account'
      ],
      prerequisites: ['Death certificate obtained', 'Will located'],
      icon: '⚖️'
    },
    {
      id: 'litigation-discovery',
      name: 'Discovery Management',
      description: 'Manage discovery process in litigation matter',
      category: 'Litigation',
      task_type: 'discovery',
      default_priority: 'high',
      estimated_hours: 8,
      billable: true,
      checklist_items: [
        'Prepare discovery plan',
        'Draft discovery requests',
        'Serve discovery on opposing party',
        'Review received discovery responses',
        'Prepare privilege log',
        'Schedule depositions',
        'Organize discovery materials'
      ],
      prerequisites: ['Case filed', 'Initial case management conference'],
      icon: '🔍'
    },
    {
      id: 'real-estate-closing',
      name: 'Real Estate Transaction Closing',
      description: 'Manage real estate purchase/sale closing',
      category: 'Real Estate',
      task_type: 'transaction_closing',
      default_priority: 'urgent',
      estimated_hours: 5,
      billable: true,
      checklist_items: [
        'Review purchase agreement',
        'Order title examination',
        'Review title commitment',
        'Prepare closing documents',
        'Coordinate with lender',
        'Schedule closing',
        'Conduct closing',
        'Record documents'
      ],
      prerequisites: ['Purchase agreement signed', 'Title ordered'],
      icon: '🏡'
    },
    {
      id: 'compliance-audit',
      name: 'Legal Compliance Audit',
      description: 'Conduct comprehensive legal compliance review',
      category: 'Compliance',
      task_type: 'compliance_review',
      default_priority: 'normal',
      estimated_hours: 10,
      billable: true,
      checklist_items: [
        'Identify applicable regulations',
        'Review current policies',
        'Document compliance gaps',
        'Research regulatory updates',
        'Prepare compliance recommendations',
        'Draft updated policies',
        'Schedule implementation meeting'
      ],
      prerequisites: ['Client provides current policies'],
      icon: '🛡️'
    },
    {
      id: 'document-preparation',
      name: 'Legal Document Preparation',
      description: 'Prepare custom legal documents',
      category: 'General',
      task_type: 'document_preparation',
      default_priority: 'normal',
      estimated_hours: 2,
      billable: true,
      checklist_items: [
        'Gather client requirements',
        'Research applicable law',
        'Draft initial document',
        'Internal review',
        'Client review',
        'Finalize document'
      ],
      prerequisites: ['Client provides requirements'],
      icon: '📝'
    }
  ]

  const handleTemplateSelect = (template: TaskTemplate) => {
    setSelectedTemplate(template)
    setFormData({
      ...formData,
      title: template.name,
      description: template.description,
      task_type: template.task_type,
      priority: template.default_priority,
      estimated_hours: template.estimated_hours,
      billable: template.billable,
      checklist_items: [...template.checklist_items]
    })
    setShowTemplates(false)
  }

  const handleInputChange = (field: keyof TaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData(prev => ({
        ...prev,
        checklist_items: [...prev.checklist_items, newChecklistItem.trim()]
      }))
      setNewChecklistItem('')
    }
  }

  const removeChecklistItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      checklist_items: prev.checklist_items.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a task title')
      return
    }

    if (!formData.matter_id.trim()) {
      alert('Please select or enter a matter ID')
      return
    }

    try {
      setLoading(true)

      const taskData = {
        matter_id: formData.matter_id.trim(),
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type,
        status: formData.status,
        priority: formData.priority,
        assigned_to: formData.assigned_to.trim() || null,
        due_date: formData.due_date || null,
        start_date: formData.start_date || null,
        estimated_hours: formData.estimated_hours,
        billable: formData.billable,
        notes: formData.notes.trim() || null,
        checklist_items: formData.checklist_items.length > 0 ? formData.checklist_items : null
      }

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          router.push('/tasks')
        } else {
          alert('Error creating task: ' + (data.message || 'Unknown error'))
        }
      } else {
        alert('Error creating task. Please try again.')
      }

    } catch (error) {
      console.error('Error creating task:', error)
      alert('Error creating task. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const groupedTemplates = taskTemplates.reduce((groups, template) => {
    const category = template.category
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(template)
    return groups
  }, {} as Record<string, TaskTemplate[]>)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header">
        <div className="content-container">
          <div className="section-header">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div>
                <h1 className="page-title flex items-center">
                  <ClipboardDocumentListIcon className="h-8 w-8 mr-3 text-blue-600" />
                  {showTemplates ? 'Choose Task Template' : 'Create New Task'}
                  {selectedTemplate && (
                    <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {selectedTemplate.icon} {selectedTemplate.name}
                    </span>
                  )}
                </h1>
                <p className="page-subtitle">
                  {showTemplates 
                    ? 'Select a legal workflow template or create a custom task'
                    : 'Configure task details and workflow requirements'
                  }
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              {!showTemplates && (
                <button
                  onClick={() => setShowTemplates(true)}
                  className="btn-secondary flex items-center"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Choose Template
                </button>
              )}
              
              {!showTemplates && (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.title.trim() || !formData.matter_id.trim()}
                  className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Creating...' : 'Create Task'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {showTemplates ? (
          /* Task Templates */
          <div>
            {/* Custom Task Option */}
            <div className="card mb-6">
              <div className="flex items-center justify-between p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClipboardDocumentListIcon className="h-8 w-8 text-gray-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">Custom Task</h3>
                    <p className="text-sm text-gray-600">Create a custom task without using a template</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="btn-secondary"
                >
                  Create Custom Task
                </button>
              </div>
            </div>

            {/* Template Categories */}
            {Object.entries(groupedTemplates).map(([category, templates]) => (
              <div key={category} className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {templates.map((template) => (
                    <div key={template.id} className="card hover:shadow-lg transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between p-6">
                        <div className="flex items-start flex-1">
                          <div className="flex-shrink-0 text-2xl mr-4">
                            {template.icon}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h3>
                            <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-3">
                              <span className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                {template.estimated_hours}h
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                template.default_priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                template.default_priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                template.default_priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {template.default_priority.charAt(0).toUpperCase() + template.default_priority.slice(1)} Priority
                              </span>
                              {template.billable && (
                                <span className="flex items-center text-green-600">
                                  <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                                  Billable
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-gray-500">
                              <strong>Includes:</strong> {template.checklist_items.length} checklist items
                              {template.prerequisites.length > 0 && (
                                <span>, {template.prerequisites.length} prerequisites</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleTemplateSelect(template)}
                          className="btn-primary ml-4"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Task Form */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Task Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter task title"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe the task objectives and requirements"
                      rows={4}
                      className="input-field"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Task Type</label>
                      <select
                        value={formData.task_type}
                        onChange={(e) => handleInputChange('task_type', e.target.value)}
                        className="input-field"
                      >
                        <option value="general">General</option>
                        <option value="client_intake">Client Intake</option>
                        <option value="document_review">Document Review</option>
                        <option value="document_preparation">Document Preparation</option>
                        <option value="research">Legal Research</option>
                        <option value="filing">Court Filing</option>
                        <option value="client_communication">Client Communication</option>
                        <option value="discovery">Discovery</option>
                        <option value="compliance_review">Compliance Review</option>
                        <option value="entity_formation">Entity Formation</option>
                        <option value="transaction_closing">Transaction Closing</option>
                        <option value="probate_administration">Probate Administration</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleInputChange('status', e.target.value)}
                        className="input-field"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="on_hold">On Hold</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => handleInputChange('priority', e.target.value)}
                        className="input-field"
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Estimated Hours</label>
                      <input
                        type="number"
                        value={formData.estimated_hours}
                        onChange={(e) => handleInputChange('estimated_hours', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.25"
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment & Scheduling */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Assignment & Scheduling</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Matter ID *</label>
                    <input
                      type="text"
                      value={formData.matter_id}
                      onChange={(e) => handleInputChange('matter_id', e.target.value)}
                      placeholder="Enter matter ID (e.g., matter-1)"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Assigned To</label>
                    <select
                      value={formData.assigned_to}
                      onChange={(e) => handleInputChange('assigned_to', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Unassigned</option>
                      <option value="user-1">Luke Barry (Attorney)</option>
                      {/* Would populate from users API */}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange('start_date', e.target.value)}
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="form-label">Due Date</label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => handleInputChange('due_date', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="billable"
                      checked={formData.billable}
                      onChange={(e) => handleInputChange('billable', e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="billable" className="text-sm text-gray-700">
                      This is billable time
                    </label>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Task Checklist</h3>
                
                <div className="space-y-4">
                  {formData.checklist_items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg">
                      <CheckIcon className="h-4 w-4 text-green-600" />
                      <span className="flex-1 text-sm">{item}</span>
                      <button
                        onClick={() => removeChecklistItem(index)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()}
                      placeholder="Add checklist item"
                      className="input-field"
                    />
                    <button
                      onClick={addChecklistItem}
                      className="btn-secondary"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Additional Notes</h3>
                
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Add any additional notes, requirements, or special instructions"
                  rows={4}
                  className="input-field"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {selectedTemplate && (
                <div className="card">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Template Info</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-2xl">{selectedTemplate.icon}</span>
                      <div>
                        <div className="font-medium">{selectedTemplate.name}</div>
                        <div className="text-gray-600">{selectedTemplate.category}</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600">
                      {selectedTemplate.description}
                    </div>

                    {selectedTemplate.prerequisites.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Prerequisites</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {selectedTemplate.prerequisites.map((prereq, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-orange-600 mr-2">•</span>
                              {prereq}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="card">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Task Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Priority:</span>
                    <span className={`font-medium ${
                      formData.priority === 'urgent' ? 'text-red-600' :
                      formData.priority === 'high' ? 'text-orange-600' :
                      formData.priority === 'normal' ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Hours:</span>
                    <span className="font-medium">{formData.estimated_hours}h</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Billable:</span>
                    <span className={`font-medium ${formData.billable ? 'text-green-600' : 'text-gray-600'}`}>
                      {formData.billable ? 'Yes' : 'No'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Checklist Items:</span>
                    <span className="font-medium">{formData.checklist_items.length}</span>
                  </div>
                </div>
              </div>

              <div className="card bg-blue-50 border-blue-200">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Legal Workflow Tips</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Use task templates to ensure consistent workflows and reduce the risk of missing critical steps in legal processes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}