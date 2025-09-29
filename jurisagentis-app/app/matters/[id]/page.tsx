/**
 * Matter Detail View - Comprehensive matter management with timeline, documents, and tasks
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  FolderOpenIcon,
  ArrowLeftIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PlusIcon,
  ChevronRightIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

interface Matter {
  id: string
  matter_number: string
  title: string
  description?: string
  client: {
    id: string
    name: string
    email: string
    phone?: string
  }
  service_type: 'estate_planning' | 'business_formation' | 'real_estate' | 'litigation' | 'contract_review' | 'other'
  matter_type: 'flat_fee' | 'hourly' | 'contingency' | 'retainer'
  status: 'intake' | 'active' | 'funding' | 'closed' | 'on_hold' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_attorney: {
    id: string
    name: string
  }
  created_date: string
  opened_date?: string
  closed_date?: string
  target_completion?: string
  estimated_fee: number
  actual_fee?: number
  retainer_required: boolean
  retainer_amount?: number
  retainer_paid: boolean
  next_action?: {
    description: string
    due_date: string
    assigned_to: string
  }
  stage_history: {
    id: string
    from_status: string
    to_status: string
    changed_by: string
    changed_date: string
    notes?: string
  }[]
  documents_count: number
  tasks_count: number
  tasks_completed: number
  billing_status: 'not_billed' | 'partially_billed' | 'fully_billed' | 'collection'
}

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

interface Task {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to: string
  due_date?: string
  completed_date?: string
  estimated_hours?: number
  actual_hours?: number
}

interface TimeEntry {
  id: string
  date: string
  description: string
  hours: number
  rate: number
  attorney: string
  billable: boolean
  billed: boolean
}

interface BillingEntry {
  id: string
  date: string
  description: string
  amount: number
  type: 'fee' | 'expense' | 'payment' | 'adjustment'
  invoice_id?: string
}

export default function MatterDetailPage() {
  const router = useRouter()
  const params = useParams()
  const matterId = params.id as string
  
  // State
  const [matter, setMatter] = useState<Matter | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [billingEntries, setBillingEntries] = useState<BillingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'billing' | 'timeline'>('overview')
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState<Matter['status']>('active')
  const [statusNotes, setStatusNotes] = useState('')

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents?matter_id=${matterId}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data.documents) {
          setDocuments(data.data.documents)
        }
      }
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }, [matterId])

  const loadMatterData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load documents from API
      await loadDocuments()
      
      // Mock data - replace with actual API calls
      const mockMatter: Matter = {
        id: matterId,
        matter_number: '2025-001',
        title: 'Johnson Family Estate Planning',
        description: 'Complete estate planning package including revocable living trust, pour-over will, powers of attorney, and healthcare directives. Client has complex financial situation with multiple properties and business interests.',
        client: {
          id: '1',
          name: 'John & Mary Johnson',
          email: 'mary.johnson@email.com',
          phone: '(555) 123-4567'
        },
        service_type: 'estate_planning',
        matter_type: 'flat_fee',
        status: 'funding',
        priority: 'normal',
        assigned_attorney: {
          id: '1',
          name: 'Luke Barry'
        },
        created_date: '2025-01-10',
        opened_date: '2025-01-12',
        target_completion: '2025-02-15',
        estimated_fee: 2500.00,
        retainer_required: true,
        retainer_amount: 1250.00,
        retainer_paid: true,
        next_action: {
          description: 'Review and finalize trust documents',
          due_date: '2025-01-20',
          assigned_to: 'Luke Barry'
        },
        stage_history: [
          {
            id: '1',
            from_status: 'intake',
            to_status: 'active',
            changed_by: 'Luke Barry',
            changed_date: '2025-01-12',
            notes: 'Initial consultation completed, retainer received'
          },
          {
            id: '2',
            from_status: 'active',
            to_status: 'funding',
            changed_by: 'Luke Barry',
            changed_date: '2025-01-15',
            notes: 'Trust documents drafted, awaiting client review and funding'
          }
        ],
        documents_count: 8,
        tasks_count: 12,
        tasks_completed: 8,
        billing_status: 'partially_billed'
      }

      // Documents are loaded from API separately

      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Initial client consultation',
          description: 'Meet with clients to understand estate planning goals',
          status: 'completed',
          priority: 'high',
          assigned_to: 'Luke Barry',
          due_date: '2025-01-12',
          completed_date: '2025-01-12',
          estimated_hours: 2,
          actual_hours: 2.5
        },
        {
          id: '2',
          title: 'Draft trust documents',
          description: 'Prepare revocable living trust and related documents',
          status: 'completed',
          priority: 'high',
          assigned_to: 'Luke Barry',
          due_date: '2025-01-15',
          completed_date: '2025-01-15',
          estimated_hours: 4,
          actual_hours: 4.5
        },
        {
          id: '3',
          title: 'Review trust documents with client',
          description: 'Schedule and conduct review meeting',
          status: 'in_progress',
          priority: 'normal',
          assigned_to: 'Luke Barry',
          due_date: '2025-01-20',
          estimated_hours: 1.5
        },
        {
          id: '4',
          title: 'Prepare trust funding documents',
          description: 'Draft deeds and financial account transfers',
          status: 'pending',
          priority: 'normal',
          assigned_to: 'Luke Barry',
          due_date: '2025-01-25',
          estimated_hours: 3
        }
      ]

      const mockTimeEntries: TimeEntry[] = [
        {
          id: '1',
          date: '2025-01-12',
          description: 'Initial consultation with clients',
          hours: 2.5,
          rate: 350,
          attorney: 'Luke Barry',
          billable: true,
          billed: false
        },
        {
          id: '2',
          date: '2025-01-14',
          description: 'Research complex trust structures',
          hours: 1.0,
          rate: 350,
          attorney: 'Luke Barry',
          billable: true,
          billed: false
        },
        {
          id: '3',
          date: '2025-01-15',
          description: 'Draft trust documents and pour-over will',
          hours: 4.5,
          rate: 350,
          attorney: 'Luke Barry',
          billable: true,
          billed: false
        }
      ]

      const mockBillingEntries: BillingEntry[] = [
        {
          id: '1',
          date: '2025-01-12',
          description: 'Retainer payment received',
          amount: 1250.00,
          type: 'payment'
        },
        {
          id: '2',
          date: '2025-01-10',
          description: 'Estate planning flat fee',
          amount: 2500.00,
          type: 'fee'
        }
      ]

      setMatter(mockMatter)
      setTasks(mockTasks)
      setTimeEntries(mockTimeEntries)
      setBillingEntries(mockBillingEntries)
      
    } catch (error) {
      console.error('Error loading matter data:', error)
    } finally {
      setLoading(false)
    }
  }, [loadDocuments, matterId])

  useEffect(() => {
    loadMatterData()
  }, [matterId, loadMatterData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: Matter['status'], priority: Matter['priority']) => {
    const statusStyles = {
      intake: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-blue-100 text-blue-800 border-blue-200',
      funding: 'bg-orange-100 text-orange-800 border-orange-200',
      closed: 'bg-green-100 text-green-800 border-green-200',
      on_hold: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    }

    const priorityIcons = {
      urgent: '🔴',
      high: '🟡',
      normal: '',
      low: '🟢'
    }
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyles[status]}`}>
        {priorityIcons[priority] && (
          <span className="mr-1">{priorityIcons[priority]}</span>
        )}
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const getProgressPercentage = (tasksCompleted: number, tasksTotal: number) => {
    if (tasksTotal === 0) return 0
    return Math.round((tasksCompleted / tasksTotal) * 100)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('image')) return '🖼️'
    return '📁'
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
        {confidentialityLabels[level]}
      </span>
    )
  }

  const handleStatusChange = async () => {
    if (!matter) return
    
    try {
      // Add to stage history
      const newStageEntry = {
        id: Date.now().toString(),
        from_status: matter.status,
        to_status: newStatus,
        changed_by: 'Luke Barry',
        changed_date: new Date().toISOString().split('T')[0],
        notes: statusNotes
      }

      setMatter({
        ...matter,
        status: newStatus,
        stage_history: [...matter.stage_history, newStageEntry]
      })

      setShowStatusModal(false)
      setStatusNotes('')
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="loading-spinner h-8 w-8"></div>
      </div>
    )
  }

  if (!matter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FolderOpenIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Matter not found</h3>
          <button
            onClick={() => router.push('/matters')}
            className="btn-primary"
          >
            Back to Matters
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
                onClick={() => router.push('/matters')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="page-title">{matter.matter_number}</h1>
                  {getStatusBadge(matter.status, matter.priority)}
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{matter.title}</h2>
                <p className="page-subtitle">{matter.client.name} • {matter.assigned_attorney.name}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowStatusModal(true)}
                className="btn-secondary flex items-center"
              >
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Update Status
              </button>
              
              <button
                onClick={() => router.push(`/matters/${matter.id}/edit`)}
                className="btn-primary flex items-center"
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" />
                Edit Matter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Estimated Fee</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(matter.estimated_fee)}</p>
                <p className="text-xs text-gray-500">{matter.matter_type.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Progress</p>
                <p className="text-2xl font-bold text-gray-900">{getProgressPercentage(matter.tasks_completed, matter.tasks_count)}%</p>
                <p className="text-xs text-gray-500">{matter.tasks_completed}/{matter.tasks_count} tasks</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Documents</p>
                <p className="text-2xl font-bold text-gray-900">{matter.documents_count}</p>
                <p className="text-xs text-gray-500">files uploaded</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Target Date</p>
                <p className="text-lg font-bold text-gray-900">
                  {matter.target_completion ? formatDate(matter.target_completion) : 'Not set'}
                </p>
                <p className="text-xs text-gray-500">
                  {matter.next_action ? `Next: ${matter.next_action.description}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="card mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: 'Overview', icon: FolderOpenIcon },
                { key: 'documents', label: 'Documents', icon: DocumentTextIcon },
                { key: 'tasks', label: 'Tasks', icon: CheckCircleIcon },
                { key: 'billing', label: 'Billing', icon: CurrencyDollarIcon },
                { key: 'timeline', label: 'Timeline', icon: ClockIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'details' | 'documents' | 'tasks' | 'billing' | 'timeline')}
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
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Matter Details */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Matter Details</h3>
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Description</dt>
                        <dd className="mt-1 text-sm text-gray-900">{matter.description}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Service Type</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {matter.service_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                        <dd className="mt-1 text-sm text-gray-900">{formatDate(matter.created_date)}</dd>
                      </div>
                      {matter.opened_date && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Opened Date</dt>
                          <dd className="mt-1 text-sm text-gray-900">{formatDate(matter.opened_date)}</dd>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Client Information */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Client Information</h3>
                    <div className="space-y-3">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Name</dt>
                        <dd className="mt-1 text-sm text-gray-900">{matter.client.name}</dd>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <a href={`mailto:${matter.client.email}`} className="text-blue-600 hover:text-blue-800">
                              {matter.client.email}
                            </a>
                          </dd>
                        </div>
                      </div>
                      {matter.client.phone && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Phone</dt>
                          <dd className="mt-1 text-sm text-gray-900 flex items-center">
                            <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                            <a href={`tel:${matter.client.phone}`} className="text-blue-600 hover:text-blue-800">
                              {matter.client.phone}
                            </a>
                          </dd>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Retainer Status */}
                {matter.retainer_required && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Retainer Status</h4>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(matter.retainer_amount || 0)} retainer required
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        matter.retainer_paid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {matter.retainer_paid ? 'Paid' : 'Outstanding'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Next Action */}
                {matter.next_action && (
                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                    <div className="flex items-start">
                      <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                      <div>
                        <h4 className="text-lg font-medium text-orange-900">Next Action Required</h4>
                        <p className="text-sm text-orange-800 mt-1">{matter.next_action.description}</p>
                        <p className="text-xs text-orange-600 mt-2">
                          Due: {formatDate(matter.next_action.due_date)} • Assigned to: {matter.next_action.assigned_to}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Documents ({documents.length})</h3>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => router.push(`/documents/upload?matter_id=${matterId}`)}
                      className="btn-primary flex items-center"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Upload Document
                    </button>
                    <button 
                      onClick={() => router.push(`/documents?matter_id=${matterId}`)}
                      className="btn-secondary flex items-center"
                    >
                      <EyeIcon className="h-5 w-5 mr-2" />
                      View All
                    </button>
                  </div>
                </div>
                
                {documents.length === 0 ? (
                  <div className="text-center py-8 border border-gray-200 rounded-lg">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No documents found for this matter</p>
                    <p className="text-gray-500 mb-4">Upload documents or link existing ones to this matter</p>
                    <div className="flex justify-center space-x-3">
                      <button 
                        onClick={() => router.push(`/documents/upload?matter_id=${matterId}`)}
                        className="btn-primary"
                      >
                        Upload New Document
                      </button>
                      <button 
                        onClick={() => router.push(`/documents?matter_id=${matterId}`)}
                        className="btn-secondary"
                      >
                        View All Documents
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">{documents.length} documents</p>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => router.push(`/documents/upload?matter_id=${matterId}`)}
                          className="btn-secondary text-sm"
                        >
                          Upload New
                        </button>
                        <button 
                          onClick={() => router.push(`/documents?matter_id=${matterId}`)}
                          className="btn-secondary text-sm"
                        >
                          View All
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {documents.map((doc) => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <span className="text-xl mr-2">{getFileTypeIcon(doc.file_type)}</span>
                                <div>
                                  <h4 className="font-medium text-gray-900 text-sm">{doc.title}</h4>
                                  <p className="text-xs text-gray-500">{doc.document_number}</p>
                                </div>
                              </div>
                              
                              <p className="text-xs text-gray-600 mb-2 truncate">
                                {doc.description || 'No description'}
                              </p>
                              
                              <div className="space-y-1">
                                <p className="text-xs text-gray-500">
                                  {doc.document_type} • {doc.document_category}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatFileSize(doc.file_size)}
                                  {doc.page_count && ` • ${doc.page_count} pages`}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-3">
                            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                              doc.status === 'final' ? 'bg-green-100 text-green-800' :
                              doc.status === 'review' ? 'bg-yellow-100 text-yellow-800' :
                              doc.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                              doc.status === 'archived' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {doc.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              {doc.requires_review && doc.status !== 'final' && ' • Review Required'}
                            </div>
                            
                            {getConfidentialityBadge(doc.confidentiality_level)}
                          </div>
                          
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {doc.tags.slice(0, 2).map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                                  #{tag}
                                </span>
                              ))}
                              {doc.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{doc.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                            <span className="text-xs text-gray-500">
                              {formatDate(doc.created_at)}
                            </span>
                            <div className="flex space-x-1">
                              <button 
                                onClick={() => router.push(`/documents/${doc.id}`)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View Document"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button 
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Download Document"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => router.push(`/documents/${doc.id}/edit`)}
                                className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                title="Edit Document"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Tasks ({tasks.filter(t => t.status === 'completed').length}/{tasks.length} completed)
                  </h3>
                  <button className="btn-primary flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Task
                  </button>
                </div>
                
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-1 h-4 w-4 rounded-full flex items-center justify-center ${
                            task.status === 'completed' ? 'bg-green-100' :
                            task.status === 'in_progress' ? 'bg-blue-100' :
                            task.status === 'cancelled' ? 'bg-red-100' :
                            'bg-gray-100'
                          }`}>
                            {task.status === 'completed' && (
                              <CheckCircleIcon className="h-3 w-3 text-green-600" />
                            )}
                            {task.status === 'cancelled' && (
                              <XCircleIcon className="h-3 w-3 text-red-600" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h4 className={`font-medium ${
                              task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>Assigned to: {task.assigned_to}</span>
                              {task.due_date && <span>Due: {formatDate(task.due_date)}</span>}
                              {task.estimated_hours && <span>Est: {task.estimated_hours}h</span>}
                              {task.actual_hours && <span>Actual: {task.actual_hours}h</span>}
                            </div>
                          </div>
                        </div>
                        
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                          task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          task.priority === 'normal' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.priority}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Time Entries */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Time Entries</h3>
                    <div className="space-y-3">
                      {timeEntries.map((entry) => (
                        <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">{entry.description}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatDate(entry.date)} • {entry.attorney}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">
                                {entry.hours}h × {formatCurrency(entry.rate)}
                              </p>
                              <p className="text-sm font-bold text-gray-900">
                                {formatCurrency(entry.hours * entry.rate)}
                              </p>
                              <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                                entry.billed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {entry.billed ? 'Billed' : 'Unbilled'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billing Summary */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Summary</h3>
                    <div className="space-y-3">
                      {billingEntries.map((entry) => (
                        <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-gray-900">{entry.description}</p>
                              <p className="text-sm text-gray-600">{formatDate(entry.date)}</p>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${
                                entry.type === 'payment' ? 'text-green-600' : 
                                entry.type === 'fee' ? 'text-blue-600' :
                                'text-gray-900'
                              }`}>
                                {entry.type === 'payment' ? '+' : ''}{formatCurrency(entry.amount)}
                              </p>
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                entry.type === 'payment' ? 'bg-green-100 text-green-800' :
                                entry.type === 'fee' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Matter Timeline</h3>
                <div className="flow-root">
                  <ul className="-mb-8">
                    {matter.stage_history.map((stage, stageIdx) => (
                      <li key={stage.id}>
                        <div className="relative pb-8">
                          {stageIdx !== matter.stage_history.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                <ChevronRightIcon className="h-5 w-5 text-white" aria-hidden="true" />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">
                                  Status changed from{' '}
                                  <span className="font-medium text-gray-900">
                                    {stage.from_status.replace('_', ' ')}
                                  </span>{' '}
                                  to{' '}
                                  <span className="font-medium text-gray-900">
                                    {stage.to_status.replace('_', ' ')}
                                  </span>
                                </p>
                                {stage.notes && (
                                  <p className="text-sm text-gray-700 mt-1">{stage.notes}</p>
                                )}
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <p>{formatDate(stage.changed_date)}</p>
                                <p>{stage.changed_by}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3 className="text-lg font-medium text-gray-900">Update Matter Status</h3>
            </div>
            
            <div className="modal-content">
              <div className="space-y-4">
                <div>
                  <label className="form-label">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as Matter['status'])}
                    className="input-field"
                  >
                    <option value="intake">Intake</option>
                    <option value="active">Active</option>
                    <option value="funding">Funding</option>
                    <option value="closed">Closed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add notes about this status change..."
                    rows={3}
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowStatusModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                className="btn-primary"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}