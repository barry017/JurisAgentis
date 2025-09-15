/**
 * New Matter Form - Create new legal matter/case
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  UsersIcon,
  BanknotesIcon,
  CalendarIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface MatterFormData {
  // Basic Information
  title: string
  description?: string
  practice_area: string
  matter_type: string
  case_number?: string
  
  // Client Information
  client_id: string
  
  // Legal Details
  jurisdiction: string
  court_name?: string
  judge_name?: string
  opposing_counsel?: string
  opposing_party?: string
  
  // Status and Priority
  status: string
  priority: string
  urgency_level: number
  
  // Financial Information
  estimated_hours?: number
  hourly_rate?: number
  flat_fee?: number
  retainer_amount?: number
  billing_method: string
  
  // Dates
  date_opened: string
  statute_limitations?: string
  next_deadline?: string
  estimated_completion?: string
  
  // Assignment
  lead_attorney?: string
  assigned_paralegal?: string
  
  // Notes
  case_summary?: string
  client_objectives?: string
  strategy_notes?: string
  special_instructions?: string
}

interface Client {
  id: string
  first_name: string
  last_name: string
  business_name?: string
  email: string
  practice_area: string
}

interface Attorney {
  uid: string
  first_name: string
  last_name: string
  role: string
}

export default function NewMatterPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState<MatterFormData>({
    title: '',
    practice_area: '',
    matter_type: '',
    client_id: '',
    jurisdiction: '',
    status: 'intake',
    priority: 'normal',
    urgency_level: 3,
    billing_method: 'flat_fee',
    date_opened: new Date().toISOString().split('T')[0]
  })
  
  const [clients, setClients] = useState<Client[]>([])
  const [attorneys, setAttorneys] = useState<Attorney[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingClients, setLoadingClients] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  // Check permissions
  const canCreateMatters = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  if (!canCreateMatters) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to create new matters.</p>
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

  // Load clients and attorneys
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load clients
        const clientsResponse = await fetch('/api/clients?limit=100')
        if (clientsResponse.ok) {
          const clientsResult = await clientsResponse.json()
          setClients(clientsResult.clients || [])
        }

        // Load attorneys and paralegals
        const usersResponse = await fetch('/api/users?roles=associate_attorney,paralegal')
        if (usersResponse.ok) {
          const usersResult = await usersResponse.json()
          setAttorneys(usersResult.users || [])
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoadingClients(false)
      }
    }

    loadData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }))
  }

  const filteredClients = clients.filter(client =>
    clientSearch === '' || 
    `${client.first_name} ${client.last_name}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.business_name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.title || !formData.client_id || !formData.practice_area) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/matters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          created_by: user?.id
        })
      })

      const result = await response.json()

      if (result.success || result.status === 'SUCCESS') {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/matters/${result.matter?.id || result.data?.id}`)
        }, 2000)
      } else {
        throw new Error(result.message || 'Failed to create matter')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Matter Created Successfully!</h2>
          <p className="text-gray-600">Redirecting to matter details...</p>
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
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                  New Matter
                </h1>
                <p className="text-gray-600 mt-1">Create a new legal matter or case</p>
              </div>
            </div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Matter Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Johnson Family Trust Administration"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Practice Area <span className="text-red-500">*</span>
                </label>
                <select
                  name="practice_area"
                  value={formData.practice_area}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                >
                  <option value="">Select Practice Area</option>
                  <option value="estate_planning">Estate Planning</option>
                  <option value="trust_administration">Trust Administration</option>
                  <option value="probate">Probate</option>
                  <option value="business_law">Business Law</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="family_law">Family Law</option>
                  <option value="litigation">Litigation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Matter Type
                </label>
                <select
                  name="matter_type"
                  value={formData.matter_type}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select Type</option>
                  <option value="consultation">Consultation</option>
                  <option value="document_preparation">Document Preparation</option>
                  <option value="representation">Legal Representation</option>
                  <option value="transaction">Transaction</option>
                  <option value="litigation">Litigation</option>
                  <option value="administrative">Administrative</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Number
                </label>
                <input
                  type="text"
                  name="case_number"
                  value={formData.case_number || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="CV-2025-0123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Opened
                </label>
                <input
                  type="date"
                  name="date_opened"
                  value={formData.date_opened}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Brief description of the matter..."
                />
              </div>
            </div>
          </div>

          {/* Client Selection */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UsersIcon className="h-5 w-5 mr-2 text-green-600" />
              Client Selection
            </h3>
            
            {loadingClients ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading clients...</p>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Clients
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Search by name, business, or email..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="client_id"
                    value={formData.client_id}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select a client</option>
                    {filteredClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.business_name 
                          ? `${client.business_name} (${client.first_name} ${client.last_name})`
                          : `${client.first_name} ${client.last_name}`
                        } - {client.email}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredClients.length === 0 && clientSearch && (
                  <p className="text-sm text-gray-500 mt-2">
                    No clients found matching "{clientSearch}". 
                    <button
                      type="button"
                      onClick={() => router.push('/clients/new')}
                      className="text-blue-600 hover:text-blue-800 ml-1"
                    >
                      Create new client?
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Legal Details */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Legal Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jurisdiction
                </label>
                <select
                  name="jurisdiction"
                  value={formData.jurisdiction}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select Jurisdiction</option>
                  <option value="federal">Federal</option>
                  <option value="alabama">Alabama</option>
                  <option value="georgia">Georgia</option>
                  <option value="tennessee">Tennessee</option>
                  <option value="mississippi">Mississippi</option>
                  <option value="florida">Florida</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Court Name
                </label>
                <input
                  type="text"
                  name="court_name"
                  value={formData.court_name || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Jefferson County Probate Court"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Judge Name
                </label>
                <input
                  type="text"
                  name="judge_name"
                  value={formData.judge_name || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Hon. Sarah Williams"
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
                  placeholder="Smith & Associates"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Opposing Party
                </label>
                <input
                  type="text"
                  name="opposing_party"
                  value={formData.opposing_party || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Defendant name or opposing party"
                />
              </div>
            </div>
          </div>

          {/* Status and Priority */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Status & Priority
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <option value="pending">Pending</option>
                  <option value="on_hold">On Hold</option>
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
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency Level (1-5)
                </label>
                <input
                  type="number"
                  name="urgency_level"
                  value={formData.urgency_level}
                  onChange={handleInputChange}
                  min={1}
                  max={5}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BanknotesIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Financial Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Method
                </label>
                <select
                  name="billing_method"
                  value={formData.billing_method}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="flat_fee">Flat Fee</option>
                  <option value="hourly">Hourly</option>
                  <option value="contingency">Contingency</option>
                  <option value="retainer">Retainer</option>
                  <option value="pro_bono">Pro Bono</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Hours
                </label>
                <input
                  type="number"
                  name="estimated_hours"
                  value={formData.estimated_hours || ''}
                  onChange={handleInputChange}
                  step="0.5"
                  className="input-field"
                  placeholder="10.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  className="input-field"
                  placeholder="350.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flat Fee ($)
                </label>
                <input
                  type="number"
                  name="flat_fee"
                  value={formData.flat_fee || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  className="input-field"
                  placeholder="5000.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Retainer Amount ($)
                </label>
                <input
                  type="number"
                  name="retainer_amount"
                  value={formData.retainer_amount || ''}
                  onChange={handleInputChange}
                  step="0.01"
                  className="input-field"
                  placeholder="2500.00"
                />
              </div>
            </div>
          </div>

          {/* Important Dates */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
              Important Dates
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statute of Limitations
                </label>
                <input
                  type="date"
                  name="statute_limitations"
                  value={formData.statute_limitations || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Deadline
                </label>
                <input
                  type="date"
                  name="next_deadline"
                  value={formData.next_deadline || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-2">
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
            </div>
          </div>

          {/* Assignment */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Staff Assignment
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Attorney
                </label>
                <select
                  name="lead_attorney"
                  value={formData.lead_attorney || ''}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select Attorney</option>
                  {attorneys
                    .filter(attorney => attorney.role === 'associate_attorney')
                    .map((attorney) => (
                      <option key={attorney.uid} value={attorney.uid}>
                        {attorney.first_name} {attorney.last_name}
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
                  <option value="">Select Paralegal</option>
                  {attorneys
                    .filter(attorney => attorney.role === 'paralegal')
                    .map((attorney) => (
                      <option key={attorney.uid} value={attorney.uid}>
                        {attorney.first_name} {attorney.last_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notes & Documentation
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Summary
                </label>
                <textarea
                  name="case_summary"
                  value={formData.case_summary || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="input-field"
                  placeholder="Brief summary of the case and key issues..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Objectives
                </label>
                <textarea
                  name="client_objectives"
                  value={formData.client_objectives || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="What the client hopes to achieve..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Strategy Notes
                </label>
                <textarea
                  name="strategy_notes"
                  value={formData.strategy_notes || ''}
                  onChange={handleInputChange}
                  rows={3}
                  className="input-field"
                  placeholder="Legal strategy and approach..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Instructions
                </label>
                <textarea
                  name="special_instructions"
                  value={formData.special_instructions || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="input-field"
                  placeholder="Any special handling requirements..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating Matter...' : 'Create Matter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}