/**
 * Client Intake Form - Comprehensive intake workflow
 * 
 * Implements FR-015: Client intake workflow with customizable forms 
 * and required field validation for legal practice management
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { useError } from '@/hooks/use-error'
import { 
  UserPlusIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  BriefcaseIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ClientInsert } from '@/types/database'

interface IntakeFormData {
  // Client Type
  type: 'individual' | 'entity' | 'trust' | 'estate'
  
  // Individual Fields
  first_name: string
  last_name: string
  middle_name: string
  suffix: string
  date_of_birth: string
  ssn: string
  
  // Entity Fields
  entity_name: string
  entity_type: string
  tax_id: string
  
  // Contact Information
  email: string
  phone_primary: string
  phone_secondary: string
  address_primary: {
    street: string
    suite: string
    city: string
    state: string
    zip: string
    country: string
  }
  address_secondary: {
    street: string
    suite: string
    city: string
    state: string
    zip: string
    country: string
  }
  
  // Professional Information
  occupation: string
  employer: string
  
  // Emergency Contact
  emergency_contact: {
    name: string
    relationship: string
    phone: string
    email: string
  }
  
  // Client Relationship
  referred_by: string
  referral_source: string
  how_heard_about_us: string
  
  // Legal Needs
  legal_matter_description: string
  urgency_level: 'low' | 'medium' | 'high' | 'urgent'
  estimated_complexity: 'simple' | 'medium' | 'complex'
  budget_range: string
  timeline_expectations: string
  
  // Background & Context
  previous_attorney: string
  relevant_documents: string[]
  special_circumstances: string
  
  // Preferences
  communication_preferences: string[]
  appointment_preferences: string
  
  // Notes
  initial_notes: string
  tags: string[]
}

const initialFormData: IntakeFormData = {
  type: 'individual',
  first_name: '',
  last_name: '',
  middle_name: '',
  suffix: '',
  date_of_birth: '',
  ssn: '',
  entity_name: '',
  entity_type: '',
  tax_id: '',
  email: '',
  phone_primary: '',
  phone_secondary: '',
  address_primary: {
    street: '',
    suite: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  },
  address_secondary: {
    street: '',
    suite: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  },
  occupation: '',
  employer: '',
  emergency_contact: {
    name: '',
    relationship: '',
    phone: '',
    email: ''
  },
  referred_by: '',
  referral_source: '',
  how_heard_about_us: '',
  legal_matter_description: '',
  urgency_level: 'medium',
  estimated_complexity: 'medium',
  budget_range: '',
  timeline_expectations: '',
  previous_attorney: '',
  relevant_documents: [],
  special_circumstances: '',
  communication_preferences: [],
  appointment_preferences: '',
  initial_notes: '',
  tags: []
}

type IntakeStep = 'type' | 'basic' | 'contact' | 'legal' | 'background' | 'review'

const steps: { id: IntakeStep; title: string; description: string }[] = [
  { id: 'type', title: 'Client Type', description: 'Select the type of client' },
  { id: 'basic', title: 'Basic Information', description: 'Name and identification' },
  { id: 'contact', title: 'Contact Details', description: 'Address and communication' },
  { id: 'legal', title: 'Legal Matter', description: 'Describe legal needs' },
  { id: 'background', title: 'Background', description: 'Additional context' },
  { id: 'review', title: 'Review', description: 'Confirm and submit' }
]

export default function ClientIntakePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleError, showSuccess } = useError()
  
  const [currentStep, setCurrentStep] = useState<IntakeStep>('type')
  const [formData, setFormData] = useState<IntakeFormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeFormData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)

  // Redirect non-authenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Check permissions
  useEffect(() => {
    if (user && !['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Update progress based on current step
  useEffect(() => {
    const stepIndex = steps.findIndex(step => step.id === currentStep)
    setProgress(((stepIndex + 1) / steps.length) * 100)
  }, [currentStep])

  // Pre-populate from URL parameters if available
  useEffect(() => {
    const type = searchParams.get('type')
    if (type && ['individual', 'entity', 'trust', 'estate'].includes(type)) {
      setFormData(prev => ({ ...prev, type: type as 'individual' | 'entity' | 'trust' | 'estate' }))
    }
  }, [searchParams])

  const updateFormData = (field: keyof IntakeFormData, value: string | Record<string, string>) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const updateNestedFormData = (
    parentField: keyof IntakeFormData,
    childField: string,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField] as Record<string, unknown>),
        [childField]: value
      }
    }))
  }

  const validateStep = (step: IntakeStep): boolean => {
    const newErrors: Partial<Record<keyof IntakeFormData, string>> = {}
    
    switch (step) {
      case 'type':
        if (!formData.type) {
          newErrors.type = 'Client type is required'
        }
        break
        
      case 'basic':
        if (formData.type === 'individual') {
          if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
          if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
        } else {
          if (!formData.entity_name.trim()) newErrors.entity_name = 'Entity name is required'
          if (!formData.entity_type.trim()) newErrors.entity_type = 'Entity type is required'
        }
        break
        
      case 'contact':
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address'
        }
        if (!formData.phone_primary.trim()) newErrors.phone_primary = 'Primary phone is required'
        if (!formData.address_primary.street.trim()) newErrors.address_primary = 'Address is required'
        if (!formData.address_primary.city.trim()) newErrors.address_primary = 'City is required'
        if (!formData.address_primary.state.trim()) newErrors.address_primary = 'State is required'
        if (!formData.address_primary.zip.trim()) newErrors.address_primary = 'ZIP code is required'
        break
        
      case 'legal':
        if (!formData.legal_matter_description.trim()) {
          newErrors.legal_matter_description = 'Please describe your legal matter'
        }
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const currentIndex = steps.findIndex(step => step.id === currentStep)
      if (currentIndex < steps.length - 1) {
        setCurrentStep(steps[currentIndex + 1].id)
      }
    }
  }

  const prevStep = () => {
    const currentIndex = steps.findIndex(step => step.id === currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep('review')) return
    
    try {
      setIsSubmitting(true)
      
      // Transform form data to match database schema
      const clientData: Partial<ClientInsert> = {
        type: formData.type,
        first_name: formData.type === 'individual' ? formData.first_name : null,
        last_name: formData.type === 'individual' ? formData.last_name : null,
        middle_name: formData.type === 'individual' ? formData.middle_name || null : null,
        suffix: formData.type === 'individual' ? formData.suffix || null : null,
        date_of_birth: formData.type === 'individual' ? formData.date_of_birth || null : null,
        entity_name: formData.type !== 'individual' ? formData.entity_name : null,
        entity_type: formData.type !== 'individual' ? formData.entity_type || null : null,
        email: formData.email,
        phone_primary: formData.phone_primary,
        phone_secondary: formData.phone_secondary || null,
        address_primary: formData.address_primary,
        address_secondary: formData.address_secondary.street ? formData.address_secondary : null,
        occupation: formData.occupation || null,
        employer: formData.employer || null,
        emergency_contact: formData.emergency_contact.name ? formData.emergency_contact : null,
        referred_by: formData.referred_by || null,
        referral_source: formData.referral_source || null,
        notes: formData.initial_notes || null,
        tags: formData.tags.length > 0 ? formData.tags : null
      }

      // In production, this would call the actual API
      console.log('Creating client with data:', clientData)
      
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      showSuccess('Client intake completed successfully!')
      router.push('/clients')
      
    } catch (error) {
      handleError(error, {
        operation: 'Complete Client Intake',
        fallbackMessage: 'Failed to complete intake. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep)
  const isFirstStep = getCurrentStepIndex() === 0
  const isLastStep = getCurrentStepIndex() === steps.length - 1

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/clients')}
                className="mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <UserPlusIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Client Intake
                </h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive client information collection
                </p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              Step {getCurrentStepIndex() + 1} of {steps.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Step Navigation */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const isCurrent = step.id === currentStep
                const isCompleted = index < getCurrentStepIndex()
                
                return (
                  <li key={step.id} className="flex-1">
                    <div className={`flex items-center ${index < steps.length - 1 ? 'pb-4' : ''}`}>
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                        ${isCompleted 
                          ? 'bg-blue-600 border-blue-600 text-white' 
                          : isCurrent 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-gray-300 text-gray-500'
                        }`}>
                        {isCompleted ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <span className="text-sm">{index + 1}</span>
                        )}
                      </div>
                      <div className="ml-3 min-w-0 flex-1">
                        <p className={`text-sm font-medium ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          </nav>
        </div>

        {/* Form Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Client Type */}
            {currentStep === 'type' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">What type of client are you adding?</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    This helps us customize the intake form for the appropriate information.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'individual', icon: UserIcon, title: 'Individual', description: 'Person seeking legal services' },
                    { id: 'entity', icon: BuildingOfficeIcon, title: 'Business Entity', description: 'Corporation, LLC, Partnership, etc.' },
                    { id: 'trust', icon: DocumentTextIcon, title: 'Trust', description: 'Trust entity or trust administration' },
                    { id: 'estate', icon: HeartIcon, title: 'Estate', description: 'Estate administration or probate' }
                  ].map((type) => {
                    const Icon = type.icon
                    const isSelected = formData.type === type.id
                    
                    return (
                      <button
                        key={type.id}
                        onClick={() => updateFormData('type', type.id)}
                        className={`p-6 rounded-lg border-2 text-left transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start">
                          <Icon className={`h-6 w-6 mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div className="ml-3">
                            <h4 className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                              {type.title}
                            </h4>
                            <p className={`text-sm mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-600'}`}>
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
                
                {errors.type && (
                  <p className="text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.type}
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Basic Information */}
            {currentStep === 'basic' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {formData.type === 'individual' ? 'Personal Information' : 'Entity Information'}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.type === 'individual' 
                      ? 'Provide the individual\'s personal details'
                      : 'Provide the entity\'s business information'
                    }
                  </p>
                </div>

                {formData.type === 'individual' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => updateFormData('first_name', e.target.value)}
                        className={errors.first_name ? 'border-red-500' : ''}
                      />
                      {errors.first_name && (
                        <p className="text-sm text-red-600 mt-1">{errors.first_name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="last_name">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => updateFormData('last_name', e.target.value)}
                        className={errors.last_name ? 'border-red-500' : ''}
                      />
                      {errors.last_name && (
                        <p className="text-sm text-red-600 mt-1">{errors.last_name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="middle_name">Middle Name</Label>
                      <Input
                        id="middle_name"
                        value={formData.middle_name}
                        onChange={(e) => updateFormData('middle_name', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="suffix">Suffix</Label>
                      <select
                        id="suffix"
                        value={formData.suffix}
                        onChange={(e) => updateFormData('suffix', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="">Select suffix</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="III">III</option>
                        <option value="IV">IV</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="date_of_birth">Date of Birth</Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => updateFormData('date_of_birth', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="ssn">Social Security Number</Label>
                      <Input
                        id="ssn"
                        type="password"
                        placeholder="XXX-XX-XXXX"
                        value={formData.ssn}
                        onChange={(e) => updateFormData('ssn', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Optional - will be encrypted if provided
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Label htmlFor="entity_name">Entity Name *</Label>
                      <Input
                        id="entity_name"
                        value={formData.entity_name}
                        onChange={(e) => updateFormData('entity_name', e.target.value)}
                        className={errors.entity_name ? 'border-red-500' : ''}
                        placeholder="Legal entity name"
                      />
                      {errors.entity_name && (
                        <p className="text-sm text-red-600 mt-1">{errors.entity_name}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="entity_type">Entity Type *</Label>
                      <select
                        id="entity_type"
                        value={formData.entity_type}
                        onChange={(e) => updateFormData('entity_type', e.target.value)}
                        className={`w-full rounded-md border px-3 py-2 ${
                          errors.entity_type ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select type</option>
                        <option value="LLC">LLC</option>
                        <option value="Corporation">Corporation</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Trust">Trust</option>
                        <option value="Non-Profit">Non-Profit</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.entity_type && (
                        <p className="text-sm text-red-600 mt-1">{errors.entity_type}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="tax_id">Tax ID / EIN</Label>
                      <Input
                        id="tax_id"
                        type="password"
                        placeholder="XX-XXXXXXX"
                        value={formData.tax_id}
                        onChange={(e) => updateFormData('tax_id', e.target.value)}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Will be encrypted if provided
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Contact Information */}
            {currentStep === 'contact' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    How can we reach you? All fields marked with * are required.
                  </p>
                </div>

                <Tabs defaultValue="primary" className="w-full">
                  <TabsList>
                    <TabsTrigger value="primary">Contact Details</TabsTrigger>
                    <TabsTrigger value="address">Address</TabsTrigger>
                    <TabsTrigger value="emergency">Emergency Contact</TabsTrigger>
                  </TabsList>

                  <TabsContent value="primary" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <div className="relative">
                          <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                            placeholder="email@example.com"
                          />
                        </div>
                        {errors.email && (
                          <p className="text-sm text-red-600 mt-1">{errors.email}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone_primary">Primary Phone *</Label>
                        <div className="relative">
                          <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone_primary"
                            type="tel"
                            value={formData.phone_primary}
                            onChange={(e) => updateFormData('phone_primary', e.target.value)}
                            className={`pl-10 ${errors.phone_primary ? 'border-red-500' : ''}`}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        {errors.phone_primary && (
                          <p className="text-sm text-red-600 mt-1">{errors.phone_primary}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="phone_secondary">Secondary Phone</Label>
                        <div className="relative">
                          <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="phone_secondary"
                            type="tel"
                            value={formData.phone_secondary}
                            onChange={(e) => updateFormData('phone_secondary', e.target.value)}
                            className="pl-10"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>

                      {formData.type === 'individual' && (
                        <>
                          <div>
                            <Label htmlFor="occupation">Occupation</Label>
                            <div className="relative">
                              <BriefcaseIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                id="occupation"
                                value={formData.occupation}
                                onChange={(e) => updateFormData('occupation', e.target.value)}
                                className="pl-10"
                                placeholder="Job title"
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="employer">Employer</Label>
                            <Input
                              id="employer"
                              value={formData.employer}
                              onChange={(e) => updateFormData('employer', e.target.value)}
                              placeholder="Company name"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="address" className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Primary Address *</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <Label htmlFor="street">Street Address *</Label>
                          <Input
                            id="street"
                            value={formData.address_primary.street}
                            onChange={(e) => updateNestedFormData('address_primary', 'street', e.target.value)}
                            className={errors.address_primary ? 'border-red-500' : ''}
                            placeholder="123 Main Street"
                          />
                        </div>
                        <div>
                          <Label htmlFor="suite">Suite/Unit</Label>
                          <Input
                            id="suite"
                            value={formData.address_primary.suite}
                            onChange={(e) => updateNestedFormData('address_primary', 'suite', e.target.value)}
                            placeholder="Apt 1A"
                          />
                        </div>
                        <div>
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            value={formData.address_primary.city}
                            onChange={(e) => updateNestedFormData('address_primary', 'city', e.target.value)}
                            className={errors.address_primary ? 'border-red-500' : ''}
                            placeholder="Atlanta"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">State *</Label>
                          <Input
                            id="state"
                            value={formData.address_primary.state}
                            onChange={(e) => updateNestedFormData('address_primary', 'state', e.target.value)}
                            className={errors.address_primary ? 'border-red-500' : ''}
                            placeholder="GA"
                          />
                        </div>
                        <div>
                          <Label htmlFor="zip">ZIP Code *</Label>
                          <Input
                            id="zip"
                            value={formData.address_primary.zip}
                            onChange={(e) => updateNestedFormData('address_primary', 'zip', e.target.value)}
                            className={errors.address_primary ? 'border-red-500' : ''}
                            placeholder="30309"
                          />
                        </div>
                      </div>
                      {errors.address_primary && (
                        <p className="text-sm text-red-600 mt-1">{errors.address_primary}</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="emergency" className="space-y-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-4">Emergency Contact</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="emergency_name">Full Name</Label>
                          <Input
                            id="emergency_name"
                            value={formData.emergency_contact.name}
                            onChange={(e) => updateNestedFormData('emergency_contact', 'name', e.target.value)}
                            placeholder="Jane Doe"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergency_relationship">Relationship</Label>
                          <Input
                            id="emergency_relationship"
                            value={formData.emergency_contact.relationship}
                            onChange={(e) => updateNestedFormData('emergency_contact', 'relationship', e.target.value)}
                            placeholder="Spouse, Parent, etc."
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergency_phone">Phone</Label>
                          <Input
                            id="emergency_phone"
                            type="tel"
                            value={formData.emergency_contact.phone}
                            onChange={(e) => updateNestedFormData('emergency_contact', 'phone', e.target.value)}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div>
                          <Label htmlFor="emergency_email">Email</Label>
                          <Input
                            id="emergency_email"
                            type="email"
                            value={formData.emergency_contact.email}
                            onChange={(e) => updateNestedFormData('emergency_contact', 'email', e.target.value)}
                            placeholder="emergency@example.com"
                          />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Step 4: Legal Matter */}
            {currentStep === 'legal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Legal Matter Details</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Tell us about your legal needs so we can provide the best assistance.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="legal_matter_description">Describe Your Legal Matter *</Label>
                    <Textarea
                      id="legal_matter_description"
                      value={formData.legal_matter_description}
                      onChange={(e) => updateFormData('legal_matter_description', e.target.value)}
                      className={errors.legal_matter_description ? 'border-red-500' : ''}
                      placeholder="Please provide details about your legal needs, situation, or questions..."
                      rows={4}
                    />
                    {errors.legal_matter_description && (
                      <p className="text-sm text-red-600 mt-1">{errors.legal_matter_description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="urgency_level">Urgency Level</Label>
                      <select
                        id="urgency_level"
                        value={formData.urgency_level}
                        onChange={(e) => updateFormData('urgency_level', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="low">Low - No immediate deadline</option>
                        <option value="medium">Medium - Within a few weeks</option>
                        <option value="high">High - Within a week</option>
                        <option value="urgent">Urgent - Immediate attention needed</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="estimated_complexity">Estimated Complexity</Label>
                      <select
                        id="estimated_complexity"
                        value={formData.estimated_complexity}
                        onChange={(e) => updateFormData('estimated_complexity', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="simple">Simple - Straightforward matter</option>
                        <option value="medium">Medium - Some complexity</option>
                        <option value="complex">Complex - Highly detailed work</option>
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="budget_range">Budget Range</Label>
                      <Input
                        id="budget_range"
                        value={formData.budget_range}
                        onChange={(e) => updateFormData('budget_range', e.target.value)}
                        placeholder="e.g., $1,000 - $5,000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="timeline_expectations">Timeline Expectations</Label>
                      <Input
                        id="timeline_expectations"
                        value={formData.timeline_expectations}
                        onChange={(e) => updateFormData('timeline_expectations', e.target.value)}
                        placeholder="e.g., completed by end of month"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="referred_by">Referred By</Label>
                      <Input
                        id="referred_by"
                        value={formData.referred_by}
                        onChange={(e) => updateFormData('referred_by', e.target.value)}
                        placeholder="Name of person or organization"
                      />
                    </div>

                    <div>
                      <Label htmlFor="how_heard_about_us">How Did You Hear About Us?</Label>
                      <select
                        id="how_heard_about_us"
                        value={formData.how_heard_about_us}
                        onChange={(e) => updateFormData('how_heard_about_us', e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      >
                        <option value="">Please select</option>
                        <option value="google">Google Search</option>
                        <option value="referral">Referral</option>
                        <option value="website">Website</option>
                        <option value="social_media">Social Media</option>
                        <option value="advertisement">Advertisement</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Background & Additional Info */}
            {currentStep === 'background' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Background & Additional Information</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Optional information that helps us serve you better.
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="previous_attorney">Previous Attorney</Label>
                    <Input
                      id="previous_attorney"
                      value={formData.previous_attorney}
                      onChange={(e) => updateFormData('previous_attorney', e.target.value)}
                      placeholder="Name of previous legal counsel (if any)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="special_circumstances">Special Circumstances</Label>
                    <Textarea
                      id="special_circumstances"
                      value={formData.special_circumstances}
                      onChange={(e) => updateFormData('special_circumstances', e.target.value)}
                      placeholder="Any special circumstances we should be aware of..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label>Communication Preferences</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['Email', 'Phone', 'Text', 'Mail'].map((method) => (
                        <label key={method} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.communication_preferences.includes(method)}
                            onChange={(e) => {
                              const prefs = e.target.checked
                                ? [...formData.communication_preferences, method]
                                : formData.communication_preferences.filter(p => p !== method)
                              updateFormData('communication_preferences', prefs)
                            }}
                            className="rounded border-gray-300 mr-2"
                          />
                          {method}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="initial_notes">Additional Notes</Label>
                    <Textarea
                      id="initial_notes"
                      value={formData.initial_notes}
                      onChange={(e) => updateFormData('initial_notes', e.target.value)}
                      placeholder="Any additional information you'd like to share..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={formData.tags.join(', ')}
                      onChange={(e) => updateFormData('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                      placeholder="e.g., estate-planning, urgent, high-value"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Separate tags with commas
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {currentStep === 'review' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Review Information</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Please review all information before submitting the intake form.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Client Type & Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {formData.type === 'individual' ? 'Personal Information' : 'Entity Information'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Type</dt>
                          <dd className="text-sm text-gray-900 capitalize">{formData.type}</dd>
                        </div>
                        {formData.type === 'individual' ? (
                          <>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Name</dt>
                              <dd className="text-sm text-gray-900">
                                {`${formData.first_name} ${formData.middle_name} ${formData.last_name} ${formData.suffix}`.trim()}
                              </dd>
                            </div>
                            {formData.date_of_birth && (
                              <div>
                                <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                                <dd className="text-sm text-gray-900">{formData.date_of_birth}</dd>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Entity Name</dt>
                              <dd className="text-sm text-gray-900">{formData.entity_name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Entity Type</dt>
                              <dd className="text-sm text-gray-900">{formData.entity_type}</dd>
                            </div>
                          </>
                        )}
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Contact Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="text-sm text-gray-900">{formData.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Primary Phone</dt>
                          <dd className="text-sm text-gray-900">{formData.phone_primary}</dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Address</dt>
                          <dd className="text-sm text-gray-900">
                            {formData.address_primary.street}
                            {formData.address_primary.suite && `, ${formData.address_primary.suite}`}
                            <br />
                            {formData.address_primary.city}, {formData.address_primary.state} {formData.address_primary.zip}
                          </dd>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Legal Matter */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Legal Matter</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <dl className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Description</dt>
                          <dd className="text-sm text-gray-900">{formData.legal_matter_description}</dd>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Urgency</dt>
                            <dd className="text-sm text-gray-900 capitalize">{formData.urgency_level}</dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Complexity</dt>
                            <dd className="text-sm text-gray-900 capitalize">{formData.estimated_complexity}</dd>
                          </div>
                        </div>
                      </dl>
                    </CardContent>
                  </Card>

                  {/* Tags */}
                  {formData.tags.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Tags</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {formData.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={isFirstStep}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {isLastStep ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Complete Intake'}
                  <CheckIcon className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}