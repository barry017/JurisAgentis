/**
 * Client Documents Component
 * Displays and manages documents related to a specific client
 */

'use client'

import { useState, useEffect } from 'react'
import { 
  DocumentTextIcon,
  PlusIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ClockIcon,
  LockClosedIcon,
  TagIcon
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
  client_id?: string
  matter_id?: string
  status: 'draft' | 'in_review' | 'approved' | 'final' | 'archived'
  document_date?: string
  execution_date?: string
  effective_date?: string
  confidentiality_level: 'public' | 'internal' | 'confidential' | 'client_confidential' | 'attorney_client_privileged'
  retention_date?: string
  tags?: string[]
  created_at: string
  updated_at: string
  created_by_profile?: {
    first_name: string
    last_name: string
  }
}

interface ClientDocumentsProps {
  clientId: string
  clientName: string
}

export default function ClientDocuments({ clientId, clientName }: ClientDocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Fetch documents for client
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams()
        params.append('client_id', clientId)
        if (searchTerm) params.append('search', searchTerm)
        if (statusFilter !== 'all') params.append('status', statusFilter)
        if (typeFilter !== 'all') params.append('document_type', typeFilter)

        const response = await fetch(`/api/documents?${params}`)
        const data = await response.json()

        if (data.success) {
          setDocuments(data.documents || [])
        } else {
          setError('Failed to load documents')
        }
      } catch {
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
  }, [clientId, searchTerm, statusFilter, typeFilter])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      in_review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-blue-100 text-blue-800 border-blue-200',
      final: 'bg-green-100 text-green-800 border-green-200',
      archived: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const getConfidentialityBadge = (level: string) => {
    const styles = {
      public: 'bg-green-50 text-green-700 border-green-200',
      internal: 'bg-blue-50 text-blue-700 border-blue-200',
      confidential: 'bg-orange-50 text-orange-700 border-orange-200',
      client_confidential: 'bg-red-50 text-red-700 border-red-200',
      attorney_client_privileged: 'bg-purple-50 text-purple-700 border-purple-200'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[level as keyof typeof styles] || styles.internal}`}>
        <LockClosedIcon className="h-3 w-3 mr-1" />
        {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('doc')) return '📝'
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊'
    if (fileType.includes('image')) return '🖼️'
    return '📄'
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading documents...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Documents</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary flex items-center mx-auto"
        >
          <ArrowPathIcon className="h-4 w-4 mr-2" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
          Client Documents ({documents.length})
        </h3>
        <button className="btn-primary flex items-center text-sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10 text-sm"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_review">In Review</option>
          <option value="approved">Approved</option>
          <option value="final">Final</option>
          <option value="archived">Archived</option>
        </select>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field text-sm"
        >
          <option value="all">All Types</option>
          <option value="contract">Contract</option>
          <option value="correspondence">Correspondence</option>
          <option value="pleading">Pleading</option>
          <option value="evidence">Evidence</option>
          <option value="research">Research</option>
          <option value="administrative">Administrative</option>
        </select>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="p-8 text-center border border-gray-200 rounded-lg">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'No documents match your current filters'
              : `No documents have been uploaded for ${clientName} yet`
            }
          </p>
          {!searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
            <button className="btn-primary">
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((document) => (
            <div key={document.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                {/* Document Info */}
                <div className="flex items-start space-x-3 flex-1">
                  <div className="text-2xl">
                    {getFileIcon(document.file_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">{document.title}</h4>
                      <span className="text-xs text-gray-500">#{document.document_number}</span>
                    </div>
                    
                    {document.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{document.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{document.file_name}</span>
                      <span>{formatFileSize(document.file_size)}</span>
                      <span className="capitalize">{document.document_type}</span>
                      {document.document_date && (
                        <span>
                          <ClockIcon className="h-3 w-3 inline mr-1" />
                          {formatDate(document.document_date)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mt-2">
                      {getStatusBadge(document.status)}
                      {getConfidentialityBadge(document.confidentiality_level)}
                      {document.tags && document.tags.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <TagIcon className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {document.tags.slice(0, 2).join(', ')}
                            {document.tags.length > 2 && ` +${document.tags.length - 2}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {document.created_by_profile && (
                      <div className="text-xs text-gray-500 mt-1">
                        Created by {document.created_by_profile.first_name} {document.created_by_profile.last_name} 
                        {' '} on {formatDate(document.created_at)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      // TODO: Implement document viewing
                      console.log('View document:', document.id)
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="View Document"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      // TODO: Implement document download
                      console.log('Download document:', document.id)
                    }}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Download Document"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      // TODO: Implement document editing
                      console.log('Edit document:', document.id)
                    }}
                    className="p-2 text-gray-400 hover:text-yellow-600 transition-colors"
                    title="Edit Document"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this document?')) {
                        // TODO: Implement document deletion
                        console.log('Delete document:', document.id)
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Document"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {documents.length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Showing {documents.length} document{documents.length !== 1 ? 's' : ''} for {clientName}
            </div>
            <div className="flex items-center space-x-4">
              <span>
                Total size: {formatFileSize(documents.reduce((total, doc) => total + doc.file_size, 0))}
              </span>
              <span>
                Latest: {documents.length > 0 ? formatDate(Math.max(...documents.map(d => new Date(d.updated_at).getTime())).toString()) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}