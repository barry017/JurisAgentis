/**
 * Tasks Dashboard - Comprehensive task management and tracking
 * 
 * Manages tasks across all matters with advanced filtering and workflow automation
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ClipboardDocumentListIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  PencilSquareIcon,
  ChevronUpDownIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  UserIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface Task {
  id: string
  matter_id: string
  title: string
  description?: string
  task_type?: string
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'on_hold'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assigned_to?: string
  created_by: string
  due_date?: string
  start_date?: string
  completed_date?: string
  estimated_hours?: number
  actual_hours: number
  prerequisite_task_ids?: string[]
  blocks_task_ids?: string[]
  billable: boolean
  billed: boolean
  notes?: string
  completion_notes?: string
  matter: {
    id: string
    matter_number: string
    title: string
    status: string
  }
  assigned_to_profile?: {
    first_name: string
    last_name: string
    title?: string
  }
  created_by_profile: {
    first_name: string
    last_name: string
    title?: string
  }
  created_at: string
  updated_at: string
}

interface TaskStats {
  total_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  overdue_tasks: number
  completed_today: number
  billable_hours_pending: number
  avg_completion_time: number
  tasks_due_this_week: number
}

export default function TasksPage() {
  const router = useRouter()
  
  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [stats, setStats] = useState<TaskStats>({
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    overdue_tasks: 0,
    completed_today: 0,
    billable_hours_pending: 0,
    avg_completion_time: 0,
    tasks_due_this_week: 0
  })
  const [loading, setLoading] = useState(true)
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [matterFilter, setMatterFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [billableOnly, setBillableOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'due_date' | 'priority' | 'created_at' | 'matter_number'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Load tasks data
  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (priorityFilter !== 'all') params.append('priority', priorityFilter)
      if (matterFilter !== 'all') params.append('matter_id', matterFilter)
      if (assigneeFilter !== 'all') params.append('assigned_to', assigneeFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (overdueOnly) params.append('overdue_only', 'true')
      if (billableOnly) params.append('billable_only', 'true')
      
      // Call the tasks API
      const response = await fetch(`/api/tasks?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success && data.data.tasks) {
        setTasks(data.data.tasks)
        
        // Calculate stats from tasks data
        const now = new Date()
        const today = now.toISOString().split('T')[0]
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        setStats({
          total_tasks: data.data.tasks.length,
          pending_tasks: data.data.tasks.filter((t: Task) => t.status === 'pending').length,
          in_progress_tasks: data.data.tasks.filter((t: Task) => t.status === 'in_progress').length,
          overdue_tasks: data.data.tasks.filter((t: Task) => 
            t.due_date && t.due_date < today && !['completed', 'cancelled'].includes(t.status)
          ).length,
          completed_today: data.data.tasks.filter((t: Task) => 
            t.completed_date && t.completed_date === today
          ).length,
          billable_hours_pending: data.data.tasks
            .filter((t: Task) => t.billable && !t.billed && t.status === 'completed')
            .reduce((sum: number, t: Task) => sum + t.actual_hours, 0),
          avg_completion_time: 3.2, // Would need to calculate from historical data
          tasks_due_this_week: data.data.tasks.filter((t: Task) => 
            t.due_date && t.due_date >= today && t.due_date <= weekFromNow && t.status !== 'completed'
          ).length
        })
      } else {
        // Fallback to empty array if API fails
        setTasks([])
        setStats({
          total_tasks: 0,
          pending_tasks: 0,
          in_progress_tasks: 0,
          overdue_tasks: 0,
          completed_today: 0,
          billable_hours_pending: 0,
          avg_completion_time: 0,
          tasks_due_this_week: 0
        })
      }
      
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (hours: number) => {
    return `${hours.toFixed(1)}h`
  }

  const getStatusBadge = (status: Task['status'], priority: Task['priority']) => {
    const statusStyles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      review: 'bg-purple-100 text-purple-800 border-purple-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
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

  const isOverdue = (task: Task) => {
    if (!task.due_date || ['completed', 'cancelled'].includes(task.status)) return false
    return task.due_date < new Date().toISOString().split('T')[0]
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        task.matter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.matter.matter_number.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
      const matchesMatter = matterFilter === 'all' || task.matter_id === matterFilter
      const matchesAssignee = assigneeFilter === 'all' || task.assigned_to === assigneeFilter
      const matchesOverdue = !overdueOnly || isOverdue(task)
      const matchesBillable = !billableOnly || task.billable
      
      return matchesSearch && matchesStatus && matchesPriority && matchesMatter && 
             matchesAssignee && matchesOverdue && matchesBillable
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'due_date':
          aValue = a.due_date || '9999-12-31'
          bValue = b.due_date || '9999-12-31'
          break
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 }
          aValue = priorityOrder[a.priority]
          bValue = priorityOrder[b.priority]
          break
        case 'matter_number':
          aValue = a.matter.matter_number
          bValue = b.matter.matter_number
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
                <ClipboardDocumentListIcon className="h-8 w-8 mr-3 text-blue-600" />
                Task Management
              </h1>
              <p className="page-subtitle">
                Track and manage all tasks across matters with advanced workflow automation
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/tasks/new')}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Task
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
              
              <button
                onClick={loadTasks}
                className="btn-secondary flex items-center"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
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
              <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_tasks}</p>
                <p className="text-xs text-gray-500">{stats.in_progress_tasks} in progress</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue_tasks}</p>
                <p className="text-xs text-gray-500">need immediate attention</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Billable Hours</p>
                <p className="text-2xl font-bold text-gray-900">{formatTime(stats.billable_hours_pending)}</p>
                <p className="text-xs text-gray-500">pending billing</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <CalendarDaysIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Due This Week</p>
                <p className="text-2xl font-bold text-gray-900">{stats.tasks_due_this_week}</p>
                <p className="text-xs text-gray-500">{stats.completed_today} completed today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={overdueOnly}
                  onChange={(e) => setOverdueOnly(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Overdue only</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={billableOnly}
                  onChange={(e) => setBillableOnly(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Billable only</span>
              </label>
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="completed">Completed</option>
                    <option value="on_hold">On Hold</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Matter</label>
                  <select
                    value={matterFilter}
                    onChange={(e) => setMatterFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Matters</option>
                    {/* Would populate from matters API */}
                  </select>
                </div>

                <div>
                  <label className="form-label">Assignee</label>
                  <select
                    value={assigneeFilter}
                    onChange={(e) => setAssigneeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Assignees</option>
                    <option value="user-1">Luke Barry</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tasks List */}
        <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="loading-spinner h-8 w-8 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No tasks found</p>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || overdueOnly || billableOnly
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first task'
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
                        onClick={() => handleSort('due_date')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Task & Matter</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">Status & Progress</th>
                    
                    <th className="table-header-cell">
                      <button
                        onClick={() => handleSort('due_date')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Due Date</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="table-header-cell">Assignee & Hours</th>
                    
                    <th className="table-header-cell text-right">Actions</th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className={`table-row ${isOverdue(task) ? 'bg-red-50' : ''}`}>
                      <td className="table-cell">
                        <div>
                          <div className="font-medium text-gray-900">{task.title}</div>
                          <div className="text-sm text-gray-600 truncate max-w-md">
                            {task.description || 'No description'}
                          </div>
                          <div className="text-xs text-gray-500">
                            {task.matter.matter_number} • {task.matter.title}
                          </div>
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div className="space-y-2">
                          {getStatusBadge(task.status, task.priority)}
                          {task.billable && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              💰 Billable
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          {task.due_date ? (
                            <div className={`text-sm ${isOverdue(task) ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                              {formatDate(task.due_date)}
                              {isOverdue(task) && <span className="ml-1">⚠️</span>}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">No due date</span>
                          )}
                          {task.start_date && (
                            <div className="text-xs text-gray-500">
                              Started: {formatDate(task.start_date)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="table-cell">
                        <div>
                          <div className="text-sm text-gray-900">
                            {task.assigned_to_profile 
                              ? `${task.assigned_to_profile.first_name} ${task.assigned_to_profile.last_name}`
                              : 'Unassigned'
                            }
                          </div>
                          <div className="text-xs text-gray-500">
                            {task.estimated_hours && `Est: ${formatTime(task.estimated_hours)}`}
                            {task.actual_hours > 0 && ` • Actual: ${formatTime(task.actual_hours)}`}
                          </div>
                        </div>
                      </td>
                      
                      <td className="table-cell text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => router.push(`/documents?matter_id=${task.matter_id}`)}
                            className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                            title="View Matter Documents"
                          >
                            <DocumentTextIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/tasks/${task.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Task"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/tasks/${task.id}/edit`)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit Task"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
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