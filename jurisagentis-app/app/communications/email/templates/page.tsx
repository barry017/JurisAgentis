'use client'

import { useState, useEffect } from 'react'
import { DocumentTextIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  variables: string[]
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
  usage_count?: number
}

interface TemplateForm {
  name: string
  subject: string
  content: string
  category: string
  variables: string[]
  is_active: boolean
}

const templateCategories = [
  { value: 'client_communication', label: 'Client Communication' },
  { value: 'deadline_reminder', label: 'Deadline Reminder' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'document_delivery', label: 'Document Delivery' },
  { value: 'system_notification', label: 'System Notification' },
  { value: 'welcome', label: 'Welcome' },
  { value: 'follow_up', label: 'Follow Up' }
]

const commonVariables = [
  'client_name',
  'attorney_name',
  'firm_name',
  'matter_title',
  'matter_number',
  'deadline_date',
  'deadline_description',
  'invoice_number',
  'amount_due',
  'due_date',
  'document_list',
  'portal_link',
  'payment_link',
  'court_name',
  'court_date',
  'case_number'
]

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  
  // Form state
  const [form, setForm] = useState<TemplateForm>({
    name: '',
    subject: '',
    content: '',
    category: 'client_communication',
    variables: [],
    is_active: true
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Preview state
  const [previewData, setPreviewData] = useState<Record<string, string>>({})

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      // Since we don't have a templates API endpoint yet, we'll use mock data
      // In a real implementation, this would fetch from /api/email/templates
      const mockTemplates: EmailTemplate[] = [
        {
          id: 'tmpl-1',
          name: 'deadline_reminder',
          subject: 'Important Deadline Reminder - {{matter_title}}',
          content: `Dear {{client_name}},

This is a reminder that you have an important deadline coming up for your matter: {{matter_title}}.

Deadline: {{deadline_date}}
Description: {{deadline_description}}

Please contact our office if you have any questions or need assistance.

Best regards,
{{attorney_name}}
{{firm_name}}`,
          variables: ['client_name', 'matter_title', 'deadline_date', 'deadline_description', 'attorney_name', 'firm_name'],
          category: 'deadline_reminder',
          is_active: true,
          created_at: '2025-01-10T08:00:00Z',
          updated_at: '2025-01-12T10:30:00Z',
          usage_count: 15
        },
        {
          id: 'tmpl-2',
          name: 'invoice_notification',
          subject: 'Invoice {{invoice_number}} - {{matter_title}}',
          content: `Dear {{client_name}},

Please find attached your invoice for legal services.

Invoice Number: {{invoice_number}}
Amount Due: {{amount_due}}
Due Date: {{due_date}}
Matter: {{matter_title}}

You can view and pay your invoice online at: {{payment_link}}

If you have any questions about this invoice, please don't hesitate to contact us.

Best regards,
{{attorney_name}}
{{firm_name}}`,
          variables: ['client_name', 'invoice_number', 'amount_due', 'due_date', 'matter_title', 'payment_link', 'attorney_name', 'firm_name'],
          category: 'invoice',
          is_active: true,
          created_at: '2025-01-08T14:20:00Z',
          updated_at: '2025-01-08T14:20:00Z',
          usage_count: 8
        },
        {
          id: 'tmpl-3',
          name: 'document_ready',
          subject: 'Documents Ready for Review - {{matter_title}}',
          content: `Dear {{client_name}},

Your documents for {{matter_title}} are ready for review.

Document(s): {{document_list}}

Please log into your secure client portal to review the documents: {{portal_link}}

If you have any questions or need to schedule an appointment to discuss the documents, please contact our office.

Best regards,
{{attorney_name}}
{{firm_name}}`,
          variables: ['client_name', 'matter_title', 'document_list', 'portal_link', 'attorney_name', 'firm_name'],
          category: 'document_delivery',
          is_active: true,
          created_at: '2025-01-05T11:15:00Z',
          updated_at: '2025-01-11T16:45:00Z',
          usage_count: 23
        },
        {
          id: 'tmpl-4',
          name: 'welcome_client',
          subject: 'Welcome to {{firm_name}} - {{matter_title}}',
          content: `Dear {{client_name}},

Welcome to {{firm_name}}! We're pleased to be representing you in your {{matter_title}} matter.

Your assigned attorney is {{attorney_name}}, who will be your primary contact throughout this case.

Important Information:
- Matter Number: {{matter_number}}
- Client Portal: {{portal_link}}

We're committed to providing you with excellent legal representation and keeping you informed every step of the way.

Best regards,
{{attorney_name}}
{{firm_name}}`,
          variables: ['client_name', 'firm_name', 'matter_title', 'attorney_name', 'matter_number', 'portal_link'],
          category: 'welcome',
          is_active: true,
          created_at: '2025-01-01T09:00:00Z',
          updated_at: '2025-01-01T09:00:00Z',
          usage_count: 12
        }
      ]

      setTemplates(mockTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleCreateTemplate = () => {
    setForm({
      name: '',
      subject: '',
      content: '',
      category: 'client_communication',
      variables: [],
      is_active: true
    })
    setIsCreateModalOpen(true)
  }

  const handleEditTemplate = (template: EmailTemplate) => {
    setForm({
      name: template.name,
      subject: template.subject,
      content: template.content,
      category: template.category,
      variables: template.variables,
      is_active: template.is_active
    })
    setSelectedTemplate(template)
    setIsEditModalOpen(true)
  }

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    
    // Set sample data for preview
    const sampleData: Record<string, string> = {}
    template.variables.forEach(variable => {
      switch (variable) {
        case 'client_name':
          sampleData[variable] = 'John Smith'
          break
        case 'attorney_name':
          sampleData[variable] = 'Sarah Johnson'
          break
        case 'firm_name':
          sampleData[variable] = 'JurisAgentis Law Firm'
          break
        case 'matter_title':
          sampleData[variable] = 'Smith Family Trust'
          break
        case 'matter_number':
          sampleData[variable] = 'MAT-2025-001'
          break
        case 'deadline_date':
          sampleData[variable] = 'January 25, 2025'
          break
        case 'deadline_description':
          sampleData[variable] = 'Trust document filing deadline'
          break
        case 'invoice_number':
          sampleData[variable] = 'INV-2025-003'
          break
        case 'amount_due':
          sampleData[variable] = '$1,250.00'
          break
        case 'due_date':
          sampleData[variable] = 'February 1, 2025'
          break
        case 'document_list':
          sampleData[variable] = 'Trust Agreement, Power of Attorney'
          break
        case 'portal_link':
          sampleData[variable] = 'https://portal.jurisagentis.com/client'
          break
        case 'payment_link':
          sampleData[variable] = 'https://portal.jurisagentis.com/payment'
          break
        default:
          sampleData[variable] = `[${variable}]`
      }
    })
    
    setPreviewData(sampleData)
    setIsPreviewModalOpen(true)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      setSaveError(null)

      // In a real implementation, this would POST to /api/email/templates
      console.log('Saving template:', form)

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Close modal and refresh
      setIsCreateModalOpen(false)
      setIsEditModalOpen(false)
      fetchTemplates()

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setSaving(false)
    }
  }

  const extractVariables = (text: string) => {
    const variableRegex = /\{\{(\w+)\}\}/g
    const variables = new Set<string>()
    let match
    
    while ((match = variableRegex.exec(text)) !== null) {
      variables.add(match[1])
    }
    
    return Array.from(variables)
  }

  const handleContentChange = (content: string) => {
    const detectedVariables = extractVariables(content + form.subject)
    setForm(prev => ({
      ...prev,
      content,
      variables: detectedVariables
    }))
  }

  const handleSubjectChange = (subject: string) => {
    const detectedVariables = extractVariables(subject + form.content)
    setForm(prev => ({
      ...prev,
      subject,
      variables: detectedVariables
    }))
  }

  const renderPreview = (template: EmailTemplate, data: Record<string, string>) => {
    let previewSubject = template.subject
    let previewContent = template.content

    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      previewSubject = previewSubject.replace(new RegExp(placeholder, 'g'), value)
      previewContent = previewContent.replace(new RegExp(placeholder, 'g'), value)
    })

    return { previewSubject, previewContent }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'associate_attorney']}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage email templates for consistent communication
            </p>
          </div>
          <button
            onClick={handleCreateTemplate}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Template
          </button>
        </div>

        {/* Templates List */}
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading templates...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <DocumentTextIcon className="h-12 w-12 text-red-500 mx-auto" />
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <button
                onClick={fetchTemplates}
                className="mt-2 text-sm text-blue-600 hover:text-blue-500"
              >
                Try again
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="p-6 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="mt-2 text-sm text-gray-500">No templates found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {templates.map((template) => (
                <div key={template.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <p className="text-sm text-gray-500">{template.subject}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          template.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span>{templateCategories.find(c => c.value === template.category)?.label}</span>
                        <span>•</span>
                        <span>Used {template.usage_count} times</span>
                        <span>•</span>
                        <span>Updated {formatDate(template.updated_at)}</span>
                      </div>

                      {template.variables.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500 mb-1">Variables:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.variables.map((variable) => (
                              <span
                                key={variable}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {`{{${variable}}}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePreviewTemplate(template)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Preview"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {(isCreateModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isCreateModalOpen ? 'Create New Template' : 'Edit Template'}
                </h3>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false)
                    setIsEditModalOpen(false)
                    setSaveError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="space-y-6">
                {saveError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-sm text-red-600">{saveError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g., deadline_reminder"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={form.category}
                      onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {templateCategories.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject Line *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => handleSubjectChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Use {{variable}} for dynamic content"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Content *
                  </label>
                  <textarea
                    required
                    rows={15}
                    value={form.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Enter your email template content. Use {{variable}} for dynamic content."
                  />
                </div>

                {form.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Detected Variables ({form.variables.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {form.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Variables are automatically detected from your subject and content
                    </p>
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Template is active and available for use
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false)
                      setIsEditModalOpen(false)
                      setSaveError(null)
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : (isCreateModalOpen ? 'Create Template' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {isPreviewModalOpen && selectedTemplate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Preview: {selectedTemplate.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h3>
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <p className="text-lg font-medium text-gray-900">
                    {renderPreview(selectedTemplate, previewData).previewSubject}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                      {renderPreview(selectedTemplate, previewData).previewContent}
                    </pre>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-blue-700 mb-2">Sample Data Used</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(previewData).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium text-blue-600">{`{{${key}}}:`}</span>
                        <span className="text-blue-800">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}