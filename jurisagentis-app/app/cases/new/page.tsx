/**
 * New Case Creation Form - Multi-step case intake workflow
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  // CalendarIcon,
  // BuildingOfficeIcon2,
  ArrowRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface CaseFormData {
  title: string
  description: string
  case_type: 'estate_planning' | 'business_formation' | 'real_estate' | 'family_law' | 'litigation' | 'other'
  primary_client_id: string
  assigned_attorney: string
  assigned_paralegal?: string
  assigned_assistant?: string
  opened_date: string
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

export default function NewCasePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 4

  const [formData, setFormData] = useState<CaseFormData>({
    title: '',
    description: '',
    case_type: 'estate_planning',
    primary_client_id: '',
    assigned_attorney: '',
    opened_date: new Date().toISOString().split('T')[0],
    billing_type: 'flat_fee',
    priority: 'normal',
    complexity: 'medium'
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [attorneys, setAttorneys] = useState<User[]>([])
  const [paralegals, setParalegals] = useState<User[]>([])
  const [assistants, setAssistants] = useState<User[]>([])

  // Check permissions
  const canCreateCases = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canCreateCases) {
      router.push('/dashboard')
    }
  }, [user, canCreateCases, router])

  // Load clients and staff
  useEffect(() => {
    if (user && canCreateCases) {
      loadClients()
      loadStaff()
    }
  }, [user, canCreateCases])

  // Set default assigned attorney to current user if they're an attorney
  useEffect(() => {
    if (user && ['admin', 'associate_attorney'].includes(user.role)) {
      setFormData(prev => ({ ...prev, assigned_attorney: user.uid }))
    }
  }, [user])

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

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
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

      const response = await fetch('/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          created_by: user?.uid
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/cases/${result.data.case.id}`)
        }, 2000)
      } else {
        throw new Error(result.error?.message || 'Failed to create case')
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canCreateCases) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to create cases.</p>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Case Created Successfully!</h2>
          <p className="text-gray-600">Redirecting to case details...</p>
        </div>
      </div>
    )
  }

  const stepTitles = [
    'Basic Information',
    'Client & Assignment',
    'Financial Details',
    'Additional Information'
  ]

  const stepIcons = [
    DocumentTextIcon,
    UserIcon,
    CurrencyDollarIcon,
    ClockIcon
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/cases')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <PlusIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Create New Case
                </h1>
                <p className="text-gray-600 mt-1">
                  Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNumber = index + 1
              const Icon = stepIcons[index]
              const isActive = stepNumber === currentStep
              const isCompleted = stepNumber < currentStep
              
              return (
                <div key={stepNumber} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isActive 
                        ? 'border-blue-600 text-blue-600 bg-white' 
                        : 'border-gray-300 text-gray-400 bg-white'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      Step {stepNumber}
                    </p>
                    <p className={`text-xs ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      {stepTitles[index]}
                    </p>
                  </div>
                  
                  {stepNumber < totalSteps && (
                    <div className={`flex-1 h-0.5 mx-4 ${
                      stepNumber < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-3xl">
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

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
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
                    placeholder="Enter descriptive case title"
                  />
                </div>

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
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="input-field"
                    placeholder="Provide a detailed description of the case"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Client & Assignment */}
          {currentStep === 2 && (
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
                    Assigned Paralegal (Optional)
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
                    Assigned Assistant (Optional)
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
          )}

          {/* Step 3: Financial Details */}
          {currentStep === 3 && (
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

                {formData.billing_type === 'flat_fee' && (
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
                      placeholder="0.00"
                    />
                  </div>
                )}

                {formData.billing_type === 'hourly' && (
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
                      placeholder="0.00"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retainer Amount (Optional)
                  </label>
                  <input
                    type="number"
                    name="retainer_amount"
                    value={formData.retainer_amount || ''}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className="input-field"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Additional Information */}
          {currentStep === 4 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-purple-600" />
                Additional Information
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Previous
            </button>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => router.push('/cases')}
                className="btn-secondary"
              >
                Cancel
              </button>
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary"
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Case...' : 'Create Case'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}