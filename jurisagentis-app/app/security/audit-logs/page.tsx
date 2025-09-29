/**
 * Security & Compliance - Audit Logs Management Interface
 * HIPAA-compliant audit logging with comprehensive tracking and reporting
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ClockIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EyeIcon,
  UserIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChartBarIcon,
  BellIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'

interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  user_name: string
  user_role: string
  action: string
  resource_type: 'client' | 'case' | 'document' | 'user' | 'system' | 'ai_assistant' | 'billing'
  resource_id?: string
  resource_name?: string
  ip_address: string
  user_agent: string
  session_id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  compliance_category: 'data_access' | 'user_management' | 'system_change' | 'security_event' | 'ai_usage'
  details: {
    description: string
    before_value?: unknown
    after_value?: unknown
    affected_fields?: string[]
    additional_context?: Record<string, unknown>
  }
  geolocation?: {
    country: string
    region: string
    city: string
  }
  compliance_flags: string[]
  risk_score: number
}

interface AuditFilters {
  dateRange: {
    start: string
    end: string
  }
  users: string[]
  actions: string[]
  resourceTypes: string[]
  severityLevels: string[]
  complianceCategories: string[]
  riskScoreRange: {
    min: number
    max: number
  }
}

interface ComplianceMetrics {
  total_events: number
  high_risk_events: number
  failed_access_attempts: number
  data_access_events: number
  user_management_events: number
  ai_usage_events: number
  compliance_violations: number
  average_risk_score: number
  unique_users: number
  unique_ips: number
}

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [_error, setError] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null)

  // Filters
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    users: [],
    actions: [],
    resourceTypes: [],
    severityLevels: [],
    complianceCategories: [],
    riskScoreRange: { min: 0, max: 10 }
  })

  // Check permissions - only admins and security officers can access audit logs
  const canViewAuditLogs = user && ['admin', 'security_officer'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canViewAuditLogs) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canViewAuditLogs, router])

  // Load audit logs and metrics
  useEffect(() => {
    if (user && canViewAuditLogs) {
      loadAuditLogs()
      loadComplianceMetrics()
    }
  }, [user, canViewAuditLogs, filters, loadAuditLogs])

  const loadAuditLogs = useCallback(async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockLogs = generateMockAuditLogs()
      setAuditLogs(mockLogs)
    } catch (error) {
      setError('Failed to load audit logs')
      console.error('Audit logs error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadComplianceMetrics = async () => {
    try {
      // Simulate metrics calculation
      const mockMetrics: ComplianceMetrics = {
        total_events: 2847,
        high_risk_events: 23,
        failed_access_attempts: 7,
        data_access_events: 1456,
        user_management_events: 89,
        ai_usage_events: 567,
        compliance_violations: 2,
        average_risk_score: 2.3,
        unique_users: 45,
        unique_ips: 78
      }
      setMetrics(mockMetrics)
    } catch (error) {
      console.error('Metrics error:', error)
    }
  }

  const generateMockAuditLogs = (): AuditLog[] => {
    const actions = [
      'user_login', 'user_logout', 'document_access', 'document_download', 'client_view',
      'case_update', 'user_created', 'password_change', 'ai_query', 'data_export',
      'settings_change', 'backup_created', 'login_failed', 'permission_granted'
    ]
    
    const resourceTypes: AuditLog['resource_type'][] = [
      'client', 'case', 'document', 'user', 'system', 'ai_assistant', 'billing'
    ]
    
    const severityLevels: AuditLog['severity'][] = ['info', 'warning', 'error', 'critical']
    
    const complianceCategories: AuditLog['compliance_category'][] = [
      'data_access', 'user_management', 'system_change', 'security_event', 'ai_usage'
    ]

    const logs: AuditLog[] = []
    
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      const action = actions[Math.floor(Math.random() * actions.length)]
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
      const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)]
      const complianceCategory = complianceCategories[Math.floor(Math.random() * complianceCategories.length)]
      
      logs.push({
        id: `audit_${Date.now()}_${i}`,
        timestamp: timestamp.toISOString(),
        user_id: `user_${Math.floor(Math.random() * 10) + 1}`,
        user_name: ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown'][Math.floor(Math.random() * 5)],
        user_role: ['admin', 'attorney', 'paralegal', 'assistant'][Math.floor(Math.random() * 4)],
        action,
        resource_type: resourceType,
        resource_id: `${resourceType}_${Math.floor(Math.random() * 1000)}`,
        resource_name: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} ${Math.floor(Math.random() * 100)}`,
        ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        session_id: `session_${Math.random().toString(36).substr(2, 9)}`,
        severity,
        compliance_category: complianceCategory,
        details: {
          description: `User performed ${action} on ${resourceType}`,
          before_value: severity === 'info' ? undefined : { status: 'active' },
          after_value: severity === 'info' ? undefined : { status: 'modified' },
          affected_fields: ['status', 'last_modified'],
          additional_context: {
            client_consent: true,
            data_classification: 'confidential'
          }
        },
        geolocation: {
          country: 'United States',
          region: 'California',
          city: 'San Francisco'
        },
        compliance_flags: severity === 'critical' ? ['HIPAA_VIOLATION', 'DATA_BREACH'] : 
                          severity === 'error' ? ['UNAUTHORIZED_ACCESS'] : [],
        risk_score: Math.random() * 10
      })
    }
    
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const getSeverityColor = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'error': return 'text-orange-600 bg-orange-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const getSeverityIcon = (severity: AuditLog['severity']) => {
    switch (severity) {
      case 'critical': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'error': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'warning': return <BellIcon className="h-4 w-4" />
      default: return <DocumentTextIcon className="h-4 w-4" />
    }
  }

  const getResourceIcon = (resourceType: AuditLog['resource_type']) => {
    switch (resourceType) {
      case 'client': return <UserIcon className="h-4 w-4" />
      case 'document': return <DocumentTextIcon className="h-4 w-4" />
      case 'ai_assistant': return <ComputerDesktopIcon className="h-4 w-4" />
      case 'system': return <ShieldCheckIcon className="h-4 w-4" />
      default: return <DocumentTextIcon className="h-4 w-4" />
    }
  }

  const exportAuditLogs = async () => {
    try {
      // Simulate export
      const data = JSON.stringify(auditLogs, null, 2)
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (_error) {
      setError('Failed to export audit logs')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewAuditLogs) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-2 mr-4">
                <ShieldCheckIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Security Audit Logs</h1>
                <p className="text-gray-600 mt-1">
                  HIPAA-compliant audit trail and compliance monitoring
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
              </button>
              
              <button
                onClick={exportAuditLogs}
                className="btn-secondary flex items-center"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export
              </button>
              
              <button
                onClick={() => router.push('/security')}
                className="btn-primary flex items-center"
              >
                <LockClosedIcon className="h-4 w-4 mr-2" />
                Security Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Compliance Metrics */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="card">
              <div className="flex items-center">
                <div className="bg-blue-100 rounded-lg p-2 mr-3">
                  <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Events</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.total_events.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-red-100 rounded-lg p-2 mr-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">High Risk Events</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.high_risk_events}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-yellow-100 rounded-lg p-2 mr-3">
                  <LockClosedIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Failed Access</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.failed_access_attempts}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-green-100 rounded-lg p-2 mr-3">
                  <UserIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.unique_users}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center">
                <div className="bg-purple-100 rounded-lg p-2 mr-3">
                  <ChartBarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Risk Score</p>
                  <p className="text-2xl font-bold text-gray-900">{metrics.average_risk_score.toFixed(1)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="card mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-secondary flex items-center ${showFilters ? 'bg-blue-100 text-blue-700' : ''}`}
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Advanced Filters
            </button>
          </div>

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="input-field text-sm"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity Level</label>
                  <select
                    multiple
                    className="input-field text-sm h-20"
                    value={filters.severityLevels}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      severityLevels: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                  >
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resource Type</label>
                  <select
                    multiple
                    className="input-field text-sm h-20"
                    value={filters.resourceTypes}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      resourceTypes: Array.from(e.target.selectedOptions, option => option.value)
                    }))}
                  >
                    <option value="client">Client</option>
                    <option value="case">Case</option>
                    <option value="document">Document</option>
                    <option value="user">User</option>
                    <option value="system">System</option>
                    <option value="ai_assistant">AI Assistant</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audit Logs Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Risk Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{log.user_name}</div>
                          <div className="text-gray-500">{log.user_role}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          {getResourceIcon(log.resource_type)}
                          <span className="ml-2">{log.action.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="font-medium">{log.resource_name}</div>
                          <div className="text-gray-500">{log.resource_type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          <span className="ml-1">{log.severity}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <div className={`w-full bg-gray-200 rounded-full h-2 ${log.risk_score > 7 ? 'bg-red-200' : log.risk_score > 4 ? 'bg-yellow-200' : 'bg-green-200'}`}>
                            <div 
                              className={`h-2 rounded-full ${log.risk_score > 7 ? 'bg-red-600' : log.risk_score > 4 ? 'bg-yellow-600' : 'bg-green-600'}`}
                              style={{ width: `${(log.risk_score / 10) * 100}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs">{log.risk_score.toFixed(1)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Showing 1 to 20 of {auditLogs.length} results
          </div>
          <div className="flex space-x-2">
            <button className="btn-secondary text-sm">Previous</button>
            <button className="btn-secondary text-sm">Next</button>
          </div>
        </div>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Audit Log Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.user_name} ({selectedLog.user_role})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.action.replace(/_/g, ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Resource</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.resource_name} ({selectedLog.resource_type})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.ip_address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Session ID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono text-xs">{selectedLog.session_id}</p>
                  </div>
                </div>

                {selectedLog.compliance_flags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Compliance Flags</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedLog.compliance_flags.map((flag, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Details</label>
                  <div className="mt-1 bg-gray-50 rounded-lg p-3">
                    <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}