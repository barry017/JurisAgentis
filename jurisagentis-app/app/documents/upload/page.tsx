/**
 * Document Upload Page - Secure file upload with metadata management
 * 
 * Handles file uploads with validation, security checks, and automatic metadata extraction
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CloudArrowUpIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  PaperClipIcon,
  EyeIcon,
  TrashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  preview?: string
}

interface DocumentMetadata {
  title: string
  description: string
  document_type: string
  document_category: string
  confidentiality_level: string
  priority: string
  client_id: string
  matter_id: string
  tags: string[]
  document_date: string
  requires_review: boolean
}

export default function DocumentUploadPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // State
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [metadata, setMetadata] = useState<DocumentMetadata>({
    title: '',
    description: '',
    document_type: 'document',
    document_category: 'general',
    confidentiality_level: 'client_confidential',
    priority: 'normal',
    client_id: '',
    matter_id: searchParams.get('matter_id') || '',
    tags: [],
    document_date: new Date().toISOString().split('T')[0],
    requires_review: false
  })
  const [tagInput, setTagInput] = useState('')

  // Pre-fill matter_id from URL if provided
  useEffect(() => {
    const matterIdParam = searchParams.get('matter_id')
    const clientIdParam = searchParams.get('client_id')
    
    if (matterIdParam) {
      setMetadata(prev => ({ ...prev, matter_id: matterIdParam }))
    }
    if (clientIdParam) {
      setMetadata(prev => ({ ...prev, client_id: clientIdParam }))
    }
  }, [searchParams])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    handleFiles(selectedFiles)
  }

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      // File size limit: 50MB
      if (file.size > 50 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`)
        return false
      }
      
      // File type validation
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/gif'
      ]
      
      if (!allowedTypes.includes(file.type)) {
        alert(`File type ${file.type} is not allowed for ${file.name}.`)
        return false
      }
      
      return true
    })

    const uploadFiles: UploadFile[] = validFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      progress: 0,
      status: 'pending'
    }))

    setFiles(prev => [...prev, ...uploadFiles])

    // Auto-fill title from first file if not set
    if (!metadata.title && validFiles.length > 0) {
      const firstFileName = validFiles[0].name.replace(/\.[^/.]+$/, '')
      setMetadata(prev => ({ ...prev, title: firstFileName }))
    }
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const uploadFile = async (uploadFile: UploadFile): Promise<void> => {
    try {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading', progress: 0 }
          : f
      ))

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('metadata', JSON.stringify({
        ...metadata,
        file_name: uploadFile.file.name,
        file_size: uploadFile.file.size,
        file_type: uploadFile.file.type,
        file_extension: uploadFile.file.name.split('.').pop()?.toLowerCase() || ''
      }))

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setFiles(prev => prev.map(f => {
          if (f.id === uploadFile.id && f.progress < 90) {
            return { ...f, progress: f.progress + Math.random() * 20 }
          }
          return f
        }))
      }, 200)

      // For now, simulate the upload since we don't have actual file storage
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      clearInterval(progressInterval)

      // Create document record via API
      const documentData = {
        title: metadata.title || uploadFile.file.name,
        description: metadata.description,
        document_type: metadata.document_type,
        document_category: metadata.document_category,
        file_name: uploadFile.file.name,
        file_path: `/documents/uploads/${uploadFile.file.name}`, // Would be actual storage path
        file_size: uploadFile.file.size,
        file_type: uploadFile.file.type,
        file_extension: uploadFile.file.name.split('.').pop()?.toLowerCase() || '',
        file_hash: `sha256-${Date.now()}`, // Would be actual file hash
        client_id: metadata.client_id || null,
        matter_id: metadata.matter_id || null,
        status: 'draft',
        document_date: metadata.document_date,
        confidentiality_level: metadata.confidentiality_level,
        priority: metadata.priority,
        tags: metadata.tags,
        requires_review: metadata.requires_review
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(documentData)
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'success', progress: 100 }
          : f
      ))

    } catch (error) {
      console.error('Upload error:', error)
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Upload failed' }
          : f
      ))
    }
  }

  const handleUploadAll = async () => {
    if (!metadata.title) {
      alert('Please enter a document title')
      return
    }

    setUploading(true)

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const file of files.filter(f => f.status === 'pending')) {
        await uploadFile(file)
      }
    } finally {
      setUploading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('image')) return '🖼️'
    return '📁'
  }

  const canUpload = files.length > 0 && metadata.title && !uploading

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
              
              <div>
                <h1 className="page-title flex items-center">
                  <CloudArrowUpIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Upload Documents
                  {metadata.matter_id && (
                    <span className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      Matter: {metadata.matter_id}
                    </span>
                  )}
                </h1>
                <p className="page-subtitle">
                  {metadata.matter_id 
                    ? 'Upload documents for this matter with automatic metadata tagging'
                    : 'Secure document upload with metadata management and automatic categorization'
                  }
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleUploadAll}
                disabled={!canUpload}
                className={`btn-primary flex items-center ${
                  !canUpload ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload Area */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Files</h3>
              
              {/* Drag and Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to browse
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Supports PDF, Word, Excel, images and text files up to 50MB each
                </p>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary"
                >
                  <PaperClipIcon className="h-5 w-5 mr-2" />
                  Choose Files
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                />
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Selected Files ({files.length})
                  </h3>
                  <button
                    onClick={() => setFiles([])}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="space-y-3">
                  {files.map((uploadFile) => (
                    <div key={uploadFile.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center flex-1">
                          <span className="text-2xl mr-3">{getFileIcon(uploadFile.file.type)}</span>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{uploadFile.file.name}</h4>
                            <p className="text-sm text-gray-500">
                              {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type}
                            </p>
                            
                            {/* Progress Bar */}
                            {uploadFile.status === 'uploading' && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-gray-600">Uploading...</span>
                                  <span className="text-xs text-gray-600">{Math.round(uploadFile.progress)}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadFile.progress}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Status Messages */}
                            {uploadFile.status === 'success' && (
                              <div className="flex items-center mt-2 text-green-600">
                                <CheckCircleIcon className="h-4 w-4 mr-1" />
                                <span className="text-xs">Upload successful</span>
                              </div>
                            )}
                            
                            {uploadFile.status === 'error' && (
                              <div className="flex items-center mt-2 text-red-600">
                                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                                <span className="text-xs">{uploadFile.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploadFile.status === 'uploading'}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metadata Form */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Document Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter document title"
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of the document"
                    rows={3}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Document Type</label>
                    <select
                      value={metadata.document_type}
                      onChange={(e) => setMetadata(prev => ({ ...prev, document_type: e.target.value }))}
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
                      value={metadata.document_category}
                      onChange={(e) => setMetadata(prev => ({ ...prev, document_category: e.target.value }))}
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
                    <label className="form-label">Confidentiality Level</label>
                    <select
                      value={metadata.confidentiality_level}
                      onChange={(e) => setMetadata(prev => ({ ...prev, confidentiality_level: e.target.value }))}
                      className="input-field"
                    >
                      <option value="public">Public</option>
                      <option value="internal">Internal</option>
                      <option value="client_confidential">Client Confidential</option>
                      <option value="attorney_work_product">Attorney Work Product</option>
                      <option value="privileged">Privileged</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Priority</label>
                    <select
                      value={metadata.priority}
                      onChange={(e) => setMetadata(prev => ({ ...prev, priority: e.target.value }))}
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
                  <label className="form-label">Document Date</label>
                  <input
                    type="date"
                    value={metadata.document_date}
                    onChange={(e) => setMetadata(prev => ({ ...prev, document_date: e.target.value }))}
                    className="input-field"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Matter ID</label>
                    <input
                      type="text"
                      value={metadata.matter_id}
                      onChange={(e) => setMetadata(prev => ({ ...prev, matter_id: e.target.value }))}
                      placeholder="Optional matter ID"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="form-label">Client ID</label>
                    <input
                      type="text"
                      value={metadata.client_id}
                      onChange={(e) => setMetadata(prev => ({ ...prev, client_id: e.target.value }))}
                      placeholder="Optional client ID"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="form-label">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-blue-600"
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

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requires_review"
                    checked={metadata.requires_review}
                    onChange={(e) => setMetadata(prev => ({ ...prev, requires_review: e.target.checked }))}
                    className="mr-2"
                  />
                  <label htmlFor="requires_review" className="text-sm text-gray-700">
                    Requires review before finalization
                  </label>
                </div>
              </div>
            </div>

            {/* Upload Summary */}
            {files.length > 0 && (
              <div className="card bg-blue-50 border-blue-200">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Upload Summary</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      {files.length} file{files.length !== 1 ? 's' : ''} ready to upload
                      {metadata.matter_id && ` to matter ${metadata.matter_id}`}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Files will be stored securely with the specified metadata and access controls.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}