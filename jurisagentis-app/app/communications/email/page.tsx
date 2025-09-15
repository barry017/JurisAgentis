'use client'

import { useState, useEffect } from 'react'
import { PaperAirplaneIcon, InboxIcon, EyeIcon, ClockIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

interface EmailRecord {
  id: string
  to_addresses: string[]
  cc_addresses?: string[]
  bcc_addresses?: string[]
  subject: string
  content: string
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
  category: 'client_communication' | 'deadline_reminder' | 'invoice' | 'document_delivery' | 'system_notification'
  matter_id?: string
  client_id?: string
  template_used?: string
  sent_at?: string
  delivered_at?: string
  opened_at?: string
  clicked_at?: string
  error_message?: string
  created_at: string
  created_by: string
}

interface SendEmailForm {
  to: string
  cc?: string
  bcc?: string
  subject: string
  content: string
  template?: string
  template_data?: Record<string, any>
  matter_id?: string
  client_id?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  category: 'client_communication' | 'deadline_reminder' | 'invoice' | 'document_delivery' | 'system_notification'
  confidential?: boolean
}

const statusIcons = {
  queued: ClockIcon,
  sent: PaperAirplaneIcon,
  delivered: CheckCircleIcon,
  opened: EyeIcon,
  clicked: EyeIcon,
  bounced: ExclamationTriangleIcon,
  failed: ExclamationTriangleIcon,
}

const statusColors = {
  queued: 'text-yellow-600 bg-yellow-100',
  sent: 'text-blue-600 bg-blue-100',
  delivered: 'text-green-600 bg-green-100',
  opened: 'text-purple-600 bg-purple-100',
  clicked: 'text-indigo-600 bg-indigo-100',
  bounced: 'text-red-600 bg-red-100',
  failed: 'text-red-600 bg-red-100',
}

const categoryLabels = {
  client_communication: 'Client Communication',
  deadline_reminder: 'Deadline Reminder',
  invoice: 'Invoice',
  document_delivery: 'Document Delivery',
  system_notification: 'System Notification'
}

export default function EmailManagementPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox')
  const [emails, setEmails] = useState<EmailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null)
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    matter_id: '',
    client_id: ''
  })

  // Send email form state
  const [sendForm, setSendForm] = useState<SendEmailForm>({
    to: '',
    subject: '',
    content: '',
    priority: 'normal',
    category: 'client_communication'
  })
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Available templates
  const [templates] = useState([
    { name: 'deadline_reminder', label: 'Deadline Reminder' },
    { name: 'invoice_notification', label: 'Invoice Notification' },
    { name: 'document_ready', label: 'Document Ready for Review' }
  ])

  const fetchEmails = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.status) params.append('status', filters.status)
      if (filters.matter_id) params.append('matter_id', filters.matter_id)
      if (filters.client_id) params.append('client_id', filters.client_id)

      const response = await fetch(`/api/email?${params.toString()}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const result = await response.json()
      setEmails(result.data.emails || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmails()
  }, [filters])

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setSending(true)
      setSendError(null)
      setSendSuccess(false)

      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(sendForm),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to send email')
      }

      const result = await response.json()
      setSendSuccess(true)
      
      // Reset form
      setSendForm({
        to: '',
        subject: '',
        content: '',
        priority: 'normal',
        category: 'client_communication'
      })

      // Refresh email list
      fetchEmails()

      // Auto-switch to inbox after sending
      setTimeout(() => {
        setActiveTab('inbox')
        setSendSuccess(false)
      }, 2000)

    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  const handleTemplateChange = (templateName: string) => {
    setSendForm(prev => ({
      ...prev,
      template: templateName,
      template_data: {
        client_name: 'John Smith',
        matter_title: 'Sample Matter',
        deadline_date: '2025-01-20',
        deadline_description: 'Important filing deadline',
        attorney_name: 'Sarah Johnson',
        firm_name: 'JurisAgentis Law Firm'
      }
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ProtectedRoute allowedRoles={['admin', 'associate_attorney', 'paralegal']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Communications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send and manage email communications with clients and colleagues
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inbox'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <InboxIcon className="h-5 w-5 inline mr-2" />
              Email History
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compose'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <PaperAirplaneIcon className="h-5 w-5 inline mr-2" />
              Compose Email
            </button>
          </nav>
        </div>

        {/* Email History Tab */}
        {activeTab === 'inbox' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="sent">Sent</option>
                    <option value="delivered">Delivered</option>
                    <option value="opened">Opened</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Matter ID
                  </label>
                  <input
                    type="text"
                    value={filters.matter_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, matter_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Filter by matter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client ID
                  </label>
                  <input
                    type="text"
                    value={filters.client_id}
                    onChange={(e) => setFilters(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Filter by client"
                  />
                </div>
              </div>
            </div>

            {/* Email List */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading emails...</p>
                </div>
              ) : error ? (
                <div className="p-6 text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                  <button
                    onClick={fetchEmails}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                  >
                    Try again
                  </button>
                </div>
              ) : emails.length === 0 ? (
                <div className="p-6 text-center">
                  <InboxIcon className="h-12 w-12 text-gray-400 mx-auto" />
                  <p className="mt-2 text-sm text-gray-500">No emails found</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {emails.map((email) => {
                    const StatusIcon = statusIcons[email.status]
                    return (
                      <div
                        key={email.id}
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedEmail(email)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <div className={`p-1 rounded-full ${statusColors[email.status]}`}>
                                <StatusIcon className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {email.subject}
                                </p>
                                <p className="text-sm text-gray-500 truncate">
                                  To: {email.to_addresses.join(', ')}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                              <span>{categoryLabels[email.category]}</span>
                              <span>•</span>
                              <span>{formatDate(email.created_at)}</span>
                              {email.sent_at && (
                                <>
                                  <span>•</span>
                                  <span>Sent: {formatDate(email.sent_at)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[email.status]}`}>
                              {email.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Compose Email Tab */}
        {activeTab === 'compose' && (
          <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
            <form onSubmit={handleSendEmail} className="space-y-6">
              {sendSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        Email sent successfully!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {sendError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">
                        {sendError}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To *
                    </label>
                    <input
                      type="email"
                      required
                      value={sendForm.to}
                      onChange={(e) => setSendForm(prev => ({ ...prev, to: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="recipient@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CC
                    </label>
                    <input
                      type="email"
                      value={sendForm.cc || ''}
                      onChange={(e) => setSendForm(prev => ({ ...prev, cc: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="cc@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <input
                      type="text"
                      required
                      value={sendForm.subject}
                      onChange={(e) => setSendForm(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Email subject"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Template
                    </label>
                    <select
                      value={sendForm.template || ''}
                      onChange={(e) => handleTemplateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">No template</option>
                      {templates.map(template => (
                        <option key={template.name} value={template.name}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={sendForm.category}
                      onChange={(e) => setSendForm(prev => ({ ...prev, category: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {Object.entries(categoryLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      value={sendForm.priority}
                      onChange={(e) => setSendForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message *
                </label>
                <textarea
                  required
                  rows={12}
                  value={sendForm.content}
                  onChange={(e) => setSendForm(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter your message here..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="confidential"
                    checked={sendForm.confidential || false}
                    onChange={(e) => setSendForm(prev => ({ ...prev, confidential: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="confidential" className="ml-2 text-sm text-gray-700">
                    Mark as confidential
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Email Detail Modal */}
        {selectedEmail && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Email Details</h3>
                <button
                  onClick={() => setSelectedEmail(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="text-sm text-gray-900">{selectedEmail.subject}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">To</label>
                    <p className="text-sm text-gray-900">{selectedEmail.to_addresses.join(', ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[selectedEmail.status]}`}>
                      {selectedEmail.status}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Content</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-md">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">{selectedEmail.content}</pre>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium text-gray-500">Created</label>
                    <p className="text-gray-900">{formatDate(selectedEmail.created_at)}</p>
                  </div>
                  {selectedEmail.sent_at && (
                    <div>
                      <label className="font-medium text-gray-500">Sent</label>
                      <p className="text-gray-900">{formatDate(selectedEmail.sent_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}