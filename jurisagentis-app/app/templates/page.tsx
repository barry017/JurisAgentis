/**
 * Document Templates Management Page
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DocumentTemplate {
  id: string
  template_name: string
  template_code: string
  description?: string
  category: string
  practice_area: string
  document_type: string
  is_fillable: boolean
  is_active: boolean
  is_public: boolean
  usage_count: number
  last_used_date?: string
  version_number: string
  created_by: {
    first_name: string
    last_name: string
  }
  created_at: string
  permission_level: string
}

interface TemplateFilters {
  category: string
  practice_area: string
  document_type: string
  is_public: string
  created_by: string
}

export default function TemplatesPage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<TemplateFilters>({
    category: 'all',
    practice_area: 'all',
    document_type: 'all',
    is_public: 'all',
    created_by: 'all'
  })
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

  // Check permissions
  const canViewTemplates = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canCreateTemplates = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canEditTemplates = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canDeleteTemplates = user && ['admin', 'associate_attorney'].includes(user.role)

  if (!canViewTemplates) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view document templates.</p>
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

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)
        
        const params = new URLSearchParams()
        if (searchTerm) params.set('search', searchTerm)
        if (filters.category !== 'all') params.set('category', filters.category)
        if (filters.practice_area !== 'all') params.set('practice_area', filters.practice_area)
        if (filters.document_type !== 'all') params.set('document_type', filters.document_type)
        if (filters.is_public !== 'all') params.set('is_public', filters.is_public)

        const response = await fetch(`/api/templates?${params}`)
        if (response.ok) {
          const result = await response.json()
          setTemplates(result.data || result.templates || [])
        } else {
          // Set mock data for demonstration
          setTemplates(getMockTemplates())
        }
      } catch (error) {
        console.error('Error loading templates:', error)
        // Set mock data for demonstration
        setTemplates(getMockTemplates())
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(loadTemplates, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchTerm, filters])

  const handleUseTemplate = (templateId: string) => {
    router.push(`/templates/${templateId}/use`)
  }

  const handleEditTemplate = (templateId: string) => {
    router.push(`/templates/${templateId}/edit`)
  }

  const handleDuplicateTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/duplicate`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        router.push(`/templates/${result.data.id}/edit`)
      } else {
        alert('Failed to duplicate template')
      }
    } catch (error) {
      console.error('Error duplicating template:', error)
      alert('Error duplicating template')
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId))
      } else {
        alert('Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('Error deleting template')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedTemplates.length === 0) {
      alert('Please select templates first')
      return
    }

    switch (action) {
      case 'delete':
        if (window.confirm(`Are you sure you want to delete ${selectedTemplates.length} template(s)?`)) {
          // TODO: Implement bulk delete
          console.log('Bulk delete:', selectedTemplates)
        }
        break
      case 'export':
        // TODO: Implement bulk export
        console.log('Bulk export:', selectedTemplates)
        break
      default:
        break
    }
  }

  const filteredTemplates = templates.filter(template => {
    if (searchTerm && !template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !template.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading templates...</p>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                Document Templates
              </h1>
              <p className="text-gray-600 mt-1">
                Manage and use document templates for your legal practice
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {canCreateTemplates && (
                <button
                  onClick={() => router.push('/templates/new')}
                  className="btn-primary flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Template
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search templates by name or description..."
              />
            </div>
            
            {selectedTemplates.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedTemplates.length} selected
                </span>
                {canDeleteTemplates && (
                  <button
                    onClick={() => handleBulkAction('delete')}
                    className="btn-secondary text-sm"
                  >
                    Delete Selected
                  </button>
                )}
                <button
                  onClick={() => handleBulkAction('export')}
                  className="btn-secondary text-sm"
                >
                  Export Selected
                </button>
              </div>
            )}
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="contracts">Contracts & Agreements</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="litigation">Litigation</option>
                    <option value="letters">Letters & Correspondence</option>
                    <option value="forms">Forms & Applications</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Practice Area
                  </label>
                  <select
                    value={filters.practice_area}
                    onChange={(e) => setFilters(prev => ({ ...prev, practice_area: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="all">All Practice Areas</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="trust_administration">Trust Administration</option>
                    <option value="business_law">Business Law</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="family_law">Family Law</option>
                    <option value="litigation">Litigation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={filters.document_type}
                    onChange={(e) => setFilters(prev => ({ ...prev, document_type: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="contract">Contract</option>
                    <option value="letter">Letter</option>
                    <option value="form">Form</option>
                    <option value="pleading">Pleading</option>
                    <option value="notice">Notice</option>
                    <option value="agreement">Agreement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    value={filters.is_public}
                    onChange={(e) => setFilters(prev => ({ ...prev, is_public: e.target.value }))}
                    className="input-field text-sm"
                  >
                    <option value="all">All Templates</option>
                    <option value="true">Public</option>
                    <option value="false">Private</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => setFilters({
                      category: 'all',
                      practice_area: 'all',
                      document_type: 'all',
                      is_public: 'all',
                      created_by: 'all'
                    })}
                    className="btn-secondary text-sm w-full"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Template Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedTemplates.includes(template.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplates(prev => [...prev, template.id])
                        } else {
                          setSelectedTemplates(prev => prev.filter(id => id !== template.id))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded mr-3 mt-1"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {template.template_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {template.template_code}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {template.is_public && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2">
                        Public
                      </span>
                    )}
                    {template.is_fillable && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Fillable
                      </span>
                    )}
                  </div>
                </div>

                {/* Template Details */}
                <div className="space-y-2 mb-4">
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                  
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span>{template.category.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>{template.practice_area.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="flex items-center text-xs text-gray-500 space-x-4">
                    <span className="flex items-center">
                      <ChartBarIcon className="h-3 w-3 mr-1" />
                      Used {template.usage_count} times
                    </span>
                    <span>•</span>
                    <span>v{template.version_number}</span>
                  </div>
                </div>

                {/* Template Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    By {template.created_by.first_name} {template.created_by.last_name}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Use Template"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => router.push(`/templates/${template.id}`)}
                      className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                      title="View Template"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    
                    {canEditTemplates && (
                      <button
                        onClick={() => handleEditTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                        title="Edit Template"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canEditTemplates && (
                      <button
                        onClick={() => handleDuplicateTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Duplicate Template"
                      >
                        <DocumentDuplicateIcon className="h-4 w-4" />
                      </button>
                    )}
                    
                    {canDeleteTemplates && template.permission_level === 'admin' && (
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Template"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || Object.values(filters).some(f => f !== 'all')
                ? 'Try adjusting your search or filters'
                : canCreateTemplates 
                  ? 'Get started by creating your first template'
                  : 'No templates are available yet'
              }
            </p>
            {canCreateTemplates && (!searchTerm && Object.values(filters).every(f => f === 'all')) && (
              <button
                onClick={() => router.push('/templates/new')}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create First Template
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Mock data for demonstration
function getMockTemplates(): DocumentTemplate[] {
  return [
    {
      id: '1',
      template_name: 'Last Will and Testament',
      template_code: 'WILL-001',
      description: 'Standard last will and testament template for individual clients',
      category: 'estate_planning',
      practice_area: 'estate_planning',
      document_type: 'will',
      is_fillable: true,
      is_active: true,
      is_public: true,
      usage_count: 45,
      last_used_date: '2025-01-10T14:30:00Z',
      version_number: '2.1',
      created_by: {
        first_name: 'John',
        last_name: 'Smith'
      },
      created_at: '2024-06-15T09:00:00Z',
      permission_level: 'use'
    },
    {
      id: '2',
      template_name: 'LLC Operating Agreement',
      template_code: 'LLC-OA-001',
      description: 'Multi-member LLC operating agreement template',
      category: 'business_formation',
      practice_area: 'business_law',
      document_type: 'agreement',
      is_fillable: true,
      is_active: true,
      is_public: false,
      usage_count: 23,
      last_used_date: '2025-01-08T16:20:00Z',
      version_number: '1.5',
      created_by: {
        first_name: 'Sarah',
        last_name: 'Johnson'
      },
      created_at: '2024-08-20T11:15:00Z',
      permission_level: 'edit'
    },
    {
      id: '3',
      template_name: 'Client Engagement Letter',
      template_code: 'ENG-LTR-001',
      description: 'Standard client engagement letter for estate planning matters',
      category: 'letters',
      practice_area: 'estate_planning',
      document_type: 'letter',
      is_fillable: true,
      is_active: true,
      is_public: true,
      usage_count: 67,
      last_used_date: '2025-01-12T10:45:00Z',
      version_number: '3.0',
      created_by: {
        first_name: 'Michael',
        last_name: 'Davis'
      },
      created_at: '2024-03-10T08:30:00Z',
      permission_level: 'use'
    },
    {
      id: '4',
      template_name: 'Purchase and Sale Agreement - Real Estate',
      template_code: 'RE-PSA-001',
      description: 'Residential real estate purchase and sale agreement',
      category: 'contracts',
      practice_area: 'real_estate',
      document_type: 'contract',
      is_fillable: true,
      is_active: true,
      is_public: false,
      usage_count: 34,
      last_used_date: '2025-01-05T13:20:00Z',
      version_number: '2.3',
      created_by: {
        first_name: 'Lisa',
        last_name: 'Wilson'
      },
      created_at: '2024-05-25T15:45:00Z',
      permission_level: 'admin'
    },
    {
      id: '5',
      template_name: 'Motion for Summary Judgment',
      template_code: 'LIT-MSJ-001',
      description: 'Standard motion for summary judgment template',
      category: 'litigation',
      practice_area: 'litigation',
      document_type: 'pleading',
      is_fillable: true,
      is_active: true,
      is_public: true,
      usage_count: 12,
      last_used_date: '2024-12-20T09:15:00Z',
      version_number: '1.2',
      created_by: {
        first_name: 'Robert',
        last_name: 'Brown'
      },
      created_at: '2024-09-12T12:00:00Z',
      permission_level: 'use'
    }
  ]
}