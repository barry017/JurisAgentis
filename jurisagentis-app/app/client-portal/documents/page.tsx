/**
 * Client Portal - Secure Document Center
 * 
 * Secure document sharing with encryption, access controls, and audit logging
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CloudArrowUpIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ArrowLeftIcon,
  ShareIcon,
  ChatBubbleLeftIcon,
  DocumentArrowUpIcon
} from '@heroicons/react/24/outline'

interface Document {
  id: string
  name: string
  type: string
  category: string
  size: string
  uploadedAt: string
  uploadedBy: string
  status: 'draft' | 'review' | 'approved' | 'signed' | 'archived'
  confidentialityLevel: 'public' | 'confidential' | 'privileged'
  requiresSignature: boolean
  isEncrypted: boolean
  accessCount: number
  lastAccessed?: string
  expiresAt?: string
  matterId: string
  matterTitle: string
  version: number
  description?: string
  tags: string[]
  canDownload: boolean
  canComment: boolean
  hasComments: boolean
  commentCount: number
}

const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Smith Family Trust Agreement v3.2',
    type: 'PDF',
    category: 'Trust Documents',
    size: '2.4 MB',
    uploadedAt: '2025-01-12T14:30:00Z',
    uploadedBy: 'Sarah Johnson',
    status: 'review',
    confidentialityLevel: 'privileged',
    requiresSignature: true,
    isEncrypted: true,
    accessCount: 7,
    lastAccessed: '2025-01-13T09:15:00Z',
    expiresAt: '2025-04-12T14:30:00Z',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    version: 3,
    description: 'Final trust agreement ready for client review and signature',
    tags: ['trust', 'estate-planning', 'signature-required'],
    canDownload: true,
    canComment: true,
    hasComments: true,
    commentCount: 3
  },
  {
    id: '2',
    name: 'Asset Inventory Worksheet',
    type: 'Excel',
    category: 'Worksheets',
    size: '156 KB',
    uploadedAt: '2025-01-08T10:00:00Z',
    uploadedBy: 'John Smith',
    status: 'approved',
    confidentialityLevel: 'confidential',
    requiresSignature: false,
    isEncrypted: true,
    accessCount: 12,
    lastAccessed: '2025-01-12T16:20:00Z',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    version: 1,
    description: 'Complete inventory of client assets for trust planning',
    tags: ['assets', 'inventory', 'planning'],
    canDownload: true,
    canComment: false,
    hasComments: false,
    commentCount: 0
  },
  {
    id: '3',
    name: 'Power of Attorney - Healthcare',
    type: 'PDF',
    category: 'Legal Documents',
    size: '890 KB',
    uploadedAt: '2025-01-05T11:30:00Z',
    uploadedBy: 'Sarah Johnson',
    status: 'signed',
    confidentialityLevel: 'privileged',
    requiresSignature: true,
    isEncrypted: true,
    accessCount: 5,
    lastAccessed: '2025-01-10T14:45:00Z',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    version: 1,
    description: 'Executed healthcare power of attorney document',
    tags: ['poa', 'healthcare', 'executed'],
    canDownload: true,
    canComment: false,
    hasComments: false,
    commentCount: 0
  },
  {
    id: '4',
    name: 'Trust Funding Instructions',
    type: 'PDF',
    category: 'Instructions',
    size: '445 KB',
    uploadedAt: '2025-01-15T09:00:00Z',
    uploadedBy: 'Sarah Johnson',
    status: 'draft',
    confidentialityLevel: 'confidential',
    requiresSignature: false,
    isEncrypted: true,
    accessCount: 2,
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    version: 1,
    description: 'Step-by-step instructions for funding the trust',
    tags: ['instructions', 'funding', 'trust'],
    canDownload: true,
    canComment: true,
    hasComments: false,
    commentCount: 0
  }
]

const folders = [
  { id: '1', name: 'Trust Documents', count: 2, matterId: '1' },
  { id: '2', name: 'Legal Documents', count: 1, matterId: '1' },
  { id: '3', name: 'Worksheets', count: 1, matterId: '1' },
  { id: '4', name: 'Instructions', count: 1, matterId: '1' }
]

export default function ClientDocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>(mockDocuments)
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>(mockDocuments)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'folders'>('folders')
  const [loading, setLoading] = useState(false)

  // Filter documents based on search and filters
  useEffect(() => {
    let filtered = documents

    if (searchQuery) {
      filtered = filtered.filter(doc => 
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(doc => doc.category === selectedCategory)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(doc => doc.status === selectedStatus)
    }

    setFilteredDocuments(filtered)
  }, [searchQuery, selectedCategory, selectedStatus, documents])

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      signed: 'bg-blue-100 text-blue-800 border-blue-200',
      archived: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    const icons = {
      draft: ClockIcon,
      review: ExclamationTriangleIcon,
      approved: CheckCircleIcon,
      signed: CheckCircleIcon,
      archived: FolderIcon
    }
    
    const StatusIcon = icons[status as keyof typeof icons] || ClockIcon
    const statusStyle = styles[status as keyof typeof styles] || styles.draft
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyle}`}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getConfidentialityBadge = (level: string) => {
    const styles = {
      public: 'bg-gray-100 text-gray-800',
      confidential: 'bg-orange-100 text-orange-800',
      privileged: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[level as keyof typeof styles] || styles.confidential}`}>
        <LockClosedIcon className="h-3 w-3 mr-1" />
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleDocumentAction = (action: string, docId: string) => {
    console.log(`${action} document:`, docId)
    // In real implementation, would handle download, view, comment, etc.
  }

  const categories = [...new Set(documents.map(doc => doc.category))]
  const statuses = [...new Set(documents.map(doc => doc.status))]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Secure Document Center
                </h1>
                <p className="text-gray-600 mt-1">
                  Your confidential legal documents with enterprise-grade security
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'list' ? 'folders' : 'list')}
                className="btn-secondary"
              >
                {viewMode === 'list' ? 'Folder View' : 'List View'}
              </button>
              <button className="btn-primary flex items-center">
                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                Upload Document
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents, descriptions, or tags..."
                  className="input-field pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                className="input-field"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <select
                className="input-field"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {viewMode === 'folders' ? (
          /* Folder View */
          <div className="space-y-6">
            {folders.map(folder => {
              const folderDocs = filteredDocuments.filter(doc => doc.category === folder.name)
              if (folderDocs.length === 0) return null
              
              return (
                <div key={folder.id} className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FolderIcon className="h-6 w-6 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">{folder.name}</h3>
                        <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded-full">
                          {folderDocs.length} document{folderDocs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <div className="grid gap-4">
                      {folderDocs.map(doc => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <DocumentTextIcon className="h-8 w-8 text-blue-600 flex-shrink-0 mt-1" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h4>
                                  {doc.isEncrypted && <LockClosedIcon className="h-4 w-4 text-green-600" />}
                                  {doc.requiresSignature && <DocumentArrowUpIcon className="h-4 w-4 text-orange-600" />}
                                </div>
                                
                                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                                  <span>{doc.type} • {doc.size}</span>
                                  <span>v{doc.version}</span>
                                  <span>Uploaded {formatDate(doc.uploadedAt)}</span>
                                  <span>by {doc.uploadedBy}</span>
                                </div>
                                
                                {doc.description && (
                                  <p className="text-sm text-gray-600 mb-2">{doc.description}</p>
                                )}
                                
                                <div className="flex items-center space-x-2 mb-2">
                                  {getStatusBadge(doc.status)}
                                  {getConfidentialityBadge(doc.confidentialityLevel)}
                                  {doc.expiresAt && (
                                    <span className="text-xs text-orange-600">
                                      Expires {formatDate(doc.expiresAt)}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <span>Accessed {doc.accessCount} times</span>
                                  {doc.lastAccessed && (
                                    <span>Last: {formatDate(doc.lastAccessed)}</span>
                                  )}
                                  {doc.hasComments && (
                                    <span>{doc.commentCount} comment{doc.commentCount !== 1 ? 's' : ''}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                              <button
                                onClick={() => handleDocumentAction('view', doc.id)}
                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View Document"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              
                              {doc.canDownload && (
                                <button
                                  onClick={() => handleDocumentAction('download', doc.id)}
                                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Download Document"
                                >
                                  <ArrowDownTrayIcon className="h-4 w-4" />
                                </button>
                              )}
                              
                              {doc.canComment && (
                                <button
                                  onClick={() => handleDocumentAction('comment', doc.id)}
                                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                                  title="Add Comment"
                                >
                                  <ChatBubbleLeftIcon className="h-4 w-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => handleDocumentAction('share', doc.id)}
                                className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                                title="Share Document"
                              >
                                <ShareIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                All Documents ({filteredDocuments.length})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Security
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                              {doc.isEncrypted && <LockClosedIcon className="h-4 w-4 text-green-600" />}
                              {doc.requiresSignature && <DocumentArrowUpIcon className="h-4 w-4 text-orange-600" />}
                            </div>
                            <div className="text-sm text-gray-500">
                              {doc.category} • {doc.type} • {doc.size} • v{doc.version}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(doc.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getConfidentialityBadge(doc.confidentialityLevel)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(doc.uploadedAt)}</div>
                        <div className="text-sm text-gray-500">by {doc.uploadedBy}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDocumentAction('view', doc.id)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          {doc.canDownload && (
                            <button
                              onClick={() => handleDocumentAction('download', doc.id)}
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {doc.canComment && (
                            <button
                              onClick={() => handleDocumentAction('comment', doc.id)}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                              title="Comment"
                            >
                              <ChatBubbleLeftIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredDocuments.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Your documents will appear here once they are uploaded.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}