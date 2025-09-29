/**
 * Practice Performance Dashboards - Comprehensive law firm operations analytics
 * Real-time performance tracking with attorney productivity and case velocity metrics
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

interface PracticeMetrics {
  total_cases: number
  active_cases: number
  cases_closed_this_month: number
  average_case_duration: number
  case_velocity: number
  deadline_compliance: number
  client_satisfaction: number
  attorney_utilization: number
  billable_hour_target: number
  billable_hours_actual: number
  revenue_per_hour: number
  case_win_rate: number
}

interface AttorneyProductivity {
  attorney_id: string
  attorney_name: string
  role: string
  billable_hours_target: number
  billable_hours_actual: number
  utilization_rate: number
  cases_active: number
  cases_closed: number
  avg_case_duration: number
  client_satisfaction: number
  revenue_generated: number
  efficiency_score: number
  deadline_compliance: number
  peer_ranking: number
}

interface CaseVelocity {
  case_id: string
  case_title: string
  client_name: string
  practice_area: string
  status: string
  opened_date: string
  target_close_date: string
  actual_progress: number
  expected_progress: number
  velocity_score: number
  bottlenecks: string[]
  next_milestone: string
  assigned_attorney: string
}

interface DeadlineMetrics {
  upcoming_deadlines: Array<{
    case_id: string
    case_title: string
    deadline_type: string
    due_date: string
    days_remaining: number
    assigned_to: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    completion_status: number
  }>
  overdue_items: Array<{
    case_id: string
    item_description: string
    due_date: string
    days_overdue: number
    assigned_to: string
    impact_level: string
  }>
  compliance_score: number
  trend_direction: 'improving' | 'declining' | 'stable'
}

interface ClientSatisfactionData {
  client_id: string
  client_name: string
  satisfaction_score: number
  last_survey_date: string
  response_time_rating: number
  communication_rating: number
  outcome_satisfaction: number
  likelihood_to_refer: number
  feedback_summary: string
  improvement_areas: string[]
}

interface KPITrend {
  metric: string
  current_value: number
  previous_value: number
  change_percentage: number
  trend: 'up' | 'down' | 'stable'
  target_value: number
  performance_rating: 'excellent' | 'good' | 'needs_improvement' | 'poor'
}

export default function PracticePerformancePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [metrics, setMetrics] = useState<PracticeMetrics | null>(null)
  const [attorneyData, setAttorneyData] = useState<AttorneyProductivity[]>([])
  const [caseVelocity, setCaseVelocity] = useState<CaseVelocity[]>([])
  const [deadlineMetrics, setDeadlineMetrics] = useState<DeadlineMetrics | null>(null)
  const [clientSatisfaction, setClientSatisfaction] = useState<ClientSatisfactionData[]>([])
  const [kpiTrends, setKpiTrends] = useState<KPITrend[]>([])
  const [loading, setLoading] = useState(false)
  const [_error, _setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [activeTab, setActiveTab] = useState<'overview' | 'attorneys' | 'cases' | 'deadlines' | 'satisfaction'>('overview')

  // Check permissions
  const canViewPerformance = user && ['admin', 'partner', 'office_manager'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canViewPerformance) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canViewPerformance, router])

  // Load performance data
  useEffect(() => {
    if (user && canViewPerformance) {
      loadPerformanceData()
    }
  }, [user, canViewPerformance, selectedPeriod, loadPerformanceData])

  const loadPerformanceData = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMetrics(generateMockPracticeMetrics())
      setAttorneyData(generateMockAttorneyData())
      setCaseVelocity(generateMockCaseVelocity())
      setDeadlineMetrics(generateMockDeadlineMetrics())
      setClientSatisfaction(generateMockClientSatisfaction())
      setKpiTrends(generateMockKPITrends())
    } catch (error) {
      setError('Failed to load performance data')
      console.error('Performance data error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateMockPracticeMetrics = (): PracticeMetrics => ({
    total_cases: 234,
    active_cases: 156,
    cases_closed_this_month: 23,
    average_case_duration: 4.7,
    case_velocity: 87.3,
    deadline_compliance: 94.2,
    client_satisfaction: 8.7,
    attorney_utilization: 82.4,
    billable_hour_target: 9600,
    billable_hours_actual: 8945,
    revenue_per_hour: 425,
    case_win_rate: 78.5
  })

  const generateMockAttorneyData = (): AttorneyProductivity[] => [
    {
      attorney_id: 'attorney_1',
      attorney_name: 'Sarah Johnson',
      role: 'Senior Partner',
      billable_hours_target: 1800,
      billable_hours_actual: 1987,
      utilization_rate: 91.2,
      cases_active: 12,
      cases_closed: 8,
      avg_case_duration: 3.2,
      client_satisfaction: 9.1,
      revenue_generated: 567890,
      efficiency_score: 94.5,
      deadline_compliance: 97.8,
      peer_ranking: 1
    },
    {
      attorney_id: 'attorney_2',
      attorney_name: 'Michael Chen',
      role: 'Associate',
      billable_hours_target: 2000,
      billable_hours_actual: 1734,
      utilization_rate: 86.7,
      cases_active: 18,
      cases_closed: 12,
      avg_case_duration: 5.1,
      client_satisfaction: 8.6,
      revenue_generated: 489234,
      efficiency_score: 87.3,
      deadline_compliance: 91.2,
      peer_ranking: 3
    },
    {
      attorney_id: 'attorney_3',
      attorney_name: 'Emily Rodriguez',
      role: 'Senior Associate',
      billable_hours_target: 1900,
      billable_hours_actual: 1892,
      utilization_rate: 89.1,
      cases_active: 15,
      cases_closed: 10,
      avg_case_duration: 4.8,
      client_satisfaction: 8.9,
      revenue_generated: 456123,
      efficiency_score: 91.7,
      deadline_compliance: 95.4,
      peer_ranking: 2
    },
    {
      attorney_id: 'attorney_4',
      attorney_name: 'David Wilson',
      role: 'Associate',
      billable_hours_target: 2000,
      billable_hours_actual: 1645,
      utilization_rate: 82.3,
      cases_active: 22,
      cases_closed: 9,
      avg_case_duration: 6.2,
      client_satisfaction: 8.3,
      revenue_generated: 398765,
      efficiency_score: 79.8,
      deadline_compliance: 87.6,
      peer_ranking: 4
    }
  ]

  const generateMockCaseVelocity = (): CaseVelocity[] => [
    {
      case_id: 'case_1',
      case_title: 'TechCorp Acquisition Review',
      client_name: 'TechCorp Industries',
      practice_area: 'Corporate Law',
      status: 'Active',
      opened_date: '2024-01-15T00:00:00Z',
      target_close_date: '2024-03-15T00:00:00Z',
      actual_progress: 65,
      expected_progress: 70,
      velocity_score: 92.9,
      bottlenecks: ['Pending regulatory approval', 'Client document review'],
      next_milestone: 'Board approval meeting',
      assigned_attorney: 'Sarah Johnson'
    },
    {
      case_id: 'case_2',
      case_title: 'Employment Dispute Resolution',
      client_name: 'Global Manufacturing LLC',
      practice_area: 'Employment Law',
      status: 'Active',
      opened_date: '2023-11-20T00:00:00Z',
      target_close_date: '2024-02-20T00:00:00Z',
      actual_progress: 40,
      expected_progress: 80,
      velocity_score: 50.0,
      bottlenecks: ['Witness availability', 'Discovery delays', 'Opposing counsel response'],
      next_milestone: 'Mediation session',
      assigned_attorney: 'Michael Chen'
    },
    {
      case_id: 'case_3',
      case_title: 'Real Estate Transaction',
      client_name: 'Real Estate Holdings Co',
      practice_area: 'Real Estate',
      status: 'Active',
      opened_date: '2024-01-08T00:00:00Z',
      target_close_date: '2024-02-08T00:00:00Z',
      actual_progress: 95,
      expected_progress: 90,
      velocity_score: 105.6,
      bottlenecks: [],
      next_milestone: 'Final closing documents',
      assigned_attorney: 'Emily Rodriguez'
    }
  ]

  const generateMockDeadlineMetrics = (): DeadlineMetrics => ({
    upcoming_deadlines: [
      {
        case_id: 'case_1',
        case_title: 'TechCorp Acquisition',
        deadline_type: 'Document Filing',
        due_date: '2024-01-20T00:00:00Z',
        days_remaining: 5,
        assigned_to: 'Sarah Johnson',
        priority: 'high',
        completion_status: 75
      },
      {
        case_id: 'case_2',
        case_title: 'Employment Dispute',
        deadline_type: 'Discovery Response',
        due_date: '2024-01-18T00:00:00Z',
        days_remaining: 3,
        assigned_to: 'Michael Chen',
        priority: 'critical',
        completion_status: 30
      },
      {
        case_id: 'case_3',
        case_title: 'Real Estate Transaction',
        deadline_type: 'Contract Review',
        due_date: '2024-01-22T00:00:00Z',
        days_remaining: 7,
        assigned_to: 'Emily Rodriguez',
        priority: 'medium',
        completion_status: 90
      }
    ],
    overdue_items: [
      {
        case_id: 'case_4',
        item_description: 'Client approval on settlement terms',
        due_date: '2024-01-10T00:00:00Z',
        days_overdue: 5,
        assigned_to: 'David Wilson',
        impact_level: 'Medium'
      }
    ],
    compliance_score: 94.2,
    trend_direction: 'improving'
  })

  const generateMockClientSatisfaction = (): ClientSatisfactionData[] => [
    {
      client_id: 'client_1',
      client_name: 'TechCorp Industries',
      satisfaction_score: 9.2,
      last_survey_date: '2024-01-10T00:00:00Z',
      response_time_rating: 9.0,
      communication_rating: 9.1,
      outcome_satisfaction: 9.5,
      likelihood_to_refer: 9.8,
      feedback_summary: 'Exceptional service and expertise in corporate law matters',
      improvement_areas: ['Billing transparency']
    },
    {
      client_id: 'client_2',
      client_name: 'Global Manufacturing LLC',
      satisfaction_score: 8.4,
      last_survey_date: '2024-01-08T00:00:00Z',
      response_time_rating: 8.2,
      communication_rating: 8.5,
      outcome_satisfaction: 8.7,
      likelihood_to_refer: 8.1,
      feedback_summary: 'Professional handling of employment matters with good results',
      improvement_areas: ['Response time', 'Case status updates']
    },
    {
      client_id: 'client_3',
      client_name: 'Real Estate Holdings Co',
      satisfaction_score: 8.9,
      last_survey_date: '2024-01-12T00:00:00Z',
      response_time_rating: 9.1,
      communication_rating: 8.8,
      outcome_satisfaction: 8.9,
      likelihood_to_refer: 9.0,
      feedback_summary: 'Efficient and knowledgeable real estate transaction support',
      improvement_areas: ['Cost estimates']
    }
  ]

  const generateMockKPITrends = (): KPITrend[] => [
    {
      metric: 'Case Velocity',
      current_value: 87.3,
      previous_value: 84.1,
      change_percentage: 3.8,
      trend: 'up',
      target_value: 90,
      performance_rating: 'good'
    },
    {
      metric: 'Deadline Compliance',
      current_value: 94.2,
      previous_value: 91.7,
      change_percentage: 2.7,
      trend: 'up',
      target_value: 95,
      performance_rating: 'good'
    },
    {
      metric: 'Client Satisfaction',
      current_value: 8.7,
      previous_value: 8.9,
      change_percentage: -2.2,
      trend: 'down',
      target_value: 9.0,
      performance_rating: 'needs_improvement'
    },
    {
      metric: 'Attorney Utilization',
      current_value: 82.4,
      previous_value: 79.8,
      change_percentage: 3.3,
      trend: 'up',
      target_value: 85,
      performance_rating: 'good'
    },
    {
      metric: 'Case Win Rate',
      current_value: 78.5,
      previous_value: 76.2,
      change_percentage: 3.0,
      trend: 'up',
      target_value: 80,
      performance_rating: 'good'
    }
  ]

  const getPerformanceColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600 bg-green-100'
      case 'good': return 'text-blue-600 bg-blue-100'
      case 'needs_improvement': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getVelocityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 75) return 'text-blue-600 bg-blue-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewPerformance) {
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
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Practice Performance Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Real-time insights into law firm operations and productivity
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="input-field text-sm"
              >
                <option value="current_month">Current Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">This Quarter</option>
                <option value="ytd">Year to Date</option>
              </select>
              
              <button
                onClick={() => router.push('/reports')}
                className="btn-primary flex items-center"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                All Reports
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6">
            <nav className="flex space-x-8">
              {[
                { id: 'overview', name: 'Performance Overview', icon: ChartBarIcon },
                { id: 'attorneys', name: 'Attorney Productivity', icon: UserGroupIcon },
                { id: 'cases', name: 'Case Velocity', icon: ScaleIcon },
                { id: 'deadlines', name: 'Deadline Management', icon: ClockIcon },
                { id: 'satisfaction', name: 'Client Satisfaction', icon: StarIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'attorneys' | 'cases' | 'deadlines' | 'satisfaction')}
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
            {/* Performance Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-8">
                {/* Key Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Cases</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.active_cases}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.cases_closed_this_month} closed this month
                        </p>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3">
                        <ScaleIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Case Velocity</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.case_velocity}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.average_case_duration} months avg duration
                        </p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3">
                        <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Deadline Compliance</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.deadline_compliance}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          On-time completion rate
                        </p>
                      </div>
                      <div className="bg-yellow-100 rounded-lg p-3">
                        <ClockIcon className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Client Satisfaction</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.client_satisfaction}/10</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Average rating
                        </p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <StarIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* KPI Trends */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Key Performance Indicators</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {kpiTrends.map((kpi, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">{kpi.metric}</h4>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPerformanceColor(kpi.performance_rating)}`}>
                            {kpi.performance_rating.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-bold text-gray-900">
                            {kpi.metric.includes('Satisfaction') ? kpi.current_value.toFixed(1) : kpi.current_value.toFixed(1)}
                            {kpi.metric.includes('Satisfaction') ? '/10' : '%'}
                          </div>
                          <div className="flex items-center">
                            {kpi.trend === 'up' ? (
                              <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
                            ) : kpi.trend === 'down' ? (
                              <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
                            ) : (
                              <div className="w-4 h-1 bg-gray-400 rounded mr-1"></div>
                            )}
                            <span className={`text-sm ${
                              kpi.trend === 'up' ? 'text-green-600' : 
                              kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {Math.abs(kpi.change_percentage).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Current</span>
                            <span>Target: {kpi.target_value}{kpi.metric.includes('Satisfaction') ? '/10' : '%'}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${(kpi.current_value / kpi.target_value) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Practice Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Billable Hours</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Target</span>
                        <span className="font-medium">{metrics.billable_hour_target.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Actual</span>
                        <span className="font-medium">{metrics.billable_hours_actual.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Utilization</span>
                        <span className={`font-medium ${metrics.attorney_utilization >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                          {metrics.attorney_utilization}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Revenue Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Revenue per Hour</span>
                        <span className="font-medium">${metrics.revenue_per_hour}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Case Win Rate</span>
                        <span className="font-medium text-green-600">{metrics.case_win_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Cases</span>
                        <span className="font-medium">{metrics.total_cases}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Efficiency Indicators</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Case Duration</span>
                        <span className="font-medium">{metrics.average_case_duration} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Cases Closed</span>
                        <span className="font-medium">{metrics.cases_closed_this_month} this month</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Velocity Score</span>
                        <span className="font-medium text-blue-600">{metrics.case_velocity}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attorney Productivity Tab */}
            {activeTab === 'attorneys' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attorney
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billable Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utilization
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cases
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Efficiency Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client Satisfaction
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Deadline Compliance
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ranking
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attorneyData.map((attorney) => (
                          <tr key={attorney.attorney_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{attorney.attorney_name}</div>
                                <div className="text-sm text-gray-500">{attorney.role}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{attorney.billable_hours_actual.toLocaleString()}</div>
                              <div className="text-sm text-gray-500">of {attorney.billable_hours_target.toLocaleString()} target</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                attorney.utilization_rate >= 85 ? 'text-green-600' : 
                                attorney.utilization_rate >= 75 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {attorney.utilization_rate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{attorney.cases_active} active</div>
                              <div className="text-sm text-gray-500">{attorney.cases_closed} closed</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                attorney.efficiency_score >= 90 ? 'text-green-600' : 
                                attorney.efficiency_score >= 80 ? 'text-blue-600' : 
                                attorney.efficiency_score >= 70 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {attorney.efficiency_score.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-purple-600">
                                {attorney.client_satisfaction.toFixed(1)}/10
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                attorney.deadline_compliance >= 95 ? 'text-green-600' : 
                                attorney.deadline_compliance >= 85 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {attorney.deadline_compliance.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                #{attorney.peer_ranking}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Case Velocity Tab */}
            {activeTab === 'cases' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Case
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Progress
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Velocity Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Target Close
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Next Milestone
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Bottlenecks
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned Attorney
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {caseVelocity.map((caseItem) => (
                          <tr key={caseItem.case_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{caseItem.case_title}</div>
                                <div className="text-sm text-gray-500">{caseItem.client_name}</div>
                                <div className="text-sm text-gray-500">{caseItem.practice_area}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900 mr-2">{caseItem.actual_progress}%</div>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      caseItem.actual_progress >= caseItem.expected_progress ? 'bg-green-600' : 'bg-red-600'
                                    }`}
                                    style={{ width: `${caseItem.actual_progress}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Expected: {caseItem.expected_progress}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVelocityColor(caseItem.velocity_score)}`}>
                                {caseItem.velocity_score.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(caseItem.target_close_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {caseItem.next_milestone}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                {caseItem.bottlenecks.slice(0, 2).map((bottleneck, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 mr-1">
                                    {bottleneck}
                                  </span>
                                ))}
                                {caseItem.bottlenecks.length > 2 && (
                                  <span className="text-xs text-gray-500">+{caseItem.bottlenecks.length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {caseItem.assigned_attorney}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Deadline Management Tab */}
            {activeTab === 'deadlines' && deadlineMetrics && (
              <div className="space-y-6">
                {/* Upcoming Deadlines */}
                <div className="card">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      deadlineMetrics.compliance_score >= 95 ? 'bg-green-100 text-green-800' :
                      deadlineMetrics.compliance_score >= 85 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {deadlineMetrics.compliance_score}% compliance
                    </span>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Case & Deadline
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Assigned To
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completion
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Days Remaining
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {deadlineMetrics.upcoming_deadlines.map((deadline, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{deadline.case_title}</div>
                                <div className="text-sm text-gray-500">{deadline.deadline_type}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(deadline.due_date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(deadline.priority)}`}>
                                {deadline.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {deadline.assigned_to}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900 mr-2">{deadline.completion_status}%</div>
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${deadline.completion_status}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                deadline.days_remaining <= 1 ? 'text-red-600' :
                                deadline.days_remaining <= 3 ? 'text-orange-600' :
                                deadline.days_remaining <= 7 ? 'text-yellow-600' : 'text-green-600'
                              }`}>
                                {deadline.days_remaining} days
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Overdue Items */}
                {deadlineMetrics.overdue_items.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-red-600">Overdue Items</h3>
                    <div className="space-y-3">
                      {deadlineMetrics.overdue_items.map((item, index) => (
                        <div key={index} className="border-l-4 border-red-600 bg-red-50 p-4 rounded-r-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-red-900">{item.item_description}</h4>
                              <p className="text-sm text-red-700">Case: {item.case_id}</p>
                              <p className="text-sm text-red-700">Assigned to: {item.assigned_to}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-red-600">{item.days_overdue} days overdue</span>
                              <p className="text-sm text-red-700">Impact: {item.impact_level}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Client Satisfaction Tab */}
            {activeTab === 'satisfaction' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Overall Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Response Time
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Communication
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Outcome Satisfaction
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Likelihood to Refer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Survey
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientSatisfaction.map((client) => (
                          <tr key={client.client_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                client.satisfaction_score >= 9 ? 'text-green-600' :
                                client.satisfaction_score >= 8 ? 'text-blue-600' :
                                client.satisfaction_score >= 7 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {client.satisfaction_score.toFixed(1)}/10
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {client.response_time_rating.toFixed(1)}/10
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {client.communication_rating.toFixed(1)}/10
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {client.outcome_satisfaction.toFixed(1)}/10
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {client.likelihood_to_refer.toFixed(1)}/10
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(client.last_survey_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Improvement Areas Summary */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Improvement Areas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from(new Set(clientSatisfaction.flatMap(c => c.improvement_areas))).map((area, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{area}</h4>
                        <div className="text-sm text-gray-600">
                          Mentioned by {clientSatisfaction.filter(c => c.improvement_areas.includes(area)).length} clients
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
    </div>
  )
}