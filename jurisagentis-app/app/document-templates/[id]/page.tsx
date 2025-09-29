/**
 * Document Template Detail View - Display template information and content
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowLeftIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CodeBracketIcon,
  ChartBarIcon,
  GlobeAltIcon,
  ScaleIcon,
  BriefcaseIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface DocumentTemplate {
  id: string
  name: string
  title: string
  description: string
  category: 'estate_planning' | 'business_law' | 'family_law' | 'contracts' | 'litigation' | 'real_estate' | 'tax_law' | 'employment' | 'general'
  content: string
  variables: string[]
  jurisdictions: string[]
  practice_areas: string[]
  is_active: boolean
  version: string
  created_at: string
  updated_at: string
  created_by: string
  usage_count?: number
  file_format: 'docx' | 'pdf' | 'txt'
  required_fields: string[]
  optional_fields: string[]
}

export default function TemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [templateId, setTemplateId] = useState<string>('')

  const [template, setTemplate] = useState<DocumentTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showContent, setShowContent] = useState(false)

  // Check permissions
  const canViewTemplates = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canEditTemplates = user && ['admin', 'associate_attorney'].includes(user.role)
  const canDeleteTemplates = user && ['admin'].includes(user.role)
  const canUseTemplates = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setTemplateId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // Fetch template data
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/document-templates/${templateId}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setTemplate(data.data.template)
        } else {
          setError(data.error?.message || 'Failed to load template')
        }
      } catch (_error) {
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (user && canViewTemplates && templateId) {
      fetchTemplate()
    }
  }, [templateId, user, canViewTemplates])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canViewTemplates) {
      router.push('/dashboard')
    }
  }, [user, canViewTemplates, router])

  const getCategoryIcon = (category: string) => {
    const icons = {
      estate_planning: DocumentTextIcon,
      business_law: BriefcaseIcon,
      family_law: UserGroupIcon,
      contracts: DocumentDuplicateIcon,
      litigation: ScaleIcon,
      real_estate: BuildingOfficeIcon,
      tax_law: ChartBarIcon,
      employment: UserGroupIcon,
      general: DocumentTextIcon
    }
    const IconComponent = icons[category as keyof typeof icons] || DocumentTextIcon
    return <IconComponent className="h-8 w-8 text-blue-600" />
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      estate_planning: 'bg-purple-100 text-purple-800 border-purple-200',
      business_law: 'bg-blue-100 text-blue-800 border-blue-200',
      family_law: 'bg-pink-100 text-pink-800 border-pink-200',
      contracts: 'bg-green-100 text-green-800 border-green-200',
      litigation: 'bg-red-100 text-red-800 border-red-200',
      real_estate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      tax_law: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      employment: 'bg-orange-100 text-orange-800 border-orange-200',
      general: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[category as keyof typeof colors] || colors.general
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDeleteTemplate = async () => {
    if (!template) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${template.title}"? This action cannot be undone.`
    )

    if (confirmed) {
      try {
        const response = await fetch(`/api/document-templates/${templateId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          router.push('/document-templates')
        } else {
          const data = await response.json()
          alert(`Failed to delete template: ${data.error?.message || 'Unknown error'}`)
        }
      } catch (_error) {
        alert('Network error occurred while deleting template')
      }
    }
  }

  const handleUseTemplate = () => {
    if (template) {
      router.push(`/documents/create?template_id=${template.id}`)
    }
  }

  const handleDuplicateTemplate = () => {
    if (template) {
      router.push(`/document-templates/create?duplicate_id=${template.id}`)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewTemplates) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Template</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/document-templates')}
            className="btn-primary"
          >
            Return to Templates
          </button>
        </div>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Template Not Found</h2>
          <p className="text-gray-600 mb-4">The requested template could not be found.</p>
          <button
            onClick={() => router.push('/document-templates')}
            className="btn-primary"
          >
            Return to Templates
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
                onClick={() => router.push('/document-templates')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                {getCategoryIcon(template.category)}
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">{template.title}</h1>
                  <div className="flex items-center mt-1 space-x-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(template.category)}`}>
                      {template.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-gray-500">
                      Version {template.version}
                    </span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      template.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {canUseTemplates && (
                <button
                  onClick={handleUseTemplate}
                  className="btn-primary flex items-center"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Use Template
                </button>
              )}

              {canEditTemplates && (
                <button
                  onClick={handleDuplicateTemplate}
                  className="btn-secondary flex items-center"
                >
                  <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                  Duplicate
                </button>
              )}

              {canEditTemplates && (
                <button
                  onClick={() => router.push(`/document-templates/${templateId}/edit`)}
                  className="btn-secondary flex items-center"
                >
                  <PencilSquareIcon className="h-4 w-4 mr-2" />
                  Edit
                </button>
              )}

              {canDeleteTemplates && (
                <button
                  onClick={handleDeleteTemplate}
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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Overview */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Overview</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{template.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                    <p className="text-gray-900 font-mono text-sm">{template.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">File Format</label>
                    <p className="text-gray-900 uppercase">{template.file_format}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Usage Count</label>
                    <p className="text-gray-900">{template.usage_count || 0} times</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Variables</label>
                    <p className="text-gray-900">{template.variables.length} variables</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Content */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Template Content</h3>
                <button
                  onClick={() => setShowContent(!showContent)}
                  className="btn-secondary text-sm flex items-center"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  {showContent ? 'Hide' : 'Show'} Content
                </button>
              </div>
              
              {showContent ? (
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                    {template.content}
                  </pre>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center border border-dashed border-gray-300">
                  <CodeBracketIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Click &quot;Show Content&quot; to view the template content</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {template.content.length} characters • {template.variables.length} variables
                  </p>
                </div>
              )}
            </div>

            {/* Variables */}
            {template.variables.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Variables</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Required Fields</label>
                    <div className="space-y-2">
                      {template.required_fields.length > 0 ? (
                        template.required_fields.map((field, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 mr-2 mb-2"
                          >
                            <span className="font-mono">{'{{' + field + '}}'}</span>
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No required fields specified</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Optional Fields</label>
                    <div className="space-y-2">
                      {template.optional_fields.length > 0 ? (
                        template.optional_fields.map((field, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 mr-2 mb-2"
                          >
                            <span className="font-mono">{'{{' + field + '}}'}</span>
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No optional fields specified</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">All Variables</label>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 rounded-md text-sm bg-gray-100 text-gray-800"
                      >
                        <span className="font-mono">{'{{' + variable + '}}'}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Template Info */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <div>
                      <p className="text-gray-900 text-sm">{template.created_by}</p>
                      <p className="text-xs text-gray-500">{formatDate(template.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-gray-900 text-sm">{formatDate(template.updated_at)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usage Statistics</label>
                  <div className="flex items-center">
                    <ChartBarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <p className="text-gray-900 text-sm">{template.usage_count || 0} documents created</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Practice Areas */}
            {template.practice_areas.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TagIcon className="h-5 w-5 mr-2 text-indigo-600" />
                  Practice Areas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.practice_areas.map((area, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Jurisdictions */}
            {template.jurisdictions.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <GlobeAltIcon className="h-5 w-5 mr-2 text-green-600" />
                  Jurisdictions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.jurisdictions.map((jurisdiction, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                    >
                      {jurisdiction}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {canUseTemplates && (
                  <button 
                    onClick={handleUseTemplate}
                    className="w-full btn-primary text-left flex items-center"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Create Document
                  </button>
                )}
                
                {canEditTemplates && (
                  <button 
                    onClick={handleDuplicateTemplate}
                    className="w-full btn-secondary text-left flex items-center"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                    Duplicate Template
                  </button>
                )}
                
                {canEditTemplates && (
                  <button 
                    onClick={() => router.push(`/document-templates/${templateId}/edit`)}
                    className="w-full btn-secondary text-left flex items-center"
                  >
                    <PencilSquareIcon className="h-4 w-4 mr-2" />
                    Edit Template
                  </button>
                )}
                
                <button 
                  onClick={() => router.push(`/documents?template_id=${template.id}`)}
                  className="w-full btn-secondary text-left flex items-center"
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}