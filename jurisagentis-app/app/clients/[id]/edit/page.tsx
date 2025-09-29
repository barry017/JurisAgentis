/**
 * Edit Client Form - Update existing client record
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  UserIcon,
  PencilSquareIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface ClientFormData {
  first_name: string
  last_name: string
  preferred_name?: string
  date_of_birth?: string
  email?: string
  phone_primary?: string
  phone_secondary?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  client_status: 'prospect' | 'active' | 'inactive' | 'former' | 'do_not_contact'
  client_type: 'individual' | 'business' | 'estate' | 'trust' | 'non_profit' | 'government'
  business_name?: string
  business_tax_id?: string
  business_type?: string
  referral_source?: string
  practice_areas?: string[]
  communication_preference?: 'email' | 'phone' | 'mail' | 'secure_portal' | 'no_contact'
  language_preference?: string
  billing_rate?: number
  payment_terms?: number
  credit_limit?: number
  notes?: string
  tags?: string[]
}

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clientId, setClientId] = useState<string>('')

  const [formData, setFormData] = useState<ClientFormData>({
    first_name: '',
    last_name: '',
    client_status: 'prospect',
    client_type: 'individual',
    country: 'United States',
    communication_preference: 'email',
    language_preference: 'english',
    payment_terms: 30
  })
  
  const [loading, setLoading] = useState(false)
  const [loadingClient, setLoadingClient] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [originalData, setOriginalData] = useState<ClientFormData | null>(null)

  // Check permissions
  const canEditClients = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setClientId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoadingClient(true)
        setError(null)

        const response = await fetch(`/api/clients/${clientId}`)
        const data = await response.json()

        if (response.ok) {
          const client = data.client
          const clientFormData: ClientFormData = {
            first_name: client.first_name || '',
            last_name: client.last_name || '',
            preferred_name: client.preferred_name || '',
            date_of_birth: client.date_of_birth || '',
            email: client.email || '',
            phone_primary: client.phone_primary || '',
            phone_secondary: client.phone_secondary || '',
            address_line1: client.address_line1 || '',
            address_line2: client.address_line2 || '',
            city: client.city || '',
            state: client.state || '',
            zip_code: client.zip_code || '',
            country: client.country || 'United States',
            client_status: client.client_status || 'prospect',
            client_type: client.client_type || 'individual',
            business_name: client.business_name || '',
            business_tax_id: client.business_tax_id || '',
            business_type: client.business_type || '',
            referral_source: client.referral_source || '',
            practice_areas: client.practice_areas || [],
            communication_preference: client.communication_preference || 'email',
            language_preference: client.language_preference || 'english',
            billing_rate: client.billing_rate || undefined,
            payment_terms: client.payment_terms || 30,
            credit_limit: client.credit_limit || undefined,
            notes: client.notes || '',
            tags: client.tags || []
          }
          
          setFormData(clientFormData)
          setOriginalData(clientFormData)
        } else {
          setError(data.error?.message || 'Failed to load client')
        }
      } catch (_error) {
        setError('Network error occurred')
      } finally {
        setLoadingClient(false)
      }
    }

    if (user && canEditClients && clientId) {
      fetchClient()
    }
  }, [clientId, user, canEditClients])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canEditClients) {
      router.push('/dashboard')
    }
  }, [user, canEditClients, router])

  if (!canEditClients) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to edit clients.</p>
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
      if (!formData.first_name || !formData.last_name) {
        throw new Error('First name and last name are required')
      }

      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/clients/${clientId}`)
        }, 2000)
      } else {
        throw new Error(result.error?.message || 'Failed to update client')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const hasChanges = originalData && JSON.stringify(formData) !== JSON.stringify(originalData)

  if (authLoading || loadingClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Client Updated Successfully!</h2>
          <p className="text-gray-600">Redirecting to client profile...</p>
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
                onClick={() => router.push(`/clients/${clientId}`)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <PencilSquareIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Edit Client
                </h1>
                <p className="text-gray-600 mt-1">
                  Update client information for {formData.first_name} {formData.last_name}
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

          {/* Personal Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Name
                </label>
                <input
                  type="text"
                  name="preferred_name"
                  value={formData.preferred_name || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Status
                </label>
                <select
                  name="client_status"
                  value={formData.client_status}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="prospect">Prospect</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="former">Former</option>
                  <option value="do_not_contact">Do Not Contact</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Type
                </label>
                <select
                  name="client_type"
                  value={formData.client_type}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                  <option value="estate">Estate</option>
                  <option value="trust">Trust</option>
                  <option value="non_profit">Non-Profit</option>
                  <option value="government">Government</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <PhoneIcon className="h-5 w-5 mr-2 text-green-600" />
              Contact Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Phone
                </label>
                <input
                  type="tel"
                  name="phone_primary"
                  value={formData.phone_primary || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secondary Phone
                </label>
                <input
                  type="tel"
                  name="phone_secondary"
                  value={formData.phone_secondary || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Communication Preference
                </label>
                <select
                  name="communication_preference"
                  value={formData.communication_preference || 'email'}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="mail">Mail</option>
                  <option value="secure_portal">Secure Portal</option>
                  <option value="no_contact">No Contact</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPinIcon className="h-5 w-5 mr-2 text-purple-600" />
              Address Information
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1 || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2 || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code || ''}
                    onChange={handleInputChange}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-orange-600" />
              Business Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <input
                  type="text"
                  name="business_type"
                  value={formData.business_type || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID
                </label>
                <input
                  type="text"
                  name="business_tax_id"
                  value={formData.business_tax_id || ''}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Rate ($/hour)
                </label>
                <input
                  type="number"
                  name="billing_rate"
                  value={formData.billing_rate || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="input-field"
                />
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
                  Practice Areas (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.practice_areas?.join(', ') || ''}
                  onChange={(e) => handleArrayInputChange('practice_areas', e.target.value)}
                  className="input-field"
                  placeholder="Estate Planning, Wills, Trusts"
                />
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
                  placeholder="high-priority, corporate, family"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Source
                </label>
                <input
                  type="text"
                  name="referral_source"
                  value={formData.referral_source || ''}
                  onChange={handleInputChange}
                  className="input-field"
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
                  rows={4}
                  className="input-field"
                  placeholder="Additional notes about the client..."
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push(`/clients/${clientId}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Client...' : 'Update Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}