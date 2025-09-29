/**
 * Document Templates Dashboard - Manage legal document templates
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  CalendarIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  TagIcon,
  BuildingOfficeIcon,
  ScaleIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline'

interface DocumentTemplate {
  id: string
  name: string
  title: string
  description: string
  category: 'estate_planning' | 'business_law' | 'family_law' | 'contracts' | 'litigation' | 'real_estate' | 'tax_law' | 'employment' | 'general'
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

interface TemplateStats {
  total_templates: number
  active_templates: number
  draft_templates: number
  most_used: DocumentTemplate | null
  categories: { [key: string]: number }
  recent_usage: number
}

export default function DocumentTemplatesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [stats, setStats] = useState<TemplateStats>({
    total_templates: 0,
    active_templates: 0,
    draft_templates: 0,
    most_used: null,
    categories: {},
    recent_usage: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [practiceAreaFilter, setPracticeAreaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [totalTemplates, setTotalTemplates] = useState(0)
  const pageSize = 20

  // Check permissions
  const canViewTemplates = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canCreateTemplates = user && ['admin', 'associate_attorney'].includes(user.role)
  const canEditTemplates = user && ['admin', 'associate_attorney'].includes(user.role)
  const canDeleteTemplates = user && ['admin'].includes(user.role)

  // Get initial filters from URL params
  useEffect(() => {
    const category = searchParams.get('category')
    const practice_area = searchParams.get('practice_area')
    if (category) setCategoryFilter(category)
    if (practice_area) setPracticeAreaFilter(practice_area)
  }, [searchParams])

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

  // Load templates data
  useEffect(() => {
    if (user && canViewTemplates) {
      loadTemplates()
    }
  }, [user, canViewTemplates, searchTerm, categoryFilter, practiceAreaFilter, statusFilter, currentPage, loadTemplates])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, categoryFilter, practiceAreaFilter, statusFilter])

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      if (practiceAreaFilter !== 'all') params.append('practice_area', practiceAreaFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', pageSize.toString())
      params.append('offset', (currentPage * pageSize).toString())

      const response = await fetch(`/api/document-templates?${params}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setTemplates(data.data.templates || [])
        setTotalTemplates(data.data.pagination?.total || 0)
        
        // Calculate stats from data
        const templatesData = data.data.templates || []
        const activeTemplates = templatesData.filter((t: DocumentTemplate) => t.is_active)
        const draftTemplates = templatesData.filter((t: DocumentTemplate) => !t.is_active)
        
        // Calculate category distribution
        const categories: { [key: string]: number } = {}
        templatesData.forEach((template: DocumentTemplate) => {
          categories[template.category] = (categories[template.category] || 0) + 1
        })
        
        // Find most used template
        const mostUsed = templatesData.reduce((prev: DocumentTemplate | null, current: DocumentTemplate) => {
          return (!prev || (current.usage_count || 0) > (prev.usage_count || 0)) ? current : prev
        }, null)
        
        setStats({
          total_templates: data.data.pagination?.total || 0,
          active_templates: activeTemplates.length,
          draft_templates: draftTemplates.length,
          most_used: mostUsed,
          categories,
          recent_usage: templatesData.reduce((sum: number, t: DocumentTemplate) => sum + (t.usage_count || 0), 0)
        })
      } else {
        setError(data.error?.message || 'Failed to load templates')
      }
      
    } catch (error) {
      console.error('Error loading templates:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, categoryFilter, practiceAreaFilter, statusFilter, currentPage, pageSize])

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
    return <IconComponent className="h-5 w-5" />
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
      month: 'short',
      day: 'numeric'
    })
  }

  const handleCreateTemplate = () => {
    router.push('/document-templates/create')
  }

  const handleUseTemplate = (template: DocumentTemplate) => {
    router.push(`/documents/create?template_id=${template.id}`)
  }

  const handleEditTemplate = (template: DocumentTemplate) => {
    router.push(`/document-templates/${template.id}/edit`)
  }

  const handleDeleteTemplate = async (template: DocumentTemplate) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${template.title}"? This action cannot be undone.`
    )

    if (confirmed) {
      try {
        const response = await fetch(`/api/document-templates/${template.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          loadTemplates() // Reload the list
        } else {
          const data = await response.json()
          alert(`Failed to delete template: ${data.error?.message || 'Unknown error'}`)
        }
      } catch (_error) {
        alert('Network error occurred while deleting template')
      }
    }
  }

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter
    const matchesPracticeArea = practiceAreaFilter === 'all' || template.practice_areas.includes(practiceAreaFilter)
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && template.is_active) ||
      (statusFilter === 'inactive' && !template.is_active)
    
    return matchesSearch && matchesCategory && matchesPracticeArea && matchesStatus
  })

  if (authLoading || (loading && templates.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewTemplates) {
    return null
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
                Manage legal document templates for streamlined document creation
              </p>
            </div>

            <div className="flex space-x-3">
              {canCreateTemplates && (
                <button
                  onClick={handleCreateTemplate}
                  className="btn-primary flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Template
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
              
              <button
                onClick={loadTemplates}
                className="btn-secondary flex items-center"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Templates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_templates}</p>
                <p className="text-xs text-gray-500">{stats.active_templates} active</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Most Popular</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.most_used?.title.substring(0, 20) || 'None'}
                  {stats.most_used?.title && stats.most_used.title.length > 20 && '...'}
                </p>
                <p className="text-xs text-gray-500">
                  {stats.most_used?.usage_count || 0} uses
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <TagIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.categories).length}
                </p>
                <p className="text-xs text-gray-500">practice areas</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Recent Usage</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recent_usage}</p>
                <p className="text-xs text-gray-500">total uses</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates by name, title, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Categories</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_law">Business Law</option>
                    <option value="family_law">Family Law</option>
                    <option value="contracts">Contracts</option>
                    <option value="litigation">Litigation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="tax_law">Tax Law</option>
                    <option value="employment">Employment</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Practice Area</label>
                  <select
                    value={practiceAreaFilter}
                    onChange={(e) => setPracticeAreaFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Practice Areas</option>
                    <option value="Estate Planning">Estate Planning</option>
                    <option value="Business Law">Business Law</option>
                    <option value="Family Law">Family Law</option>
                    <option value="Contracts">Contracts</option>
                    <option value="Litigation">Litigation</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Employment Law">Employment Law</option>
                    <option value="Intellectual Property">Intellectual Property</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Templates List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No templates found</p>
              <p className="text-gray-500">
                {searchTerm || categoryFilter !== 'all' || practiceAreaFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : canCreateTemplates
                    ? 'Get started by creating your first template'
                    : 'No templates have been created yet'
                }
              </p>
              {canCreateTemplates && !searchTerm && categoryFilter === 'all' && practiceAreaFilter === 'all' && (
                <button
                  onClick={handleCreateTemplate}
                  className="btn-primary mt-4"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create First Template
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Templates Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                {filteredTemplates.map((template) => (
                  <div key={template.id} className="card hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        {getCategoryIcon(template.category)}
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(template.category)}`}>
                          {template.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => router.push(`/document-templates/${template.id}`)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Template"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        {canEditTemplates && (
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit Template"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}

                        {canDeleteTemplates && (
                          <button
                            onClick={() => handleDeleteTemplate(template)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Template"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.title}</h3>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <UserGroupIcon className="h-4 w-4 mr-1" />
                        <span>{template.usage_count || 0} uses</span>
                        <span className="mx-2">•</span>
                        <span>v{template.version}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-500">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        <span>Updated {formatDate(template.updated_at)}</span>
                      </div>

                      {template.variables.length > 0 && (
                        <div className="flex items-center text-sm text-gray-500">
                          <TagIcon className="h-4 w-4 mr-1" />
                          <span>{template.variables.length} variables</span>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="flex-1 btn-primary text-sm"
                      >
                        Use Template
                      </button>
                      <button
                        onClick={() => router.push(`/document-templates/${template.id}`)}
                        className="flex-1 btn-secondary text-sm"
                      >
                        View Details
                      </button>
                    </div>

                    {/* Status indicator */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          template.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {template.is_active ? 'Active' : 'Inactive'}
                        </span>
                        
                        <div className="flex flex-wrap gap-1">
                          {template.practice_areas.slice(0, 2).map((area, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                            >
                              {area}
                            </span>
                          ))}
                          {template.practice_areas.length > 2 && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                              +{template.practice_areas.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalTemplates > pageSize && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalTemplates)} of {totalTemplates} templates
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={(currentPage + 1) * pageSize >= totalTemplates}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}