/**
 * Edit Case Form - Update existing case record
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  PencilSquareIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
  // ClockIcon
} from '@heroicons/react/24/outline'

interface CaseFormData {
  title: string
  description: string
  case_type: 'estate_planning' | 'business_formation' | 'real_estate' | 'family_law' | 'litigation' | 'other'
  status: 'intake' | 'active' | 'on_hold' | 'pending_closure' | 'completed' | 'closed'
  primary_client_id: string
  assigned_attorney: string
  assigned_paralegal?: string
  assigned_assistant?: string
  opened_date: string
  closed_date?: string
  statute_of_limitations?: string
  estimated_completion?: string
  flat_fee_amount?: number
  hourly_rate?: number
  retainer_amount?: number
  billing_type: 'flat_fee' | 'hourly' | 'contingency' | 'retainer'
  court_case_number?: string
  opposing_party?: string
  opposing_counsel?: string
  jurisdiction?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  complexity: 'low' | 'medium' | 'high'
  tags?: string[]
  notes?: string
  internal_notes?: string
}

interface Client {
  id: string
  first_name?: string
  last_name?: string
  entity_name?: string
  email?: string
  phone_primary?: string
}

interface User {
  uid: string
  first_name: string
  last_name: string
  email: string
  role: string
}

export default function EditCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [caseId, setCaseId] = useState<string>('')

  const [formData, setFormData] = useState<CaseFormData>({
    title: '',
    description: '',
    case_type: 'estate_planning',
    status: 'intake',
    primary_client_id: '',
    assigned_attorney: '',
    opened_date: new Date().toISOString().split('T')[0],
    billing_type: 'flat_fee',
    priority: 'normal',
    complexity: 'medium'
  })
  
  const [loading, setLoading] = useState(false)
  const [loadingCase, setLoadingCase] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [originalData, setOriginalData] = useState<CaseFormData | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [attorneys, setAttorneys] = useState<User[]>([])
  const [paralegals, setParalegals] = useState<User[]>([])
  const [assistants, setAssistants] = useState<User[]>([])

  // Check permissions
  const canEditCases = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

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
        setLoadingCase(true)
        setError(null)

        const response = await fetch(`/api/cases/${caseId}`)
        const data = await response.json()

        if (response.ok && data.success) {
          const caseData = data.data.case
          const caseFormData: CaseFormData = {
            title: caseData.title || '',
            description: caseData.description || '',
            case_type: caseData.case_type || 'estate_planning',
            status: caseData.status || 'intake',
            primary_client_id: caseData.primary_client?.id || '',
            assigned_attorney: caseData.assigned_attorney_profile?.uid || '',
            assigned_paralegal: caseData.assigned_paralegal_profile?.uid || '',
            assigned_assistant: caseData.assigned_assistant_profile?.uid || '',
            opened_date: caseData.opened_date || '',
            closed_date: caseData.closed_date || '',
            statute_of_limitations: caseData.statute_of_limitations || '',
            estimated_completion: caseData.estimated_completion || '',
            flat_fee_amount: caseData.flat_fee_amount || undefined,
            hourly_rate: caseData.hourly_rate || undefined,
            retainer_amount: caseData.retainer_amount || undefined,
            billing_type: caseData.billing_type || 'flat_fee',
            court_case_number: caseData.court_case_number || '',
            opposing_party: caseData.opposing_party || '',
            opposing_counsel: caseData.opposing_counsel || '',
            jurisdiction: caseData.jurisdiction || '',
            priority: caseData.priority || 'normal',
            complexity: caseData.complexity || 'medium',
            tags: caseData.tags || [],
            notes: caseData.notes || '',
            internal_notes: caseData.internal_notes || ''
          }
          
          setFormData(caseFormData)
          setOriginalData(caseFormData)
        } else {
          setError(data.error?.message || 'Failed to load case')
        }
      } catch (_error) {
        setError('Network error occurred')
      } finally {
        setLoadingCase(false)
      }
    }

    if (user && canEditCases && caseId) {
      fetchCase()
    }
  }, [caseId, user, canEditCases])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canEditCases) {
      router.push('/dashboard')
    }
  }, [user, canEditCases, router])

  // Load clients and staff
  useEffect(() => {
    if (user && canEditCases) {
      loadClients()
      loadStaff()
    }
  }, [user, canEditCases])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=1000')
      const data = await response.json()
      
      if (response.ok && data.clients) {
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const loadStaff = async () => {
    try {
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (response.ok && data.success) {
        const users = data.data.users || []
        setAttorneys(users.filter((u: User) => ['admin', 'associate_attorney'].includes(u.role)))
        setParalegals(users.filter((u: User) => u.role === 'paralegal'))
        setAssistants(users.filter((u: User) => u.role === 'assistant'))
      }
    } catch (error) {
      console.error('Error loading staff:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value
    }))
  }

  const handleArrayInputChange = (name: string, value: string) => {
    const values = value.split(',').map(v => v.trim()).filter(v => v)
    setFormData(prev => ({ ...prev, [name]: values }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.title || !formData.primary_client_id || !formData.assigned_attorney) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/cases/${caseId}`)
        }, 2000)
      } else {
        throw new Error(result.error?.message || 'Failed to update case')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getClientDisplayName = (client: Client) => {
    if (client.entity_name) {
      return client.entity_name
    }
    return `${client.first_name || ''} ${client.last_name || ''}`.trim()
  }

  const getUserDisplayName = (user: User) => {
    return `${user.first_name} ${user.last_name}`
  }

  const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData)

  if (authLoading || loadingCase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canEditCases) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to edit cases.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Updated Successfully!</h2>
          <p className="text-gray-600">Redirecting to case details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/cases/${caseId}`)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <PencilSquareIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Edit Case
                </h1>
                <p className="text-gray-600 mt-1">
                  Update case information and details
                </p>
              </div>
            </div>
            
            {hasChanges && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Unsaved Changes
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Case Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="case_type"
                    value={formData.case_type}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="family_law">Family Law</option>
                    <option value="litigation">Litigation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="intake">Intake</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="pending_closure">Pending Closure</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Client & Assignment */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-green-600" />
              Client & Assignment
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Client <span className="text-red-500">*</span>
                </label>
                <select
                  name="primary_client_id"
                  value={formData.primary_client_id}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {getClientDisplayName(client)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Attorney <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="assigned_attorney"
                    value={formData.assigned_attorney}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select an attorney</option>
                    {attorneys.map(attorney => (
                      <option key={attorney.uid} value={attorney.uid}>
                        {getUserDisplayName(attorney)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Paralegal
                  </label>
                  <select
                    name="assigned_paralegal"
                    value={formData.assigned_paralegal || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Select a paralegal</option>
                    {paralegals.map(paralegal => (
                      <option key={paralegal.uid} value={paralegal.uid}>
                        {getUserDisplayName(paralegal)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Assistant
                  </label>
                  <select
                    name="assigned_assistant"
                    value={formData.assigned_assistant || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="">Select an assistant</option>
                    {assistants.map(assistant => (
                      <option key={assistant.uid} value={assistant.uid}>
                        {getUserDisplayName(assistant)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CurrencyDollarIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Financial Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Type
                </label>
                <select
                  name="billing_type"
                  value={formData.billing_type}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="flat_fee">Flat Fee</option>
                  <option value="hourly">Hourly</option>
                  <option value="contingency">Contingency</option>
                  <option value="retainer">Retainer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Flat Fee Amount
                  </label>
                  <input
                    type="number"
                    name="flat_fee_amount"
                    value={formData.flat_fee_amount || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Rate
                  </label>
                  <input
                    type="number"
                    name="hourly_rate"
                    value={formData.hourly_rate || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retainer Amount
                  </label>
                  <input
                    type="number"
                    name="retainer_amount"
                    value={formData.retainer_amount || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dates & Litigation */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
              Dates & Litigation Details
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opened Date
                  </label>
                  <input
                    type="date"
                    name="opened_date"
                    value={formData.opened_date}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Completion
                  </label>
                  <input
                    type="date"
                    name="estimated_completion"
                    value={formData.estimated_completion || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Statute of Limitations
                  </label>
                  <input
                    type="date"
                    name="statute_of_limitations"
                    value={formData.statute_of_limitations || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
              </div>

              {(formData.status === 'completed' || formData.status === 'closed') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Closed Date
                  </label>
                  <input
                    type="date"
                    name="closed_date"
                    value={formData.closed_date || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Court Case Number
                  </label>
                  <input
                    type="text"
                    name="court_case_number"
                    value={formData.court_case_number || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jurisdiction
                  </label>
                  <input
                    type="text"
                    name="jurisdiction"
                    value={formData.jurisdiction || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opposing Party
                  </label>
                  <input
                    type="text"
                    name="opposing_party"
                    value={formData.opposing_party || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Opposing Counsel
                  </label>
                  <input
                    type="text"
                    name="opposing_counsel"
                    value={formData.opposing_counsel || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Additional Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Complexity
                </label>
                <select
                  name="complexity"
                  value={formData.complexity}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) => handleArrayInputChange('tags', e.target.value)}
                  className="input-field"
                  placeholder="urgent, high-priority, family"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Additional notes about the case..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  name="internal_notes"
                  value={formData.internal_notes || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Internal notes for staff..."
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push(`/cases/${caseId}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Case...' : 'Update Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}