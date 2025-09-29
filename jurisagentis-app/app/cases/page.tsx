/**
 * Cases Dashboard - Comprehensive case management
 * 
 * Tracks cases from intake to completion with automated status workflows
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  FolderOpen,
  Plus,
  Filter,
  Search,
  BarChart3,
  DollarSign,
  AlertTriangle,
  Eye,
  Edit,
  RotateCcw,
  Trash2
} from 'lucide-react'

interface Case {
  id: string
  case_number: string
  title: string
  description?: string
  case_type: 'estate_planning' | 'business_formation' | 'real_estate' | 'family_law' | 'litigation' | 'other'
  status: 'intake' | 'active' | 'on_hold' | 'pending_closure' | 'completed' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  primary_client: {
    id: string
    first_name?: string
    last_name?: string
    entity_name?: string
    email?: string
    phone_primary?: string
  }
  assigned_attorney_profile?: {
    uid: string
    first_name: string
    last_name: string
    email: string
  }
  assigned_paralegal_profile?: {
    uid: string
    first_name: string
    last_name: string
    email: string
  }
  opened_date: string
  closed_date?: string
  estimated_completion?: string
  statute_of_limitations?: string
  flat_fee_amount?: number
  hourly_rate?: number
  retainer_amount?: number
  billing_type: 'flat_fee' | 'hourly' | 'contingency' | 'retainer'
  court_case_number?: string
  opposing_party?: string
  opposing_counsel?: string
  jurisdiction?: string
  complexity: 'low' | 'medium' | 'high'
  tags?: string[]
  notes?: string
  internal_notes?: string
  created_at: string
  updated_at: string
}

interface CaseStats {
  total_cases: number
  active_cases: number
  cases_needing_attention: number
  this_month_opened: number
  this_month_closed: number
  overdue_cases: number
  total_pending_retainers: number
  avg_completion_days: number
}

export default function CasesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  
  // State
  const [cases, setCases] = useState<Case[]>([])
  const [stats, setStats] = useState<CaseStats>({
    total_cases: 0,
    active_cases: 0,
    cases_needing_attention: 0,
    this_month_opened: 0,
    this_month_closed: 0,
    overdue_cases: 0,
    total_pending_retainers: 0,
    avg_completion_days: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [caseTypeFilter, setCaseTypeFilter] = useState('all')
  const [attorneyFilter, setAttorneyFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, _setSortBy] = useState<'created_at' | 'case_number' | 'client_name' | 'estimated_completion'>('created_at')
  const [sortOrder, _setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [totalCases, setTotalCases] = useState(0)
  const pageSize = 20

  // Check permissions
  const canViewCases = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canCreateCases = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canEditCases = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canDeleteCases = user && ['admin', 'associate_attorney'].includes(user.role)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  const loadCases = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (caseTypeFilter !== 'all') params.append('case_type', caseTypeFilter)
      if (attorneyFilter !== 'all') params.append('assigned_attorney', attorneyFilter)
      params.append('limit', pageSize.toString())
      params.append('offset', (currentPage * pageSize).toString())

      const response = await fetch(`/api/cases?${params}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setCases(data.data.cases || [])
        setTotalCases(data.data.pagination?.total || 0)
        
        // Calculate stats from data
        const casesData = data.data.cases || []
        const now = new Date()
        const thisMonth = now.getMonth()
        const thisYear = now.getFullYear()
        
        setStats({
          total_cases: data.data.pagination?.total || 0,
          active_cases: casesData.filter((c: Case) => ['active', 'intake'].includes(c.status)).length,
          cases_needing_attention: casesData.filter((c: Case) => 
            c.priority === 'urgent' || 
            (c.retainer_amount && c.retainer_amount > 0) ||
            (c.estimated_completion && new Date(c.estimated_completion) < now && !['completed', 'closed'].includes(c.status))
          ).length,
          this_month_opened: casesData.filter((c: Case) => {
            const opened = new Date(c.opened_date)
            return opened.getMonth() === thisMonth && opened.getFullYear() === thisYear
          }).length,
          this_month_closed: casesData.filter((c: Case) => {
            if (!c.closed_date) return false
            const closed = new Date(c.closed_date)
            return closed.getMonth() === thisMonth && closed.getFullYear() === thisYear
          }).length,
          overdue_cases: casesData.filter((c: Case) => {
            if (!c.estimated_completion) return false
            return new Date(c.estimated_completion) < now && !['completed', 'closed'].includes(c.status)
          }).length,
          total_pending_retainers: casesData.reduce((sum: number, c: Case) => 
            sum + (c.retainer_amount || 0), 0
          ),
          avg_completion_days: 15 // TODO: Calculate from actual data
        })
      } else {
        setError(data.error?.message || 'Failed to load cases')
      }
      
    } catch (error) {
      console.error('Error loading cases:', error)
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, caseTypeFilter, attorneyFilter, currentPage])

  // Check permissions
  useEffect(() => {
    if (user && !canViewCases) {
      router.push('/dashboard')
    }
  }, [user, canViewCases, router])

  // Load cases data
  useEffect(() => {
    if (user && canViewCases) {
      loadCases()
    }
  }, [user, canViewCases, searchTerm, statusFilter, caseTypeFilter, attorneyFilter, currentPage, loadCases])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, statusFilter, caseTypeFilter, attorneyFilter])

  const getClientDisplayName = (client: Case['primary_client']) => {
    if (client.entity_name) {
      return client.entity_name
    }
    return `${client.first_name || ''} ${client.last_name || ''}`.trim()
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

  const getStatusBadge = (status: Case['status'], priority: Case['priority']) => {
    const statusStyles = {
      intake: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      active: 'bg-blue-100 text-blue-800 border-blue-200',
      on_hold: 'bg-orange-100 text-orange-800 border-orange-200',
      pending_closure: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      closed: 'bg-gray-100 text-gray-800 border-gray-200'
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

  const handleDeleteCase = async (caseItem: Case) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete case ${caseItem.case_number}? This action cannot be undone.`
    )

    if (confirmed) {
      try {
        const response = await fetch(`/api/cases/${caseItem.id}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          loadCases() // Reload the list
        } else {
          const data = await response.json()
          alert(`Failed to delete case: ${data.error?.message || 'Unknown error'}`)
        }
      } catch {
        alert('Network error occurred while deleting case')
      }
    }
  }

  // Filter and sort cases
  const filteredCases = cases
    .filter(caseItem => {
      const matchesSearch = 
        caseItem.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getClientDisplayName(caseItem.primary_client).toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter
      const matchesCaseType = caseTypeFilter === 'all' || caseItem.case_type === caseTypeFilter
      const matchesAttorney = attorneyFilter === 'all' || caseItem.assigned_attorney_profile?.uid === attorneyFilter
      
      return matchesSearch && matchesStatus && matchesCaseType && matchesAttorney
    })
    .sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date
      
      switch (sortBy) {
        case 'client_name':
          aValue = getClientDisplayName(a.primary_client)
          bValue = getClientDisplayName(b.primary_client)
          break
        default:
          aValue = a[sortBy as keyof Case] as string | number | Date
          bValue = b[sortBy as keyof Case] as string | number | Date
      }
      
      const modifier = sortOrder === 'asc' ? 1 : -1
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier
      }
      
      return ((aValue as number) - (bValue as number)) * modifier
    })

  if (authLoading || (loading && cases.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewCases) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FolderOpen className="h-8 w-8 mr-3 text-blue-600" />
                Case Management
              </h1>
              <p className="text-gray-600 mt-1">
                Track cases from intake to completion with automated workflows
              </p>
            </div>

            <div className="flex space-x-3">
              {canCreateCases && (
                <button
                  onClick={() => router.push('/cases/new')}
                  className="btn-primary flex items-center"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  New Case
                </button>
              )}
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </button>
              
              <button
                onClick={loadCases}
                className="btn-secondary flex items-center"
              >
                <RotateCcw className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <FolderOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_cases}</p>
                <p className="text-xs text-gray-500">{stats.active_cases} active</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Needing Attention</p>
                <p className="text-2xl font-bold text-gray-900">{stats.cases_needing_attention}</p>
                <p className="text-xs text-gray-500">urgent or overdue</p>
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

        {/* Error Message */}
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search cases by number, title, or client..."
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="intake">Intake</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="pending_closure">Pending Closure</option>
                    <option value="completed">Completed</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Case Type</label>
                  <select
                    value={caseTypeFilter}
                    onChange={(e) => setCaseTypeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Types</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="family_law">Family Law</option>
                    <option value="litigation">Litigation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attorney</label>
                  <select
                    value={attorneyFilter}
                    onChange={(e) => setAttorneyFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Attorneys</option>
                    {/* TODO: Load from actual attorneys */}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading cases...</p>
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="p-8 text-center">
              <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No cases found</p>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || caseTypeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : canCreateCases
                    ? 'Get started by creating your first case'
                    : 'No cases have been added yet'
                }
              </p>
              {canCreateCases && !searchTerm && statusFilter === 'all' && caseTypeFilter === 'all' && (
                <button
                  onClick={() => router.push('/cases/new')}
                  className="btn-primary mt-4"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Case
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-2">Case Number</div>
                  <div className="col-span-3">Client & Title</div>
                  <div className="col-span-2">Status & Type</div>
                  <div className="col-span-2">Dates</div>
                  <div className="col-span-2">Financial</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {filteredCases.map((caseItem) => (
                  <div key={caseItem.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Case Number */}
                      <div className="col-span-2">
                        <div className="font-medium text-gray-900">{caseItem.case_number}</div>
                        <div className="text-sm text-gray-500">{formatDate(caseItem.created_at)}</div>
                      </div>
                      
                      {/* Client & Title */}
                      <div className="col-span-3">
                        <div className="font-medium text-gray-900">{getClientDisplayName(caseItem.primary_client)}</div>
                        <div className="text-sm text-gray-600">{caseItem.title}</div>
                        {caseItem.assigned_attorney_profile && (
                          <div className="text-xs text-gray-500">
                            Attorney: {caseItem.assigned_attorney_profile.first_name} {caseItem.assigned_attorney_profile.last_name}
                          </div>
                        )}
                      </div>
                      
                      {/* Status & Type */}
                      <div className="col-span-2">
                        <div className="space-y-1">
                          {getStatusBadge(caseItem.status, caseItem.priority)}
                          <div className="text-xs text-gray-500 capitalize">
                            {caseItem.case_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      {/* Dates */}
                      <div className="col-span-2">
                        <div className="text-sm">
                          <div className="text-gray-900">Opened: {formatDate(caseItem.opened_date)}</div>
                          {caseItem.estimated_completion && (
                            <div className="text-gray-600">Est: {formatDate(caseItem.estimated_completion)}</div>
                          )}
                          {caseItem.closed_date && (
                            <div className="text-green-600">Closed: {formatDate(caseItem.closed_date)}</div>
                          )}
                        </div>
                      </div>
                      
                      {/* Financial */}
                      <div className="col-span-2">
                        <div className="text-sm">
                          {caseItem.flat_fee_amount && (
                            <div className="text-gray-900">Fee: {formatCurrency(caseItem.flat_fee_amount)}</div>
                          )}
                          {caseItem.hourly_rate && (
                            <div className="text-gray-900">Rate: {formatCurrency(caseItem.hourly_rate)}/hr</div>
                          )}
                          {caseItem.retainer_amount && (
                            <div className="text-orange-600">Retainer: {formatCurrency(caseItem.retainer_amount)}</div>
                          )}
                          <div className="text-xs text-gray-500 capitalize">{caseItem.billing_type.replace('_', ' ')}</div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-1">
                        <div className="flex space-x-1">
                          <button
                            onClick={() => router.push(`/cases/${caseItem.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Case"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {canEditCases && (
                            <button
                              onClick={() => router.push(`/cases/${caseItem.id}/edit`)}
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Edit Case"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}

                          {canDeleteCases && (
                            <button
                              onClick={() => handleDeleteCase(caseItem)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Case"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalCases > pageSize && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalCases)} of {totalCases} cases
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={(currentPage + 1) * pageSize >= totalCases}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}