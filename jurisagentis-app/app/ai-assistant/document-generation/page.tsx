/**
 * AI Document Generation - Create documents using AI assistance
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  DocumentTextIcon,
  SparklesIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  // ExclamationTriangleIcon, // Removed unused import
  // ClockIcon, // Removed unused import
  UserIcon,
  BuildingOfficeIcon,
  // CalendarIcon, // Removed unused import
  // PaperAirplaneIcon, // Removed unused import
  EyeIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface DocumentTemplate {
  id: string
  name: string
  title: string
  description: string
  category: string
  variables: string[]
  content: string
}

interface GenerationStep {
  id: string
  title: string
  description: string
  completed: boolean
  data?: unknown
}

interface AIGenerationResult {
  content: string
  title: string
  suggestions: string[]
  confidence: number
  variables_filled: { [key: string]: string }
}

export default function AIDocumentGenerationPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [documentType, setDocumentType] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null)
  // const [generationData, setGenerationData] = useState<Record<string, unknown>>({}) // Removed unused variable
  const [generatedContent, setGeneratedContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Generation steps
  const [steps, setSteps] = useState<GenerationStep[]>([
    {
      id: 'document-type',
      title: 'Document Type',
      description: 'Choose what type of document to create',
      completed: false
    },
    {
      id: 'template-selection',
      title: 'Template Selection',
      description: 'Select a template or create from scratch',
      completed: false
    },
    {
      id: 'information-gathering',
      title: 'Information Gathering',
      description: 'Provide details for the document',
      completed: false
    },
    {
      id: 'ai-generation',
      title: 'AI Generation',
      description: 'Generate document with AI assistance',
      completed: false
    },
    {
      id: 'review-finalize',
      title: 'Review & Finalize',
      description: 'Review and save the generated document',
      completed: false
    }
  ])

  // Document types
  const documentTypes = [
    {
      id: 'contract',
      title: 'Contract/Agreement',
      description: 'Service agreements, NDAs, employment contracts',
      icon: DocumentTextIcon,
      templates: ['nda', 'service-agreement', 'employment']
    },
    {
      id: 'estate',
      title: 'Estate Planning',
      description: 'Wills, trusts, power of attorney documents',
      icon: UserIcon,
      templates: ['simple-will', 'trust', 'power-of-attorney']
    },
    {
      id: 'business',
      title: 'Business Formation',
      description: 'LLC agreements, corporate bylaws, articles',
      icon: BuildingOfficeIcon,
      templates: ['llc-operating', 'corporate-bylaws', 'articles']
    },
    {
      id: 'litigation',
      title: 'Litigation Documents',
      description: 'Pleadings, motions, discovery requests',
      icon: DocumentDuplicateIcon,
      templates: ['complaint', 'motion-dismiss', 'discovery']
    }
  ]

  // Mock templates
  const templates: DocumentTemplate[] = [
    {
      id: 'nda-standard',
      name: 'standard_nda',
      title: 'Standard Non-Disclosure Agreement',
      description: 'Comprehensive NDA for business relationships',
      category: 'contract',
      variables: ['disclosing_party', 'receiving_party', 'effective_date', 'purpose', 'governing_law'],
      content: 'NDA template content...'
    },
    {
      id: 'service-agreement',
      name: 'service_agreement',
      title: 'Service Agreement Template',
      description: 'Professional services agreement template',
      category: 'contract',
      variables: ['service_provider', 'client', 'services_description', 'payment_terms', 'term'],
      content: 'Service agreement template content...'
    }
  ]

  // Check permissions
  const canUseAI = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  // Get template from URL if provided
  useEffect(() => {
    const templateId = searchParams.get('template_id')
    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        setSelectedTemplate(template)
        setDocumentType(template.category)
        setCurrentStep(2) // Skip to information gathering
        updateStepCompletion(0, true)
        updateStepCompletion(1, true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canUseAI) {
      router.push('/dashboard')
    }
  }, [user, canUseAI, router])

  const updateStepCompletion = (stepIndex: number, completed: boolean) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, completed } : step
    ))
  }

  const handleDocumentTypeSelect = (type: string) => {
    setDocumentType(type)
    updateStepCompletion(0, true)
    setCurrentStep(1)
  }

  const handleTemplateSelect = (template: DocumentTemplate | null) => {
    setSelectedTemplate(template)
    updateStepCompletion(1, true)
    setCurrentStep(2)
  }

  const handleInformationSubmit = (data: Record<string, unknown>) => {
    setGenerationData(data)
    updateStepCompletion(2, true)
    setCurrentStep(3)
    generateDocument(data)
  }

  const generateDocument = async (data: Record<string, unknown>) => {
    try {
      setLoading(true)
      setError('')

      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 3000))

      const result: AIGenerationResult = {
        content: generateMockDocument(data),
        title: data.document_title || 'Generated Legal Document',
        suggestions: [
          'Consider adding a dispute resolution clause',
          'Review governing law section',
          'Add termination notice requirements'
        ],
        confidence: 0.92,
        variables_filled: data
      }

      setGeneratedContent(result.content)
      updateStepCompletion(3, true)
      setCurrentStep(4)
      setSuccess('Document generated successfully!')
    } catch {
      setError('Failed to generate document. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const generateMockDocument = (data: Record<string, unknown>): string => {
    if (selectedTemplate?.name === 'standard_nda') {
      return `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on ${data.effective_date || '[DATE]'} by and between ${data.disclosing_party || '[DISCLOSING PARTY]'}, a ${data.disclosing_party_type || '[ENTITY TYPE]'} ("Disclosing Party"), and ${data.receiving_party || '[RECEIVING PARTY]'}, a ${data.receiving_party_type || '[ENTITY TYPE]'} ("Receiving Party").

WHEREAS, the Disclosing Party possesses certain confidential and proprietary information relating to ${data.subject_matter || '[SUBJECT MATTER]'};

WHEREAS, the Receiving Party desires to receive and evaluate such confidential information for the purpose of ${data.purpose || '[PURPOSE]'};

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. CONFIDENTIAL INFORMATION
For purposes of this Agreement, "Confidential Information" means all non-public information disclosed by the Disclosing Party to the Receiving Party, whether orally, in writing, or in any other form.

2. NON-DISCLOSURE
The Receiving Party agrees to hold all Confidential Information in strict confidence and not to disclose such information to any third party without the prior written consent of the Disclosing Party.

3. USE RESTRICTIONS
The Receiving Party shall use the Confidential Information solely for the purpose stated above and shall not use such information for any other purpose.

4. TERM
This Agreement shall commence on the Effective Date and shall remain in effect for ${data.term_duration || 'three (3) years'} unless earlier terminated.

5. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of ${data.governing_law || '[STATE]'}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

${data.disclosing_party || '[DISCLOSING PARTY]'}

By: _________________________
Name: ${data.disclosing_signatory || '[NAME]'}
Title: ${data.disclosing_title || '[TITLE]'}
Date: ___________________

${data.receiving_party || '[RECEIVING PARTY]'}

By: _________________________
Name: ${data.receiving_signatory || '[NAME]'}
Title: ${data.receiving_title || '[TITLE]'}
Date: ___________________`
    }

    return `GENERATED LEGAL DOCUMENT

This document has been generated using AI assistance based on the information you provided.

[Document content would be generated here based on the selected template and provided information]

Document Title: ${data.document_title || 'Untitled Document'}
Generated on: ${new Date().toLocaleDateString()}
Generated by: AI Assistant (Aida)

Please review this document carefully and make any necessary modifications before use.`
  }

  const handleSaveDocument = async () => {
    try {
      setLoading(true)
      
      // Mock save operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      updateStepCompletion(4, true)
      setSuccess('Document saved successfully!')
      
      // Redirect to documents after save
      setTimeout(() => {
        router.push('/documents')
      }, 2000)
    } catch {
      setError('Failed to save document')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canUseAI) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/ai-assistant')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mr-3">
                  <SparklesIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Document Generation</h1>
                  <p className="text-gray-600 mt-1">
                    Create legal documents with AI assistance
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/ai-assistant')}
                className="btn-secondary"
              >
                Back to Assistant
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  step.completed 
                    ? 'bg-green-600 border-green-600 text-white'
                    : index === currentStep
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}>
                  {step.completed ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-16 h-0.5 ml-4 ${
                    step.completed ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-900">{steps[currentStep]?.title}</h3>
            <p className="text-gray-600">{steps[currentStep]?.description}</p>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="alert-success mb-6">
            {success}
          </div>
        )}

        {/* Step Content */}
        <div className="card">
          {/* Step 0: Document Type Selection */}
          {currentStep === 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Choose Document Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {documentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleDocumentTypeSelect(type.id)}
                    className="text-left p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center mb-3">
                      <type.icon className="h-8 w-8 text-blue-600 mr-3" />
                      <h4 className="text-lg font-semibold text-gray-900">{type.title}</h4>
                    </div>
                    <p className="text-gray-600 mb-3">{type.description}</p>
                    <div className="flex items-center text-sm text-blue-600">
                      <SparklesIcon className="h-4 w-4 mr-1" />
                      <span>{type.templates.length} AI templates available</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Template Selection */}
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Select Template</h3>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleTemplateSelect(null)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center">
                    <SparklesIcon className="h-6 w-6 text-purple-600 mr-3" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Create from Scratch with AI</h4>
                      <p className="text-sm text-gray-600">Let AI generate a completely custom document based on your requirements</p>
                    </div>
                  </div>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">or choose a template</span>
                  </div>
                </div>

                {templates
                  .filter(t => t.category === documentType)
                  .map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center">
                        <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3" />
                        <div>
                          <h4 className="font-semibold text-gray-900">{template.title}</h4>
                          <p className="text-sm text-gray-600">{template.description}</p>
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            <span>{template.variables.length} variables to fill</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Step 2: Information Gathering */}
          {currentStep === 2 && (
            <InformationGatheringForm
              template={selectedTemplate}
              onSubmit={handleInformationSubmit}
            />
          )}

          {/* Step 3: AI Generation */}
          {currentStep === 3 && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating Document...</h3>
              <p className="text-gray-600">AI is creating your document based on the provided information</p>
              <div className="mt-6 max-w-md mx-auto">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <SparklesIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">
                      Using advanced AI to ensure legal accuracy and completeness
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review & Finalize */}
          {currentStep === 4 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Review Generated Document</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="btn-secondary text-sm"
                  >
                    <Cog6ToothIcon className="h-4 w-4 mr-2" />
                    Modify Information
                  </button>
                  <button className="btn-secondary text-sm">
                    <EyeIcon className="h-4 w-4 mr-2" />
                    Preview
                  </button>
                  <button className="btn-secondary text-sm">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Download
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-mono">
                      {generatedContent}
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-800">Generation Complete</span>
                    </div>
                    <p className="text-sm text-green-700">
                      Document generated with 92% confidence score
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">AI Suggestions</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Consider adding a dispute resolution clause</li>
                      <li>• Review governing law section</li>
                      <li>• Add termination notice requirements</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleSaveDocument}
                    disabled={loading}
                    className="w-full btn-primary"
                  >
                    {loading ? 'Saving...' : 'Save Document'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Information Gathering Form Component
function InformationGatheringForm({ 
  template, 
  onSubmit 
}: { 
  template: DocumentTemplate | null
  onSubmit: (data: Record<string, unknown>) => void 
}) {
  const [formData, setFormData] = useState<Record<string, unknown>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (template) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Provide Information for {template.title}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {template.variables.map((variable) => (
            <div key={variable}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {variable.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              <input
                type="text"
                value={formData[variable] || ''}
                onChange={(e) => handleInputChange(variable, e.target.value)}
                className="input-field"
                placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
              />
            </div>
          ))}
          
          <button type="submit" className="btn-primary">
            <SparklesIcon className="h-4 w-4 mr-2" />
            Generate Document
          </button>
        </form>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Describe Your Document Requirements
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Title
          </label>
          <input
            type="text"
            value={formData.document_title || ''}
            onChange={(e) => handleInputChange('document_title', e.target.value)}
            className="input-field"
            placeholder="Enter document title"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Document Purpose
          </label>
          <textarea
            value={formData.document_purpose || ''}
            onChange={(e) => handleInputChange('document_purpose', e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Describe what this document should accomplish"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parties Involved
            </label>
            <textarea
              value={formData.parties || ''}
              onChange={(e) => handleInputChange('parties', e.target.value)}
              className="input-field"
              rows={3}
              placeholder="List all parties (names, addresses, entity types)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Terms
            </label>
            <textarea
              value={formData.key_terms || ''}
              onChange={(e) => handleInputChange('key_terms', e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Describe important terms and conditions"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Governing Law/Jurisdiction
          </label>
          <input
            type="text"
            value={formData.governing_law || ''}
            onChange={(e) => handleInputChange('governing_law', e.target.value)}
            className="input-field"
            placeholder="e.g., State of California"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Requirements
          </label>
          <textarea
            value={formData.additional_requirements || ''}
            onChange={(e) => handleInputChange('additional_requirements', e.target.value)}
            className="input-field"
            rows={3}
            placeholder="Any specific clauses, terms, or requirements"
          />
        </div>
        
        <button type="submit" className="btn-primary">
          <SparklesIcon className="h-4 w-4 mr-2" />
          Generate Custom Document
        </button>
      </form>
    </div>
  )
}