/**
 * User Registration Page - Sign up new users
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  UserPlusIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface RegistrationFormData {
  // Personal Information
  firstName: string
  lastName: string
  email: string
  
  // Authentication
  password: string
  confirmPassword: string
  
  // Professional Information
  jobTitle: string
  organization?: string
  barNumber?: string
  phoneNumber: string
  
  // System Access
  requestedRole: string
  requestReason: string
  
  // Legal Agreements
  acceptTerms: boolean
  acceptPrivacy: boolean
  acceptCommunications: boolean
}

export default function RegisterPage() {
  const _router = useRouter()
  
  const [formData, setFormData] = useState<RegistrationFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    jobTitle: '',
    phoneNumber: '',
    requestedRole: 'assistant',
    requestReason: '',
    acceptTerms: false,
    acceptPrivacy: false,
    acceptCommunications: false
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    
    // Clear specific validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Personal Information
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required'
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required'
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }
    
    // Confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }
    
    // Professional Information
    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Job title is required'
    }
    
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required'
    }
    
    if (!formData.requestReason.trim()) {
      errors.requestReason = 'Please explain why you need access to this system'
    }
    
    // Legal Agreements
    if (!formData.acceptTerms) {
      errors.acceptTerms = 'You must accept the Terms of Service'
    }
    
    if (!formData.acceptPrivacy) {
      errors.acceptPrivacy = 'You must accept the Privacy Policy'
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          jobTitle: formData.jobTitle.trim(),
          organization: formData.organization?.trim() || null,
          barNumber: formData.barNumber?.trim() || null,
          phoneNumber: formData.phoneNumber.trim(),
          requestedRole: formData.requestedRole,
          requestReason: formData.requestReason.trim(),
          acceptCommunications: formData.acceptCommunications
        })
      })

      const result = await response.json()

      if (response.ok && (result.success || result.status === 'SUCCESS')) {
        setSuccess(true)
      } else {
        throw new Error(result.message || result.error || 'Registration failed')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Submitted!</h2>
          <div className="space-y-3 text-sm text-gray-600">
            <p>
              Thank you for registering with JurisAgentis. Your registration request has been submitted for admin approval.
            </p>
            <p>
              You will receive an email confirmation shortly, and another email once your account is approved and activated.
            </p>
            <p className="font-medium text-gray-700">
              Please check your email for further instructions.
            </p>
          </div>
          <div className="mt-6 space-y-3">
            <Link
              href="/login"
              className="btn-primary w-full"
            >
              Return to Login
            </Link>
            <Link
              href="/"
              className="btn-secondary w-full"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <UserPlusIcon className="h-12 w-12 text-blue-600 mx-auto" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900">
            Register for JurisAgentis
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to access our legal practice management system
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
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
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.firstName ? 'border-red-500' : ''}`}
                    placeholder="John"
                  />
                  {validationErrors.firstName && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.lastName ? 'border-red-500' : ''}`}
                    placeholder="Smith"
                  />
                  {validationErrors.lastName && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.lastName}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.email ? 'border-red-500' : ''}`}
                    placeholder="john.smith@example.com"
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Security</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`input-field pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`input-field pr-10 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-4 w-4 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500">
                Password must be at least 8 characters and contain uppercase, lowercase, and numeric characters.
              </div>
            </div>

            {/* Professional Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Professional Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.jobTitle ? 'border-red-500' : ''}`}
                    placeholder="Attorney, Paralegal, Assistant, etc."
                  />
                  {validationErrors.jobTitle && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.jobTitle}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className={`input-field ${validationErrors.phoneNumber ? 'border-red-500' : ''}`}
                    placeholder="(555) 123-4567"
                  />
                  {validationErrors.phoneNumber && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.phoneNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    name="organization"
                    value={formData.organization || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Law Firm or Organization Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bar Number
                  </label>
                  <input
                    type="text"
                    name="barNumber"
                    value={formData.barNumber || ''}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="State Bar Number (if applicable)"
                  />
                </div>
              </div>
            </div>

            {/* System Access */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                System Access Request
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requested Role
                  </label>
                  <select
                    name="requestedRole"
                    value={formData.requestedRole}
                    onChange={handleInputChange}
                    className="input-field"
                  >
                    <option value="assistant">Assistant</option>
                    <option value="paralegal">Paralegal</option>
                    <option value="associate_attorney">Associate Attorney</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    An admin will review and assign the appropriate role based on your qualifications.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Access Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="requestReason"
                    value={formData.requestReason}
                    onChange={handleInputChange}
                    rows={4}
                    className={`input-field ${validationErrors.requestReason ? 'border-red-500' : ''}`}
                    placeholder="Please explain why you need access to this system and how you plan to use it..."
                  />
                  {validationErrors.requestReason && (
                    <p className="text-sm text-red-600 mt-1">{validationErrors.requestReason}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Legal Agreements */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Legal Agreements</h3>
              
              <div className="space-y-3">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded mt-0.5"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I accept the{' '}
                    <Link href="/legal/terms" className="text-blue-600 hover:text-blue-800">
                      Terms of Service
                    </Link>{' '}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                {validationErrors.acceptTerms && (
                  <p className="text-sm text-red-600 ml-6">{validationErrors.acceptTerms}</p>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptPrivacy"
                    checked={formData.acceptPrivacy}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded mt-0.5"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I accept the{' '}
                    <Link href="/legal/privacy" className="text-blue-600 hover:text-blue-800">
                      Privacy Policy
                    </Link>{' '}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                {validationErrors.acceptPrivacy && (
                  <p className="text-sm text-red-600 ml-6">{validationErrors.acceptPrivacy}</p>
                )}

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    name="acceptCommunications"
                    checked={formData.acceptCommunications}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded mt-0.5"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    I agree to receive email communications about my account status and system updates
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting Registration...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                    Submit Registration
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:text-blue-800 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}