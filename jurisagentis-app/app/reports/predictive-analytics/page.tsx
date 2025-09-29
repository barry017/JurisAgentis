/**
 * Predictive Analytics for Legal Practice - Advanced forecasting and strategic intelligence
 * AI-powered predictions for capacity planning, market opportunities, and business growth
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  StarIcon,
  Cog6ToothIcon,
  BellIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

interface PredictiveMetrics {
  forecast_accuracy: number
  predictions_generated: number
  confidence_score: number
  model_performance: number
  alerts_triggered: number
  strategic_recommendations: number
  resource_optimization: number
  revenue_forecast_variance: number
}

interface CapacityForecast {
  period: string
  predicted_caseload: number
  current_capacity: number
  capacity_utilization: number
  staffing_needs: {
    attorneys_needed: number
    paralegals_needed: number
    support_staff_needed: number
  }
  bottleneck_risks: Array<{
    area: string
    probability: number
    impact: 'low' | 'medium' | 'high' | 'critical'
    mitigation_strategies: string[]
  }>
  capacity_recommendations: string[]
  confidence_level: number
}

interface MarketOpportunity {
  id: string
  opportunity_type: 'new_practice_area' | 'client_expansion' | 'geographic_expansion' | 'service_enhancement'
  title: string
  description: string
  market_size: number
  growth_potential: number
  competitive_landscape: 'low' | 'medium' | 'high'
  entry_difficulty: 'easy' | 'moderate' | 'challenging' | 'difficult'
  investment_required: number
  expected_roi: number
  timeline_to_profitability: number
  success_probability: number
  key_requirements: string[]
  risks: string[]
  strategic_value: number
}

interface ClientLifecycleValue {
  client_segment: string
  current_clients: number
  predicted_acquisition: number
  predicted_retention: number
  average_lifetime_value: number
  value_growth_trend: number
  churn_risk_factors: string[]
  expansion_opportunities: string[]
  satisfaction_prediction: number
  revenue_prediction: number
  profitability_score: number
}

interface RiskAlert {
  id: string
  alert_type: 'capacity_overload' | 'client_churn' | 'revenue_decline' | 'compliance_risk' | 'market_threat'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  probability: number
  potential_impact: number
  time_horizon: 'immediate' | 'short_term' | 'medium_term' | 'long_term'
  affected_areas: string[]
  early_indicators: string[]
  recommended_actions: string[]
  monitoring_metrics: string[]
  created_at: string
}

interface GrowthForecast {
  forecast_period: string
  revenue_predictions: {
    conservative: number
    likely: number
    optimistic: number
  }
  growth_drivers: Array<{
    driver: string
    impact_weight: number
    confidence: number
    description: string
  }>
  market_factors: Array<{
    factor: string
    trend: 'positive' | 'negative' | 'neutral'
    impact_magnitude: number
  }>
  strategic_initiatives: Array<{
    initiative: string
    investment_required: number
    expected_return: number
    timeline: string
    success_probability: number
  }>
  scenario_analysis: Array<{
    scenario: string
    probability: number
    revenue_impact: number
    key_assumptions: string[]
  }>
}

interface ResourceOptimization {
  optimization_area: string
  current_efficiency: number
  potential_improvement: number
  implementation_effort: 'low' | 'medium' | 'high'
  expected_savings: number
  payback_period: number
  recommendations: Array<{
    action: string
    priority: number
    estimated_impact: number
    resources_required: string[]
  }>
  success_metrics: string[]
  timeline: string
}

export default function PredictiveAnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [metrics, setMetrics] = useState<PredictiveMetrics | null>(null)
  const [capacityForecasts, setCapacityForecasts] = useState<CapacityForecast[]>([])
  const [marketOpportunities, setMarketOpportunities] = useState<MarketOpportunity[]>([])
  const [clientLifecycleData, setClientLifecycleData] = useState<ClientLifecycleValue[]>([])
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([])
  const [growthForecasts, setGrowthForecasts] = useState<GrowthForecast[]>([])
  const [resourceOptimization, setResourceOptimization] = useState<ResourceOptimization[]>([])
  const [loading, setLoading] = useState(false)
  const [, setError] = useState('')
  const [selectedTimeHorizon, setSelectedTimeHorizon] = useState('12_months')
  const [activeTab, setActiveTab] = useState<'overview' | 'capacity' | 'opportunities' | 'clients' | 'risks' | 'growth'>('overview')

  // Check permissions
  const canViewPredictive = user && ['admin', 'partner', 'office_manager'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canViewPredictive) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canViewPredictive, router])

  // Load predictive data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        setMetrics(generateMockPredictiveMetrics())
        setCapacityForecasts(generateMockCapacityForecasts())
        setMarketOpportunities(generateMockMarketOpportunities())
        setClientLifecycleData(generateMockClientLifecycleData())
        setRiskAlerts(generateMockRiskAlerts())
        setGrowthForecasts(generateMockGrowthForecasts())
        setResourceOptimization(generateMockResourceOptimization())
      } catch (error) {
        setError('Failed to load predictive analytics data')
        console.error('Predictive analytics error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && canViewPredictive) {
      loadData()
    }
  }, [user, canViewPredictive, selectedTimeHorizon])


  const generateMockPredictiveMetrics = (): PredictiveMetrics => ({
    forecast_accuracy: 87.4,
    predictions_generated: 156,
    confidence_score: 8.9,
    model_performance: 91.2,
    alerts_triggered: 7,
    strategic_recommendations: 23,
    resource_optimization: 15.8,
    revenue_forecast_variance: 4.3
  })

  const generateMockCapacityForecasts = (): CapacityForecast[] => [
    {
      period: '2024 Q2',
      predicted_caseload: 187,
      current_capacity: 165,
      capacity_utilization: 113.3,
      staffing_needs: {
        attorneys_needed: 2,
        paralegals_needed: 1,
        support_staff_needed: 1
      },
      bottleneck_risks: [
        {
          area: 'Document Review',
          probability: 0.78,
          impact: 'high',
          mitigation_strategies: [
            'Hire additional paralegal staff',
            'Implement document automation tools',
            'Outsource routine document review'
          ]
        },
        {
          area: 'Client Communication',
          probability: 0.45,
          impact: 'medium',
          mitigation_strategies: [
            'Implement automated client update system',
            'Redistribute client portfolios',
            'Enhance support staff capabilities'
          ]
        }
      ],
      capacity_recommendations: [
        'Hire 2 additional attorneys by April 1st',
        'Invest in legal technology automation',
        'Consider strategic partnership for overflow work',
        'Implement flexible staffing arrangements'
      ],
      confidence_level: 0.89
    },
    {
      period: '2024 Q3',
      predicted_caseload: 203,
      current_capacity: 180,
      capacity_utilization: 112.8,
      staffing_needs: {
        attorneys_needed: 1,
        paralegals_needed: 2,
        support_staff_needed: 0
      },
      bottleneck_risks: [
        {
          area: 'Trial Preparation',
          probability: 0.62,
          impact: 'critical',
          mitigation_strategies: [
            'Hire experienced trial attorney',
            'Develop trial preparation templates',
            'Create dedicated trial support team'
          ]
        }
      ],
      capacity_recommendations: [
        'Expand trial preparation capabilities',
        'Cross-train existing attorneys',
        'Develop specialized practice groups'
      ],
      confidence_level: 0.84
    }
  ]

  const generateMockMarketOpportunities = (): MarketOpportunity[] => [
    {
      id: 'opportunity_1',
      opportunity_type: 'new_practice_area',
      title: 'Cybersecurity & Data Privacy Law',
      description: 'Growing demand for cybersecurity legal services driven by increasing data breaches and regulatory requirements. Market shows 34% annual growth.',
      market_size: 2850000,
      growth_potential: 34.2,
      competitive_landscape: 'medium',
      entry_difficulty: 'moderate',
      investment_required: 185000,
      expected_roi: 245,
      timeline_to_profitability: 8,
      success_probability: 0.78,
      key_requirements: [
        'Hire attorney with cybersecurity expertise',
        'Obtain relevant certifications and training',
        'Develop partnerships with cybersecurity firms',
        'Build specialized marketing materials'
      ],
      risks: [
        'Rapidly evolving regulatory landscape',
        'High competition from specialized firms',
        'Significant upfront investment in expertise'
      ],
      strategic_value: 9.2
    },
    {
      id: 'opportunity_2',
      opportunity_type: 'geographic_expansion',
      title: 'Sacramento Market Expansion',
      description: 'Underserved legal market with growing business sector. Limited competition in corporate law services for mid-size companies.',
      market_size: 1670000,
      growth_potential: 18.7,
      competitive_landscape: 'low',
      entry_difficulty: 'easy',
      investment_required: 125000,
      expected_roi: 167,
      timeline_to_profitability: 6,
      success_probability: 0.84,
      key_requirements: [
        'Establish satellite office or partnership',
        'Hire local attorney with market knowledge',
        'Develop referral network',
        'Create targeted marketing campaign'
      ],
      risks: [
        'Unknown local market dynamics',
        'Distance management challenges',
        'Local regulatory differences'
      ],
      strategic_value: 7.8
    },
    {
      id: 'opportunity_3',
      opportunity_type: 'service_enhancement',
      title: 'AI-Powered Legal Document Services',
      description: 'Leverage AI technology to offer faster, more cost-effective document preparation and review services.',
      market_size: 980000,
      growth_potential: 67.4,
      competitive_landscape: 'low',
      entry_difficulty: 'challenging',
      investment_required: 245000,
      expected_roi: 312,
      timeline_to_profitability: 12,
      success_probability: 0.71,
      key_requirements: [
        'Invest in AI document technology platform',
        'Train staff on new technology workflows',
        'Develop quality assurance processes',
        'Create competitive pricing strategy'
      ],
      risks: [
        'Technology implementation complexity',
        'Client acceptance of AI-assisted services',
        'Regulatory considerations for AI use'
      ],
      strategic_value: 8.6
    }
  ]

  const generateMockClientLifecycleData = (): ClientLifecycleValue[] => [
    {
      client_segment: 'Large Corporate Clients',
      current_clients: 23,
      predicted_acquisition: 8,
      predicted_retention: 0.94,
      average_lifetime_value: 487300,
      value_growth_trend: 12.8,
      churn_risk_factors: [
        'Budget constraints during economic uncertainty',
        'In-house legal team expansion',
        'Competitive pricing pressure'
      ],
      expansion_opportunities: [
        'Additional practice area services',
        'Subsidiary company legal needs',
        'International expansion support'
      ],
      satisfaction_prediction: 8.7,
      revenue_prediction: 3892000,
      profitability_score: 9.1
    },
    {
      client_segment: 'Mid-Size Businesses',
      current_clients: 67,
      predicted_acquisition: 24,
      predicted_retention: 0.87,
      average_lifetime_value: 145600,
      value_growth_trend: 8.3,
      churn_risk_factors: [
        'Cost sensitivity',
        'Seasonal business fluctuations',
        'Limited legal budget allocation'
      ],
      expansion_opportunities: [
        'Employment law compliance',
        'Contract template development',
        'Risk management consulting'
      ],
      satisfaction_prediction: 8.3,
      revenue_prediction: 2156000,
      profitability_score: 7.8
    },
    {
      client_segment: 'Individual Clients',
      current_clients: 134,
      predicted_acquisition: 45,
      predicted_retention: 0.76,
      average_lifetime_value: 28950,
      value_growth_trend: 5.7,
      churn_risk_factors: [
        'One-time legal needs',
        'Price sensitivity',
        'Limited ongoing legal requirements'
      ],
      expansion_opportunities: [
        'Family law services',
        'Estate planning',
        'Personal injury referrals'
      ],
      satisfaction_prediction: 8.1,
      revenue_prediction: 967000,
      profitability_score: 6.4
    }
  ]

  const generateMockRiskAlerts = (): RiskAlert[] => [
    {
      id: 'alert_1',
      alert_type: 'capacity_overload',
      severity: 'high',
      title: 'Capacity Overload Risk in Q2 2024',
      description: 'Predicted caseload will exceed current capacity by 13.3%, creating potential service delivery and quality risks.',
      probability: 0.87,
      potential_impact: 156000,
      time_horizon: 'short_term',
      affected_areas: ['Case Management', 'Client Satisfaction', 'Attorney Utilization'],
      early_indicators: [
        'Increasing case intake rates',
        'Extended response times to clients',
        'Attorney overtime hours trending up'
      ],
      recommended_actions: [
        'Begin recruitment process for 2 additional attorneys',
        'Implement case triage and prioritization system',
        'Consider temporary staffing augmentation',
        'Review and optimize current workflows'
      ],
      monitoring_metrics: [
        'Weekly case intake numbers',
        'Average response time to clients',
        'Attorney billable hour tracking',
        'Client satisfaction scores'
      ],
      created_at: '2024-01-15T10:30:00Z'
    },
    {
      id: 'alert_2',
      alert_type: 'client_churn',
      severity: 'medium',
      title: 'Elevated Churn Risk in Mid-Size Business Segment',
      description: 'Predictive models indicate 23% higher than normal churn probability for mid-size business clients due to economic pressures.',
      probability: 0.68,
      potential_impact: 284000,
      time_horizon: 'medium_term',
      affected_areas: ['Revenue Stability', 'Business Development', 'Client Relations'],
      early_indicators: [
        'Delayed payment patterns',
        'Reduced legal service requests',
        'Client budget constraint discussions'
      ],
      recommended_actions: [
        'Proactive client outreach and relationship building',
        'Develop flexible pricing and service packages',
        'Create value-added services at lower price points',
        'Implement client retention campaign'
      ],
      monitoring_metrics: [
        'Client payment timing',
        'Service request frequency',
        'Client satisfaction surveys',
        'Revenue per client trends'
      ],
      created_at: '2024-01-14T14:20:00Z'
    },
    {
      id: 'alert_3',
      alert_type: 'market_threat',
      severity: 'medium',
      title: 'Increased Competition in Corporate Law Sector',
      description: 'Market analysis indicates 2 new law firms entering our primary market with competitive pricing strategies.',
      probability: 0.92,
      potential_impact: 187000,
      time_horizon: 'medium_term',
      affected_areas: ['Market Share', 'Pricing Strategy', 'Client Acquisition'],
      early_indicators: [
        'New firm marketing activities',
        'Client inquiries about pricing',
        'Competitive proposal requests'
      ],
      recommended_actions: [
        'Conduct competitive analysis and positioning review',
        'Enhance value proposition and service differentiation',
        'Strengthen client relationships and retention',
        'Consider strategic pricing adjustments'
      ],
      monitoring_metrics: [
        'Market share indicators',
        'Competitive win/loss ratios',
        'Client acquisition costs',
        'Pricing effectiveness metrics'
      ],
      created_at: '2024-01-13T09:15:00Z'
    }
  ]

  const generateMockGrowthForecasts = (): GrowthForecast[] => [
    {
      forecast_period: '2024 Annual',
      revenue_predictions: {
        conservative: 3200000,
        likely: 3850000,
        optimistic: 4650000
      },
      growth_drivers: [
        {
          driver: 'New Client Acquisition',
          impact_weight: 0.35,
          confidence: 0.82,
          description: 'Aggressive business development and referral programs'
        },
        {
          driver: 'Service Expansion',
          impact_weight: 0.28,
          confidence: 0.74,
          description: 'Launch of cybersecurity and data privacy practice'
        },
        {
          driver: 'Market Growth',
          impact_weight: 0.22,
          confidence: 0.89,
          description: 'Overall legal services market expansion'
        },
        {
          driver: 'Operational Efficiency',
          impact_weight: 0.15,
          confidence: 0.91,
          description: 'Technology investments and process optimization'
        }
      ],
      market_factors: [
        {
          factor: 'Economic Conditions',
          trend: 'positive',
          impact_magnitude: 0.67
        },
        {
          factor: 'Regulatory Environment',
          trend: 'positive',
          impact_magnitude: 0.54
        },
        {
          factor: 'Technology Adoption',
          trend: 'positive',
          impact_magnitude: 0.78
        },
        {
          factor: 'Competition Intensity',
          trend: 'negative',
          impact_magnitude: 0.43
        }
      ],
      strategic_initiatives: [
        {
          initiative: 'Cybersecurity Practice Launch',
          investment_required: 185000,
          expected_return: 450000,
          timeline: '8 months',
          success_probability: 0.78
        },
        {
          initiative: 'AI Document Platform',
          investment_required: 245000,
          expected_return: 765000,
          timeline: '12 months',
          success_probability: 0.71
        },
        {
          initiative: 'Sacramento Office Expansion',
          investment_required: 125000,
          expected_return: 290000,
          timeline: '6 months',
          success_probability: 0.84
        }
      ],
      scenario_analysis: [
        {
          scenario: 'Economic Downturn',
          probability: 0.25,
          revenue_impact: -0.18,
          key_assumptions: ['Client budget cuts', 'Delayed decision making', 'Increased price sensitivity']
        },
        {
          scenario: 'Technology Disruption',
          probability: 0.15,
          revenue_impact: 0.12,
          key_assumptions: ['Early AI adoption advantage', 'Improved efficiency', 'New service offerings']
        },
        {
          scenario: 'Market Expansion',
          probability: 0.35,
          revenue_impact: 0.23,
          key_assumptions: ['Successful geographic expansion', 'New practice area growth', 'Client acquisition success']
        }
      ]
    }
  ]

  const generateMockResourceOptimization = (): ResourceOptimization[] => [
    {
      optimization_area: 'Document Management Automation',
      current_efficiency: 67.4,
      potential_improvement: 28.6,
      implementation_effort: 'medium',
      expected_savings: 127000,
      payback_period: 8.5,
      recommendations: [
        {
          action: 'Implement AI-powered document review system',
          priority: 9,
          estimated_impact: 85000,
          resources_required: ['Technology investment', 'Staff training', 'Process redesign']
        },
        {
          action: 'Automate routine document generation',
          priority: 8,
          estimated_impact: 42000,
          resources_required: ['Template development', 'System integration', 'Quality assurance']
        }
      ],
      success_metrics: [
        'Document processing time reduction',
        'Error rate improvement',
        'Staff productivity increase',
        'Client satisfaction with turnaround times'
      ],
      timeline: '6-9 months'
    },
    {
      optimization_area: 'Client Communication Streamlining',
      current_efficiency: 74.2,
      potential_improvement: 19.8,
      implementation_effort: 'low',
      expected_savings: 67000,
      payback_period: 4.2,
      recommendations: [
        {
          action: 'Deploy automated client update system',
          priority: 7,
          estimated_impact: 45000,
          resources_required: ['CRM integration', 'Communication templates', 'Staff protocols']
        },
        {
          action: 'Implement client portal for self-service',
          priority: 6,
          estimated_impact: 22000,
          resources_required: ['Portal development', 'Client training', 'Support processes']
        }
      ],
      success_metrics: [
        'Response time to client inquiries',
        'Client satisfaction scores',
        'Staff time allocation efficiency',
        'Communication volume management'
      ],
      timeline: '3-4 months'
    }
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getOpportunityColor = (type: string) => {
    switch (type) {
      case 'new_practice_area': return 'text-purple-600 bg-purple-100'
      case 'geographic_expansion': return 'text-blue-600 bg-blue-100'
      case 'service_enhancement': return 'text-green-600 bg-green-100'
      case 'client_expansion': return 'text-indigo-600 bg-indigo-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewPredictive) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-2 mr-4">
                <ArrowTrendingUpIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Predictive Analytics & Forecasting</h1>
                <p className="text-gray-600 mt-1">
                  AI-powered predictions for strategic planning and business growth
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <select
                value={selectedTimeHorizon}
                onChange={(e) => setSelectedTimeHorizon(e.target.value)}
                className="input-field text-sm"
              >
                <option value="6_months">6 Month Horizon</option>
                <option value="12_months">12 Month Horizon</option>
                <option value="24_months">24 Month Horizon</option>
                <option value="36_months">36 Month Horizon</option>
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
                { id: 'overview', name: 'Predictive Overview', icon: ChartBarIcon },
                { id: 'capacity', name: 'Capacity Planning', icon: UserGroupIcon },
                { id: 'opportunities', name: 'Market Opportunities', icon: LightBulbIcon },
                { id: 'clients', name: 'Client Lifecycle', icon: StarIcon },
                { id: 'risks', name: 'Risk Alerts', icon: ExclamationTriangleIcon },
                { id: 'growth', name: 'Growth Forecasting', icon: ArrowTrendingUpIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'capacity' | 'opportunities' | 'clients' | 'risks' | 'growth')}
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
            {/* Predictive Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-8">
                {/* Key Predictive Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Forecast Accuracy</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.forecast_accuracy}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Model confidence: {metrics.confidence_score}/10
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
                        <p className="text-sm text-gray-600">Active Predictions</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.predictions_generated}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Performance: {metrics.model_performance}%
                        </p>
                      </div>
                      <div className="bg-blue-100 rounded-lg p-3">
                        <ChartBarIcon className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Risk Alerts</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.alerts_triggered}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Recommendations: {metrics.strategic_recommendations}
                        </p>
                      </div>
                      <div className="bg-red-100 rounded-lg p-3">
                        <BellIcon className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Resource Optimization</p>
                        <p className="text-2xl font-bold text-gray-900">{formatPercentage(metrics.resource_optimization)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Variance: {metrics.revenue_forecast_variance}%
                        </p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <Cog6ToothIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Risk Alerts */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Active Risk Alerts</h3>
                  <div className="space-y-4">
                    {riskAlerts.slice(0, 3).map((alert) => (
                      <div 
                        key={alert.id}
                        className={`border-l-4 p-4 rounded-r-lg ${
                          alert.severity === 'critical' ? 'border-red-600 bg-red-50' :
                          alert.severity === 'high' ? 'border-orange-600 bg-orange-50' :
                          alert.severity === 'medium' ? 'border-yellow-600 bg-yellow-50' :
                          'border-blue-600 bg-blue-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <h4 className="font-medium text-gray-900 mr-3">{alert.title}</h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                                {alert.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{alert.description}</p>
                            <div className="flex items-center text-xs text-gray-600">
                              <span className="mr-4">Probability: {(alert.probability * 100).toFixed(0)}%</span>
                              <span className="mr-4">Impact: {formatCurrency(alert.potential_impact)}</span>
                              <span>Timeline: {alert.time_horizon.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Optimization Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {resourceOptimization.slice(0, 2).map((optimization, index) => (
                    <div key={index} className="card">
                      <h4 className="font-medium text-gray-900 mb-3">{optimization.optimization_area}</h4>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">{optimization.current_efficiency}%</div>
                          <div className="text-xs text-gray-600">Current Efficiency</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">+{optimization.potential_improvement}%</div>
                          <div className="text-xs text-gray-600">Potential Gain</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Expected Savings</span>
                          <span className="font-medium text-green-600">{formatCurrency(optimization.expected_savings)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Payback Period</span>
                          <span className="font-medium">{optimization.payback_period.toFixed(1)} months</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Implementation</span>
                          <span className={`font-medium ${
                            optimization.implementation_effort === 'low' ? 'text-green-600' :
                            optimization.implementation_effort === 'medium' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {optimization.implementation_effort}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Capacity Planning Tab */}
            {activeTab === 'capacity' && (
              <div className="space-y-6">
                {capacityForecasts.map((forecast, index) => (
                  <div key={index} className="card">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">{forecast.period} Capacity Forecast</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {(forecast.confidence_level * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{forecast.predicted_caseload}</div>
                        <div className="text-sm text-gray-600">Predicted Caseload</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{forecast.current_capacity}</div>
                        <div className="text-sm text-gray-600">Current Capacity</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${forecast.capacity_utilization > 100 ? 'text-red-600' : 'text-yellow-600'}`}>
                          {forecast.capacity_utilization.toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600">Utilization</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {forecast.staffing_needs.attorneys_needed + forecast.staffing_needs.paralegals_needed + forecast.staffing_needs.support_staff_needed}
                        </div>
                        <div className="text-sm text-gray-600">Staff Needed</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Staffing Needs</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Attorneys</span>
                            <span className="font-medium">{forecast.staffing_needs.attorneys_needed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Paralegals</span>
                            <span className="font-medium">{forecast.staffing_needs.paralegals_needed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Support Staff</span>
                            <span className="font-medium">{forecast.staffing_needs.support_staff_needed}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Bottleneck Risks</h4>
                        <div className="space-y-2">
                          {forecast.bottleneck_risks.map((risk, riskIndex) => (
                            <div key={riskIndex} className="flex justify-between items-center">
                              <span className="text-sm text-gray-700">{risk.area}</span>
                              <div className="flex items-center">
                                <span className="text-xs text-gray-600 mr-2">{(risk.probability * 100).toFixed(0)}%</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  risk.impact === 'critical' ? 'bg-red-100 text-red-800' :
                                  risk.impact === 'high' ? 'bg-orange-100 text-orange-800' :
                                  risk.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {risk.impact}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="space-y-2">
                        {forecast.capacity_recommendations.map((recommendation, recIndex) => (
                          <li key={recIndex} className="flex items-start">
                            <LightBulbIcon className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Market Opportunities Tab */}
            {activeTab === 'opportunities' && (
              <div className="space-y-6">
                {marketOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">{opportunity.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOpportunityColor(opportunity.opportunity_type)}`}>
                            {opportunity.opportunity_type.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4">{opportunity.description}</p>
                      </div>
                      
                      <div className="ml-4 text-right">
                        <div className="text-sm font-medium text-gray-900">Strategic Value</div>
                        <div className="text-2xl font-bold text-purple-600">{opportunity.strategic_value}/10</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-green-600">{formatCurrency(opportunity.market_size)}</div>
                        <div className="text-xs text-gray-600">Market Size</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-blue-600">{formatPercentage(opportunity.growth_potential)}</div>
                        <div className="text-xs text-gray-600">Growth Potential</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-purple-600">{opportunity.expected_roi}%</div>
                        <div className="text-xs text-gray-600">Expected ROI</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-orange-600">{opportunity.timeline_to_profitability}mo</div>
                        <div className="text-xs text-gray-600">Time to Profit</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">Competition</div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCompetitionColor(opportunity.competitive_landscape)}`}>
                          {opportunity.competitive_landscape}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">Entry Difficulty</div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          opportunity.entry_difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          opportunity.entry_difficulty === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {opportunity.entry_difficulty}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">Success Probability</div>
                        <div className="text-lg font-bold text-blue-600">{(opportunity.success_probability * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Key Requirements</h4>
                        <ul className="space-y-2">
                          {opportunity.key_requirements.map((requirement, index) => (
                            <li key={index} className="flex items-start">
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                              <span className="text-sm text-gray-700">{requirement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Risk Factors</h4>
                        <ul className="space-y-2">
                          {opportunity.risks.map((risk, index) => (
                            <li key={index} className="flex items-start">
                              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Investment Required</span>
                        <span className="font-medium text-red-600">{formatCurrency(opportunity.investment_required)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Client Lifecycle Tab */}
            {activeTab === 'clients' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                  {clientLifecycleData.map((segment, index) => (
                    <div key={index} className="card">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">{segment.client_segment}</h3>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Profitability Score</div>
                          <div className="text-2xl font-bold text-purple-600">{segment.profitability_score}/10</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{segment.current_clients}</div>
                          <div className="text-sm text-gray-600">Current Clients</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(segment.average_lifetime_value)}</div>
                          <div className="text-sm text-gray-600">Avg Lifetime Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{(segment.predicted_retention * 100).toFixed(0)}%</div>
                          <div className="text-sm text-gray-600">Retention Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{formatCurrency(segment.revenue_prediction)}</div>
                          <div className="text-sm text-gray-600">Predicted Revenue</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Churn Risk Factors</h4>
                          <ul className="space-y-2">
                            {segment.churn_risk_factors.map((factor, factorIndex) => (
                              <li key={factorIndex} className="flex items-start">
                                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{factor}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Expansion Opportunities</h4>
                          <ul className="space-y-2">
                            {segment.expansion_opportunities.map((opportunity, oppIndex) => (
                              <li key={oppIndex} className="flex items-start">
                                <ArrowTrendingUpIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{opportunity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-sm text-gray-600">Predicted Acquisition</div>
                            <div className="text-lg font-bold text-blue-600">{segment.predicted_acquisition} clients</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Value Growth Trend</div>
                            <div className={`text-lg font-bold ${segment.value_growth_trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(segment.value_growth_trend)}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Satisfaction Prediction</div>
                            <div className="text-lg font-bold text-purple-600">{segment.satisfaction_prediction.toFixed(1)}/10</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk Alerts Tab */}
            {activeTab === 'risks' && (
              <div className="space-y-6">
                {riskAlerts.map((alert) => (
                  <div key={alert.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">{alert.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {alert.time_horizon.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4">{alert.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-red-600">{(alert.probability * 100).toFixed(0)}%</div>
                        <div className="text-xs text-gray-600">Probability</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-orange-600">{formatCurrency(alert.potential_impact)}</div>
                        <div className="text-xs text-gray-600">Potential Impact</div>
                      </div>
                      <div className="text-center bg-gray-50 rounded-lg p-3">
                        <div className="text-lg font-bold text-blue-600">{alert.affected_areas.length}</div>
                        <div className="text-xs text-gray-600">Affected Areas</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Early Indicators</h4>
                        <ul className="space-y-2">
                          {alert.early_indicators.map((indicator, index) => (
                            <li key={index} className="flex items-start">
                              <BellIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{indicator}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
                        <ul className="space-y-2">
                          {alert.recommended_actions.map((action, index) => (
                            <li key={index} className="flex items-start">
                              <LightBulbIcon className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Monitoring Metrics</h4>
                      <div className="flex flex-wrap gap-2">
                        {alert.monitoring_metrics.map((metric, index) => (
                          <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {metric}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Growth Forecasting Tab */}
            {activeTab === 'growth' && (
              <div className="space-y-6">
                {growthForecasts.map((forecast, index) => (
                  <div key={index} className="space-y-6">
                    {/* Revenue Predictions */}
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">{forecast.forecast_period} Revenue Forecast</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">{formatCurrency(forecast.revenue_predictions.conservative)}</div>
                          <div className="text-sm text-gray-600">Conservative</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{formatCurrency(forecast.revenue_predictions.likely)}</div>
                          <div className="text-sm text-gray-600">Most Likely</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{formatCurrency(forecast.revenue_predictions.optimistic)}</div>
                          <div className="text-sm text-gray-600">Optimistic</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Growth Drivers</h4>
                          <div className="space-y-3">
                            {forecast.growth_drivers.map((driver, driverIndex) => (
                              <div key={driverIndex} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                <div>
                                  <div className="font-medium text-gray-900">{driver.driver}</div>
                                  <div className="text-sm text-gray-600">{driver.description}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-blue-600">{(driver.impact_weight * 100).toFixed(0)}%</div>
                                  <div className="text-xs text-gray-500">{(driver.confidence * 100).toFixed(0)}% conf.</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Market Factors</h4>
                          <div className="space-y-2">
                            {forecast.market_factors.map((factor, factorIndex) => (
                              <div key={factorIndex} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700">{factor.factor}</span>
                                <div className="flex items-center">
                                  <span className={`text-xs font-medium mr-2 ${
                                    factor.trend === 'positive' ? 'text-green-600' :
                                    factor.trend === 'negative' ? 'text-red-600' : 'text-gray-600'
                                  }`}>
                                    {factor.trend}
                                  </span>
                                  <span className="text-xs text-gray-500">{(factor.impact_magnitude * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Strategic Initiatives */}
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Strategic Initiatives</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
                        {forecast.strategic_initiatives.map((initiative, initIndex) => (
                          <div key={initIndex} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium text-gray-900">{initiative.initiative}</h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {(initiative.success_probability * 100).toFixed(0)}% success
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <div className="text-sm text-gray-600">Investment</div>
                                <div className="text-lg font-bold text-red-600">{formatCurrency(initiative.investment_required)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Expected Return</div>
                                <div className="text-lg font-bold text-green-600">{formatCurrency(initiative.expected_return)}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-600">Timeline</div>
                                <div className="text-lg font-bold text-blue-600">{initiative.timeline}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Scenario Analysis */}
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Scenario Analysis</h3>
                      <div className="space-y-4">
                        {forecast.scenario_analysis.map((scenario, scenarioIndex) => (
                          <div key={scenarioIndex} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="font-medium text-gray-900">{scenario.scenario}</h4>
                              <div className="text-right">
                                <div className="text-sm text-gray-600">Probability</div>
                                <div className="text-lg font-bold text-blue-600">{(scenario.probability * 100).toFixed(0)}%</div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-gray-600">Revenue Impact</div>
                                <div className={`text-lg font-bold ${scenario.revenue_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatPercentage(scenario.revenue_impact * 100)}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-sm text-gray-600 mb-2">Key Assumptions</div>
                                <div className="flex flex-wrap gap-1">
                                  {scenario.key_assumptions.map((assumption, assIndex) => (
                                    <span key={assIndex} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {assumption}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
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