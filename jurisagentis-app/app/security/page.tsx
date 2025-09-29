/**
 * Security & Compliance Dashboard - Main security monitoring interface
 * HIPAA-compliant security oversight with real-time monitoring and alerts
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ChartBarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  CheckCircleIcon,
  ServerIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline'

interface SecurityMetrics {
  overall_security_score: number
  threat_level: 'low' | 'medium' | 'high' | 'critical'
  active_sessions: number
  failed_login_attempts: number
  data_encryption_status: number
  backup_status: 'healthy' | 'warning' | 'error'
  compliance_score: number
  last_security_scan: string
  vulnerabilities: {
    critical: number
    high: number
    medium: number
    low: number
  }
  recent_alerts: SecurityAlert[]
}

interface SecurityAlert {
  id: string
  type: 'security_breach' | 'compliance_violation' | 'system_anomaly' | 'access_failure' | 'data_concern'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  timestamp: string
  status: 'active' | 'investigating' | 'resolved'
  affected_users?: string[]
  affected_resources?: string[]
  recommended_actions: string[]
}

interface ComplianceStatus {
  hipaa_compliance: {
    status: 'compliant' | 'non_compliant' | 'under_review'
    last_audit: string
    next_audit: string
    areas: Array<{
      area: string
      status: 'compliant' | 'non_compliant' | 'needs_attention'
      score: number
    }>
  }
  data_retention: {
    policies_active: number
    automated_deletion_active: boolean
    retention_violations: number
  }
  access_controls: {
    rbac_status: 'active' | 'needs_review'
    mfa_enforcement: number
    password_policy_compliance: number
  }
  audit_logging: {
    coverage: number
    retention_period: number
    integrity_verified: boolean
  }
}

interface SystemHealth {
  uptime: number
  performance_score: number
  storage_usage: number
  backup_success_rate: number
  encryption_coverage: number
  network_security: number
  endpoint_protection: number
  incident_response_readiness: number
}

export default function SecurityDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'compliance' | 'incidents' | 'monitoring'>('overview')

  // Check permissions - only admins and security officers can access security dashboard
  const canViewSecurity = user && ['admin', 'security_officer'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canViewSecurity) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canViewSecurity, router])

  // Load security data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Simulate API calls for security data
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setMetrics(generateMockSecurityMetrics())
        setComplianceStatus(generateMockComplianceStatus())
        setSystemHealth(generateMockSystemHealth())
      } catch (error) {
        setError('Failed to load security data')
        console.error('Security data error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && canViewSecurity) {
      loadData()
    }
  }, [user, canViewSecurity])


  const generateMockSecurityMetrics = (): SecurityMetrics => ({
    overall_security_score: 8.7,
    threat_level: 'low',
    active_sessions: 23,
    failed_login_attempts: 3,
    data_encryption_status: 99.8,
    backup_status: 'healthy',
    compliance_score: 9.2,
    last_security_scan: '2024-01-15T10:30:00Z',
    vulnerabilities: {
      critical: 0,
      high: 2,
      medium: 5,
      low: 12
    },
    recent_alerts: [
      {
        id: 'alert_1',
        type: 'access_failure',
        severity: 'warning',
        title: 'Multiple Failed Login Attempts',
        description: 'User attempted to log in 5 times with incorrect credentials from IP 192.168.1.100',
        timestamp: '2024-01-15T14:30:00Z',
        status: 'active',
        affected_users: ['john.doe@example.com'],
        recommended_actions: ['Monitor IP address', 'Verify user identity', 'Consider temporary account lock']
      },
      {
        id: 'alert_2',
        type: 'system_anomaly',
        severity: 'info',
        title: 'Unusual Data Access Pattern',
        description: 'User accessed 150+ client records in short timeframe, pattern flagged for review',
        timestamp: '2024-01-15T12:15:00Z',
        status: 'investigating',
        affected_users: ['jane.smith@example.com'],
        recommended_actions: ['Review user activity', 'Verify business justification']
      },
      {
        id: 'alert_3',
        type: 'compliance_violation',
        severity: 'error',
        title: 'Data Retention Policy Violation',
        description: 'Documents older than retention period detected in case #12345',
        timestamp: '2024-01-15T09:45:00Z',
        status: 'resolved',
        affected_resources: ['case_12345'],
        recommended_actions: ['Archive documents', 'Update retention policies', 'Audit similar cases']
      }
    ]
  })

  const generateMockComplianceStatus = (): ComplianceStatus => ({
    hipaa_compliance: {
      status: 'compliant',
      last_audit: '2023-12-01',
      next_audit: '2024-06-01',
      areas: [
        { area: 'Administrative Safeguards', status: 'compliant', score: 9.5 },
        { area: 'Physical Safeguards', status: 'compliant', score: 9.8 },
        { area: 'Technical Safeguards', status: 'needs_attention', score: 8.2 },
        { area: 'Breach Notification', status: 'compliant', score: 9.7 },
        { area: 'Business Associate Agreements', status: 'compliant', score: 9.3 }
      ]
    },
    data_retention: {
      policies_active: 12,
      automated_deletion_active: true,
      retention_violations: 1
    },
    access_controls: {
      rbac_status: 'active',
      mfa_enforcement: 89,
      password_policy_compliance: 94
    },
    audit_logging: {
      coverage: 98.5,
      retention_period: 7,
      integrity_verified: true
    }
  })

  const generateMockSystemHealth = (): SystemHealth => ({
    uptime: 99.97,
    performance_score: 8.9,
    storage_usage: 67,
    backup_success_rate: 99.8,
    encryption_coverage: 99.9,
    network_security: 9.1,
    endpoint_protection: 8.8,
    incident_response_readiness: 9.3
  })

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }

  const getComplianceStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 bg-green-100'
      case 'non_compliant': return 'text-red-600 bg-red-100'
      case 'needs_attention': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200'
      case 'error': return 'text-orange-600 bg-orange-100 border-orange-200'
      case 'warning': return 'text-yellow-600 bg-yellow-100 border-yellow-200'
      default: return 'text-blue-600 bg-blue-100 border-blue-200'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewSecurity) {
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
                <h1 className="text-2xl font-bold text-gray-900">Security & Compliance Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  HIPAA-compliant security monitoring and compliance oversight
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/security/audit-logs')}
                className="btn-secondary flex items-center"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                Audit Logs
              </button>
              
              <button
                onClick={() => router.push('/security/compliance-reports')}
                className="btn-secondary flex items-center"
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                Compliance Reports
              </button>
              
              <button
                onClick={() => router.push('/security/incident-response')}
                className="btn-primary flex items-center"
              >
                <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                Incident Response
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: ChartBarIcon },
                { id: 'compliance', name: 'Compliance', icon: CheckCircleIcon },
                { id: 'incidents', name: 'Security Incidents', icon: ExclamationTriangleIcon },
                { id: 'monitoring', name: 'System Monitoring', icon: ComputerDesktopIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'compliance' | 'incidents' | 'monitoring')}
                  className={`flex items-center px-3 py-2 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-8">
                {/* Key Security Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Security Score</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.overall_security_score}/10</p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3">
                        <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(metrics.overall_security_score / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Threat Level</p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getThreatLevelColor(metrics.threat_level)}`}>
                          {metrics.threat_level.toUpperCase()}
                        </span>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3">
                        <ExclamationTriangleIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">Last updated: {new Date().toLocaleTimeString()}</p>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Sessions</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.active_sessions}</p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <UserGroupIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">Failed attempts: {metrics.failed_login_attempts}</p>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Compliance Score</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.compliance_score}/10</p>
                      </div>
                      <div className="bg-indigo-100 rounded-lg p-3">
                        <CheckCircleIcon className="h-8 w-8 text-indigo-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${(metrics.compliance_score / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vulnerabilities Summary */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Vulnerabilities</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{metrics.vulnerabilities.critical}</div>
                      <div className="text-sm text-gray-600">Critical</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{metrics.vulnerabilities.high}</div>
                      <div className="text-sm text-gray-600">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{metrics.vulnerabilities.medium}</div>
                      <div className="text-sm text-gray-600">Medium</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{metrics.vulnerabilities.low}</div>
                      <div className="text-sm text-gray-600">Low</div>
                    </div>
                  </div>
                </div>

                {/* Recent Security Alerts */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Security Alerts</h3>
                    <button
                      onClick={() => router.push('/security/alerts')}
                      className="btn-secondary text-sm"
                    >
                      View All Alerts
                    </button>
                  </div>
                  <div className="space-y-4">
                    {metrics.recent_alerts.slice(0, 3).map((alert) => (
                      <div 
                        key={alert.id}
                        className={`border-l-4 p-4 rounded-r-lg ${getAlertSeverityColor(alert.severity)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{alert.title}</h4>
                            <p className="text-sm mt-1">{alert.description}</p>
                            <p className="text-xs mt-2 opacity-75">
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alert.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            alert.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {alert.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Compliance Tab */}
            {activeTab === 'compliance' && complianceStatus && (
              <div className="space-y-8">
                {/* HIPAA Compliance Status */}
                <div className="card">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">HIPAA Compliance Status</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getComplianceStatusColor(complianceStatus.hipaa_compliance.status)}`}>
                      {complianceStatus.hipaa_compliance.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-gray-600">Last Audit</p>
                      <p className="text-lg font-medium">{new Date(complianceStatus.hipaa_compliance.last_audit).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Next Audit</p>
                      <p className="text-lg font-medium">{new Date(complianceStatus.hipaa_compliance.next_audit).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {complianceStatus.hipaa_compliance.areas.map((area, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <h4 className="font-medium text-gray-900">{area.area}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getComplianceStatusColor(area.status)}`}>
                            {area.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{area.score}/10</div>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                area.score >= 9 ? 'bg-green-600' : 
                                area.score >= 7 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${(area.score / 10) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Compliance Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Data Retention</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active Policies</span>
                        <span className="font-medium">{complianceStatus.data_retention.policies_active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Auto Deletion</span>
                        <span className={`font-medium ${complianceStatus.data_retention.automated_deletion_active ? 'text-green-600' : 'text-red-600'}`}>
                          {complianceStatus.data_retention.automated_deletion_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Violations</span>
                        <span className="font-medium text-red-600">{complianceStatus.data_retention.retention_violations}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Access Controls</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">RBAC Status</span>
                        <span className="font-medium text-green-600">{complianceStatus.access_controls.rbac_status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">MFA Enforcement</span>
                        <span className="font-medium">{complianceStatus.access_controls.mfa_enforcement}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Password Compliance</span>
                        <span className="font-medium">{complianceStatus.access_controls.password_policy_compliance}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Audit Logging</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Coverage</span>
                        <span className="font-medium">{complianceStatus.audit_logging.coverage}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Retention Period</span>
                        <span className="font-medium">{complianceStatus.audit_logging.retention_period} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Integrity</span>
                        <span className={`font-medium ${complianceStatus.audit_logging.integrity_verified ? 'text-green-600' : 'text-red-600'}`}>
                          {complianceStatus.audit_logging.integrity_verified ? 'Verified' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Monitoring Tab */}
            {activeTab === 'monitoring' && systemHealth && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { name: 'System Uptime', value: systemHealth.uptime, unit: '%', icon: ServerIcon, color: 'green' },
                    { name: 'Performance Score', value: systemHealth.performance_score, unit: '/10', icon: ChartBarIcon, color: 'blue' },
                    { name: 'Encryption Coverage', value: systemHealth.encryption_coverage, unit: '%', icon: LockClosedIcon, color: 'purple' },
                    { name: 'Backup Success Rate', value: systemHealth.backup_success_rate, unit: '%', icon: DocumentTextIcon, color: 'indigo' },
                    { name: 'Storage Usage', value: systemHealth.storage_usage, unit: '%', icon: ServerIcon, color: 'yellow' },
                    { name: 'Network Security', value: systemHealth.network_security, unit: '/10', icon: GlobeAltIcon, color: 'red' },
                    { name: 'Endpoint Protection', value: systemHealth.endpoint_protection, unit: '/10', icon: ComputerDesktopIcon, color: 'pink' },
                    { name: 'Incident Response', value: systemHealth.incident_response_readiness, unit: '/10', icon: ExclamationTriangleIcon, color: 'cyan' }
                  ].map((metric, index) => (
                    <div key={index} className="card">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">{metric.name}</p>
                          <p className="text-2xl font-bold text-gray-900">{metric.value}{metric.unit}</p>
                        </div>
                        <div className={`bg-${metric.color}-100 rounded-lg p-3`}>
                          <metric.icon className={`h-6 w-6 text-${metric.color}-600`} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`bg-${metric.color}-600 h-2 rounded-full`}
                            style={{ 
                              width: `${metric.unit === '%' ? metric.value : (metric.value / 10) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}