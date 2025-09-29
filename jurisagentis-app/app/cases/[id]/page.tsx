/**
 * Case Detail View - Display comprehensive case information
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  FolderOpenIcon,
  PencilSquareIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  PhoneIcon,
  EnvelopeIcon,
  // MapPinIcon,
  TagIcon,
  ChatBubbleLeftRightIcon,
  // PaperClipIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline'

interface Case {
  id: string
  case_number: string
  title: string
  description?: string
  case_type: 'estate_planning' | 'business_formation' | 'real_estate' | 'family_law' | 'litigation' | 'other'
  status: 'intake' | 'active' | 'on_hold' | 'pending_closure' | 'completed' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  primary_client: {
    id: string
    first_name?: string
    last_name?: string
    entity_name?: string
    email?: string
    phone_primary?: string
    phone_secondary?: string
    address_primary?: { street: string; city: string; state: string; zip: string }
  }
  assigned_attorney_profile?: {
    uid: string
    first_name: string
    last_name: string
    email: string
    title?: string
  }
  assigned_paralegal_profile?: {
    uid: string
    first_name: string
    last_name: string
    email: string
    title?: string
  }
  assigned_assistant_profile?: {
    uid: string
    first_name: string
    last_name: string
    email: string
    title?: string
  }
  opened_date: string
  closed_date?: string
  estimated_completion?: string
  statute_of_limitations?: string
  flat_fee_amount?: number
  hourly_rate?: number
  retainer_amount?: number
  billing_type: 'flat_fee' | 'hourly' | 'contingency' | 'retainer'
  court_case_number?: string
  opposing_party?: string
  opposing_counsel?: string
  jurisdiction?: string
  complexity: 'low' | 'medium' | 'high'
  tags?: string[]
  notes?: string
  internal_notes?: string
  created_at: string
  updated_at: string
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [caseId, setCaseId] = useState<string>('')

  const [caseData, setCaseData] = useState<Case | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check permissions
  const canViewCases = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canEditCases = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canDeleteCases = user && ['admin', 'associate_attorney'].includes(user.role)

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setCaseId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // Fetch case data
  useEffect(() => {
    const fetchCase = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/cases/${caseId}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setCaseData(data.data.case)
        } else {
          setError(data.error?.message || 'Failed to load case')
        }
      } catch (_error) {
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (user && canViewCases && caseId) {
      fetchCase()
    }
  }, [caseId, user, canViewCases])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canViewCases) {
      router.push('/dashboard')
    }
  }, [user, canViewCases, router])

  const getClientDisplayName = (client: Case['primary_client']) => {
    if (client.entity_name) {
      return client.entity_name
    }
    return `${client.first_name || ''} ${client.last_name || ''}`.trim()
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      intake: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-blue-100 text-blue-800 border-blue-200',
      on_hold: 'bg-orange-100 text-orange-800 border-orange-200',
      pending_closure: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles] || styles.active}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-green-100 text-green-800 border-green-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      urgent: 'bg-red-100 text-red-800 border-red-200'
    }
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[priority as keyof typeof styles] || styles.normal}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDeleteCase = async () => {
    if (!caseData) return

    const confirmed = window.confirm(
      `Are you sure you want to delete case ${caseData.case_number}? This action cannot be undone.`
    )

    if (confirmed) {
      try {
        const response = await fetch(`/api/cases/${caseId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          router.push('/cases')
        } else {
          const data = await response.json()
          alert(`Failed to delete case: ${data.error?.message || 'Unknown error'}`)
        }
      } catch (_error) {
        alert('Network error occurred while deleting case')
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewCases) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Case</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/cases')}
            className="btn-primary"
          >
            Return to Cases
          </button>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FolderOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Not Found</h2>
          <p className="text-gray-600 mb-4">The requested case could not be found.</p>
          <button
            onClick={() => router.push('/cases')}
            className="btn-primary"
          >
            Return to Cases
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/cases')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <FolderOpenIcon className="h-8 w-8 mr-3 text-blue-600" />
                  {caseData.case_number}
                </h1>
                <div className="flex items-center mt-1 space-x-4">
                  {getStatusBadge(caseData.status)}
                  {getPriorityBadge(caseData.priority)}
                  <span className="text-sm text-gray-500 capitalize">
                    {caseData.case_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {canEditCases && (
                <button
                  onClick={() => router.push(`/cases/${caseId}/edit`)}
                  className="btn-secondary flex items-center"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit Case
                </button>
              )}

              {canDeleteCases && (
                <button
                  onClick={handleDeleteCase}
                  className="btn-danger flex items-center"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Case Overview */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                Case Overview
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <p className="text-gray-900 text-lg font-medium">{caseData.title}</p>
                </div>

                {caseData.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900 whitespace-pre-wrap">{caseData.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                    <p className="text-gray-900 capitalize">{caseData.case_type.replace('_', ' ')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complexity</label>
                    <p className="text-gray-900 capitalize">{caseData.complexity}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Type</label>
                    <p className="text-gray-900 capitalize">{caseData.billing_type.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                {caseData.primary_client.entity_name ? (
                  <BuildingOfficeIcon className="h-5 w-5 mr-2 text-green-600" />
                ) : (
                  <UserIcon className="h-5 w-5 mr-2 text-green-600" />
                )}
                Primary Client
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900 font-medium">{getClientDisplayName(caseData.primary_client)}</p>
                </div>

                {caseData.primary_client.email && (
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{caseData.primary_client.email}</p>
                      <p className="text-sm text-gray-500">Email</p>
                    </div>
                  </div>
                )}

                {caseData.primary_client.phone_primary && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{caseData.primary_client.phone_primary}</p>
                      <p className="text-sm text-gray-500">Primary Phone</p>
                    </div>
                  </div>
                )}

                {caseData.primary_client.phone_secondary && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{caseData.primary_client.phone_secondary}</p>
                      <p className="text-sm text-gray-500">Secondary Phone</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push(`/clients/${caseData.primary_client.id}`)}
                  className="btn-secondary text-sm"
                >
                  View Client Profile
                </button>
              </div>
            </div>

            {/* Financial Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-yellow-600" />
                Financial Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {caseData.flat_fee_amount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Flat Fee</label>
                    <p className="text-gray-900 text-lg font-semibold">{formatCurrency(caseData.flat_fee_amount)}</p>
                  </div>
                )}

                {caseData.hourly_rate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                    <p className="text-gray-900 text-lg font-semibold">{formatCurrency(caseData.hourly_rate)}/hour</p>
                  </div>
                )}

                {caseData.retainer_amount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Retainer</label>
                    <p className="text-gray-900 text-lg font-semibold">{formatCurrency(caseData.retainer_amount)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Litigation Details */}
            {(caseData.court_case_number || caseData.opposing_party || caseData.opposing_counsel || caseData.jurisdiction) && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ScaleIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Litigation Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {caseData.court_case_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Court Case Number</label>
                      <p className="text-gray-900">{caseData.court_case_number}</p>
                    </div>
                  )}

                  {caseData.jurisdiction && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                      <p className="text-gray-900">{caseData.jurisdiction}</p>
                    </div>
                  )}

                  {caseData.opposing_party && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opposing Party</label>
                      <p className="text-gray-900">{caseData.opposing_party}</p>
                    </div>
                  )}

                  {caseData.opposing_counsel && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Opposing Counsel</label>
                      <p className="text-gray-900">{caseData.opposing_counsel}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {(caseData.notes || caseData.internal_notes) && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-indigo-600" />
                  Notes
                </h3>

                <div className="space-y-4">
                  {caseData.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client Notes</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap">{caseData.notes}</p>
                      </div>
                    </div>
                  )}

                  {caseData.internal_notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                        <p className="text-gray-700 whitespace-pre-wrap">{caseData.internal_notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Case Status */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Status</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
                  {getStatusBadge(caseData.status)}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  {getPriorityBadge(caseData.priority)}
                </div>
              </div>
            </div>

            {/* Important Dates */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Dates</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opened</label>
                  <div className="flex items-center text-sm text-gray-900">
                    <CalendarIcon className="h-4 w-4 mr-1 text-green-600" />
                    {formatDate(caseData.opened_date)}
                  </div>
                </div>

                {caseData.estimated_completion && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Completion</label>
                    <div className="flex items-center text-sm text-gray-900">
                      <ClockIcon className="h-4 w-4 mr-1 text-blue-600" />
                      {formatDate(caseData.estimated_completion)}
                    </div>
                  </div>
                )}

                {caseData.statute_of_limitations && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Statute of Limitations</label>
                    <div className="flex items-center text-sm text-gray-900">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1 text-red-600" />
                      {formatDate(caseData.statute_of_limitations)}
                    </div>
                  </div>
                )}

                {caseData.closed_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Closed</label>
                    <div className="flex items-center text-sm text-gray-900">
                      <CheckBadgeIcon className="h-4 w-4 mr-1 text-gray-600" />
                      {formatDate(caseData.closed_date)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team Assignment */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Assignment</h3>
              <div className="space-y-3">
                {caseData.assigned_attorney_profile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Attorney</label>
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-blue-600" />
                      <div>
                        <p className="text-gray-900 font-medium">
                          {caseData.assigned_attorney_profile.first_name} {caseData.assigned_attorney_profile.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{caseData.assigned_attorney_profile.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {caseData.assigned_paralegal_profile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Paralegal</label>
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-green-600" />
                      <div>
                        <p className="text-gray-900 font-medium">
                          {caseData.assigned_paralegal_profile.first_name} {caseData.assigned_paralegal_profile.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{caseData.assigned_paralegal_profile.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {caseData.assigned_assistant_profile && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Assistant</label>
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-purple-600" />
                      <div>
                        <p className="text-gray-900 font-medium">
                          {caseData.assigned_assistant_profile.first_name} {caseData.assigned_assistant_profile.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{caseData.assigned_assistant_profile.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {caseData.tags && caseData.tags.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TagIcon className="h-5 w-5 mr-2 text-indigo-600" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {caseData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push(`/documents?case_id=${caseData.id}`)}
                  className="w-full btn-secondary text-left flex items-center"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  View Documents
                </button>
                <button 
                  onClick={() => router.push(`/tasks?case_id=${caseData.id}`)}
                  className="w-full btn-secondary text-left flex items-center"
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  View Tasks
                </button>
                <button 
                  onClick={() => router.push(`/communications?case_id=${caseData.id}`)}
                  className="w-full btn-secondary text-left flex items-center"
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                  Communications
                </button>
                <button 
                  onClick={() => router.push(`/billing?case_id=${caseData.id}`)}
                  className="w-full btn-secondary text-left flex items-center"
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                  Billing & Time
                </button>
              </div>
            </div>

            {/* Case Metadata */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Case Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDate(caseData.created_at)}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {formatDate(caseData.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}