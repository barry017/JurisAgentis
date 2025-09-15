/**
 * New Client Form - Create new client record
 */

'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  UserPlusIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface ClientFormData {
  // Personal Information
  first_name: string
  last_name: string
  middle_name?: string
  preferred_name?: string
  date_of_birth?: string
  ssn_last_four?: string
  
  // Contact Information
  email: string
  phone_primary: string
  phone_secondary?: string
  
  // Address Information
  street_address: string
  city: string
  state: string
  zip_code: string
  country: string
  
  // Business Information
  business_name?: string
  business_type?: string
  tax_id?: string
  
  // Legal Information
  client_status: string
  practice_area: string
  referral_source?: string
  intake_date: string
  
  // Communication Preferences
  preferred_contact_method: string
  communication_preferences: {
    email_updates: boolean
    sms_updates: boolean
    newsletter: boolean
    marketing: boolean
  }
  
  // Notes
  initial_consultation_notes?: string
  special_instructions?: string
}

export default function NewClientPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState<ClientFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_primary: '',
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'United States',
    client_status: 'prospect',
    practice_area: '',
    intake_date: new Date().toISOString().split('T')[0],
    preferred_contact_method: 'email',
    communication_preferences: {
      email_updates: true,
      sms_updates: false,
      newsletter: false,
      marketing: false
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Check permissions
  const canCreateClients = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  if (!canCreateClients) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to create new clients.</p>
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
    
    if (name.startsWith('communication_preferences.')) {
      const prefKey = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        communication_preferences: {
          ...prev.communication_preferences,
          [prefKey]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value === 'true'
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate required fields
      if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone_primary) {
        throw new Error('Please fill in all required fields')
      }

      const response = await fetch('/api/clients', {
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

      if (result.status === 'SUCCESS') {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/clients/${result.data.id}`)
        }, 2000)
      } else {
        throw new Error(result.message || 'Failed to create client')
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Client Created Successfully!</h2>
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
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <UserPlusIcon className="h-8 w-8 mr-3 text-blue-600" />
                  New Client
                </h1>
                <p className="text-gray-600 mt-1">Add a new client to the system</p>
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

          {/* Personal Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <UserPlusIcon className="h-5 w-5 mr-2 text-blue-600" />
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
                  placeholder="John"
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
                  placeholder="Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  name="middle_name"
                  value={formData.middle_name || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Michael"
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
                  placeholder="Jack"
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
                  Last 4 of SSN
                </label>
                <input
                  type="text"
                  name="ssn_last_four"
                  value={formData.ssn_last_four || ''}
                  onChange={handleInputChange}
                  maxLength={4}
                  pattern="[0-9]{4}"
                  className="input-field"
                  placeholder="1234"
                />
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
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="john.smith@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone_primary"
                  value={formData.phone_primary}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="(555) 123-4567"
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
                  placeholder="(555) 987-6543"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Contact Method
                </label>
                <select
                  name="preferred_contact_method"
                  value={formData.preferred_contact_method}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="text">Text Message</option>
                  <option value="mail">Mail</option>
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
                  Street Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="street_address"
                  value={formData.street_address}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="Birmingham"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                  >
                    <option value="">Select State</option>
                    <option value="AL">Alabama</option>
                    <option value="GA">Georgia</option>
                    <option value="TN">Tennessee</option>
                    <option value="MS">Mississippi</option>
                    <option value="FL">Florida</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="zip_code"
                    value={formData.zip_code}
                    onChange={handleInputChange}
                    required
                    className="input-field"
                    placeholder="35201"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-orange-600" />
              Business Information (Optional)
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
                  placeholder="Smith Enterprises LLC"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type
                </label>
                <select
                  name="business_type"
                  value={formData.business_type || ''}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Select Type</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="s_corp">S-Corporation</option>
                  <option value="nonprofit">Nonprofit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax ID / EIN
                </label>
                <input
                  type="text"
                  name="tax_id"
                  value={formData.tax_id || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="12-3456789"
                />
              </div>
            </div>
          </div>

          {/* Legal Information */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Legal Practice Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <option value="active">Active Client</option>
                  <option value="former">Former Client</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Practice Area
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
                  Intake Date
                </label>
                <input
                  type="date"
                  name="intake_date"
                  value={formData.intake_date}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referral Source
                </label>
                <input
                  type="text"
                  name="referral_source"
                  value={formData.referral_source || ''}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Attorney referral, website, etc."
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Notes & Instructions
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Consultation Notes
                </label>
                <textarea
                  name="initial_consultation_notes"
                  value={formData.initial_consultation_notes || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="input-field"
                  placeholder="Notes from initial consultation or intake..."
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
                  placeholder="Any special handling instructions..."
                />
              </div>
            </div>
          </div>

          {/* Communication Preferences */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <EnvelopeIcon className="h-5 w-5 mr-2 text-blue-600" />
              Communication Preferences
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="communication_preferences.email_updates"
                  checked={formData.communication_preferences.email_updates}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'communication_preferences.email_updates',
                      value: e.target.checked.toString(),
                      type: 'checkbox'
                    }
                  } as any)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Email case updates and communications</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="communication_preferences.sms_updates"
                  checked={formData.communication_preferences.sms_updates}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'communication_preferences.sms_updates',
                      value: e.target.checked.toString(),
                      type: 'checkbox'
                    }
                  } as any)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">SMS notifications for urgent matters</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="communication_preferences.newsletter"
                  checked={formData.communication_preferences.newsletter}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'communication_preferences.newsletter',
                      value: e.target.checked.toString(),
                      type: 'checkbox'
                    }
                  } as any)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Legal newsletter and updates</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="communication_preferences.marketing"
                  checked={formData.communication_preferences.marketing}
                  onChange={(e) => handleInputChange({
                    target: {
                      name: 'communication_preferences.marketing',
                      value: e.target.checked.toString(),
                      type: 'checkbox'
                    }
                  } as any)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Marketing communications and promotional materials</span>
              </label>
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
              {loading ? 'Creating Client...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}