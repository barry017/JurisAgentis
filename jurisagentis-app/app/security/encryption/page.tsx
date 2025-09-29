/**
 * Encryption & Security Controls - Advanced data protection and security management
 * Enterprise-grade encryption with key management and security policies
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  LockClosedIcon,
  KeyIcon,
  ShieldCheckIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ComputerDesktopIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface EncryptionKey {
  id: string
  name: string
  type: 'AES-256' | 'RSA-4096' | 'ChaCha20-Poly1305'
  purpose: 'data_encryption' | 'backup_encryption' | 'communication' | 'key_exchange'
  status: 'active' | 'expired' | 'revoked' | 'pending_rotation'
  created_date: string
  expiry_date: string
  last_rotation: string
  next_rotation: string
  usage_count: number
  protected_resources: string[]
  compliance_standards: string[]
  key_strength: number
}

interface SecurityPolicy {
  id: string
  name: string
  description: string
  policy_type: 'encryption' | 'access_control' | 'data_classification' | 'network_security'
  enforcement_level: 'mandatory' | 'recommended' | 'optional'
  applicable_resources: string[]
  requirements: string[]
  compliance_frameworks: string[]
  created_by: string
  created_date: string
  last_modified: string
  violations_count: number
  compliance_score: number
}

interface EncryptionMetrics {
  total_encrypted_data: number
  encryption_coverage: number
  active_keys: number
  keys_pending_rotation: number
  policy_violations: number
  security_score: number
  data_at_rest_encrypted: number
  data_in_transit_encrypted: number
  backup_encryption_status: number
  key_rotation_compliance: number
}

interface SecurityEvent {
  id: string
  type: 'key_rotation' | 'policy_violation' | 'encryption_failure' | 'unauthorized_access' | 'key_compromise'
  severity: 'info' | 'warning' | 'error' | 'critical'
  title: string
  description: string
  timestamp: string
  affected_resources: string[]
  remediation_status: 'pending' | 'in_progress' | 'resolved'
  remediation_actions: string[]
}

export default function EncryptionSecurityPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [encryptionKeys, setEncryptionKeys] = useState<EncryptionKey[]>([])
  const [securityPolicies, setSecurityPolicies] = useState<SecurityPolicy[]>([])
  const [metrics, setMetrics] = useState<EncryptionMetrics | null>(null)
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [_error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'keys' | 'policies' | 'monitoring'>('overview')
  const [selectedKey, setSelectedKey] = useState<EncryptionKey | null>(null)

  // Check permissions
  const canManageSecurity = user && ['admin', 'security_officer'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canManageSecurity) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canManageSecurity, router])

  // Load data
  useEffect(() => {
    if (user && canManageSecurity) {
      loadSecurityData()
    }
  }, [user, canManageSecurity, loadSecurityData])

  const loadSecurityData = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setEncryptionKeys(generateMockEncryptionKeys())
      setSecurityPolicies(generateMockSecurityPolicies())
      setMetrics(generateMockMetrics())
      setSecurityEvents(generateMockSecurityEvents())
    } catch (error) {
      setError('Failed to load security data')
      console.error('Security data error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateMockEncryptionKeys = (): EncryptionKey[] => [
    {
      id: 'key_1',
      name: 'Primary Data Encryption Key',
      type: 'AES-256',
      purpose: 'data_encryption',
      status: 'active',
      created_date: '2024-01-01T00:00:00Z',
      expiry_date: '2025-01-01T00:00:00Z',
      last_rotation: '2024-01-01T00:00:00Z',
      next_rotation: '2024-07-01T00:00:00Z',
      usage_count: 1247563,
      protected_resources: ['client_data', 'case_files', 'documents'],
      compliance_standards: ['FIPS 140-2', 'Common Criteria', 'HIPAA'],
      key_strength: 256
    },
    {
      id: 'key_2',
      name: 'Backup Encryption Key',
      type: 'AES-256',
      purpose: 'backup_encryption',
      status: 'active',
      created_date: '2024-01-01T00:00:00Z',
      expiry_date: '2025-01-01T00:00:00Z',
      last_rotation: '2024-01-01T00:00:00Z',
      next_rotation: '2024-06-01T00:00:00Z',
      usage_count: 89456,
      protected_resources: ['backup_storage', 'archived_data'],
      compliance_standards: ['FIPS 140-2', 'SOC 2'],
      key_strength: 256
    },
    {
      id: 'key_3',
      name: 'Communication Encryption Key',
      type: 'RSA-4096',
      purpose: 'communication',
      status: 'pending_rotation',
      created_date: '2023-07-01T00:00:00Z',
      expiry_date: '2024-07-01T00:00:00Z',
      last_rotation: '2023-07-01T00:00:00Z',
      next_rotation: '2024-02-01T00:00:00Z',
      usage_count: 234789,
      protected_resources: ['email_communication', 'api_endpoints'],
      compliance_standards: ['TLS 1.3', 'PCI DSS'],
      key_strength: 4096
    },
    {
      id: 'key_4',
      name: 'Database Encryption Key',
      type: 'ChaCha20-Poly1305',
      purpose: 'data_encryption',
      status: 'active',
      created_date: '2024-01-15T00:00:00Z',
      expiry_date: '2025-01-15T00:00:00Z',
      last_rotation: '2024-01-15T00:00:00Z',
      next_rotation: '2024-07-15T00:00:00Z',
      usage_count: 567891,
      protected_resources: ['database', 'user_credentials'],
      compliance_standards: ['FIPS 140-2', 'NIST'],
      key_strength: 256
    }
  ]

  const generateMockSecurityPolicies = (): SecurityPolicy[] => [
    {
      id: 'policy_1',
      name: 'Data Encryption at Rest',
      description: 'Mandatory encryption for all stored data using AES-256 or equivalent',
      policy_type: 'encryption',
      enforcement_level: 'mandatory',
      applicable_resources: ['database', 'file_storage', 'backups'],
      requirements: [
        'All data must be encrypted using AES-256 or stronger',
        'Encryption keys must be rotated every 6 months',
        'Key management must follow FIPS 140-2 standards'
      ],
      compliance_frameworks: ['HIPAA', 'SOC 2', 'GDPR'],
      created_by: 'admin',
      created_date: '2024-01-01T00:00:00Z',
      last_modified: '2024-01-10T00:00:00Z',
      violations_count: 0,
      compliance_score: 98.5
    },
    {
      id: 'policy_2',
      name: 'Data Classification and Handling',
      description: 'Classification requirements for all organizational data',
      policy_type: 'data_classification',
      enforcement_level: 'mandatory',
      applicable_resources: ['all_data'],
      requirements: [
        'All data must be classified as Public, Internal, Confidential, or Restricted',
        'Handling procedures must match classification level',
        'Access controls must be applied based on classification'
      ],
      compliance_frameworks: ['HIPAA', 'State Bar Requirements'],
      created_by: 'admin',
      created_date: '2024-01-01T00:00:00Z',
      last_modified: '2024-01-05T00:00:00Z',
      violations_count: 3,
      compliance_score: 94.2
    },
    {
      id: 'policy_3',
      name: 'Network Security Controls',
      description: 'Required security controls for network infrastructure',
      policy_type: 'network_security',
      enforcement_level: 'mandatory',
      applicable_resources: ['network_infrastructure', 'endpoints'],
      requirements: [
        'All network traffic must use TLS 1.3 or higher',
        'VPN access required for remote connections',
        'Network segmentation for sensitive systems'
      ],
      compliance_frameworks: ['NIST Cybersecurity Framework', 'ISO 27001'],
      created_by: 'admin',
      created_date: '2024-01-01T00:00:00Z',
      last_modified: '2024-01-01T00:00:00Z',
      violations_count: 1,
      compliance_score: 96.8
    }
  ]

  const generateMockMetrics = (): EncryptionMetrics => ({
    total_encrypted_data: 2847.5,
    encryption_coverage: 99.2,
    active_keys: 4,
    keys_pending_rotation: 1,
    policy_violations: 4,
    security_score: 9.1,
    data_at_rest_encrypted: 99.8,
    data_in_transit_encrypted: 98.7,
    backup_encryption_status: 100,
    key_rotation_compliance: 87.5
  })

  const generateMockSecurityEvents = (): SecurityEvent[] => [
    {
      id: 'event_1',
      type: 'key_rotation',
      severity: 'info',
      title: 'Scheduled Key Rotation Completed',
      description: 'Primary Data Encryption Key successfully rotated according to schedule',
      timestamp: '2024-01-15T10:30:00Z',
      affected_resources: ['client_data', 'case_files'],
      remediation_status: 'resolved',
      remediation_actions: ['Key rotation completed', 'Updated key references', 'Verified encryption integrity']
    },
    {
      id: 'event_2',
      type: 'policy_violation',
      severity: 'warning',
      title: 'Data Classification Violation Detected',
      description: 'Unclassified documents found in restricted access area',
      timestamp: '2024-01-15T09:15:00Z',
      affected_resources: ['document_storage'],
      remediation_status: 'in_progress',
      remediation_actions: ['Identify unclassified documents', 'Apply proper classification', 'Update access controls']
    },
    {
      id: 'event_3',
      type: 'unauthorized_access',
      severity: 'error',
      title: 'Unauthorized Encryption Key Access Attempt',
      description: 'Failed attempt to access encryption keys from unauthorized IP address',
      timestamp: '2024-01-15T08:45:00Z',
      affected_resources: ['key_management_system'],
      remediation_status: 'resolved',
      remediation_actions: ['Blocked IP address', 'Enhanced monitoring activated', 'Security team notified']
    }
  ]

  const rotateKey = async (keyId: string) => {
    try {
      setLoading(true)
      // Simulate key rotation API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setEncryptionKeys(prev => prev.map(key => 
        key.id === keyId 
          ? { 
              ...key, 
              status: 'active', 
              last_rotation: new Date().toISOString(),
              next_rotation: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
              usage_count: 0
            }
          : key
      ))
      
      // Add success event
      const newEvent: SecurityEvent = {
        id: `event_${Date.now()}`,
        type: 'key_rotation',
        severity: 'info',
        title: 'Manual Key Rotation Completed',
        description: `Encryption key ${keyId} manually rotated by ${user?.first_name} ${user?.last_name}`,
        timestamp: new Date().toISOString(),
        affected_resources: ['encryption_system'],
        remediation_status: 'resolved',
        remediation_actions: ['Key rotated successfully', 'System integrity verified']
      }
      
      setSecurityEvents(prev => [newEvent, ...prev])
    } catch (_error) {
      setError('Failed to rotate key')
    } finally {
      setLoading(false)
    }
  }

  const getKeyStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'expired': return 'text-red-600 bg-red-100'
      case 'revoked': return 'text-gray-600 bg-gray-100'
      case 'pending_rotation': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const getPolicyEnforcementColor = (level: string) => {
    switch (level) {
      case 'mandatory': return 'text-red-600 bg-red-100'
      case 'recommended': return 'text-yellow-600 bg-yellow-100'
      case 'optional': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getEventSeverityColor = (severity: string) => {
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

  if (!user || !canManageSecurity) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mr-4">
                <LockClosedIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Encryption & Security Controls</h1>
                <p className="text-gray-600 mt-1">
                  Enterprise-grade encryption and security policy management
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
                onClick={() => router.push('/security')}
                className="btn-primary flex items-center"
              >
                <ShieldCheckIcon className="h-4 w-4 mr-2" />
                Security Dashboard
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Security Overview', icon: ChartBarIcon },
                { id: 'keys', name: 'Encryption Keys', icon: KeyIcon },
                { id: 'policies', name: 'Security Policies', icon: ShieldCheckIcon },
                { id: 'monitoring', name: 'Security Monitoring', icon: ComputerDesktopIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'keys' | 'policies' | 'monitoring')}
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
                {/* Security Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Security Score</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.security_score}/10</p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3">
                        <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(metrics.security_score / 10) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Encryption Coverage</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.encryption_coverage}%</p>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3">
                        <LockClosedIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${metrics.encryption_coverage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Encryption Keys</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.active_keys}</p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <KeyIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">
                        {metrics.keys_pending_rotation} pending rotation
                      </p>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Policy Violations</p>
                        <p className="text-3xl font-bold text-gray-900">{metrics.policy_violations}</p>
                      </div>
                      <div className="bg-red-100 rounded-lg p-3">
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-xs text-gray-500">
                        Requires immediate attention
                      </p>
                    </div>
                  </div>
                </div>

                {/* Encryption Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Data at Rest</h4>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{metrics.data_at_rest_encrypted}%</div>
                      <div className="text-sm text-gray-600">Encrypted</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${metrics.data_at_rest_encrypted}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Data in Transit</h4>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{metrics.data_in_transit_encrypted}%</div>
                      <div className="text-sm text-gray-600">Encrypted</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${metrics.data_in_transit_encrypted}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Backup Encryption</h4>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{metrics.backup_encryption_status}%</div>
                      <div className="text-sm text-gray-600">Protected</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${metrics.backup_encryption_status}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Key Rotation</h4>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{metrics.key_rotation_compliance}%</div>
                      <div className="text-sm text-gray-600">Compliant</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: `${metrics.key_rotation_compliance}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Security Events */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Security Events</h3>
                    <button
                      onClick={() => setActiveTab('monitoring')}
                      className="btn-secondary text-sm"
                    >
                      View All Events
                    </button>
                  </div>
                  <div className="space-y-4">
                    {securityEvents.slice(0, 3).map((event) => (
                      <div 
                        key={event.id}
                        className={`border-l-4 p-4 rounded-r-lg ${getEventSeverityColor(event.severity)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm mt-1">{event.description}</p>
                            <p className="text-xs mt-2 opacity-75">
                              {new Date(event.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.remediation_status === 'resolved' ? 'bg-green-100 text-green-800' :
                            event.remediation_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {event.remediation_status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Encryption Keys Tab */}
            {activeTab === 'keys' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Key Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type & Purpose
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Rotation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Rotation
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Usage Count
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {encryptionKeys.map((key) => (
                          <tr key={key.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <KeyIcon className="h-4 w-4 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{key.name}</div>
                                  <div className="text-sm text-gray-500">{key.key_strength}-bit encryption</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{key.type}</div>
                              <div className="text-sm text-gray-500">{key.purpose.replace('_', ' ')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getKeyStatusColor(key.status)}`}>
                                {key.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(key.last_rotation).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(key.next_rotation).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {key.usage_count.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedKey(key)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                {key.status === 'pending_rotation' && (
                                  <button
                                    onClick={() => rotateKey(key.id)}
                                    className="text-green-600 hover:text-green-900"
                                    title="Rotate Key"
                                  >
                                    <ArrowPathIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Security Policies Tab */}
            {activeTab === 'policies' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Policy Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Enforcement Level
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Compliance Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Violations
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Modified
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {securityPolicies.map((policy) => (
                          <tr key={policy.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                                <div className="text-sm text-gray-500">{policy.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {policy.policy_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPolicyEnforcementColor(policy.enforcement_level)}`}>
                                {policy.enforcement_level}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">{policy.compliance_score}%</div>
                                <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      policy.compliance_score >= 95 ? 'bg-green-600' :
                                      policy.compliance_score >= 85 ? 'bg-yellow-600' : 'bg-red-600'
                                    }`}
                                    style={{ width: `${policy.compliance_score}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                policy.violations_count === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {policy.violations_count}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(policy.last_modified).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-blue-600 hover:text-blue-900">
                                <EyeIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Security Monitoring Tab */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Events Timeline</h3>
                  <div className="space-y-4">
                    {securityEvents.map((event) => (
                      <div 
                        key={event.id}
                        className={`border-l-4 p-4 rounded-r-lg ${getEventSeverityColor(event.severity)}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="font-medium">{event.title}</h4>
                              <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                event.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                event.severity === 'error' ? 'bg-orange-100 text-orange-800' :
                                event.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {event.severity}
                              </span>
                            </div>
                            <p className="text-sm mt-1 text-gray-700">{event.description}</p>
                            <div className="flex items-center mt-2 text-xs text-gray-500">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              {new Date(event.timestamp).toLocaleString()}
                            </div>
                            {event.affected_resources.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Affected Resources: </span>
                                {event.affected_resources.map((resource, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                                    {resource}
                                  </span>
                                ))}
                              </div>
                            )}
                            {event.remediation_actions.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500">Remediation Actions:</span>
                                <ul className="mt-1 text-xs text-gray-600">
                                  {event.remediation_actions.map((action, index) => (
                                    <li key={index} className="flex items-center">
                                      <CheckCircleIcon className="h-3 w-3 text-green-600 mr-1" />
                                      {action}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            event.remediation_status === 'resolved' ? 'bg-green-100 text-green-800' :
                            event.remediation_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {event.remediation_status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Key Details Modal */}
      {selectedKey && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Encryption Key Details</h3>
                <button
                  onClick={() => setSelectedKey(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedKey.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Encryption Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedKey.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Key Strength</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedKey.key_strength} bits</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedKey.purpose.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedKey.created_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedKey.expiry_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Protected Resources</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedKey.protected_resources.map((resource, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {resource.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Compliance Standards</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedKey.compliance_standards.map((standard, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {standard}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Usage Count</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedKey.usage_count.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Next Rotation</label>
                    <p className="mt-1 text-sm text-gray-900">{new Date(selectedKey.next_rotation).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setSelectedKey(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
                {selectedKey.status === 'pending_rotation' && (
                  <button
                    onClick={() => {
                      rotateKey(selectedKey.id)
                      setSelectedKey(null)
                    }}
                    className="btn-primary"
                  >
                    Rotate Key Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}