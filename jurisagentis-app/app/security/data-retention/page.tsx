/**
 * Data Retention & Deletion Policies - HIPAA-compliant data lifecycle management
 * Automated retention policies with legal hold and secure deletion capabilities
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  ClockIcon,
  TrashIcon,
  LockClosedIcon,
  FolderIcon,
  UserIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  ShieldCheckIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'

interface RetentionPolicy {
  id: string
  name: string
  description: string
  resource_types: string[]
  retention_period: number
  retention_unit: 'days' | 'months' | 'years'
  auto_delete: boolean
  legal_hold_override: boolean
  trigger_conditions: string[]
  deletion_method: 'soft_delete' | 'hard_delete' | 'archive'
  compliance_requirements: string[]
  created_by: string
  created_at: string
  last_modified: string
  status: 'active' | 'inactive' | 'draft'
  affected_records_count: number
}

interface DataRecord {
  id: string
  resource_type: 'client' | 'case' | 'document' | 'communication' | 'billing'
  resource_name: string
  created_date: string
  retention_policy_id: string
  retention_expires: string
  legal_hold: boolean
  legal_hold_reason?: string
  deletion_scheduled: boolean
  deletion_date?: string
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted'
  compliance_flags: string[]
  size_mb: number
  last_accessed: string
}

interface RetentionMetrics {
  total_policies: number
  active_policies: number
  records_under_retention: number
  pending_deletion: number
  legal_holds_active: number
  storage_scheduled_for_deletion: number
  compliance_violations: number
  automated_deletions_this_month: number
}

export default function DataRetentionPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [policies, setPolicies] = useState<RetentionPolicy[]>([])
  const [dataRecords, setDataRecords] = useState<DataRecord[]>([])
  const [metrics, setMetrics] = useState<RetentionMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [, setError] = useState('')
  const [showCreatePolicy, setShowCreatePolicy] = useState(false)
  const [activeTab, setActiveTab] = useState<'policies' | 'records' | 'holds' | 'reports'>('policies')

  // Form state for new policy
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    resource_types: [],
    retention_period: 7,
    retention_unit: 'years' as const,
    auto_delete: false,
    legal_hold_override: true,
    deletion_method: 'archive' as const
  })

  // Check permissions
  const canManageRetention = user && ['admin', 'security_officer'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canManageRetention) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canManageRetention, router])

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setPolicies(generateMockPolicies())
        setDataRecords(generateMockDataRecords())
        setMetrics(generateMockMetrics())
      } catch (error) {
        setError('Failed to load retention data')
        console.error('Retention data error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && canManageRetention) {
      loadData()
    }
  }, [user, canManageRetention])


  const generateMockPolicies = (): RetentionPolicy[] => [
    {
      id: 'policy_1',
      name: 'Client Files - Standard Retention',
      description: 'Standard 7-year retention for client files and case documents per legal requirements',
      resource_types: ['client', 'case', 'document'],
      retention_period: 7,
      retention_unit: 'years',
      auto_delete: false,
      legal_hold_override: true,
      trigger_conditions: ['case_closed', 'client_inactive'],
      deletion_method: 'archive',
      compliance_requirements: ['State Bar Requirements', 'HIPAA', 'Legal Professional Standards'],
      created_by: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      last_modified: '2024-01-10T00:00:00Z',
      status: 'active',
      affected_records_count: 15234
    },
    {
      id: 'policy_2',
      name: 'Email Communications - Short Term',
      description: '3-year retention for routine email communications and administrative correspondence',
      resource_types: ['communication'],
      retention_period: 3,
      retention_unit: 'years',
      auto_delete: true,
      legal_hold_override: true,
      trigger_conditions: ['communication_date'],
      deletion_method: 'soft_delete',
      compliance_requirements: ['Email Retention Policy', 'Discovery Rules'],
      created_by: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      last_modified: '2024-01-05T00:00:00Z',
      status: 'active',
      affected_records_count: 45678
    },
    {
      id: 'policy_3',
      name: 'Billing Records - IRS Compliance',
      description: '7-year retention for billing and financial records per IRS requirements',
      resource_types: ['billing'],
      retention_period: 7,
      retention_unit: 'years',
      auto_delete: false,
      legal_hold_override: false,
      trigger_conditions: ['fiscal_year_end'],
      deletion_method: 'archive',
      compliance_requirements: ['IRS Requirements', 'SOX Compliance', 'State Tax Requirements'],
      created_by: 'admin',
      created_at: '2024-01-01T00:00:00Z',
      last_modified: '2024-01-01T00:00:00Z',
      status: 'active',
      affected_records_count: 8945
    },
    {
      id: 'policy_4',
      name: 'Temporary Documents - Quick Purge',
      description: 'Short-term retention for temporary documents and draft materials',
      resource_types: ['document'],
      retention_period: 30,
      retention_unit: 'days',
      auto_delete: true,
      legal_hold_override: false,
      trigger_conditions: ['document_status_draft', 'marked_temporary'],
      deletion_method: 'hard_delete',
      compliance_requirements: ['Data Minimization', 'Privacy Protection'],
      created_by: 'admin',
      created_at: '2024-01-15T00:00:00Z',
      last_modified: '2024-01-15T00:00:00Z',
      status: 'draft',
      affected_records_count: 1234
    }
  ]

  const generateMockDataRecords = (): DataRecord[] => {
    const records: DataRecord[] = []
    const resourceTypes: DataRecord['resource_type'][] = ['client', 'case', 'document', 'communication', 'billing']
    const classifications: DataRecord['data_classification'][] = ['public', 'internal', 'confidential', 'restricted']
    
    for (let i = 0; i < 50; i++) {
      const createdDate = new Date(Date.now() - Math.random() * 5 * 365 * 24 * 60 * 60 * 1000)
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
      const retentionYears = resourceType === 'communication' ? 3 : 7
      const retentionExpires = new Date(createdDate.getTime() + retentionYears * 365 * 24 * 60 * 60 * 1000)
      
      records.push({
        id: `record_${i}`,
        resource_type: resourceType,
        resource_name: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} ${i + 1}`,
        created_date: createdDate.toISOString(),
        retention_policy_id: `policy_${Math.floor(Math.random() * 3) + 1}`,
        retention_expires: retentionExpires.toISOString(),
        legal_hold: Math.random() > 0.9,
        legal_hold_reason: Math.random() > 0.9 ? 'Ongoing litigation case #12345' : undefined,
        deletion_scheduled: retentionExpires.getTime() < Date.now() && Math.random() > 0.7,
        deletion_date: retentionExpires.getTime() < Date.now() && Math.random() > 0.7 ? 
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        data_classification: classifications[Math.floor(Math.random() * classifications.length)],
        compliance_flags: Math.random() > 0.8 ? ['HIPAA_PROTECTED'] : [],
        size_mb: Math.random() * 100,
        last_accessed: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
      })
    }
    
    return records.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
  }

  const generateMockMetrics = (): RetentionMetrics => ({
    total_policies: 4,
    active_policies: 3,
    records_under_retention: 71091,
    pending_deletion: 234,
    legal_holds_active: 12,
    storage_scheduled_for_deletion: 45.7,
    compliance_violations: 2,
    automated_deletions_this_month: 89
  })

  const createPolicy = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const policy: RetentionPolicy = {
        id: `policy_${Date.now()}`,
        ...newPolicy,
        resource_types: ['document'], // Simplified for demo
        trigger_conditions: ['document_created'],
        compliance_requirements: ['General Data Protection'],
        created_by: user!.id,
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        status: 'active',
        affected_records_count: 0
      }
      
      setPolicies(prev => [...prev, policy])
      setShowCreatePolicy(false)
      setNewPolicy({
        name: '',
        description: '',
        resource_types: [],
        retention_period: 7,
        retention_unit: 'years',
        auto_delete: false,
        legal_hold_override: true,
        deletion_method: 'archive'
      })
    } catch {
      setError('Failed to create policy')
    }
  }

  const applyLegalHold = async (recordId: string, reason: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 200))
      
      setDataRecords(prev => prev.map(record => 
        record.id === recordId 
          ? { ...record, legal_hold: true, legal_hold_reason: reason, deletion_scheduled: false, deletion_date: undefined }
          : record
      ))
    } catch {
      setError('Failed to apply legal hold')
    }
  }

  const getRetentionStatus = (record: DataRecord) => {
    if (record.legal_hold) return { status: 'Legal Hold', color: 'text-red-600 bg-red-100' }
    if (record.deletion_scheduled) return { status: 'Deletion Scheduled', color: 'text-orange-600 bg-orange-100' }
    if (new Date(record.retention_expires) < new Date()) return { status: 'Expired', color: 'text-yellow-600 bg-yellow-100' }
    return { status: 'Active', color: 'text-green-600 bg-green-100' }
  }

  const getDataClassificationColor = (classification: string) => {
    switch (classification) {
      case 'restricted': return 'text-red-600 bg-red-100'
      case 'confidential': return 'text-orange-600 bg-orange-100'
      case 'internal': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canManageRetention) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-2 mr-4">
                <ArchiveBoxIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Retention & Deletion Policies</h1>
                <p className="text-gray-600 mt-1">
                  HIPAA-compliant data lifecycle management and automated retention
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreatePolicy(true)}
                className="btn-secondary flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Policy
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
                { id: 'policies', name: 'Retention Policies', icon: DocumentTextIcon },
                { id: 'records', name: 'Data Records', icon: FolderIcon },
                { id: 'holds', name: 'Legal Holds', icon: LockClosedIcon },
                { id: 'reports', name: 'Compliance Reports', icon: ClockIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'policies' | 'records' | 'holds' | 'reports')}
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
            {/* Metrics Overview */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Policies</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics.active_policies}</p>
                    </div>
                    <div className="bg-blue-100 rounded-lg p-2">
                      <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Records Under Retention</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics.records_under_retention.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-100 rounded-lg p-2">
                      <FolderIcon className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pending Deletion</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics.pending_deletion}</p>
                    </div>
                    <div className="bg-orange-100 rounded-lg p-2">
                      <TrashIcon className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Legal Holds Active</p>
                      <p className="text-2xl font-bold text-gray-900">{metrics.legal_holds_active}</p>
                    </div>
                    <div className="bg-red-100 rounded-lg p-2">
                      <LockClosedIcon className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Policies Tab */}
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
                            Resource Types
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Retention Period
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Auto Delete
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Affected Records
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {policies.map((policy) => (
                          <tr key={policy.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{policy.name}</div>
                                <div className="text-sm text-gray-500">{policy.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {policy.resource_types.map((type, index) => (
                                  <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {type}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {policy.retention_period} {policy.retention_unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                policy.auto_delete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {policy.auto_delete ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {policy.affected_records_count.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                policy.status === 'active' ? 'bg-green-100 text-green-800' :
                                policy.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {policy.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex space-x-2">
                                <button className="text-blue-600 hover:text-blue-900">
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                                <button className="text-green-600 hover:text-green-900">
                                  <PencilIcon className="h-4 w-4" />
                                </button>
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

            {/* Data Records Tab */}
            {activeTab === 'records' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Resource
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Created Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Retention Expires
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Classification
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dataRecords.slice(0, 20).map((record) => {
                          const retentionStatus = getRetentionStatus(record)
                          return (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-8 w-8">
                                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                      {record.resource_type === 'document' ? <DocumentTextIcon className="h-4 w-4 text-blue-600" /> :
                                       record.resource_type === 'client' ? <UserIcon className="h-4 w-4 text-blue-600" /> :
                                       <FolderIcon className="h-4 w-4 text-blue-600" />}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">{record.resource_name}</div>
                                    <div className="text-sm text-gray-500">{record.resource_type}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(record.created_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {new Date(record.retention_expires).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDataClassificationColor(record.data_classification)}`}>
                                  {record.data_classification}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${retentionStatus.color}`}>
                                  {retentionStatus.status}
                                </span>
                                {record.legal_hold && (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      <LockClosedIcon className="h-3 w-3 mr-1" />
                                      Legal Hold
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {record.size_mb.toFixed(1)} MB
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex space-x-2">
                                  {!record.legal_hold && (
                                    <button
                                      onClick={() => applyLegalHold(record.id, 'Manual hold applied')}
                                      className="text-red-600 hover:text-red-900"
                                      title="Apply Legal Hold"
                                    >
                                      <LockClosedIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                  <button className="text-blue-600 hover:text-blue-900">
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Policy Modal */}
      {showCreatePolicy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Retention Policy</h3>
                <button
                  onClick={() => setShowCreatePolicy(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Policy Name</label>
                  <input
                    type="text"
                    value={newPolicy.name}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 input-field"
                    placeholder="Enter policy name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newPolicy.description}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 input-field"
                    placeholder="Enter policy description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Retention Period</label>
                    <input
                      type="number"
                      value={newPolicy.retention_period}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, retention_period: parseInt(e.target.value) }))}
                      className="mt-1 input-field"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <select
                      value={newPolicy.retention_unit}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, retention_unit: e.target.value as 'days' | 'months' | 'years' }))}
                      className="mt-1 input-field"
                    >
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                      <option value="years">Years</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Deletion Method</label>
                  <select
                    value={newPolicy.deletion_method}
                    onChange={(e) => setNewPolicy(prev => ({ ...prev, deletion_method: e.target.value as 'soft_delete' | 'hard_delete' | 'archive' }))}
                    className="mt-1 input-field"
                  >
                    <option value="soft_delete">Soft Delete (Mark as deleted)</option>
                    <option value="hard_delete">Hard Delete (Permanent removal)</option>
                    <option value="archive">Archive (Move to long-term storage)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newPolicy.auto_delete}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, auto_delete: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable automatic deletion</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newPolicy.legal_hold_override}
                      onChange={(e) => setNewPolicy(prev => ({ ...prev, legal_hold_override: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow legal hold override</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreatePolicy(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={createPolicy}
                  disabled={!newPolicy.name || !newPolicy.description}
                  className="btn-primary"
                >
                  Create Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}