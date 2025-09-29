/**
 * Financial Reporting & Revenue Analytics - Comprehensive law firm financial intelligence
 * Advanced financial analysis with profitability tracking and revenue forecasting
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  UserGroupIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface FinancialMetrics {
  total_revenue: number
  revenue_change: number
  total_expenses: number
  net_profit: number
  profit_margin: number
  outstanding_receivables: number
  average_case_value: number
  revenue_per_attorney: number
  billable_hours_total: number
  realization_rate: number
  collection_rate: number
  write_offs: number
}

interface RevenueData {
  period: string
  revenue: number
  expenses: number
  profit: number
  billable_hours: number
  cases_closed: number
}

interface PracticeAreaPerformance {
  practice_area: string
  revenue: number
  revenue_percentage: number
  cases_count: number
  average_case_value: number
  profit_margin: number
  billable_hours: number
  realization_rate: number
  growth_rate: number
}

interface ClientProfitability {
  client_id: string
  client_name: string
  total_revenue: number
  total_costs: number
  profit: number
  profit_margin: number
  cases_count: number
  avg_case_duration: number
  payment_terms_compliance: number
  lifetime_value: number
}

interface AttorneyPerformance {
  attorney_id: string
  attorney_name: string
  revenue_generated: number
  billable_hours: number
  billable_rate: number
  realization_rate: number
  utilization_rate: number
  cases_handled: number
  avg_case_value: number
  client_satisfaction: number
}

interface FinancialForecast {
  period: string
  projected_revenue: number
  projected_expenses: number
  projected_profit: number
  confidence_level: number
  key_assumptions: string[]
  risk_factors: string[]
}

export default function FinancialReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [practiceAreaData, setPracticeAreaData] = useState<PracticeAreaPerformance[]>([])
  const [clientProfitability, setClientProfitability] = useState<ClientProfitability[]>([])
  const [attorneyPerformance, setAttorneyPerformance] = useState<AttorneyPerformance[]>([])
  const [forecast, setForecast] = useState<FinancialForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [_error, setError] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('12_months')
  const [activeTab, setActiveTab] = useState<'overview' | 'practice_areas' | 'clients' | 'attorneys' | 'forecast'>('overview')

  // Check permissions
  const canViewFinancials = user && ['admin', 'partner', 'office_manager'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canViewFinancials) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canViewFinancials, router])

  // Load financial data
  useEffect(() => {
    if (user && canViewFinancials) {
      loadFinancialData()
    }
  }, [user, canViewFinancials, selectedPeriod, loadFinancialData])

  const loadFinancialData = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setMetrics(generateMockFinancialMetrics())
      setRevenueData(generateMockRevenueData())
      setPracticeAreaData(generateMockPracticeAreaData())
      setClientProfitability(generateMockClientProfitability())
      setAttorneyPerformance(generateMockAttorneyPerformance())
      setForecast(generateMockForecast())
    } catch (error) {
      setError('Failed to load financial data')
      console.error('Financial data error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateMockFinancialMetrics = (): FinancialMetrics => ({
    total_revenue: 2847500,
    revenue_change: 12.8,
    total_expenses: 1789200,
    net_profit: 1058300,
    profit_margin: 37.2,
    outstanding_receivables: 456789,
    average_case_value: 15750,
    revenue_per_attorney: 474583,
    billable_hours_total: 8945,
    realization_rate: 89.3,
    collection_rate: 94.7,
    write_offs: 23450
  })

  const generateMockRevenueData = (): RevenueData[] => {
    const data: RevenueData[] = []
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    months.forEach((month, _index) => {
      const baseRevenue = 200000 + (Math.random() - 0.5) * 50000
      data.push({
        period: `2024-${month}`,
        revenue: baseRevenue,
        expenses: baseRevenue * (0.6 + Math.random() * 0.2),
        profit: baseRevenue * (0.3 + Math.random() * 0.1),
        billable_hours: 700 + Math.floor(Math.random() * 200),
        cases_closed: 15 + Math.floor(Math.random() * 10)
      })
    })
    
    return data
  }

  const generateMockPracticeAreaData = (): PracticeAreaPerformance[] => [
    {
      practice_area: 'Corporate Law',
      revenue: 987654,
      revenue_percentage: 34.7,
      cases_count: 45,
      average_case_value: 21948,
      profit_margin: 42.1,
      billable_hours: 2890,
      realization_rate: 91.2,
      growth_rate: 15.8
    },
    {
      practice_area: 'Litigation',
      revenue: 756890,
      revenue_percentage: 26.6,
      cases_count: 78,
      average_case_value: 9704,
      profit_margin: 38.9,
      billable_hours: 3456,
      realization_rate: 87.5,
      growth_rate: 8.3
    },
    {
      practice_area: 'Real Estate',
      revenue: 543210,
      revenue_percentage: 19.1,
      cases_count: 67,
      average_case_value: 8108,
      profit_margin: 35.4,
      billable_hours: 2134,
      realization_rate: 89.8,
      growth_rate: 22.1
    },
    {
      practice_area: 'Employment Law',
      revenue: 389456,
      revenue_percentage: 13.7,
      cases_count: 89,
      average_case_value: 4375,
      profit_margin: 31.2,
      billable_hours: 1678,
      realization_rate: 85.3,
      growth_rate: -2.4
    },
    {
      practice_area: 'Family Law',
      revenue: 170290,
      revenue_percentage: 5.9,
      cases_count: 34,
      average_case_value: 5009,
      profit_margin: 28.7,
      billable_hours: 987,
      realization_rate: 82.1,
      growth_rate: 5.7
    }
  ]

  const generateMockClientProfitability = (): ClientProfitability[] => [
    {
      client_id: 'client_1',
      client_name: 'TechCorp Industries',
      total_revenue: 245600,
      total_costs: 156800,
      profit: 88800,
      profit_margin: 36.2,
      cases_count: 8,
      avg_case_duration: 4.2,
      payment_terms_compliance: 98.5,
      lifetime_value: 487300
    },
    {
      client_id: 'client_2',
      client_name: 'Global Manufacturing LLC',
      total_revenue: 189340,
      total_costs: 123450,
      profit: 65890,
      profit_margin: 34.8,
      cases_count: 12,
      avg_case_duration: 6.1,
      payment_terms_compliance: 94.2,
      lifetime_value: 356780
    },
    {
      client_id: 'client_3',
      client_name: 'Real Estate Holdings Co',
      total_revenue: 167890,
      total_costs: 98234,
      profit: 69656,
      profit_margin: 41.5,
      cases_count: 15,
      avg_case_duration: 2.8,
      payment_terms_compliance: 96.7,
      lifetime_value: 234560
    },
    {
      client_id: 'client_4',
      client_name: 'Healthcare Systems Inc',
      total_revenue: 145670,
      total_costs: 102390,
      profit: 43280,
      profit_margin: 29.7,
      cases_count: 18,
      avg_case_duration: 8.3,
      payment_terms_compliance: 87.4,
      lifetime_value: 189450
    }
  ]

  const generateMockAttorneyPerformance = (): AttorneyPerformance[] => [
    {
      attorney_id: 'attorney_1',
      attorney_name: 'Sarah Johnson',
      revenue_generated: 567890,
      billable_hours: 1987,
      billable_rate: 425,
      realization_rate: 92.1,
      utilization_rate: 87.8,
      cases_handled: 23,
      avg_case_value: 24691,
      client_satisfaction: 9.2
    },
    {
      attorney_id: 'attorney_2',
      attorney_name: 'Michael Chen',
      revenue_generated: 489234,
      billable_hours: 1734,
      billable_rate: 395,
      realization_rate: 89.7,
      utilization_rate: 81.2,
      cases_handled: 31,
      avg_case_value: 15781,
      client_satisfaction: 8.9
    },
    {
      attorney_id: 'attorney_3',
      attorney_name: 'Emily Rodriguez',
      revenue_generated: 456123,
      billable_hours: 1892,
      billable_rate: 375,
      realization_rate: 91.3,
      utilization_rate: 89.1,
      cases_handled: 28,
      avg_case_value: 16290,
      client_satisfaction: 9.1
    },
    {
      attorney_id: 'attorney_4',
      attorney_name: 'David Wilson',
      revenue_generated: 398765,
      billable_hours: 1645,
      billable_rate: 350,
      realization_rate: 85.9,
      utilization_rate: 76.3,
      cases_handled: 34,
      avg_case_value: 11728,
      client_satisfaction: 8.6
    }
  ]

  const generateMockForecast = (): FinancialForecast[] => [
    {
      period: '2024 Q2',
      projected_revenue: 750000,
      projected_expenses: 465000,
      projected_profit: 285000,
      confidence_level: 87,
      key_assumptions: [
        'Current client retention rate maintains at 94%',
        'New client acquisition grows by 15%',
        'Average billing rates increase by 5%'
      ],
      risk_factors: [
        'Economic uncertainty may affect client spending',
        'Competition for talent may increase salary costs',
        'Regulatory changes in key practice areas'
      ]
    },
    {
      period: '2024 Q3',
      projected_revenue: 820000,
      projected_expenses: 500000,
      projected_profit: 320000,
      confidence_level: 82,
      key_assumptions: [
        'Summer slowdown less severe than historical average',
        'Large corporate client renewals proceed as planned',
        'Technology investments improve efficiency by 8%'
      ],
      risk_factors: [
        'Vacation schedules may reduce billable hours',
        'Court calendar delays may extend case timelines',
        'Market volatility affecting corporate legal spend'
      ]
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const exportReport = async () => {
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const reportData = {
        generated_at: new Date().toISOString(),
        period: selectedPeriod,
        metrics,
        revenue_data: revenueData,
        practice_areas: practiceAreaData,
        client_profitability: clientProfitability,
        attorney_performance: attorneyPerformance,
        forecast
      }
      
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `financial-report-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (_error) {
      setError('Failed to export report')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewFinancials) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-2 mr-4">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Financial Reports & Analytics</h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive financial intelligence and revenue analysis
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="input-field text-sm"
              >
                <option value="3_months">Last 3 Months</option>
                <option value="6_months">Last 6 Months</option>
                <option value="12_months">Last 12 Months</option>
                <option value="ytd">Year to Date</option>
              </select>
              
              <button
                onClick={exportReport}
                className="btn-secondary flex items-center"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export Report
              </button>
              
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
                { id: 'overview', name: 'Financial Overview', icon: ChartBarIcon },
                { id: 'practice_areas', name: 'Practice Areas', icon: BanknotesIcon },
                { id: 'clients', name: 'Client Profitability', icon: UserGroupIcon },
                { id: 'attorneys', name: 'Attorney Performance', icon: DocumentTextIcon },
                { id: 'forecast', name: 'Financial Forecast', icon: ArrowTrendingUpIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'practice_areas' | 'clients' | 'attorneys' | 'forecast')}
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
            {/* Financial Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-8">
                {/* Key Financial Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.total_revenue)}</p>
                        <div className="flex items-center mt-1">
                          {metrics.revenue_change >= 0 ? (
                            <ArrowUpIcon className="h-4 w-4 text-green-600 mr-1" />
                          ) : (
                            <ArrowDownIcon className="h-4 w-4 text-red-600 mr-1" />
                          )}
                          <span className={`text-sm ${metrics.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(metrics.revenue_change)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3">
                        <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Net Profit</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.net_profit)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.profit_margin.toFixed(1)}% margin
                        </p>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3">
                        <ArrowTrendingUpIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Outstanding Receivables</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.outstanding_receivables)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.collection_rate.toFixed(1)}% collection rate
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
                        <p className="text-sm text-gray-600">Avg Case Value</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.average_case_value)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.billable_hours_total.toLocaleString()} billable hours
                        </p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <DocumentTextIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Revenue Trend Chart */}
                <div className="card">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                    <div className="flex space-x-4 text-sm">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                        <span>Revenue</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
                        <span>Expenses</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
                        <span>Profit</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="h-64 flex items-end justify-between space-x-2">
                    {revenueData.map((data, index) => (
                      <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                        <div className="flex flex-col items-center space-y-1 w-full relative h-48">
                          {/* Revenue Bar */}
                          <div 
                            className="bg-blue-600 w-full rounded-t"
                            style={{ 
                              height: `${(data.revenue / Math.max(...revenueData.map(d => d.revenue))) * 40}%`,
                              minHeight: '8px'
                            }}
                          ></div>
                          {/* Expenses Bar */}
                          <div 
                            className="bg-red-600 w-full"
                            style={{ 
                              height: `${(data.expenses / Math.max(...revenueData.map(d => d.revenue))) * 40}%`,
                              minHeight: '6px'
                            }}
                          ></div>
                          {/* Profit Bar */}
                          <div 
                            className="bg-green-600 w-full rounded-b"
                            style={{ 
                              height: `${(data.profit / Math.max(...revenueData.map(d => d.revenue))) * 40}%`,
                              minHeight: '4px'
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600 transform -rotate-45">
                          {data.period.split('-')[1]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Realization Rate</span>
                        <span className="font-medium">{metrics.realization_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Collection Rate</span>
                        <span className="font-medium">{metrics.collection_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Revenue per Attorney</span>
                        <span className="font-medium">{formatCurrency(metrics.revenue_per_attorney)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Expense Breakdown</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Expenses</span>
                        <span className="font-medium">{formatCurrency(metrics.total_expenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Write-offs</span>
                        <span className="font-medium text-red-600">{formatCurrency(metrics.write_offs)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expense Ratio</span>
                        <span className="font-medium">{((metrics.total_expenses / metrics.total_revenue) * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h4 className="font-medium text-gray-900 mb-4">Key Ratios</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Profit Margin</span>
                        <span className="font-medium text-green-600">{metrics.profit_margin}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Revenue Growth</span>
                        <span className={`font-medium ${metrics.revenue_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(metrics.revenue_change)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Billable Hours</span>
                        <span className="font-medium">{metrics.billable_hours_total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Practice Areas Tab */}
            {activeTab === 'practice_areas' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Practice Area
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cases
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Case Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Profit Margin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Growth Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Realization
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {practiceAreaData.map((area, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="text-sm font-medium text-gray-900">{area.practice_area}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(area.revenue)}</div>
                              <div className="text-sm text-gray-500">{area.revenue_percentage}% of total</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {area.cases_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(area.average_case_value)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-green-600">
                                {area.profit_margin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${area.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(area.growth_rate)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {area.realization_rate.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Client Profitability Tab */}
            {activeTab === 'clients' && (
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
                            Revenue
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Profit
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Margin
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cases
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Terms
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lifetime Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientProfitability.map((client) => (
                          <tr key={client.client_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{client.client_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(client.total_revenue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(client.profit)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-green-600">
                                {client.profit_margin.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {client.cases_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                client.payment_terms_compliance >= 95 ? 'text-green-600' : 
                                client.payment_terms_compliance >= 85 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {client.payment_terms_compliance.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(client.lifetime_value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Attorney Performance Tab */}
            {activeTab === 'attorneys' && (
              <div className="space-y-6">
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attorney Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Revenue Generated
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billable Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Billable Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Realization Rate
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Utilization
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client Satisfaction
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {attorneyPerformance.map((attorney) => (
                          <tr key={attorney.attorney_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{attorney.attorney_name}</div>
                              <div className="text-sm text-gray-500">{attorney.cases_handled} cases</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(attorney.revenue_generated)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {attorney.billable_hours.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(attorney.billable_rate)}/hr
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-green-600">
                                {attorney.realization_rate.toFixed(1)}%
                              </span>
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
                              <span className="text-sm font-medium text-blue-600">
                                {attorney.client_satisfaction.toFixed(1)}/10
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

            {/* Financial Forecast Tab */}
            {activeTab === 'forecast' && (
              <div className="space-y-6">
                {forecast.map((period, index) => (
                  <div key={index} className="card">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{period.period} Forecast</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {period.confidence_level}% confidence
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(period.projected_revenue)}</div>
                        <div className="text-sm text-gray-600">Projected Revenue</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(period.projected_expenses)}</div>
                        <div className="text-sm text-gray-600">Projected Expenses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(period.projected_profit)}</div>
                        <div className="text-sm text-gray-600">Projected Profit</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Key Assumptions</h4>
                        <ul className="space-y-2">
                          {period.key_assumptions.map((assumption, idx) => (
                            <li key={idx} className="flex items-start">
                              <div className="flex-shrink-0 w-2 h-2 bg-green-600 rounded-full mt-2 mr-3"></div>
                              <span className="text-sm text-gray-700">{assumption}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Risk Factors</h4>
                        <ul className="space-y-2">
                          {period.risk_factors.map((risk, idx) => (
                            <li key={idx} className="flex items-start">
                              <div className="flex-shrink-0 w-2 h-2 bg-red-600 rounded-full mt-2 mr-3"></div>
                              <span className="text-sm text-gray-700">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}