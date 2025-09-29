'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ShieldExclamationIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  ComputerDesktopIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface AuditLog {
  id: string
  event_type: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  user: {
    id: string
    email: string
    name: string
  } | null
  user_id: string
  ip_address: string
  user_agent: string
  details: Record<string, unknown>
  resource: string
  resource_id: string
  success: boolean
  error_message?: string
  session_id: string
  created_at: string
}

interface AuditSummary {
  date_range: { start_date: string; end_date: string }
  total_events: number
  successful_events: number
  failed_events: number
  success_rate: string
}

interface SecurityAlert {
  id: string
  event_type: string
  severity: string
  user: { email: string; name: string } | null
  ip_address: string
  details: Record<string, unknown>
  created_at: string
  risk_score: number
}

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [filters, setFilters] = useState({
    user_id: '',
    event_type: '',
    start_date: '',
    end_date: '',
    ip_address: '',
    severity: '',
    category: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const pageSize = 25

  // View state
  const [activeTab, setActiveTab] = useState<'logs' | 'summary' | 'alerts'>('logs')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showLogDetails, setShowLogDetails] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab, filters, currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      if (activeTab === 'logs') {
        await loadAuditLogs()
      } else if (activeTab === 'summary') {
        await loadSummary()
      } else if (activeTab === 'alerts') {
        await loadSecurityAlerts()
      }
    } catch (err) {
      setError('Failed to load audit data')
      console.error('Error loading audit data:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAuditLogs = async () => {
    const queryParams = new URLSearchParams({
      limit: pageSize.toString(),
      offset: ((currentPage - 1) * pageSize).toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    })

    const response = await fetch(`/api/admin/audit-logs?${queryParams}`)
    if (response.ok) {
      const result = await response.json()
      setAuditLogs(result.data.audit_logs)
      setTotalRecords(result.data.pagination.total)
      setHasMore(result.data.pagination.has_more)
    } else {
      throw new Error('Failed to load audit logs')
    }
  }

  const loadSummary = async () => {
    const body: { action: string; start_date?: string; end_date?: string } = { action: 'summary' }
    if (filters.start_date) body.start_date = filters.start_date
    if (filters.end_date) body.end_date = filters.end_date

    const response = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (response.ok) {
      const result = await response.json()
      setSummary(result.data.summary)
    } else {
      throw new Error('Failed to load summary')
    }
  }

  const loadSecurityAlerts = async () => {
    const response = await fetch('/api/admin/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'alerts', hours_back: 24 })
    })

    if (response.ok) {
      const result = await response.json()
      setSecurityAlerts(result.data.security_alerts)
    } else {
      throw new Error('Failed to load security alerts')
    }
  }

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const response = await fetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          format,
          query: filters
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (format === 'pdf') {
          // Handle PDF export (would need additional client-side PDF generation)
          console.log('PDF export data:', result.data.data)
          alert('PDF export functionality would be implemented here')
        } else {
          // Download CSV/JSON
          const blob = new Blob([result.data.content], { 
            type: result.data.content_type 
          })
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.data.filename
          a.click()
          window.URL.revokeObjectURL(url)
        }
      } else {
        throw new Error('Export failed')
      }
    } catch {
      setError('Failed to export audit logs')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100'
      case 'high': return 'text-orange-800 bg-orange-100'
      case 'medium': return 'text-yellow-800 bg-yellow-100'
      case 'low': return 'text-green-800 bg-green-100'
      default: return 'text-gray-800 bg-gray-100'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <ShieldExclamationIcon className="h-5 w-5" />
      case 'user_management': return <UserIcon className="h-5 w-5" />
      case 'data_access': return <EyeIcon className="h-5 w-5" />
      case 'system': return <ComputerDesktopIcon className="h-5 w-5" />
      default: return <ClockIcon className="h-5 w-5" />
    }
  }

  const openLogDetails = (log: AuditLog) => {
    setSelectedLog(log)
    setShowLogDetails(true)
  }

  const resetFilters = () => {
    setFilters({
      user_id: '',
      event_type: '',
      start_date: '',
      end_date: '',
      ip_address: '',
      severity: '',
      category: ''
    })
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="mt-2 text-gray-600">Monitor system activity and security events</p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <div className="relative">
                <select
                  onChange={(e) => e.target.value && handleExport(e.target.value as 'csv' | 'json' | 'pdf')}
                  value=""
                  className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <option value="">Export</option>
                  <option value="csv">Export CSV</option>
                  <option value="json">Export JSON</option>
                  <option value="pdf">Export PDF</option>
                </select>
                <DocumentArrowDownIcon className="h-4 w-4 absolute right-2 top-2.5 pointer-events-none text-gray-400" />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="mt-6">
            <Link href="/admin" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              ← Back to Admin Dashboard
            </Link>
          </nav>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 bg-white rounded-lg shadow p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Type</label>
                <input
                  type="text"
                  value={filters.event_type}
                  onChange={(e) => setFilters({ ...filters, event_type: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., login_success"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Severities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Categories</option>
                  <option value="authentication">Authentication</option>
                  <option value="data_access">Data Access</option>
                  <option value="user_management">User Management</option>
                  <option value="system">System</option>
                  <option value="security">Security</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">IP Address</label>
                <input
                  type="text"
                  value={filters.ip_address}
                  onChange={(e) => setFilters({ ...filters, ip_address: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  placeholder="e.g., 192.168.1.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="datetime-local"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="datetime-local"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                onClick={() => {
                  setCurrentPage(1)
                  loadData()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
              >
                Apply Filters
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'logs', label: 'Audit Logs', icon: ClockIcon },
                { key: 'summary', label: 'Summary', icon: ChartBarIcon },
                { key: 'alerts', label: 'Security Alerts', icon: ShieldExclamationIcon }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'logs' | 'summary' | 'alerts')}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading audit data...</p>
          </div>
        ) : (
          <>
            {/* Audit Logs Tab */}
            {activeTab === 'logs' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
                    <p className="mt-1 text-sm text-gray-500">Try adjusting your filters or date range.</p>
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-gray-200">
                      {auditLogs.map((log) => (
                        <li key={log.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-start space-x-4">
                              <div className="flex-shrink-0">
                                <div className={`p-2 rounded-full ${log.success ? 'bg-green-100' : 'bg-red-100'}`}>
                                  {getCategoryIcon(log.category)}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3">
                                  <p className="text-sm font-medium text-gray-900">
                                    {log.event_type.replace(/_/g, ' ')}
                                  </p>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                                    {log.severity}
                                  </span>
                                </div>
                                <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                                  <div>
                                    <span className="font-medium">User:</span> {log.user?.name || 'System'}
                                  </div>
                                  <div>
                                    <span className="font-medium">IP:</span> {log.ip_address}
                                  </div>
                                  <div>
                                    <span className="font-medium">Time:</span> {new Date(log.created_at).toLocaleString()}
                                  </div>
                                </div>
                                {log.resource && (
                                  <p className="mt-1 text-sm text-gray-500">
                                    <span className="font-medium">Resource:</span> {log.resource}
                                    {log.resource_id && ` (${log.resource_id})`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => openLogDetails(log)}
                                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Pagination */}
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!hasMore}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing{' '}
                            <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span>
                            {' to '}
                            <span className="font-medium">
                              {Math.min(currentPage * pageSize, totalRecords)}
                            </span>
                            {' of '}
                            <span className="font-medium">{totalRecords}</span>
                            {' results'}
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={!hasMore}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && summary && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ClockIcon className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                          <dd className="text-lg font-medium text-gray-900">{summary.total_events}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 font-bold">✓</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Successful</dt>
                          <dd className="text-lg font-medium text-gray-900">{summary.successful_events}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                          <span className="text-red-600 font-bold">✗</span>
                        </div>
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                          <dd className="text-lg font-medium text-gray-900">{summary.failed_events}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-lg shadow">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <ChartBarIcon className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">Success Rate</dt>
                          <dd className="text-lg font-medium text-gray-900">{summary.success_rate}%</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(summary.date_range.start_date).toLocaleDateString()} - {new Date(summary.date_range.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {/* Security Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {securityAlerts.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShieldExclamationIcon className="mx-auto h-12 w-12 text-green-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No security alerts</h3>
                    <p className="mt-1 text-sm text-gray-500">No suspicious activity detected in the last 24 hours.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {securityAlerts.map((alert) => (
                      <li key={alert.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              <div className={`p-2 rounded-full ${
                                alert.risk_score >= 7 ? 'bg-red-100' : 
                                alert.risk_score >= 4 ? 'bg-yellow-100' : 'bg-blue-100'
                              }`}>
                                <ShieldExclamationIcon className={`h-5 w-5 ${
                                  alert.risk_score >= 7 ? 'text-red-600' : 
                                  alert.risk_score >= 4 ? 'text-yellow-600' : 'text-blue-600'
                                }`} />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {alert.event_type.replace(/_/g, ' ')}
                                </p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                  {alert.severity}
                                </span>
                                <span className="text-sm text-gray-500">
                                  Risk Score: {alert.risk_score}/10
                                </span>
                              </div>
                              <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">User:</span> {alert.user?.name || 'Unknown'}
                                </div>
                                <div>
                                  <span className="font-medium">IP:</span> {alert.ip_address}
                                </div>
                                <div>
                                  <span className="font-medium">Time:</span> {new Date(alert.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}

        {/* Log Details Modal */}
        {showLogDetails && selectedLog && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
                  <button
                    onClick={() => setShowLogDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Basic Information</h4>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Event Type:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.event_type}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Category:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.category}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Severity:</dt>
                          <dd>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedLog.severity)}`}>
                              {selectedLog.severity}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Success:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.success ? 'Yes' : 'No'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Timestamp:</dt>
                          <dd className="text-sm text-gray-900">{new Date(selectedLog.created_at).toLocaleString()}</dd>
                        </div>
                      </dl>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">User & Session</h4>
                      <dl className="space-y-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">User:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.user?.name || 'System'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Email:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.user?.email || 'N/A'}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">IP Address:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.ip_address}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Session ID:</dt>
                          <dd className="text-sm text-gray-900 font-mono">{selectedLog.session_id}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  {selectedLog.resource && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Resource</h4>
                      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Resource:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.resource}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-600">Resource ID:</dt>
                          <dd className="text-sm text-gray-900">{selectedLog.resource_id}</dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {selectedLog.error_message && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Error</h4>
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <p className="text-sm text-red-700">{selectedLog.error_message}</p>
                      </div>
                    </div>
                  )}

                  {selectedLog.user_agent && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">User Agent</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                        <p className="text-sm text-gray-700 font-mono">{selectedLog.user_agent}</p>
                      </div>
                    </div>
                  )}

                  {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Details</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(selectedLog.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}