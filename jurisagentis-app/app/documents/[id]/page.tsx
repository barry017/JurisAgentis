/**
 * Document Detail View - Document preview and management
 * 
 * Provides document preview, metadata management, and action controls
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  DocumentTextIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  ShieldCheckIcon,
  TagIcon,
  UserIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentArrowUpIcon,
  LinkIcon,
  PrinterIcon,
  ChatBubbleLeftRightIcon
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

interface Comment {
  id: string
  author: string
  content: string
  created_at: string
  page?: number
}

interface Version {
  id: string
  version_number: number
  created_at: string
  created_by: string
  notes: string
  file_size: number
}

export default function DocumentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string
  
  // State
  const [document, setDocument] = useState<Document | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'comments' | 'versions' | 'activity'>('preview')
  const [previewMode, setPreviewMode] = useState<'document' | 'metadata'>('document')
  const [newComment, setNewComment] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    loadDocumentData()
  }, [documentId])

  const loadDocumentData = async () => {
    try {
      setLoading(true)
      
      // Load document from API
      const response = await fetch(`/api/documents?search=${documentId}`, {
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.documents && data.data.documents.length > 0) {
          const doc = data.data.documents.find((d: Document) => d.id === documentId) || data.data.documents[0]
          setDocument(doc)
        } else {
          // Mock document if not found
          setDocument({
            id: documentId,
            document_number: 'DOC-2025-001',
            title: 'Johnson Family Trust Agreement',
            description: 'Revocable living trust agreement for John and Mary Johnson including successor trustee provisions and distribution schedules.',
            document_type: 'contract',
            document_category: 'estate_planning',
            file_name: 'Johnson_Trust_Agreement_v2.pdf',
            file_path: '/documents/2025/01/Johnson_Trust_Agreement_v2.pdf',
            file_size: 2456789,
            file_type: 'application/pdf',
            file_extension: 'pdf',
            file_hash: 'sha256-a1b2c3d4e5f6789',
            client_id: 'client-1',
            matter_id: 'matter-1',
            status: 'review',
            document_date: '2025-01-15',
            execution_date: null,
            effective_date: '2025-01-20',
            expiration_date: null,
            confidentiality_level: 'client_confidential',
            priority: 'normal',
            tags: ['trust', 'estate_planning', 'review'],
            keywords: ['trust', 'revocable', 'living', 'estate', 'distribution'],
            page_count: 12,
            word_count: 3456,
            requires_review: true,
            client: {
              id: 'client-1',
              first_name: 'John',
              last_name: 'Johnson',
              business_name: null,
              client_type: 'individual'
            },
            matter: {
              id: 'matter-1',
              matter_number: '2025-001',
              title: 'Johnson Family Estate Planning',
              status: 'active'
            },
            created_at: '2025-01-15T10:30:00Z',
            updated_at: '2025-01-16T14:22:00Z'
          })
        }
      }

      // Mock comments
      setComments([
        {
          id: 'comment-1',
          author: 'Luke Barry',
          content: 'Please review the successor trustee language on page 3. The client wants to add an alternate trustee.',
          created_at: '2025-01-16T09:15:00Z',
          page: 3
        },
        {
          id: 'comment-2',
          author: 'Legal Assistant',
          content: 'Distribution percentages have been updated per client meeting notes.',
          created_at: '2025-01-16T11:30:00Z',
          page: 7
        }
      ])

      // Mock versions
      setVersions([
        {
          id: 'version-2',
          version_number: 2,
          created_at: '2025-01-16T14:22:00Z',
          created_by: 'Luke Barry',
          notes: 'Updated distribution language and added alternate trustee provision',
          file_size: 2456789
        },
        {
          id: 'version-1',
          version_number: 1,
          created_at: '2025-01-15T10:30:00Z',
          created_by: 'Luke Barry',
          notes: 'Initial draft based on client consultation',
          file_size: 2401234
        }
      ])
      
    } catch (error) {
      console.error('Error loading document data:', error)
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyles[status]}`}>
          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        {requiresReview && status !== 'final' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
            Review Required
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
      attorney_work_product: 'Attorney Work Product',
      privileged: 'Privileged'
    }
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${confidentialityStyles[level]}`}>
        <ShieldCheckIcon className="h-4 w-4 mr-1" />
        {confidentialityLabels[level]}
      </span>
    )
  }

  const handleDownload = () => {
    // In a real implementation, this would handle secure file download
    console.log('Downloading document:', document?.file_name)
    alert(`Download functionality would be implemented for: ${document?.file_name}`)
  }

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      author: 'Current User',
      content: newComment.trim(),
      created_at: new Date().toISOString()
    }

    setComments(prev => [comment, ...prev])
    setNewComment('')
  }

  const handleDeleteDocument = async () => {
    try {
      // In a real implementation, this would call the DELETE API
      console.log('Deleting document:', documentId)
      alert('Delete functionality would be implemented here')
      setShowDeleteModal(false)
      // router.push('/documents')
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Document not found</h3>
          <button
            onClick={() => router.push('/documents')}
            className="btn-primary"
          >
            Back to Documents
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header">
        <div className="content-container">
          <div className="section-header">
            <div className="flex items-center">
              <button
                onClick={() => router.back()}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="page-title">{document.document_number}</h1>
                  {getStatusBadge(document.status, document.requires_review)}
                  {getConfidentialityBadge(document.confidentiality_level)}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{document.title}</h2>
                <p className="page-subtitle">
                  {document.client && (
                    <>
                      {document.client.business_name || `${document.client.first_name} ${document.client.last_name}`}
                      {document.matter && ' • '}
                    </>
                  )}
                  {document.matter && (
                    <button
                      onClick={() => router.push(`/matters/${document.matter_id}`)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {document.matter.matter_number}: {document.matter.title}
                    </button>
                  )}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDownload}
                className="btn-secondary flex items-center"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Download
              </button>
              
              <button
                className="btn-secondary flex items-center"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                Print
              </button>
              
              <button
                className="btn-secondary flex items-center"
              >
                <ShareIcon className="h-5 w-5 mr-2" />
                Share
              </button>
              
              <button
                onClick={() => router.push(`/documents/${document.id}/edit`)}
                className="btn-primary flex items-center"
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Document Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">File Info</p>
                <p className="text-lg font-bold text-gray-900">{formatFileSize(document.file_size)}</p>
                <p className="text-xs text-gray-500">
                  {document.page_count && `${document.page_count} pages • `}
                  {document.file_extension.toUpperCase()}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-lg font-bold text-gray-900">{formatDate(document.created_at).split(',')[0]}</p>
                <p className="text-xs text-gray-500">Last modified {formatDate(document.updated_at).split(',')[0]}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Comments</p>
                <p className="text-lg font-bold text-gray-900">{comments.length}</p>
                <p className="text-xs text-gray-500">discussion threads</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <DocumentArrowUpIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Version</p>
                <p className="text-lg font-bold text-gray-900">v{versions[0]?.version_number || 1}</p>
                <p className="text-xs text-gray-500">{versions.length} versions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'preview', label: 'Preview', icon: EyeIcon },
                { key: 'details', label: 'Details', icon: DocumentTextIcon },
                { key: 'comments', label: `Comments (${comments.length})`, icon: ChatBubbleLeftRightIcon },
                { key: 'versions', label: `Versions (${versions.length})`, icon: DocumentArrowUpIcon },
                { key: 'activity', label: 'Activity', icon: ClockIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6">
            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Document Preview</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPreviewMode('document')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        previewMode === 'document'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Document
                    </button>
                    <button
                      onClick={() => setPreviewMode('metadata')}
                      className={`px-3 py-1 rounded-md text-sm font-medium ${
                        previewMode === 'metadata'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Metadata
                    </button>
                  </div>
                </div>

                {previewMode === 'document' && (
                  <div className="border border-gray-300 rounded-lg bg-white">
                    <div className="h-96 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <DocumentTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg font-medium">Document Preview</p>
                        <p className="text-sm">
                          {document.file_type === 'application/pdf' 
                            ? 'PDF preview would be displayed here'
                            : `${document.file_extension.toUpperCase()} preview would be displayed here`
                          }
                        </p>
                        <button
                          onClick={handleDownload}
                          className="btn-primary mt-4"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download to View
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {previewMode === 'metadata' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">File Name</dt>
                          <dd className="mt-1 text-sm text-gray-900">{document.file_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Document Type</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {document.document_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Category</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {document.document_category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Priority</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {document.priority.replace(/\b\w/g, l => l.toUpperCase())}
                          </dd>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">File Hash</dt>
                          <dd className="mt-1 text-xs text-gray-600 font-mono">{document.file_hash}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Word Count</dt>
                          <dd className="mt-1 text-sm text-gray-900">{document.word_count?.toLocaleString() || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Keywords</dt>
                          <dd className="mt-1">
                            {document.keywords?.map((keyword, index) => (
                              <span key={index} className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs text-gray-800 mr-1 mb-1">
                                {keyword}
                              </span>
                            )) || <span className="text-sm text-gray-500">None</span>}
                          </dd>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="mt-1 text-sm text-gray-900">{document.description || 'No description provided'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Document Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {document.document_date ? formatDate(document.document_date) : 'Not specified'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Effective Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {document.effective_date ? formatDate(document.effective_date) : 'Not specified'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tags</dt>
                        <dd className="mt-1">
                          {document.tags?.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-1">
                              <TagIcon className="h-3 w-3 mr-1" />
                              {tag}
                            </span>
                          )) || <span className="text-sm text-gray-500">No tags</span>}
                        </dd>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Client</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {document.client ? (
                            <button
                              onClick={() => router.push(`/clients/${document.client_id}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {document.client.business_name || `${document.client.first_name} ${document.client.last_name}`}
                            </button>
                          ) : 'Not linked to client'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Matter</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {document.matter ? (
                            <button
                              onClick={() => router.push(`/matters/${document.matter_id}`)}
                              className="text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {document.matter.matter_number}: {document.matter.title}
                            </button>
                          ) : 'Not linked to matter'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created By</dt>
                        <dd className="mt-1 text-sm text-gray-900">Luke Barry</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Modified</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(document.updated_at)}</dd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Comments & Discussion</h3>
                  
                  {/* Add Comment */}
                  <div className="mb-6 p-4 border border-gray-200 rounded-lg">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment about this document..."
                      rows={3}
                      className="input-field mb-3"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Comment
                    </button>
                  </div>
                  
                  {/* Comments List */}
                  <div className="space-y-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                            <span className="font-medium text-gray-900">{comment.author}</span>
                            {comment.page && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                Page {comment.page}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{formatDate(comment.created_at)}</span>
                        </div>
                        <p className="text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                    
                    {comments.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No comments yet. Start the discussion!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Versions Tab */}
            {activeTab === 'versions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Version History</h3>
                  <button className="btn-secondary">
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload New Version
                  </button>
                </div>
                
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div key={version.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-gray-900">Version {version.version_number}</span>
                            <span className="text-sm text-gray-500">by {version.created_by}</span>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm text-gray-500">{formatDate(version.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{version.notes}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(version.file_size)}</p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Download
                          </button>
                          <button className="text-blue-600 hover:text-blue-800 text-sm">
                            Compare
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Activity Timeline</h3>
                
                <div className="flow-root">
                  <ul className="-mb-8">
                    <li>
                      <div className="relative pb-8">
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                        <div className="relative flex space-x-3">
                          <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                            <DocumentArrowUpIcon className="h-5 w-5 text-white" />
                          </span>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">Luke Barry</span> updated the document
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(document.updated_at)}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                    
                    <li>
                      <div className="relative">
                        <div className="relative flex space-x-3">
                          <span className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                            <DocumentTextIcon className="h-5 w-5 text-white" />
                          </span>
                          <div className="min-w-0 flex-1 pt-1.5">
                            <p className="text-sm text-gray-500">
                              <span className="font-medium text-gray-900">Luke Barry</span> created the document
                            </p>
                            <p className="text-xs text-gray-500">{formatDate(document.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card border-red-200 bg-red-50">
          <h3 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-800">Delete this document permanently</p>
              <p className="text-xs text-red-600">This action cannot be undone and will remove all versions and comments.</p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="btn-secondary border-red-300 text-red-700 hover:bg-red-50"
            >
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete Document
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
            </div>
            
            <div className="modal-content">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-900 mb-2">
                    Are you sure you want to delete "{document.title}"?
                  </p>
                  <p className="text-sm text-gray-600">
                    This will permanently delete the document, all versions, comments, and cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDocument}
                className="btn-primary bg-red-600 hover:bg-red-700"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}