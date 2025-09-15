/**
 * Document Edit Page - Edit document metadata and properties
 * 
 * Allows editing of document metadata, tags, relationships, and status
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  DocumentTextIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TagIcon,
  LinkIcon,
  CalendarIcon,
  ShieldCheckIcon,
  DocumentArrowUpIcon
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

export default function DocumentEditPage() {
  const router = useRouter()
  const params = useParams()
  const documentId = params.id as string
  
  // State
  const [document, setDocument] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [keywordInput, setKeywordInput] = useState('')
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    document_type: 'document',
    document_category: 'general',
    status: 'draft',
    document_date: '',
    execution_date: '',
    effective_date: '',
    expiration_date: '',
    confidentiality_level: 'client_confidential',
    priority: 'normal',
    client_id: '',
    matter_id: '',
    tags: [] as string[],
    keywords: [] as string[],
    requires_review: false
  })

  useEffect(() => {
    loadDocument()
  }, [documentId])

  const loadDocument = async () => {
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
          initializeFormData(doc)
        } else {
          // Mock document if not found
          const mockDoc: Document = {
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
            execution_date: '',
            effective_date: '2025-01-20',
            expiration_date: '',
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
          }
          setDocument(mockDoc)
          initializeFormData(mockDoc)
        }
      }
      
    } catch (error) {
      console.error('Error loading document:', error)
    } finally {
      setLoading(false)
    }
  }

  const initializeFormData = (doc: Document) => {
    setFormData({
      title: doc.title,
      description: doc.description || '',
      document_type: doc.document_type,
      document_category: doc.document_category,
      status: doc.status,
      document_date: doc.document_date || '',
      execution_date: doc.execution_date || '',
      effective_date: doc.effective_date || '',
      expiration_date: doc.expiration_date || '',
      confidentiality_level: doc.confidentiality_level,
      priority: doc.priority,
      client_id: doc.client_id || '',
      matter_id: doc.matter_id || '',
      tags: doc.tags || [],
      keywords: doc.keywords || [],
      requires_review: doc.requires_review
    })
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      handleInputChange('tags', [...formData.tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      handleInputChange('keywords', [...formData.keywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }

  const removeKeyword = (keywordToRemove: string) => {
    handleInputChange('keywords', formData.keywords.filter(keyword => keyword !== keywordToRemove))
  }

  const handleSave = async () => {
    if (!document) return

    try {
      setSaving(true)
      
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        document_type: formData.document_type,
        document_category: formData.document_category,
        status: formData.status,
        document_date: formData.document_date || null,
        execution_date: formData.execution_date || null,
        effective_date: formData.effective_date || null,
        expiration_date: formData.expiration_date || null,
        confidentiality_level: formData.confidentiality_level,
        priority: formData.priority,
        client_id: formData.client_id || null,
        matter_id: formData.matter_id || null,
        tags: formData.tags,
        keywords: formData.keywords,
        requires_review: formData.requires_review
      }

      // In a real implementation, this would call the update API
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      // For now, simulate success since we don't have the PATCH endpoint yet
      console.log('Document update data:', updateData)
      
      setHasChanges(false)
      router.push(`/documents/${documentId}`)
      
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Error saving document. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges) {
      setShowUnsavedChangesModal(true)
    } else {
      router.back()
    }
  }

  const confirmCancel = () => {
    setShowUnsavedChangesModal(false)
    router.back()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
                onClick={handleCancel}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div>
                <h1 className="page-title flex items-center">
                  <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Edit Document
                  {hasChanges && (
                    <span className="ml-3 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      Unsaved Changes
                    </span>
                  )}
                </h1>
                <p className="page-subtitle">
                  {document.document_number} • {document.file_name}
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="btn-secondary flex items-center"
              >
                <XMarkIcon className="h-5 w-5 mr-2" />
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`btn-primary flex items-center ${
                  !hasChanges || saving ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <CheckIcon className="h-5 w-5 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Document Info */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">File Information</h3>
              <p className="text-sm text-blue-800">
                {document.file_name} • {document.file_size.toLocaleString()} bytes • 
                Created {formatDate(document.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basic Information */}
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter document title"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="form-label">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description of the document"
                  rows={4}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Document Type</label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => handleInputChange('document_type', e.target.value)}
                    className="input-field"
                  >
                    <option value="document">Document</option>
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
                    value={formData.document_category}
                    onChange={(e) => handleInputChange('document_category', e.target.value)}
                    className="input-field"
                  >
                    <option value="general">General</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="litigation">Litigation</option>
                    <option value="contract_review">Contract Review</option>
                    <option value="estate_administration">Estate Administration</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="input-field"
                  >
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="final">Final</option>
                    <option value="archived">Archived</option>
                    <option value="in_progress">In Progress</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="input-field"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label">Confidentiality Level</label>
                <select
                  value={formData.confidentiality_level}
                  onChange={(e) => handleInputChange('confidentiality_level', e.target.value)}
                  className="input-field"
                >
                  <option value="public">Public</option>
                  <option value="internal">Internal</option>
                  <option value="client_confidential">Client Confidential</option>
                  <option value="attorney_work_product">Attorney Work Product</option>
                  <option value="privileged">Privileged</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requires_review"
                  checked={formData.requires_review}
                  onChange={(e) => handleInputChange('requires_review', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="requires_review" className="text-sm text-gray-700">
                  Requires review before finalization
                </label>
              </div>
            </div>
          </div>

          {/* Dates and Relationships */}
          <div className="space-y-6">
            {/* Important Dates */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                Important Dates
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Document Date</label>
                  <input
                    type="date"
                    value={formData.document_date}
                    onChange={(e) => handleInputChange('document_date', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Execution Date</label>
                  <input
                    type="date"
                    value={formData.execution_date}
                    onChange={(e) => handleInputChange('execution_date', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Effective Date</label>
                  <input
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => handleInputChange('effective_date', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="form-label">Expiration Date</label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => handleInputChange('expiration_date', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>
            </div>

            {/* Relationships */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                Relationships
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Client ID</label>
                  <input
                    type="text"
                    value={formData.client_id}
                    onChange={(e) => handleInputChange('client_id', e.target.value)}
                    placeholder="Optional client ID"
                    className="input-field"
                  />
                  {document.client && (
                    <p className="text-sm text-gray-500 mt-1">
                      Current: {document.client.business_name || `${document.client.first_name} ${document.client.last_name}`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">Matter ID</label>
                  <input
                    type="text"
                    value={formData.matter_id}
                    onChange={(e) => handleInputChange('matter_id', e.target.value)}
                    placeholder="Optional matter ID"
                    className="input-field"
                  />
                  {document.matter && (
                    <p className="text-sm text-gray-500 mt-1">
                      Current: {document.matter.matter_number} - {document.matter.title}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Tags and Keywords */}
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
                <TagIcon className="h-5 w-5 mr-2 text-blue-600" />
                Tags & Keywords
              </h3>
              
              <div className="space-y-6">
                {/* Tags */}
                <div>
                  <label className="form-label">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 hover:text-blue-600"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add tag and press Enter"
                      className="input-field rounded-r-none"
                    />
                    <button
                      onClick={addTag}
                      className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="form-label">Keywords</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                      >
                        {keyword}
                        <button
                          onClick={() => removeKeyword(keyword)}
                          className="ml-2 hover:text-green-600"
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                      placeholder="Add keyword and press Enter"
                      className="input-field rounded-r-none"
                    />
                    <button
                      onClick={addKeyword}
                      className="px-4 py-2 bg-green-600 text-white rounded-r-md hover:bg-green-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      {showUnsavedChangesModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-medium text-gray-900">Unsaved Changes</h3>
            </div>
            
            <div className="modal-content">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mt-1 mr-3" />
                <div>
                  <p className="text-sm text-gray-900 mb-2">
                    You have unsaved changes that will be lost if you leave this page.
                  </p>
                  <p className="text-sm text-gray-600">
                    Are you sure you want to continue without saving?
                  </p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowUnsavedChangesModal(false)}
                className="btn-secondary"
              >
                Stay and Save
              </button>
              <button
                onClick={confirmCancel}
                className="btn-primary bg-orange-600 hover:bg-orange-700"
              >
                Leave Without Saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}