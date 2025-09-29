/**
 * Advanced Reporting Dashboard
 * 
 * Custom report builder with visualizations and analytics for legal practice management
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  PlusIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EyeIcon,
  PencilIcon,
  FunnelIcon,
  ChartPieIcon,
  TableCellsIcon,
  PresentationChartLineIcon,
  DocumentChartBarIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface Report {
  id: string
  name: string
  description: string
  category: 'financial' | 'operational' | 'client' | 'matter' | 'time' | 'document' | 'custom'
  type: 'table' | 'chart' | 'dashboard' | 'summary'
  visualization: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'table' | 'grid' | 'metric'
  isTemplate: boolean
  isPublic: boolean
  isFavorite: boolean
  config: {
    dataSource: string
    filters: Record<string, unknown>[]
    groupBy?: string[]
    aggregations?: Record<string, unknown>[]
    dateRange?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
    limit?: number
    includeArchived?: boolean
  }
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
    time: string
    recipients: string[]
    format: 'pdf' | 'excel' | 'csv'
  }
  lastRun?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  tags: string[]
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  previewImage: string
  isPopular: boolean
  config: Record<string, unknown>
}

// Mock reports
const mockReports: Report[] = [
  {
    id: '1',
    name: 'Revenue by Practice Area',
    description: 'Monthly revenue breakdown by practice area with year-over-year comparison',
    category: 'financial',
    type: 'chart',
    visualization: 'bar',
    isTemplate: false,
    isPublic: false,
    isFavorite: true,
    config: {
      dataSource: 'billing',
      filters: [
        { field: 'date_range', operator: 'last_12_months' },
        { field: 'status', operator: 'equals', value: 'paid' }
      ],
      groupBy: ['practice_area', 'month'],
      aggregations: [{ field: 'amount', function: 'sum' }],
      sortBy: 'amount',
      sortOrder: 'desc'
    },
    schedule: {
      frequency: 'monthly',
      time: '09:00',
      recipients: ['admin@jurisagentis.com', 'finance@jurisagentis.com'],
      format: 'pdf'
    },
    lastRun: '2025-01-13T09:00:00Z',
    createdBy: 'Sarah Johnson',
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2025-01-10T15:30:00Z',
    tags: ['revenue', 'practice-areas', 'monthly', 'financial']
  },
  {
    id: '2',
    name: 'Client Acquisition Report',
    description: 'New client acquisition trends and conversion rates from leads to active clients',
    category: 'client',
    type: 'dashboard',
    visualization: 'line',
    isTemplate: false,
    isPublic: false,
    isFavorite: true,
    config: {
      dataSource: 'clients',
      filters: [
        { field: 'created_date', operator: 'last_6_months' }
      ],
      groupBy: ['month', 'referral_source'],
      aggregations: [
        { field: 'client_id', function: 'count' },
        { field: 'conversion_rate', function: 'avg' }
      ]
    },
    lastRun: '2025-01-12T14:20:00Z',
    createdBy: 'Maria Rodriguez',
    createdAt: '2024-11-15T11:00:00Z',
    updatedAt: '2025-01-05T10:15:00Z',
    tags: ['clients', 'acquisition', 'marketing', 'conversion']
  },
  {
    id: '3',
    name: 'Time Tracking Summary',
    description: 'Billable vs non-billable hours by attorney with efficiency metrics',
    category: 'time',
    type: 'table',
    visualization: 'table',
    isTemplate: false,
    isPublic: true,
    isFavorite: false,
    config: {
      dataSource: 'time_entries',
      filters: [
        { field: 'date', operator: 'current_month' }
      ],
      groupBy: ['attorney', 'matter_type'],
      aggregations: [
        { field: 'billable_hours', function: 'sum' },
        { field: 'non_billable_hours', function: 'sum' },
        { field: 'efficiency_rate', function: 'avg' }
      ]
    },
    lastRun: '2025-01-13T08:00:00Z',
    createdBy: 'Michael Chen',
    createdAt: '2024-10-20T14:30:00Z',
    updatedAt: '2025-01-01T12:00:00Z',
    tags: ['time-tracking', 'billable', 'efficiency', 'attorneys']
  },
  {
    id: '4',
    name: 'Matter Status Overview',
    description: 'Current status of all active matters with priority indicators and deadlines',
    category: 'matter',
    type: 'summary',
    visualization: 'grid',
    isTemplate: false,
    isPublic: false,
    isFavorite: false,
    config: {
      dataSource: 'matters',
      filters: [
        { field: 'status', operator: 'in', value: ['active', 'pending', 'review'] }
      ],
      groupBy: ['status', 'priority'],
      sortBy: 'deadline',
      sortOrder: 'asc'
    },
    createdBy: 'Sarah Johnson',
    createdAt: '2025-01-01T16:45:00Z',
    updatedAt: '2025-01-08T09:30:00Z',
    tags: ['matters', 'status', 'deadlines', 'priority']
  }
]

// Mock report templates
const mockTemplates: ReportTemplate[] = [
  {
    id: 'template-1',
    name: 'Monthly Financial Dashboard',
    description: 'Comprehensive financial overview with revenue, expenses, and profit margins',
    category: 'financial',
    previewImage: '/report-templates/financial-dashboard.png',
    isPopular: true,
    config: {
      dataSource: 'billing',
      visualization: 'dashboard',
      widgets: ['revenue-chart', 'expense-breakdown', 'profit-margin', 'ar-aging']
    }
  },
  {
    id: 'template-2',
    name: 'Client Satisfaction Report',
    description: 'Client feedback analysis with satisfaction scores and improvement recommendations',
    category: 'client',
    previewImage: '/report-templates/client-satisfaction.png',
    isPopular: true,
    config: {
      dataSource: 'client_feedback',
      visualization: 'chart',
      metrics: ['nps_score', 'satisfaction_rating', 'response_rate']
    }
  },
  {
    id: 'template-3',
    name: 'Practice Area Performance',
    description: 'Compare performance metrics across different practice areas',
    category: 'operational',
    previewImage: '/report-templates/practice-performance.png',
    isPopular: false,
    config: {
      dataSource: 'matters',
      visualization: 'bar',
      groupBy: 'practice_area'
    }
  }
]

export default function ReportsPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>(mockReports)
  const [templates] = useState<ReportTemplate[]>(mockTemplates)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesCategory = selectedCategory === 'all' || report.category === selectedCategory
    const matchesType = selectedType === 'all' || report.type === selectedType
    const matchesSearch = !searchQuery || 
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesType && matchesSearch
  })

  const getCategoryIcon = (category: string) => {
    const icons = {
      financial: CurrencyDollarIcon,
      operational: ChartBarIcon,
      client: UserGroupIcon,
      matter: DocumentTextIcon,
      time: ClockIcon,
      document: DocumentChartBarIcon,
      custom: AdjustmentsHorizontalIcon
    }
    return icons[category as keyof typeof icons] || ChartBarIcon
  }

  const getVisualizationIcon = (visualization: string) => {
    const icons = {
      bar: ChartBarIcon,
      line: PresentationChartLineIcon,
      pie: ChartPieIcon,
      donut: ChartPieIcon,
      area: PresentationChartLineIcon,
      table: TableCellsIcon,
      grid: TableCellsIcon,
      metric: DocumentChartBarIcon
    }
    return icons[visualization as keyof typeof icons] || ChartBarIcon
  }

  const handleRunReport = async (reportId: string) => {
    console.log('Running report:', reportId)
    // In a real implementation, this would trigger the report generation
    
    setReports(prev => prev.map(report => 
      report.id === reportId 
        ? { ...report, lastRun: new Date().toISOString() }
        : report
    ))
  }

  const handleToggleFavorite = (reportId: string) => {
    setReports(prev => prev.map(report => 
      report.id === reportId 
        ? { ...report, isFavorite: !report.isFavorite }
        : report
    ))
  }

  const formatLastRun = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-3 text-blue-600" style={{width: '24px', height: '24px'}} />
                Advanced Reports
              </h1>
              <p className="text-gray-600 mt-2">
                Custom analytics and insights for your legal practice
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className={`btn-secondary flex items-center ${
                  showTemplates ? 'bg-blue-100 text-blue-800' : ''
                }`}
              >
                <SparklesIcon className="h-4 w-4 mr-2" style={{width: '16px', height: '16px'}} />
                Templates
              </button>
              
              <button
                onClick={() => router.push('/reports/builder')}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-2" style={{width: '16px', height: '16px'}} />
                Create Report
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-4 w-4 text-gray-400" style={{width: '16px', height: '16px'}} />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="financial">Financial</option>
                <option value="operational">Operational</option>
                <option value="client">Client</option>
                <option value="matter">Matter</option>
                <option value="time">Time Tracking</option>
                <option value="document">Document</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="chart">Chart</option>
                <option value="table">Table</option>
                <option value="dashboard">Dashboard</option>
                <option value="summary">Summary</option>
              </select>
            </div>

            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full border border-gray-300 rounded-md px-3 py-1 text-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Templates Section */}
        {showTemplates && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Report Templates</h2>
              <span className="text-sm text-gray-600">{templates.length} templates</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {templates.map((template) => {
                const CategoryIcon = getCategoryIcon(template.category)
                
                return (
                  <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CategoryIcon className="h-4 w-4 text-blue-600" style={{width: '16px', height: '16px'}} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          {template.isPopular && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 mt-1">
                              <StarIcon className="h-3 w-3 mr-1" />
                              Popular
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full capitalize">
                        {template.category}
                      </span>
                      <button
                        onClick={() => router.push(`/reports/builder?template=${template.id}`)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Reports Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            My Reports ({filteredReports.length})
          </h2>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <ClockIcon className="h-4 w-4" />
            <span>Last updated: {formatLastRun(new Date().toISOString())}</span>
          </div>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const CategoryIcon = getCategoryIcon(report.category)
            const VisualizationIcon = getVisualizationIcon(report.visualization)
            
            return (
              <div key={report.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      report.category === 'financial' ? 'bg-green-100' :
                      report.category === 'client' ? 'bg-blue-100' :
                      report.category === 'time' ? 'bg-orange-100' :
                      report.category === 'matter' ? 'bg-purple-100' :
                      'bg-gray-100'
                    }`}>
                      <CategoryIcon className={`h-4 w-4 ${
                        report.category === 'financial' ? 'text-green-600' :
                        report.category === 'client' ? 'text-blue-600' :
                        report.category === 'time' ? 'text-orange-600' :
                        report.category === 'matter' ? 'text-purple-600' :
                        'text-gray-600'
                      }`} style={{width: '16px', height: '16px'}} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <VisualizationIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 capitalize">{report.type}</span>
                        {report.isPublic && (
                          <span className="text-xs text-gray-500">• Public</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleFavorite(report.id)}
                    className={`p-1 rounded transition-colors ${
                      report.isFavorite 
                        ? 'text-yellow-500 hover:text-yellow-600' 
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                  >
                    <StarIcon className={`h-4 w-4 ${report.isFavorite ? 'fill-current' : ''}`} style={{width: '16px', height: '16px'}} />
                  </button>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{report.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-4">
                  {report.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
                  {report.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{report.tags.length - 3}</span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <span>By {report.createdBy}</span>
                  <span>Run: {formatLastRun(report.lastRun)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRunReport(report.id)}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Run Report
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => router.push(`/reports/${report.id}`)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="View Report"
                    >
                      <EyeIcon className="h-4 w-4" style={{width: '16px', height: '16px'}} />
                    </button>
                    <button
                      onClick={() => router.push(`/reports/builder?edit=${report.id}`)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Edit Report"
                    >
                      <PencilIcon className="h-4 w-4" style={{width: '16px', height: '16px'}} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors" title="Download">
                      <ArrowDownTrayIcon className="h-4 w-4" style={{width: '16px', height: '16px'}} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Share">
                      <ShareIcon className="h-4 w-4" style={{width: '16px', height: '16px'}} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <ChartBarIcon className="h-8 w-8 text-gray-400 mx-auto mb-4" style={{width: '32px', height: '32px'}} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matching reports' : 'No reports yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first custom report'}
            </p>
            <button
              onClick={() => router.push('/reports/builder')}
              className="btn-primary flex items-center mx-auto"
            >
              <PlusIcon className="h-4 w-4 mr-2" style={{width: '16px', height: '16px'}} />
              Create Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

