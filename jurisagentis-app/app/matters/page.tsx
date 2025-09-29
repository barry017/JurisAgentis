/**
 * Matters Dashboard - Comprehensive matter lifecycle management
 * 
 * Tracks matters from intake to completion with automated status workflows
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  FolderOpen,
  Plus,
  Filter,
  Search,
  BarChart3,
  Clock,
  DollarSign,
  FileText,
  Eye,
  Edit,
  ChevronsUpDown,
  RotateCcw,
  ClipboardList
} from 'lucide-react'

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

interface MatterStats {
  total_matters: number
  active_matters: number
  matters_in_funding: number
  matters_needing_attention: number
  this_month_opened: number
  this_month_closed: number
  average_completion_days: number
  total_pending_retainers: number
  overdue_matters: number
}

export default function MattersPage() {
  const router = useRouter()
  
  // State
  const [matters, setMatters] = useState<Matter[]>([])
  const [stats, setStats] = useState<MatterStats>({
    total_matters: 0,
    active_matters: 0,
    matters_in_funding: 0,
    matters_needing_attention: 0,
    this_month_opened: 0,
    this_month_closed: 0,
    average_completion_days: 0,
    total_pending_retainers: 0,
    overdue_matters: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all')
  const [attorneyFilter, setAttorneyFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'created_date' | 'matter_number' | 'client_name' | 'target_completion'>('created_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Load matters data
  useEffect(() => {
    loadMatters()
  }, [])

  const loadMatters = async () => {
    try {
      setLoading(true)
      
      // Call the actual matters API
      const response = await fetch('/api/matters', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data.matters) {
        // Transform API data to match frontend interface
        const transformedMatters = data.data.matters.map((matter: Record<string, unknown>) => ({
          id: matter.id,
          matter_number: matter.matter_number,
          title: matter.title,
          description: matter.description,
          client: {
            id: matter.client.id,
            name: matter.client.business_name || `${matter.client.first_name} ${matter.client.last_name}`,
            email: matter.client.email,
            phone: matter.client.phone
          },
          service_type: matter.practice_area as Matter['service_type'],
          matter_type: matter.billing_method as Matter['matter_type'],
          status: matter.status as Matter['status'],
          priority: matter.priority as Matter['priority'],
          assigned_attorney: {
            id: matter.responsible_attorney || '1',
            name: matter.responsible_attorney_profile ? 
              `${matter.responsible_attorney_profile.first_name} ${matter.responsible_attorney_profile.last_name}` : 
              'Luke Barry'
          },
          created_date: matter.created_at ? new Date(matter.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          opened_date: matter.date_opened,
          closed_date: matter.closed_date,
          target_completion: matter.next_review_date,
          estimated_fee: matter.flat_fee || matter.hourly_rate || 0,
          actual_fee: matter.actual_fee,
          retainer_required: !!matter.retainer_amount,
          retainer_amount: matter.retainer_amount || 0,
          retainer_paid: false, // Would need additional logic to determine this
          next_action: matter.internal_notes ? {
            description: matter.internal_notes,
            due_date: matter.next_review_date || new Date().toISOString().split('T')[0],
            assigned_to: matter.responsible_attorney_profile ? 
              `${matter.responsible_attorney_profile.first_name} ${matter.responsible_attorney_profile.last_name}` : 
              'Luke Barry'
          } : undefined,
          stage_history: [], // Would need to be populated from audit logs
          documents_count: 0, // Would need to be fetched from documents API
          tasks_count: matter.matter_tasks?.length || 0,
          tasks_completed: matter.matter_tasks?.filter((task: Record<string, unknown>) => task.status === 'completed').length || 0,
          billing_status: 'not_billed' as Matter['billing_status'] // Would need additional logic
        }))
        
        setMatters(transformedMatters)
        
        // Calculate stats from transformed data
        const now = new Date()
        const thisMonth = now.getMonth()
        const thisYear = now.getFullYear()
        
        setStats({
          total_matters: transformedMatters.length,
          active_matters: transformedMatters.filter(m => ['active', 'funding'].includes(m.status)).length,
          matters_in_funding: transformedMatters.filter(m => m.status === 'funding').length,
          matters_needing_attention: transformedMatters.filter(m => m.priority === 'urgent' || (m.retainer_required && !m.retainer_paid)).length,
          this_month_opened: transformedMatters.filter(m => {
            const created = new Date(m.created_date)
            return created.getMonth() === thisMonth && created.getFullYear() === thisYear
          }).length,
          this_month_closed: transformedMatters.filter(m => {
            if (!m.closed_date) return false
            const closed = new Date(m.closed_date)
            return closed.getMonth() === thisMonth && closed.getFullYear() === thisYear
          }).length,
          average_completion_days: 12,
          total_pending_retainers: transformedMatters.filter(m => m.retainer_required && !m.retainer_paid).reduce((sum, m) => sum + (m.retainer_amount || 0), 0),
          overdue_matters: transformedMatters.filter(m => {
            if (!m.target_completion) return false
            return new Date(m.target_completion) < now && !['closed', 'cancelled'].includes(m.status)
          }).length
        })
      } else {
        // Fallback to empty array if API fails
        setMatters([])
        setStats({
          total_matters: 0,
          active_matters: 0,
          matters_in_funding: 0,
          matters_needing_attention: 0,
          this_month_opened: 0,
          this_month_closed: 0,
          average_completion_days: 0,
          total_pending_retainers: 0,
          overdue_matters: 0
        })
      }
      
    } catch (error) {
      console.error('Error loading matters:', error)
    } finally {
      setLoading(false)
    }
  }

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
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
          {priorityIcons[priority] && (
            <span className="mr-1">{priorityIcons[priority]}</span>
          )}
          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
      </div>
    )
  }

  const getProgressPercentage = (tasksCompleted: number, tasksTotal: number) => {
    if (tasksTotal === 0) return 0
    return Math.round((tasksCompleted / tasksTotal) * 100)
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Filter and sort matters
  const filteredMatters = matters
    .filter(matter => {
      const matchesSearch = 
        matter.matter_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        matter.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || matter.status === statusFilter
      const matchesServiceType = serviceTypeFilter === 'all' || matter.service_type === serviceTypeFilter
      const matchesAttorney = attorneyFilter === 'all' || matter.assigned_attorney.id === attorneyFilter
      
      return matchesSearch && matchesStatus && matchesServiceType && matchesAttorney
    })
    .sort((a, b) => {
      let aValue: string | number, bValue: string | number
      
      switch (sortBy) {
        case 'client_name':
          aValue = a.client.name
          bValue = b.client.name
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
                <FolderOpen className="h-8 w-8 mr-3 text-blue-600" />
                Matter Management
              </h1>
              <p className="page-subtitle">
                Track matters from intake to completion with automated workflows
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/matters/new')}
                className="btn-primary flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Matter
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </button>
              
              <button
                onClick={loadMatters}
                className="btn-secondary flex items-center"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
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
              <FolderOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Matters</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_matters}</p>
                <p className="text-xs text-gray-500">{stats.active_matters} active</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Needing Attention</p>
                <p className="text-2xl font-bold text-gray-900">{stats.matters_needing_attention}</p>
                <p className="text-xs text-gray-500">urgent or retainer due</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Retainers</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_pending_retainers)}</p>
                <p className="text-xs text-gray-500">awaiting payment</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">This Month</p>
                <p className="text-2xl font-bold text-gray-900">{stats.this_month_opened}</p>
                <p className="text-xs text-gray-500">opened | {stats.this_month_closed} closed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search matters..."
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
                  <label className="form-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="intake">Intake</option>
                    <option value="active">Active</option>
                    <option value="funding">Funding</option>
                    <option value="closed">Closed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Service Type</label>
                  <select
                    value={serviceTypeFilter}
                    onChange={(e) => setServiceTypeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Types</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="litigation">Litigation</option>
                    <option value="contract_review">Contract Review</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Attorney</label>
                  <select
                    value={attorneyFilter}
                    onChange={(e) => setAttorneyFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Attorneys</option>
                    <option value="1">Luke Barry</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Matters List */}
        <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner h-8 w-8 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading matters...</p>
            </div>
          ) : filteredMatters.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No matters found</p>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || serviceTypeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first matter'
                }
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('matter_number')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Matter</span>
                        <ChevronsUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('client_name')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Client & Title</span>
                        <ChevronsUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">Status & Progress</th>
                    
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('target_completion')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Target Date</span>
                        <ChevronsUpDown className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">Fee & Billing</th>
                    
                    <th className="table-header-cell text-right">Actions</th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMatters.map((matter) => (
                    <tr key={matter.id} className="table-row">
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{matter.matter_number}</div>
                          <div className="text-sm text-gray-500">{formatDate(matter.created_date)}</div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{matter.client?.name || 'Unknown Client'}</div>
                          <div className="text-sm text-gray-600">{matter.title}</div>
                          <div className="text-xs text-gray-500">
                            {matter.service_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'N/A'} • {matter.assigned_attorney?.name || 'Unassigned'}
                          </div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="space-y-2">
                          {getStatusBadge(matter.status, matter.priority)}
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${getProgressPercentage(matter.tasks_completed, matter.tasks_count)}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-xs text-gray-500">
                              {matter.tasks_completed}/{matter.tasks_count}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          {matter.target_completion && (
                            <div className="text-sm text-gray-900">{formatDate(matter.target_completion)}</div>
                          )}
                          {matter.next_action && (
                            <div className="text-xs text-gray-500">
                              Next: {matter.next_action.description}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(matter.estimated_fee)}</div>
                          <div className="text-xs text-gray-500">{matter.matter_type?.replace('_', ' ') || 'N/A'}</div>
                          {matter.retainer_required && (
                            <div className={`text-xs ${matter.retainer_paid ? 'text-green-600' : 'text-red-600'}`}>
                              Retainer: {matter.retainer_paid ? 'Paid' : 'Due'}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => router.push(`/documents?matter_id=${matter.id}`)}
                            className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                            title="View Documents"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/tasks?matter_id=${matter.id}`)}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title="View Tasks"
                          >
                            <ClipboardList className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/matters/${matter.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Matter"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/matters/${matter.id}/edit`)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit Matter"
                          >
                            <Edit className="h-4 w-4" />
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