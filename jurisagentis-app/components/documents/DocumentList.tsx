/**
 * Document List Component - Document listing with filters and pagination
 * T066: Core document component for Document Management System
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Search,
  Filter,
  Grid,
  List,
  Plus,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  SortAsc,
  SortDesc,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DocumentCard } from './DocumentCard'
import { 
  Document, 
  DocumentStatus, 
  DocumentType,
  DocumentConfidentialityLevel 
} from '@jurisagentis/document-management'

interface DocumentListProps {
  initialDocuments?: Document[]
  showFilters?: boolean
  showPagination?: boolean
  showViewToggle?: boolean
  compact?: boolean
  matterFilter?: string
  clientFilter?: string
  onDocumentSelect?: (document: Document) => void
  onDocumentEdit?: (document: Document) => void
  onDocumentShare?: (document: Document) => void
  onDocumentDelete?: (document: Document) => void
}

interface DocumentFilters {
  search: string
  status: DocumentStatus | 'all'
  document_type: DocumentType | 'all'
  confidentiality_level: DocumentConfidentialityLevel | 'all'
  matter_id: string
  client_id: string
  include_archived: boolean
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  has_more: boolean
}

type ViewMode = 'grid' | 'list'
type SortField = 'created_at' | 'updated_at' | 'title' | 'status'
type SortOrder = 'asc' | 'desc'

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

const statusOptions: Array<{ value: DocumentStatus | 'all', label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Under Review' },
  { value: 'ready_for_signature', label: 'Ready for Signature' },
  { value: 'pending_signature', label: 'Pending Signature' },
  { value: 'executed', label: 'Executed' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' }
]

const documentTypeOptions: Array<{ value: DocumentType | 'all', label: string }> = [
  { value: 'all', label: 'All Types' },
  { value: 'contract', label: 'Contract' },
  { value: 'lease', label: 'Lease' },
  { value: 'will', label: 'Will' },
  { value: 'trust', label: 'Trust' },
  { value: 'power_of_attorney', label: 'Power of Attorney' },
  { value: 'court_filing', label: 'Court Filing' },
  { value: 'legal_memo', label: 'Legal Memo' },
  { value: 'client_agreement', label: 'Client Agreement' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'other', label: 'Other' }
]

const confidentialityOptions: Array<{ value: DocumentConfidentialityLevel | 'all', label: string }> = [
  { value: 'all', label: 'All Levels' },
  { value: 'public', label: 'Public' },
  { value: 'internal', label: 'Internal' },
  { value: 'client_confidential', label: 'Client Confidential' },
  { value: 'attorney_client_privileged', label: 'Attorney-Client Privileged' }
]

export function DocumentList({
  initialDocuments = [],
  showFilters = true,
  showPagination = true,
  showViewToggle = true,
  compact = false,
  matterFilter,
  clientFilter,
  onDocumentSelect,
  onDocumentEdit,
  onDocumentShare,
  onDocumentDelete
}: DocumentListProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State management
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  
  // Filters state
  const [filters, setFilters] = useState<DocumentFilters>({
    search: searchParams.get('search') || '',
    status: (searchParams.get('status') as DocumentStatus) || 'all',
    document_type: (searchParams.get('type') as DocumentType) || 'all',
    confidentiality_level: (searchParams.get('confidentiality') as DocumentConfidentialityLevel) || 'all',
    matter_id: matterFilter || searchParams.get('matter_id') || '',
    client_id: clientFilter || searchParams.get('client_id') || '',
    include_archived: searchParams.get('include_archived') === 'true'
  })
  
  // Pagination state
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '20'),
    total: 0,
    has_more: false
  })

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      
      // Add filters to query
      if (filters.search) queryParams.set('search', filters.search)
      if (filters.status !== 'all') queryParams.set('status', filters.status)
      if (filters.document_type !== 'all') queryParams.set('document_type', filters.document_type)
      if (filters.confidentiality_level !== 'all') queryParams.set('confidentiality_level', filters.confidentiality_level)
      if (filters.matter_id) queryParams.set('matter_id', filters.matter_id)
      if (filters.client_id) queryParams.set('client_id', filters.client_id)
      if (filters.include_archived) queryParams.set('include_archived', 'true')
      
      // Add pagination
      queryParams.set('page', pagination.page.toString())
      queryParams.set('limit', pagination.limit.toString())
      
      // Add sorting
      queryParams.set('sort_by', sortField)
      queryParams.set('sort_order', sortOrder)

      const response = await fetch(`/api/documents?${queryParams}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents')
      }
      
      const data = await response.json()
      
      setDocuments(data.documents || [])
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        has_more: data.pagination?.has_more || false
      }))
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
      console.error('Error fetching documents:', err)
    } finally {
      setLoading(false)
    }
  }, [filters, pagination.page, pagination.limit, sortField, sortOrder])

  // Update URL with current filters and pagination
  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    
    if (filters.search) params.set('search', filters.search)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.document_type !== 'all') params.set('type', filters.document_type)
    if (filters.confidentiality_level !== 'all') params.set('confidentiality', filters.confidentiality_level)
    if (filters.matter_id) params.set('matter_id', filters.matter_id)
    if (filters.client_id) params.set('client_id', filters.client_id)
    if (filters.include_archived) params.set('include_archived', 'true')
    if (pagination.page > 1) params.set('page', pagination.page.toString())
    if (pagination.limit !== 20) params.set('limit', pagination.limit.toString())
    
    const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`
    window.history.replaceState({}, '', newURL)
  }, [filters, pagination.page, pagination.limit])

  // Effects
  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    updateURL()
  }, [updateURL])

  // Handlers
  const handleFilterChange = (key: keyof DocumentFilters, value: string | boolean) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      document_type: 'all',
      confidentiality_level: 'all',
      matter_id: matterFilter || '',
      client_id: clientFilter || '',
      include_archived: false
    })
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const handleLimitChange = (newLimit: number) => {
    setPagination(prev => ({ 
      ...prev, 
      limit: newLimit, 
      page: 1 
    }))
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.status !== 'all') count++
    if (filters.document_type !== 'all') count++
    if (filters.confidentiality_level !== 'all') count++
    if (filters.include_archived) count++
    return count
  }

  const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1"
    >
      <span>{children}</span>
      {sortField === field && (
        sortOrder === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
      )}
    </Button>
  )

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading documents: {error}</p>
            <Button onClick={fetchDocuments} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Documents</h2>
          <p className="text-gray-600">
            {pagination.total > 0 ? `${pagination.total} documents found` : 'No documents found'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push('/documents/new')} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Document
          </Button>
          
          {showViewToggle && (
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          <Button
            variant="outline"
            onClick={fetchDocuments}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {showFilters && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className="flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFiltersCount() > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
            
            {getActiveFiltersCount() > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFiltersPanel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Document Type</label>
                <Select
                  value={filters.document_type}
                  onValueChange={(value) => handleFilterChange('document_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Confidentiality Level</label>
                <Select
                  value={filters.confidentiality_level}
                  onValueChange={(value) => handleFilterChange('confidentiality_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {confidentialityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4 flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.include_archived}
                  onChange={(e) => handleFilterChange('include_archived', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Include archived documents</span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sorting Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Sort by:</span>
          <SortButton field="created_at">Date Created</SortButton>
          <SortButton field="updated_at">Date Modified</SortButton>
          <SortButton field="title">Title</SortButton>
          <SortButton field="status">Status</SortButton>
        </div>
        
        {showPagination && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Show:</span>
            <Select
              value={pagination.limit.toString()}
              onValueChange={(value) => handleLimitChange(parseInt(value))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(option => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Documents Grid/List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500 mb-4">No documents found</p>
            <Button onClick={() => router.push('/documents/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-4'
        }>
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onView={onDocumentSelect}
              onEdit={onDocumentEdit}
              onShare={onDocumentShare}
              onDelete={onDocumentDelete}
              compact={compact || viewMode === 'list'}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {showPagination && pagination.total > pagination.limit && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} documents
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <span className="text-sm">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.has_more}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}