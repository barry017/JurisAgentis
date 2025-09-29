/**
 * Document Search Component - Advanced document search interface
 * T020: Frontend component integration for Document Management System
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  Search,
  Filter,
  X,
  Calendar,
  Tag,
  FileText,
  User,
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDocuments } from '@/hooks/use-documents'
import type { 
  DocumentType, 
  DocumentStatus, 
  DocumentConfidentialityLevel,
  DocumentSearchParams
} from '@jurisagentis/document-management'

interface DocumentSearchProps {
  onSearch?: (params: DocumentSearchParams) => void
  initialFilters?: Partial<DocumentSearchParams>
  compact?: boolean
}

const documentTypeLabels: Record<DocumentType, string> = {
  'contract': 'Contract',
  'lease': 'Lease',
  'will': 'Will',
  'trust': 'Trust',
  'power_of_attorney': 'Power of Attorney',
  'court_filing': 'Court Filing',
  'legal_memo': 'Legal Memo',
  'client_agreement': 'Client Agreement',
  'correspondence': 'Correspondence',
  'invoice': 'Invoice',
  'receipt': 'Receipt',
  'expert_report': 'Expert Report',
  'litigation_material': 'Litigation Material',
  'regulatory_filing': 'Regulatory Filing',
  'compliance_document': 'Compliance Document',
  'financial_record': 'Financial Record',
  'hr_record': 'HR Record',
  'policy': 'Policy',
  'other': 'Other'
}

const statusLabels: Record<DocumentStatus, string> = {
  'draft': 'Draft',
  'review': 'Under Review',
  'ready_for_signature': 'Ready for Signature',
  'pending_signature': 'Pending Signature',
  'executed': 'Executed',
  'completed': 'Completed',
  'archived': 'Archived'
}

export function DocumentSearch({ onSearch, initialFilters, compact = false }: DocumentSearchProps) {
  const { searchDocuments } = useDocuments()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [searchParams, setSearchParams] = useState<DocumentSearchParams>({
    query: initialFilters?.query || '',
    document_type: initialFilters?.document_type || undefined,
    status: initialFilters?.status || undefined,
    confidentiality_level: initialFilters?.confidentiality_level || undefined,
    matter_id: initialFilters?.matter_id || undefined,
    client_id: initialFilters?.client_id || undefined,
    created_by: initialFilters?.created_by || undefined,
    tags: initialFilters?.tags || undefined,
    created_after: initialFilters?.created_after || undefined,
    created_before: initialFilters?.created_before || undefined,
    limit: 20,
    offset: 0,
    sort_by: 'created_at',
    sort_order: 'desc',
    include_archived: false
  })

  const [activeFilters, setActiveFilters] = useState<string[]>([])

  // Update active filters display
  useEffect(() => {
    const filters: string[] = []
    
    if (searchParams.query) filters.push(`Query: "${searchParams.query}"`)
    if (searchParams.document_type?.length) {
      filters.push(`Type: ${searchParams.document_type.map(t => documentTypeLabels[t]).join(', ')}`)
    }
    if (searchParams.status?.length) {
      filters.push(`Status: ${searchParams.status.map(s => statusLabels[s]).join(', ')}`)
    }
    if (searchParams.confidentiality_level) {
      filters.push(`Confidentiality: ${searchParams.confidentiality_level.replace('_', ' ')}`)
    }
    if (searchParams.matter_id) filters.push(`Matter: ${searchParams.matter_id}`)
    if (searchParams.client_id) filters.push(`Client: ${searchParams.client_id}`)
    if (searchParams.created_after) {
      filters.push(`After: ${new Date(searchParams.created_after).toLocaleDateString()}`)
    }
    if (searchParams.created_before) {
      filters.push(`Before: ${new Date(searchParams.created_before).toLocaleDateString()}`)
    }
    if (searchParams.tags?.length) {
      filters.push(`Tags: ${searchParams.tags.join(', ')}`)
    }
    if (searchParams.include_archived) filters.push('Including archived')
    
    setActiveFilters(filters)
  }, [searchParams])

  const handleSearch = async () => {
    if (onSearch) {
      onSearch(searchParams)
    } else {
      await searchDocuments(searchParams)
    }
  }

  const handleQuickSearch = (query: string) => {
    const params = { ...searchParams, query }
    setSearchParams(params)
    if (onSearch) {
      onSearch(params)
    }
  }

  const clearFilter = (filterText: string) => {
    const newParams = { ...searchParams }
    
    if (filterText.startsWith('Query:')) {
      newParams.query = ''
    } else if (filterText.startsWith('Type:')) {
      newParams.document_type = undefined
    } else if (filterText.startsWith('Status:')) {
      newParams.status = undefined
    } else if (filterText.startsWith('Confidentiality:')) {
      newParams.confidentiality_level = undefined
    } else if (filterText.startsWith('Matter:')) {
      newParams.matter_id = undefined
    } else if (filterText.startsWith('Client:')) {
      newParams.client_id = undefined
    } else if (filterText.startsWith('After:')) {
      newParams.created_after = undefined
    } else if (filterText.startsWith('Before:')) {
      newParams.created_before = undefined
    } else if (filterText.startsWith('Tags:')) {
      newParams.tags = undefined
    } else if (filterText === 'Including archived') {
      newParams.include_archived = false
    }
    
    setSearchParams(newParams)
    if (onSearch) {
      onSearch(newParams)
    }
  }

  const clearAllFilters = () => {
    const clearedParams: DocumentSearchParams = {
      query: '',
      limit: 20,
      offset: 0,
      sort_by: 'created_at',
      sort_order: 'desc',
      include_archived: false
    }
    setSearchParams(clearedParams)
    if (onSearch) {
      onSearch(clearedParams)
    }
  }

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search documents..."
              className="pl-10"
              value={searchParams.query}
              onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
          </div>
          <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Advanced Search</DialogTitle>
                <DialogDescription>
                  Search documents with advanced filters and options.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Search Query */}
                <div>
                  <Label htmlFor="advanced_query">Search Query</Label>
                  <Input
                    id="advanced_query"
                    value={searchParams.query}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
                    placeholder="Enter search terms..."
                  />
                </div>

                {/* Filters Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="document_types">Document Types</Label>
                    <Select
                      value={searchParams.document_type?.[0] || ''}
                      onValueChange={(value) => setSearchParams(prev => ({ 
                        ...prev, 
                        document_type: value ? [value as DocumentType] : undefined 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All types</SelectItem>
                        {Object.entries(documentTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status_search">Status</Label>
                    <Select
                      value={searchParams.status?.[0] || ''}
                      onValueChange={(value) => setSearchParams(prev => ({ 
                        ...prev, 
                        status: value ? [value as DocumentStatus] : undefined 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All statuses</SelectItem>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="confidentiality_search">Confidentiality</Label>
                    <Select
                      value={searchParams.confidentiality_level || ''}
                      onValueChange={(value) => setSearchParams(prev => ({ 
                        ...prev, 
                        confidentiality_level: value as DocumentConfidentialityLevel || undefined 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All levels</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                        <SelectItem value="client_confidential">Client Confidential</SelectItem>
                        <SelectItem value="attorney_client_privileged">Attorney-Client Privileged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="sort_by">Sort By</Label>
                    <Select
                      value={searchParams.sort_by}
                      onValueChange={(value) => setSearchParams(prev => ({ 
                        ...prev, 
                        sort_by: value as any
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Created</SelectItem>
                        <SelectItem value="updated_at">Date Modified</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="document_type">Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="created_after">Created After</Label>
                    <Input
                      id="created_after"
                      type="date"
                      value={searchParams.created_after ? new Date(searchParams.created_after).toISOString().split('T')[0] : ''}
                      onChange={(e) => setSearchParams(prev => ({ 
                        ...prev, 
                        created_after: e.target.value ? new Date(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="created_before">Created Before</Label>
                    <Input
                      id="created_before"
                      type="date"
                      value={searchParams.created_before ? new Date(searchParams.created_before).toISOString().split('T')[0] : ''}
                      onChange={(e) => setSearchParams(prev => ({ 
                        ...prev, 
                        created_before: e.target.value ? new Date(e.target.value) : undefined 
                      }))}
                    />
                  </div>
                </div>

                {/* Additional Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="matter_id_search">Matter ID</Label>
                    <Input
                      id="matter_id_search"
                      value={searchParams.matter_id || ''}
                      onChange={(e) => setSearchParams(prev => ({ 
                        ...prev, 
                        matter_id: e.target.value || undefined 
                      }))}
                      placeholder="Enter matter ID..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="client_id_search">Client ID</Label>
                    <Input
                      id="client_id_search"
                      value={searchParams.client_id || ''}
                      onChange={(e) => setSearchParams(prev => ({ 
                        ...prev, 
                        client_id: e.target.value || undefined 
                      }))}
                      placeholder="Enter client ID..."
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <Label htmlFor="tags_search">Tags (comma-separated)</Label>
                  <Input
                    id="tags_search"
                    value={searchParams.tags?.join(', ') || ''}
                    onChange={(e) => setSearchParams(prev => ({ 
                      ...prev, 
                      tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : undefined 
                    }))}
                    placeholder="Enter tags separated by commas..."
                  />
                </div>

                {/* Options */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="include_archived"
                    checked={searchParams.include_archived}
                    onCheckedChange={(checked) => setSearchParams(prev => ({ 
                      ...prev, 
                      include_archived: checked 
                    }))}
                  />
                  <Label htmlFor="include_archived">Include archived documents</Label>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                  <Button onClick={() => {
                    handleSearch()
                    setIsAdvancedOpen(false)
                  }}>
                    Search
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSearch}>
            Search
          </Button>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge 
                key={index} 
                variant="secondary" 
                className="cursor-pointer hover:bg-red-100 hover:text-red-800"
                onClick={() => clearFilter(filter)}
              >
                {filter}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              Clear all
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Document Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search documents..."
                className="pl-10"
                value={searchParams.query}
                onChange={(e) => handleQuickSearch(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch()
                  }
                }}
              />
            </div>
            <Dialog open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Advanced Document Search</DialogTitle>
                  <DialogDescription>
                    Use advanced filters to find specific documents in your system.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Search Query */}
                  <div>
                    <Label htmlFor="advanced_query">Search Query</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="advanced_query"
                        className="pl-10"
                        value={searchParams.query}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
                        placeholder="Enter search terms..."
                      />
                    </div>
                  </div>

                  {/* Quick Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Document Type</Label>
                      <Select
                        value={searchParams.document_type?.[0] || ''}
                        onValueChange={(value) => setSearchParams(prev => ({ 
                          ...prev, 
                          document_type: value ? [value as DocumentType] : undefined 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All types</SelectItem>
                          {Object.entries(documentTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Status</Label>
                      <Select
                        value={searchParams.status?.[0] || ''}
                        onValueChange={(value) => setSearchParams(prev => ({ 
                          ...prev, 
                          status: value ? [value as DocumentStatus] : undefined 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All statuses</SelectItem>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Confidentiality</Label>
                      <Select
                        value={searchParams.confidentiality_level || ''}
                        onValueChange={(value) => setSearchParams(prev => ({ 
                          ...prev, 
                          confidentiality_level: value as DocumentConfidentialityLevel || undefined 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All levels</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="internal">Internal</SelectItem>
                          <SelectItem value="client_confidential">Client Confidential</SelectItem>
                          <SelectItem value="attorney_client_privileged">Attorney-Client Privileged</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Date Filters */}
                  <div>
                    <Label className="flex items-center mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      Date Range
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="created_after" className="text-sm">Created After</Label>
                        <Input
                          id="created_after"
                          type="date"
                          value={searchParams.created_after ? new Date(searchParams.created_after).toISOString().split('T')[0] : ''}
                          onChange={(e) => setSearchParams(prev => ({ 
                            ...prev, 
                            created_after: e.target.value ? new Date(e.target.value) : undefined 
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="created_before" className="text-sm">Created Before</Label>
                        <Input
                          id="created_before"
                          type="date"
                          value={searchParams.created_before ? new Date(searchParams.created_before).toISOString().split('T')[0] : ''}
                          onChange={(e) => setSearchParams(prev => ({ 
                            ...prev, 
                            created_before: e.target.value ? new Date(e.target.value) : undefined 
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Entity Filters */}
                  <div>
                    <Label className="flex items-center mb-2">
                      <Building className="h-4 w-4 mr-2" />
                      Entity Filters
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="matter_id_search" className="text-sm">Matter ID</Label>
                        <Input
                          id="matter_id_search"
                          value={searchParams.matter_id || ''}
                          onChange={(e) => setSearchParams(prev => ({ 
                            ...prev, 
                            matter_id: e.target.value || undefined 
                          }))}
                          placeholder="Enter matter ID..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="client_id_search" className="text-sm">Client ID</Label>
                        <Input
                          id="client_id_search"
                          value={searchParams.client_id || ''}
                          onChange={(e) => setSearchParams(prev => ({ 
                            ...prev, 
                            client_id: e.target.value || undefined 
                          }))}
                          placeholder="Enter client ID..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <Label htmlFor="tags_search" className="flex items-center mb-2">
                      <Tag className="h-4 w-4 mr-2" />
                      Tags (comma-separated)
                    </Label>
                    <Input
                      id="tags_search"
                      value={searchParams.tags?.join(', ') || ''}
                      onChange={(e) => setSearchParams(prev => ({ 
                        ...prev, 
                        tags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : undefined 
                      }))}
                      placeholder="Enter tags separated by commas..."
                    />
                  </div>

                  {/* Sort Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sort_by">Sort By</Label>
                      <Select
                        value={searchParams.sort_by}
                        onValueChange={(value) => setSearchParams(prev => ({ 
                          ...prev, 
                          sort_by: value as any
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="created_at">Date Created</SelectItem>
                          <SelectItem value="updated_at">Date Modified</SelectItem>
                          <SelectItem value="title">Title</SelectItem>
                          <SelectItem value="document_type">Type</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="sort_order">Sort Order</Label>
                      <Select
                        value={searchParams.sort_order}
                        onValueChange={(value) => setSearchParams(prev => ({ 
                          ...prev, 
                          sort_order: value as 'asc' | 'desc'
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Newest First</SelectItem>
                          <SelectItem value="asc">Oldest First</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include_archived"
                        checked={searchParams.include_archived}
                        onCheckedChange={(checked) => setSearchParams(prev => ({ 
                          ...prev, 
                          include_archived: checked 
                        }))}
                      />
                      <Label htmlFor="include_archived">Include archived documents</Label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button variant="outline" onClick={clearAllFilters}>
                      Clear All Filters
                    </Button>
                    <Button onClick={() => {
                      handleSearch()
                      setIsAdvancedOpen(false)
                    }}>
                      Search Documents
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Active Filters:</Label>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
                    onClick={() => clearFilter(filter)}
                  >
                    {filter}
                    <X className="h-3 w-3 ml-1" />
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 px-2 text-xs">
                  Clear all
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}