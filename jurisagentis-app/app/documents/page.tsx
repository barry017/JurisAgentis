/**
 * Documents Dashboard - Comprehensive document management and file operations
 * 
 * Manages documents across all matters with advanced filtering, search, and file handling
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon,
  PencilSquareIcon,
  ChevronUpDownIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CloudArrowUpIcon,
  TagIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  FolderOpenIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface Document {
  id: string
  document_number: string
  title: string
  description?: string
  document_type: string
  document_category: string
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  file_extension: string
  file_hash?: string
  client_id?: string
  matter_id?: string
  status: 'draft' | 'review' | 'final' | 'archived' | 'in_progress'
  document_date?: string
  execution_date?: string
  effective_date?: string
  expiration_date?: string
  confidentiality_level: 'public' | 'internal' | 'client_confidential' | 'attorney_work_product' | 'privileged'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  tags?: string[]
  keywords?: string[]
  page_count?: number
  word_count?: number
  requires_review: boolean
  client?: {
    id: string
    first_name?: string
    last_name?: string
    business_name?: string
    client_type: 'individual' | 'business'
  }
  matter?: {
    id: string
    matter_number: string
    title: string
    status: string
  }
  created_at: string
  updated_at: string
}

interface DocumentStats {
  total_documents: number
  pending_review: number
  final_documents: number
  draft_documents: number
  this_month_created: number
  total_file_size: number
  overdue_reviews: number
  confidential_documents: number
}

export default function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState<DocumentStats>({
    total_documents: 0,
    pending_review: 0,
    final_documents: 0,
    draft_documents: 0,
    this_month_created: 0,
    total_file_size: 0,
    overdue_reviews: 0,
    confidential_documents: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [confidentialityFilter, setConfidentialityFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [matterFilter, setMatterFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState('')
  const [reviewOnlyFilter, setReviewOnlyFilter] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'created_at' | 'document_number' | 'title' | 'file_size'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Initialize filters from URL parameters
  useEffect(() => {
    const matterIdParam = searchParams.get('matter_id')
    const clientIdParam = searchParams.get('client_id')
    const statusParam = searchParams.get('status')
    const searchParam = searchParams.get('search')
    
    if (matterIdParam) setMatterFilter(matterIdParam)
    if (clientIdParam) setClientFilter(clientIdParam)
    if (statusParam) setStatusFilter(statusParam)
    if (searchParam) setSearchTerm(searchParam)
  }, [searchParams])
  
  // Load documents data
  useEffect(() => {
    loadDocuments()
  }, [searchParams, statusFilter, documentTypeFilter, categoryFilter, confidentialityFilter, clientFilter, matterFilter, searchTerm, tagFilter])

  const loadDocuments = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (documentTypeFilter !== 'all') params.append('document_type', documentTypeFilter)
      if (categoryFilter !== 'all') params.append('document_category', categoryFilter)
      if (confidentialityFilter !== 'all') params.append('confidentiality_level', confidentialityFilter)
      if (clientFilter !== 'all') params.append('client_id', clientFilter)
      if (matterFilter !== 'all') params.append('matter_id', matterFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (tagFilter) params.append('tag', tagFilter)
      
      // Call the documents API
      const response = await fetch(`/api/documents?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data.documents) {
        setDocuments(data.data.documents)
        
        // Calculate stats from documents data
        const now = new Date()
        const thisMonth = now.getMonth()
        const thisYear = now.getFullYear()
        
        const totalFileSize = data.data.documents.reduce((sum: number, doc: Document) => sum + doc.file_size, 0)
        const confidentialDocs = data.data.documents.filter((doc: Document) => 
          ['client_confidential', 'attorney_work_product', 'privileged'].includes(doc.confidentiality_level)
        ).length
        
        setStats({
          total_documents: data.data.documents.length,
          pending_review: data.data.documents.filter((d: Document) => d.status === 'review' || d.requires_review).length,
          final_documents: data.data.documents.filter((d: Document) => d.status === 'final').length,
          draft_documents: data.data.documents.filter((d: Document) => d.status === 'draft').length,
          this_month_created: data.data.documents.filter((d: Document) => {
            const created = new Date(d.created_at)
            return created.getMonth() === thisMonth && created.getFullYear() === thisYear
          }).length,
          total_file_size: totalFileSize,
          overdue_reviews: data.data.documents.filter((d: Document) => {
            return d.requires_review && d.status !== 'final'
          }).length,
          confidential_documents: confidentialDocs
        })
      } else {
        // Fallback to empty array if API fails
        setDocuments([])
        setStats({
          total_documents: 0,
          pending_review: 0,
          final_documents: 0,
          draft_documents: 0,
          this_month_created: 0,
          total_file_size: 0,
          overdue_reviews: 0,
          confidential_documents: 0
        })
      }
      
    } catch (error) {
      console.error('Error loading documents:', error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: Document['status'], requiresReview: boolean) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      final: 'bg-green-100 text-green-800 border-green-200',
      archived: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        {requiresReview && status !== 'final' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
            ⚠️ Review Required
          </span>
        )}
      </div>
    )
  }

  const getConfidentialityBadge = (level: Document['confidentiality_level']) => {
    const confidentialityStyles = {
      public: 'bg-green-100 text-green-800',
      internal: 'bg-blue-100 text-blue-800',
      client_confidential: 'bg-yellow-100 text-yellow-800',
      attorney_work_product: 'bg-orange-100 text-orange-800',
      privileged: 'bg-red-100 text-red-800'
    }
    
    const confidentialityLabels = {
      public: 'Public',
      internal: 'Internal',
      client_confidential: 'Client Confidential',
      attorney_work_product: 'Work Product',
      privileged: 'Privileged'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${confidentialityStyles[level]}`}>
        <ShieldCheckIcon className="h-3 w-3 mr-1" />
        {confidentialityLabels[level]}
      </span>
    )
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('image')) return '🖼️'
    return '📁'
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleDownload = (document: Document) => {
    // In a real implementation, this would handle secure file download
    console.log('Downloading document:', document.file_name)
    // For now, just show an alert
    alert(`Download functionality would be implemented for: ${document.file_name}`)
  }
  
  const getFilterDisplayName = () => {
    if (matterFilter !== 'all' && clientFilter !== 'all') {
      return `Matter ${matterFilter} & Client ${clientFilter}`
    } else if (matterFilter !== 'all') {
      return `Matter ${matterFilter}`
    } else if (clientFilter !== 'all') {
      return `Client ${clientFilter}`
    }
    return null
  }
  
  const hasActiveFilters = () => {
    return matterFilter !== 'all' || clientFilter !== 'all' || statusFilter !== 'all' || 
           documentTypeFilter !== 'all' || categoryFilter !== 'all' || 
           confidentialityFilter !== 'all' || searchTerm || tagFilter || reviewOnlyFilter
  }

  // Filter and sort documents
  const filteredDocuments = documents
    .filter(document => {
      const matchesSearch = 
        document.document_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        document.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (document.description && document.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        document.file_name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || document.status === statusFilter
      const matchesType = documentTypeFilter === 'all' || document.document_type === documentTypeFilter
      const matchesCategory = categoryFilter === 'all' || document.document_category === categoryFilter
      const matchesConfidentiality = confidentialityFilter === 'all' || document.confidentiality_level === confidentialityFilter
      const matchesClient = clientFilter === 'all' || document.client_id === clientFilter
      const matchesMatter = matterFilter === 'all' || document.matter_id === matterFilter
      const matchesTag = !tagFilter || (document.tags && document.tags.some(tag => tag.toLowerCase().includes(tagFilter.toLowerCase())))
      const matchesReview = !reviewOnlyFilter || document.requires_review
      
      return matchesSearch && matchesStatus && matchesType && matchesCategory && 
             matchesConfidentiality && matchesClient && matchesMatter && matchesTag && matchesReview
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'file_size':
          aValue = a.file_size
          bValue = b.file_size
          break
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'document_number':
          aValue = a.document_number
          bValue = b.document_number
          break
        default:
          aValue = a[sortBy]
          bValue = b[sortBy]
      }
      
      const modifier = sortOrder === 'asc' ? 1 : -1
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier
      }
      
      return ((aValue as number) - (bValue as number)) * modifier
    })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header">
        <div className="content-container">
          <div className="section-header">
            <div>
              <h1 className="page-title flex items-center">
                <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                Document Management
                {(matterFilter !== 'all' || clientFilter !== 'all') && (
                  <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {matterFilter !== 'all' && `Matter: ${matterFilter}`}
                    {clientFilter !== 'all' && `Client: ${clientFilter}`}
                  </span>
                )}
              </h1>
              <p className="page-subtitle">
                {getFilterDisplayName()
                  ? `Viewing documents for ${getFilterDisplayName()}`
                  : 'Comprehensive document lifecycle management with advanced security and collaboration'
                }
              </p>
            </div>

            <div className="flex space-x-3">
              {(matterFilter !== 'all' || clientFilter !== 'all') && (
                <button
                  onClick={() => {
                    setMatterFilter('all')
                    setClientFilter('all')
                    setStatusFilter('all')
                    setSearchTerm('')
                    router.push('/documents')
                  }}
                  className="btn-secondary flex items-center"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Clear Filters
                </button>
              )}
              
              <button
                onClick={() => {
                  const uploadUrl = matterFilter !== 'all' 
                    ? `/documents/upload?matter_id=${matterFilter}`
                    : '/documents/upload'
                  router.push(uploadUrl)
                }}
                className="btn-primary flex items-center"
              >
                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                Upload Document
              </button>
              
              <button
                onClick={() => {
                  const newUrl = matterFilter !== 'all'
                    ? `/documents/new?matter_id=${matterFilter}`
                    : '/documents/new'
                  router.push(newUrl)
                }}
                className="btn-secondary flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Document
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
              
              <button
                onClick={loadDocuments}
                className="btn-secondary flex items-center"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_documents}</p>
                <p className="text-xs text-gray-500">{formatFileSize(stats.total_file_size)} total</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_review}</p>
                <p className="text-xs text-gray-500">{stats.overdue_reviews} overdue</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Final Documents</p>
                <p className="text-2xl font-bold text-gray-900">{stats.final_documents}</p>
                <p className="text-xs text-gray-500">{stats.draft_documents} drafts</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Confidential</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confidential_documents}</p>
                <p className="text-xs text-gray-500">{stats.this_month_created} this month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <TagIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter by tag..."
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="input-field pl-10 w-40"
                />
              </div>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={reviewOnlyFilter}
                  onChange={(e) => setReviewOnlyFilter(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Review required</span>
              </label>
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="final">Final</option>
                    <option value="archived">Archived</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Document Type</label>
                  <select
                    value={documentTypeFilter}
                    onChange={(e) => setDocumentTypeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Types</option>
                    <option value="contract">Contract</option>
                    <option value="agreement">Agreement</option>
                    <option value="pleading">Pleading</option>
                    <option value="motion">Motion</option>
                    <option value="brief">Brief</option>
                    <option value="correspondence">Correspondence</option>
                    <option value="memo">Memo</option>
                    <option value="discovery">Discovery</option>
                    <option value="financial">Financial</option>
                    <option value="administrative">Administrative</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Categories</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="litigation">Litigation</option>
                    <option value="contract_review">Contract Review</option>
                    <option value="estate_administration">Estate Administration</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Confidentiality</label>
                  <select
                    value={confidentialityFilter}
                    onChange={(e) => setConfidentialityFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Levels</option>
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="client_confidential">Client Confidential</option>
                    <option value="attorney_work_product">Work Product</option>
                    <option value="privileged">Privileged</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Matter</label>
                  <select
                    value={matterFilter}
                    onChange={(e) => setMatterFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Matters</option>
                    {/* Would populate from matters API */}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Documents List */}
        <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner h-8 w-8 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No documents found</p>
              <p className="text-gray-500 mb-4">
                {hasActiveFilters()
                  ? `No documents found for the selected filters${getFilterDisplayName() ? ` (${getFilterDisplayName()})` : ''}`
                  : 'Get started by uploading your first document'
                }
              </p>
              {hasActiveFilters() && (
                <div className="space-x-3">
                  <button
                    onClick={() => {
                      setMatterFilter('all')
                      setClientFilter('all')
                      setStatusFilter('all')
                      setDocumentTypeFilter('all')
                      setCategoryFilter('all')
                      setConfidentialityFilter('all')
                      setSearchTerm('')
                      setTagFilter('')
                      setReviewOnlyFilter(false)
                      router.push('/documents')
                    }}
                    className="btn-secondary"
                  >
                    Clear All Filters
                  </button>
                  <button
                    onClick={() => {
                      const uploadUrl = matterFilter !== 'all' 
                        ? `/documents/upload?matter_id=${matterFilter}`
                        : '/documents/upload'
                      router.push(uploadUrl)
                    }}
                    className="btn-primary"
                  >
                    Upload Document
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('document_number')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Document</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('title')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Title & Details</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">Status & Security</th>
                    
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('file_size')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>File Info</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">Matter & Client</th>
                    
                    <th className="table-header-cell text-right">Actions</th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map((document) => (
                    <tr key={document.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{document.document_number}</div>
                          <div className="text-sm text-gray-500">{formatDate(document.created_at)}</div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          <div className="flex items-center">
                            <span className="text-xl mr-2">{getFileTypeIcon(document.file_type)}</span>
                            <div>
                              <div className="font-medium text-gray-900">{document.title}</div>
                              <div className="text-sm text-gray-600 truncate max-w-md">
                                {document.description || 'No description'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {document.document_type} • {document.document_category}
                              </div>
                            </div>
                          </div>
                          {document.tags && document.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {document.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                  #{tag}
                                </span>
                              ))}
                              {document.tags.length > 3 && (
                                <span className="text-xs text-gray-500">+{document.tags.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="space-y-2">
                          {getStatusBadge(document.status, document.requires_review)}
                          {getConfidentialityBadge(document.confidentiality_level)}
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          <div className="text-sm text-gray-900">{document.file_name}</div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(document.file_size)}
                            {document.page_count && ` • ${document.page_count} pages`}
                            {document.word_count && ` • ${document.word_count} words`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {document.file_extension.toUpperCase()}
                          </div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          {document.matter && (
                            <div>
                              <button
                                onClick={() => router.push(`/matters/${document.matter_id}`)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                                title="View Matter Details"
                              >
                                {document.matter.matter_number}
                              </button>
                              <div className="text-xs text-gray-600">{document.matter.title}</div>
                            </div>
                          )}
                          {document.client && (
                            <div>
                              <button
                                onClick={() => router.push(`/clients/${document.client_id}`)}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                title="View Client Details"
                              >
                                {document.client.business_name || 
                                  `${document.client.first_name} ${document.client.last_name}`}
                              </button>
                            </div>
                          )}
                          {document.document_date && (
                            <div className="text-xs text-gray-500">
                              Doc: {formatDate(document.document_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDownload(document)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Download Document"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/documents/${document.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Document"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/documents/${document.id}/edit`)}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Edit Document"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}