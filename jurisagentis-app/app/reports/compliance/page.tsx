'use client'

import { useState } from 'react'
import { 
  ShieldCheckIcon, 
  DocumentTextIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  CalendarIcon,
  ScaleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

interface ComplianceMetrics {
  overall_score: number
  violations_count: number
  pending_reviews: number
  last_audit_date: string
  next_audit_due: string
  regulations_tracked: number
  compliance_rate: number
  risk_level: 'low' | 'medium' | 'high'
}

interface RegulatoryFramework {
  id: string
  name: string
  description: string
  compliance_status: 'compliant' | 'partial' | 'non_compliant'
  last_review: string
  next_review: string
  requirements_count: number
  violations: number
  risk_score: number
}

interface ComplianceViolation {
  id: string
  regulation: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved'
  discovered_date: string
  due_date: string
  assigned_to: string
  remediation_plan: string
}

interface AuditTrail {
  id: string
  audit_type: string
  date: string
  auditor: string
  scope: string
  findings: number
  status: 'completed' | 'in_progress' | 'scheduled'
  compliance_score: number
  report_url: string
}

export default function ComplianceReporting() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState('last_12_months')
  const [_selectedRegulation, _setSelectedRegulation] = useState('all')

  const complianceMetrics: ComplianceMetrics = {
    overall_score: 94.2,
    violations_count: 3,
    pending_reviews: 7,
    last_audit_date: '2024-01-15',
    next_audit_due: '2024-07-15',
    regulations_tracked: 12,
    compliance_rate: 96.8,
    risk_level: 'low'
  }

  const regulatoryFrameworks: RegulatoryFramework[] = [
    {
      id: '1',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act',
      compliance_status: 'compliant',
      last_review: '2024-01-15',
      next_review: '2024-07-15',
      requirements_count: 47,
      violations: 0,
      risk_score: 15
    },
    {
      id: '2',
      name: 'SOX',
      description: 'Sarbanes-Oxley Act',
      compliance_status: 'compliant',
      last_review: '2023-12-20',
      next_review: '2024-06-20',
      requirements_count: 23,
      violations: 0,
      risk_score: 8
    },
    {
      id: '3',
      name: 'State Bar Rules',
      description: 'Professional Conduct and Ethics',
      compliance_status: 'partial',
      last_review: '2024-02-01',
      next_review: '2024-05-01',
      requirements_count: 156,
      violations: 2,
      risk_score: 35
    },
    {
      id: '4',
      name: 'GDPR',
      description: 'General Data Protection Regulation',
      compliance_status: 'compliant',
      last_review: '2024-01-10',
      next_review: '2024-07-10',
      requirements_count: 67,
      violations: 0,
      risk_score: 12
    }
  ]

  const violations: ComplianceViolation[] = [
    {
      id: '1',
      regulation: 'State Bar Rules',
      description: 'Client communication response time exceeded 48-hour requirement',
      severity: 'medium',
      status: 'in_progress',
      discovered_date: '2024-02-15',
      due_date: '2024-03-15',
      assigned_to: 'Sarah Johnson',
      remediation_plan: 'Implement automated client response tracking system'
    },
    {
      id: '2',
      regulation: 'State Bar Rules',
      description: 'Trust account reconciliation delayed by 3 days',
      severity: 'high',
      status: 'open',
      discovered_date: '2024-02-20',
      due_date: '2024-03-05',
      assigned_to: 'Michael Chen',
      remediation_plan: 'Enhanced automated reconciliation process'
    },
    {
      id: '3',
      regulation: 'HIPAA',
      description: 'Minor documentation gap in access log review',
      severity: 'low',
      status: 'resolved',
      discovered_date: '2024-01-28',
      due_date: '2024-02-28',
      assigned_to: 'David Rodriguez',
      remediation_plan: 'Updated log review procedures'
    }
  ]

  const auditTrails: AuditTrail[] = [
    {
      id: '1',
      audit_type: 'HIPAA Compliance',
      date: '2024-01-15',
      auditor: 'External - ComplianceCorp',
      scope: 'Full System Review',
      findings: 2,
      status: 'completed',
      compliance_score: 96.5,
      report_url: '/reports/audit_2024_01_hipaa.pdf'
    },
    {
      id: '2',
      audit_type: 'State Bar Ethics',
      date: '2024-02-01',
      auditor: 'Internal - Legal Team',
      scope: 'Client Handling Procedures',
      findings: 3,
      status: 'completed',
      compliance_score: 92.1,
      report_url: '/reports/audit_2024_02_ethics.pdf'
    },
    {
      id: '3',
      audit_type: 'Financial Controls',
      date: '2024-03-01',
      auditor: 'External - FinAudit Inc',
      scope: 'Trust Account Management',
      findings: 0,
      status: 'in_progress',
      compliance_score: 0,
      report_url: ''
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': case 'completed': case 'resolved': return 'text-green-600 bg-green-50'
      case 'partial': case 'in_progress': return 'text-yellow-600 bg-yellow-50'
      case 'non_compliant': case 'open': return 'text-red-600 bg-red-50'
      case 'scheduled': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-orange-600 bg-orange-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'regulations', name: 'Regulations', icon: ScaleIcon },
    { id: 'violations', name: 'Violations', icon: ExclamationTriangleIcon },
    { id: 'audits', name: 'Audit Trails', icon: DocumentDuplicateIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Compliance & Regulatory Reporting</h1>
                  <p className="text-sm text-gray-500">Monitor regulatory compliance and audit requirements</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="last_30_days">Last 30 Days</option>
                  <option value="last_3_months">Last 3 Months</option>
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="last_12_months">Last 12 Months</option>
                </select>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Overall Compliance Score</dt>
                        <dd className="text-lg font-medium text-gray-900">{complianceMetrics.overall_score}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Open Violations</dt>
                        <dd className="text-lg font-medium text-gray-900">{complianceMetrics.violations_count}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ClockIcon className="h-6 w-6 text-yellow-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Pending Reviews</dt>
                        <dd className="text-lg font-medium text-gray-900">{complianceMetrics.pending_reviews}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CalendarIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Next Audit Due</dt>
                        <dd className="text-lg font-medium text-gray-900">{complianceMetrics.next_audit_due}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Compliance Status by Regulation</h3>
                  <div className="space-y-4">
                    {regulatoryFrameworks.map((framework) => (
                      <div key={framework.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{framework.name}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(framework.compliance_status)}`}>
                              {framework.compliance_status === 'compliant' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
                              {framework.compliance_status === 'non_compliant' && <XCircleIcon className="h-3 w-3 mr-1" />}
                              {framework.compliance_status}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span>Risk Score: {framework.risk_score}</span>
                            <span className="mx-2">•</span>
                            <span>Next Review: {framework.next_review}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Audit Activity</h3>
                  <div className="space-y-4">
                    {auditTrails.slice(0, 4).map((audit) => (
                      <div key={audit.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">{audit.audit_type}</p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(audit.status)}`}>
                              {audit.status}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span>{audit.date}</span>
                            <span className="mx-2">•</span>
                            <span>{audit.auditor}</span>
                            {audit.compliance_score > 0 && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Score: {audit.compliance_score}%</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regulations' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Regulatory Frameworks</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Compliance status and requirements for all tracked regulations
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {regulatoryFrameworks.map((framework) => (
                <li key={framework.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900">{framework.name}</h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(framework.compliance_status)}`}>
                          {framework.compliance_status === 'compliant' && <CheckCircleIcon className="h-4 w-4 mr-1" />}
                          {framework.compliance_status === 'non_compliant' && <XCircleIcon className="h-4 w-4 mr-1" />}
                          {framework.compliance_status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{framework.description}</p>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Requirements:</span>
                          <span className="ml-1 font-medium">{framework.requirements_count}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Violations:</span>
                          <span className="ml-1 font-medium text-red-600">{framework.violations}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Risk Score:</span>
                          <span className="ml-1 font-medium">{framework.risk_score}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Next Review:</span>
                          <span className="ml-1 font-medium">{framework.next_review}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'violations' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Compliance Violations</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Track and manage compliance violations and remediation efforts
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {violations.map((violation) => (
                <li key={violation.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{violation.regulation}</h4>
                        <div className="flex space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(violation.status)}`}>
                            {violation.status}
                          </span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{violation.description}</p>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Discovered:</span>
                          <span className="ml-1 font-medium">{violation.discovered_date}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Due Date:</span>
                          <span className="ml-1 font-medium">{violation.due_date}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Assigned To:</span>
                          <span className="ml-1 font-medium">{violation.assigned_to}</span>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-500 text-sm">Remediation Plan:</span>
                        <p className="mt-1 text-sm text-gray-900">{violation.remediation_plan}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'audits' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Audit Trail</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Complete history of compliance audits and assessments
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {auditTrails.map((audit) => (
                <li key={audit.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-medium text-gray-900">{audit.audit_type}</h4>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(audit.status)}`}>
                          {audit.status}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Date:</span>
                          <span className="ml-1 font-medium">{audit.date}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Auditor:</span>
                          <span className="ml-1 font-medium">{audit.auditor}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Findings:</span>
                          <span className="ml-1 font-medium">{audit.findings}</span>
                        </div>
                        {audit.compliance_score > 0 && (
                          <div>
                            <span className="text-gray-500">Score:</span>
                            <span className="ml-1 font-medium">{audit.compliance_score}%</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-gray-500 text-sm">Scope:</span>
                        <span className="ml-1 text-sm text-gray-900">{audit.scope}</span>
                      </div>
                      {audit.report_url && (
                        <div className="mt-2">
                          <a
                            href={audit.report_url}
                            className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            <DocumentTextIcon className="h-4 w-4 mr-1" />
                            Download Report
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}