/**
 * Case Outcome & Pattern Analysis - Advanced legal analytics and case intelligence
 * AI-powered pattern recognition with outcome prediction and strategic insights
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ChartBarIcon,
  ScaleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface CaseAnalyticsMetrics {
  total_cases_analyzed: number
  success_rate: number
  average_case_value: number
  settlement_rate: number
  trial_win_rate: number
  median_case_duration: number
  client_satisfaction_avg: number
  patterns_identified: number
}

interface CaseOutcome {
  case_id: string
  case_title: string
  client_name: string
  practice_area: string
  case_type: string
  opened_date: string
  closed_date: string
  duration_months: number
  outcome: 'won' | 'lost' | 'settled' | 'dismissed' | 'ongoing'
  financial_result: number
  client_satisfaction: number
  assigned_attorney: string
  settlement_amount?: number
  trial_verdict?: string
  key_factors: string[]
  complexity_score: number
  success_predictors: string[]
}

interface PatternInsight {
  id: string
  pattern_type: 'success_factor' | 'risk_indicator' | 'efficiency_pattern' | 'client_behavior' | 'market_trend'
  title: string
  description: string
  confidence_score: number
  impact_level: 'low' | 'medium' | 'high' | 'critical'
  practice_areas: string[]
  supporting_data: {
    sample_size: number
    correlation_strength: number
    statistical_significance: number
  }
  recommendations: string[]
  financial_impact: number
  implementation_priority: number
}

interface PracticeAreaAnalysis {
  practice_area: string
  total_cases: number
  success_rate: number
  average_duration: number
  average_value: number
  settlement_rate: number
  client_satisfaction: number
  profitability_score: number
  growth_trend: number
  key_success_factors: string[]
  common_challenges: string[]
  market_position: 'leading' | 'competitive' | 'developing'
}

interface OutcomePrediction {
  case_id: string
  case_title: string
  client_name: string
  predicted_outcome: 'likely_win' | 'likely_loss' | 'likely_settlement' | 'uncertain'
  confidence_level: number
  predicted_duration: number
  predicted_value: number
  key_factors: Array<{
    factor: string
    weight: number
    impact: 'positive' | 'negative' | 'neutral'
  }>
  risk_factors: string[]
  recommendations: string[]
  similar_cases: Array<{
    case_id: string
    similarity_score: number
    outcome: string
    key_lessons: string[]
  }>
}

interface TimelineAnalysis {
  phase: string
  average_duration: number
  success_correlation: number
  bottleneck_probability: number
  optimization_opportunities: string[]
  best_practices: string[]
}

export default function CaseAnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [metrics, setMetrics] = useState<CaseAnalyticsMetrics | null>(null)
  const [caseOutcomes, setCaseOutcomes] = useState<CaseOutcome[]>([])
  const [patternInsights, setPatternInsights] = useState<PatternInsight[]>([])
  const [practiceAreaAnalysis, setPracticeAreaAnalysis] = useState<PracticeAreaAnalysis[]>([])
  const [outcomePredictions, setOutcomePredictions] = useState<OutcomePrediction[]>([])
  const [timelineAnalysis, setTimelineAnalysis] = useState<TimelineAnalysis[]>([])
  const [loading, setLoading] = useState(false)
  const [_error, setError] = useState('')
  const [selectedFilters, setSelectedFilters] = useState({
    practice_area: 'all',
    date_range: '12_months',
    outcome_type: 'all',
    attorney: 'all'
  })
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'predictions' | 'practice_areas' | 'timeline'>('overview')

  // Check permissions
  const canViewAnalytics = user && ['admin', 'partner', 'senior_associate'].includes(user.role)

  // Redirect if unauthorized
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
    if (user && !canViewAnalytics) {
      router.push('/dashboard')
    }
  }, [user, authLoading, canViewAnalytics, router])

  // Load analytics data
  useEffect(() => {
    if (user && canViewAnalytics) {
      loadAnalyticsData()
    }
  }, [user, canViewAnalytics, selectedFilters, loadAnalyticsData])

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setMetrics(generateMockAnalyticsMetrics())
      setCaseOutcomes(generateMockCaseOutcomes())
      setPatternInsights(generateMockPatternInsights())
      setPracticeAreaAnalysis(generateMockPracticeAreaAnalysis())
      setOutcomePredictions(generateMockOutcomePredictions())
      setTimelineAnalysis(generateMockTimelineAnalysis())
    } catch (error) {
      setError('Failed to load analytics data')
      console.error('Analytics data error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const generateMockAnalyticsMetrics = (): CaseAnalyticsMetrics => ({
    total_cases_analyzed: 487,
    success_rate: 78.5,
    average_case_value: 47560,
    settlement_rate: 65.3,
    trial_win_rate: 82.1,
    median_case_duration: 4.7,
    client_satisfaction_avg: 8.6,
    patterns_identified: 23
  })

  const generateMockCaseOutcomes = (): CaseOutcome[] => {
    const outcomes: CaseOutcome[] = []
    const practiceAreas = ['Corporate Law', 'Litigation', 'Real Estate', 'Employment Law', 'Family Law']
    const outcomeTypes: CaseOutcome['outcome'][] = ['won', 'lost', 'settled', 'dismissed']
    const attorneys = ['Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Wilson']
    
    for (let i = 0; i < 50; i++) {
      const openDate = new Date(Date.now() - Math.random() * 2 * 365 * 24 * 60 * 60 * 1000)
      const duration = 2 + Math.random() * 10
      const closeDate = new Date(openDate.getTime() + duration * 30 * 24 * 60 * 60 * 1000)
      const outcome = outcomeTypes[Math.floor(Math.random() * outcomeTypes.length)]
      
      outcomes.push({
        case_id: `case_${i + 1}`,
        case_title: `Case ${i + 1} - ${practiceAreas[Math.floor(Math.random() * practiceAreas.length)]}`,
        client_name: `Client ${i + 1}`,
        practice_area: practiceAreas[Math.floor(Math.random() * practiceAreas.length)],
        case_type: ['Contract Dispute', 'Employment Issue', 'Property Matter', 'Corporate Transaction'][Math.floor(Math.random() * 4)],
        opened_date: openDate.toISOString(),
        closed_date: closeDate.toISOString(),
        duration_months: duration,
        outcome,
        financial_result: outcome === 'won' ? 20000 + Math.random() * 100000 : 
                        outcome === 'settled' ? 10000 + Math.random() * 50000 : 0,
        client_satisfaction: 6 + Math.random() * 4,
        assigned_attorney: attorneys[Math.floor(Math.random() * attorneys.length)],
        settlement_amount: outcome === 'settled' ? 15000 + Math.random() * 75000 : undefined,
        trial_verdict: outcome === 'won' ? 'Favorable jury verdict' : outcome === 'lost' ? 'Adverse verdict' : undefined,
        key_factors: [
          'Strong evidence', 'Client cooperation', 'Opposing counsel quality', 'Court jurisdiction', 'Case complexity'
        ].slice(0, Math.floor(Math.random() * 3) + 2),
        complexity_score: Math.random() * 10,
        success_predictors: [
          'Early settlement discussions', 'Comprehensive discovery', 'Expert witness testimony', 'Strong legal precedent'
        ].slice(0, Math.floor(Math.random() * 2) + 1)
      })
    }
    
    return outcomes.sort((a, b) => new Date(b.closed_date).getTime() - new Date(a.closed_date).getTime())
  }

  const generateMockPatternInsights = (): PatternInsight[] => [
    {
      id: 'pattern_1',
      pattern_type: 'success_factor',
      title: 'Early Settlement Discussions Increase Success Rate by 34%',
      description: 'Cases where settlement discussions begin within the first 60 days show significantly higher success rates and client satisfaction. This pattern is consistent across all practice areas.',
      confidence_score: 0.89,
      impact_level: 'high',
      practice_areas: ['Corporate Law', 'Litigation', 'Employment Law'],
      supporting_data: {
        sample_size: 187,
        correlation_strength: 0.73,
        statistical_significance: 0.95
      },
      recommendations: [
        'Initiate settlement discussions within 45 days of case opening',
        'Develop early case assessment protocols',
        'Train attorneys on effective settlement negotiation techniques'
      ],
      financial_impact: 285000,
      implementation_priority: 9
    },
    {
      id: 'pattern_2',
      pattern_type: 'efficiency_pattern',
      title: 'Complex Cases Benefit from Dedicated Case Manager Assignment',
      description: 'Cases with complexity scores above 7.0 show 28% faster resolution and 15% higher client satisfaction when assigned a dedicated case manager.',
      confidence_score: 0.82,
      impact_level: 'medium',
      practice_areas: ['Corporate Law', 'Litigation'],
      supporting_data: {
        sample_size: 94,
        correlation_strength: 0.68,
        statistical_significance: 0.92
      },
      recommendations: [
        'Implement complexity scoring for all new cases',
        'Assign dedicated case managers for high-complexity matters',
        'Develop specialized workflows for complex cases'
      ],
      financial_impact: 156000,
      implementation_priority: 7
    },
    {
      id: 'pattern_3',
      pattern_type: 'risk_indicator',
      title: 'Client Communication Gaps Predict 67% Higher Dissatisfaction Risk',
      description: 'Cases with communication gaps longer than 14 days show significantly higher risk of client dissatisfaction and negative outcomes.',
      confidence_score: 0.91,
      impact_level: 'critical',
      practice_areas: ['All Practice Areas'],
      supporting_data: {
        sample_size: 312,
        correlation_strength: 0.81,
        statistical_significance: 0.97
      },
      recommendations: [
        'Implement automated communication tracking',
        'Set up client communication alerts for 10-day intervals',
        'Develop proactive client outreach protocols'
      ],
      financial_impact: -187000,
      implementation_priority: 10
    },
    {
      id: 'pattern_4',
      pattern_type: 'market_trend',
      title: 'Employment Law Cases Show Increasing Settlement Preference',
      description: 'Employment law cases settled in 2024 increased by 23% compared to 2023, with higher client satisfaction and faster resolution times.',
      confidence_score: 0.86,
      impact_level: 'medium',
      practice_areas: ['Employment Law'],
      supporting_data: {
        sample_size: 156,
        correlation_strength: 0.71,
        statistical_significance: 0.94
      },
      recommendations: [
        'Adjust employment law case strategies to emphasize settlement',
        'Develop specialized employment settlement frameworks',
        'Track market trends in employment dispute resolution'
      ],
      financial_impact: 98000,
      implementation_priority: 6
    }
  ]

  const generateMockPracticeAreaAnalysis = (): PracticeAreaAnalysis[] => [
    {
      practice_area: 'Corporate Law',
      total_cases: 87,
      success_rate: 85.7,
      average_duration: 6.2,
      average_value: 78450,
      settlement_rate: 42.1,
      client_satisfaction: 8.9,
      profitability_score: 9.2,
      growth_trend: 15.8,
      key_success_factors: [
        'Early stakeholder alignment',
        'Comprehensive due diligence',
        'Regulatory expertise',
        'Deal structure optimization'
      ],
      common_challenges: [
        'Complex regulatory requirements',
        'Multiple stakeholder coordination',
        'Tight transaction timelines'
      ],
      market_position: 'leading'
    },
    {
      practice_area: 'Litigation',
      total_cases: 134,
      success_rate: 76.1,
      average_duration: 8.4,
      average_value: 45670,
      settlement_rate: 68.7,
      client_satisfaction: 8.3,
      profitability_score: 7.8,
      growth_trend: 8.2,
      key_success_factors: [
        'Strong case preparation',
        'Effective discovery management',
        'Settlement negotiation skills',
        'Trial advocacy expertise'
      ],
      common_challenges: [
        'Unpredictable court schedules',
        'Complex evidence management',
        'Opposing counsel tactics'
      ],
      market_position: 'competitive'
    },
    {
      practice_area: 'Real Estate',
      total_cases: 98,
      success_rate: 91.8,
      average_duration: 3.1,
      average_value: 28940,
      settlement_rate: 87.3,
      client_satisfaction: 9.1,
      profitability_score: 8.4,
      growth_trend: 22.1,
      key_success_factors: [
        'Market knowledge',
        'Title review expertise',
        'Financing coordination',
        'Closing process efficiency'
      ],
      common_challenges: [
        'Market volatility',
        'Financing complications',
        'Regulatory changes'
      ],
      market_position: 'leading'
    },
    {
      practice_area: 'Employment Law',
      total_cases: 123,
      success_rate: 72.4,
      average_duration: 5.8,
      average_value: 34560,
      settlement_rate: 78.9,
      client_satisfaction: 8.1,
      profitability_score: 6.9,
      growth_trend: -2.4,
      key_success_factors: [
        'Regulatory compliance',
        'Employee relations expertise',
        'Investigation skills',
        'Settlement negotiation'
      ],
      common_challenges: [
        'Evolving regulations',
        'Emotional client dynamics',
        'Documentation requirements'
      ],
      market_position: 'competitive'
    },
    {
      practice_area: 'Family Law',
      total_cases: 45,
      success_rate: 68.9,
      average_duration: 7.2,
      average_value: 18750,
      settlement_rate: 82.2,
      client_satisfaction: 7.8,
      profitability_score: 5.7,
      growth_trend: 5.7,
      key_success_factors: [
        'Mediation skills',
        'Child welfare focus',
        'Financial analysis',
        'Emotional support'
      ],
      common_challenges: [
        'High emotional stakes',
        'Complex financial situations',
        'Child custody considerations'
      ],
      market_position: 'developing'
    }
  ]

  const generateMockOutcomePredictions = (): OutcomePrediction[] => [
    {
      case_id: 'case_active_1',
      case_title: 'TechCorp Acquisition Review',
      client_name: 'TechCorp Industries',
      predicted_outcome: 'likely_win',
      confidence_level: 0.87,
      predicted_duration: 4.2,
      predicted_value: 125000,
      key_factors: [
        { factor: 'Strong legal precedent', weight: 0.31, impact: 'positive' },
        { factor: 'Client cooperation level', weight: 0.28, impact: 'positive' },
        { factor: 'Regulatory complexity', weight: 0.23, impact: 'negative' },
        { factor: 'Market timing', weight: 0.18, impact: 'positive' }
      ],
      risk_factors: [
        'Potential regulatory delays',
        'Third-party stakeholder objections',
        'Market volatility impact'
      ],
      recommendations: [
        'Accelerate regulatory approval process',
        'Prepare contingency plans for stakeholder concerns',
        'Monitor market conditions closely'
      ],
      similar_cases: [
        {
          case_id: 'case_127',
          similarity_score: 0.89,
          outcome: 'successful_completion',
          key_lessons: ['Early regulatory engagement crucial', 'Stakeholder communication plan essential']
        },
        {
          case_id: 'case_203',
          similarity_score: 0.82,
          outcome: 'successful_completion',
          key_lessons: ['Market timing considerations', 'Due diligence thoroughness']
        }
      ]
    },
    {
      case_id: 'case_active_2',
      case_title: 'Employment Dispute Resolution',
      client_name: 'Global Manufacturing LLC',
      predicted_outcome: 'likely_settlement',
      confidence_level: 0.74,
      predicted_duration: 6.8,
      predicted_value: 45000,
      key_factors: [
        { factor: 'Settlement history pattern', weight: 0.35, impact: 'positive' },
        { factor: 'Case complexity score', weight: 0.29, impact: 'negative' },
        { factor: 'Client budget constraints', weight: 0.21, impact: 'neutral' },
        { factor: 'Opposing party profile', weight: 0.15, impact: 'positive' }
      ],
      risk_factors: [
        'Discovery may reveal additional complications',
        'Employee witness availability issues',
        'Regulatory investigation possibility'
      ],
      recommendations: [
        'Initiate settlement discussions within 30 days',
        'Secure key witness availability early',
        'Prepare for potential regulatory review'
      ],
      similar_cases: [
        {
          case_id: 'case_089',
          similarity_score: 0.76,
          outcome: 'favorable_settlement',
          key_lessons: ['Early settlement saves costs', 'Documentation quality matters']
        }
      ]
    }
  ]

  const generateMockTimelineAnalysis = (): TimelineAnalysis[] => [
    {
      phase: 'Case Initiation & Planning',
      average_duration: 0.8,
      success_correlation: 0.73,
      bottleneck_probability: 0.15,
      optimization_opportunities: [
        'Streamline client intake process',
        'Automate initial case assessment',
        'Improve resource allocation planning'
      ],
      best_practices: [
        'Complete intake within 3 business days',
        'Conduct initial strategy session within 1 week',
        'Set clear expectations with client upfront'
      ]
    },
    {
      phase: 'Discovery & Investigation',
      average_duration: 2.4,
      success_correlation: 0.81,
      bottleneck_probability: 0.42,
      optimization_opportunities: [
        'Implement discovery automation tools',
        'Improve document management workflow',
        'Enhance third-party coordination'
      ],
      best_practices: [
        'Start discovery planning immediately',
        'Use technology for document review',
        'Maintain regular opposing counsel communication'
      ]
    },
    {
      phase: 'Negotiation & Resolution',
      average_duration: 1.6,
      success_correlation: 0.69,
      bottleneck_probability: 0.28,
      optimization_opportunities: [
        'Develop standardized negotiation frameworks',
        'Improve client decision-making process',
        'Enhance settlement documentation efficiency'
      ],
      best_practices: [
        'Prepare multiple settlement scenarios',
        'Maintain client communication throughout',
        'Document all negotiation points clearly'
      ]
    }
  ]

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'won': case 'likely_win': return 'text-green-600 bg-green-100'
      case 'lost': case 'likely_loss': return 'text-red-600 bg-red-100'
      case 'settled': case 'likely_settlement': return 'text-blue-600 bg-blue-100'
      case 'dismissed': return 'text-gray-600 bg-gray-100'
      case 'uncertain': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-purple-600 bg-purple-100'
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getMarketPositionColor = (position: string) => {
    switch (position) {
      case 'leading': return 'text-green-600 bg-green-100'
      case 'competitive': return 'text-blue-600 bg-blue-100'
      case 'developing': return 'text-yellow-600 bg-yellow-100'
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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewAnalytics) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-2 mr-4">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Case Analytics & Pattern Recognition</h1>
                <p className="text-gray-600 mt-1">
                  AI-powered insights into case outcomes and success patterns
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <select
                value={selectedFilters.practice_area}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, practice_area: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="all">All Practice Areas</option>
                <option value="corporate">Corporate Law</option>
                <option value="litigation">Litigation</option>
                <option value="real_estate">Real Estate</option>
                <option value="employment">Employment Law</option>
                <option value="family">Family Law</option>
              </select>
              
              <select
                value={selectedFilters.date_range}
                onChange={(e) => setSelectedFilters(prev => ({ ...prev, date_range: e.target.value }))}
                className="input-field text-sm"
              >
                <option value="6_months">Last 6 Months</option>
                <option value="12_months">Last 12 Months</option>
                <option value="24_months">Last 24 Months</option>
                <option value="all_time">All Time</option>
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
                { id: 'overview', name: 'Analytics Overview', icon: ChartBarIcon },
                { id: 'patterns', name: 'Pattern Insights', icon: LightBulbIcon },
                { id: 'predictions', name: 'Outcome Predictions', icon: ArrowTrendingUpIcon },
                { id: 'practice_areas', name: 'Practice Area Analysis', icon: ScaleIcon },
                { id: 'timeline', name: 'Timeline Analysis', icon: ClockIcon }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'overview' | 'patterns' | 'predictions' | 'practice_areas' | 'timeline')}
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
            {/* Analytics Overview Tab */}
            {activeTab === 'overview' && metrics && (
              <div className="space-y-8">
                {/* Key Analytics Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.success_rate}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.total_cases_analyzed} cases analyzed
                        </p>
                      </div>
                      <div className="bg-green-100 rounded-lg p-3">
                        <CheckCircleIcon className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Settlement Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.settlement_rate}%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Trial win rate: {metrics.trial_win_rate}%
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
                        <p className="text-sm text-gray-600">Avg Case Value</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.average_case_value)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Median duration: {metrics.median_case_duration} months
                        </p>
                      </div>
                      <div className="bg-yellow-100 rounded-lg p-3">
                        <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Client Satisfaction</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics.client_satisfaction_avg}/10</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {metrics.patterns_identified} patterns identified
                        </p>
                      </div>
                      <div className="bg-purple-100 rounded-lg p-3">
                        <StarIcon className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Case Outcomes */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Case Outcomes</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Case
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Outcome
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Satisfaction
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Attorney
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {caseOutcomes.slice(0, 10).map((caseItem) => (
                          <tr key={caseItem.case_id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{caseItem.case_title}</div>
                                <div className="text-sm text-gray-500">{caseItem.client_name}</div>
                                <div className="text-sm text-gray-500">{caseItem.practice_area}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(caseItem.outcome)}`}>
                                {caseItem.outcome}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {caseItem.duration_months.toFixed(1)} months
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(caseItem.financial_result)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                caseItem.client_satisfaction >= 8 ? 'text-green-600' :
                                caseItem.client_satisfaction >= 7 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {caseItem.client_satisfaction.toFixed(1)}/10
                              </span>
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

            {/* Pattern Insights Tab */}
            {activeTab === 'patterns' && (
              <div className="space-y-6">
                {patternInsights.map((insight) => (
                  <div key={insight.id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">{insight.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(insight.impact_level)}`}>
                            {insight.impact_level} impact
                          </span>
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {(insight.confidence_score * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4">{insight.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">Sample Size</div>
                            <div className="text-lg font-bold text-blue-600">{insight.supporting_data.sample_size} cases</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">Correlation Strength</div>
                            <div className="text-lg font-bold text-green-600">{(insight.supporting_data.correlation_strength * 100).toFixed(0)}%</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">Financial Impact</div>
                            <div className={`text-lg font-bold ${insight.financial_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(insight.financial_impact))}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 mb-1">Priority</div>
                        <div className="text-2xl font-bold text-purple-600">{insight.implementation_priority}/10</div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="space-y-2">
                        {insight.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {insight.practice_areas.map((area, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Outcome Predictions Tab */}
            {activeTab === 'predictions' && (
              <div className="space-y-6">
                {outcomePredictions.map((prediction) => (
                  <div key={prediction.case_id} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">{prediction.case_title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOutcomeColor(prediction.predicted_outcome)}`}>
                            {prediction.predicted_outcome.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-4">Client: {prediction.client_name}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">Confidence Level</div>
                            <div className="text-lg font-bold text-blue-600">{(prediction.confidence_level * 100).toFixed(0)}%</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">Predicted Duration</div>
                            <div className="text-lg font-bold text-green-600">{prediction.predicted_duration.toFixed(1)} months</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-sm font-medium text-gray-900">Predicted Value</div>
                            <div className="text-lg font-bold text-purple-600">{formatCurrency(prediction.predicted_value)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Key Factors</h4>
                        <div className="space-y-2">
                          {prediction.key_factors.map((factor, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm text-gray-700">{factor.factor}</span>
                              <div className="flex items-center">
                                <span className={`text-xs font-medium mr-2 ${
                                  factor.impact === 'positive' ? 'text-green-600' :
                                  factor.impact === 'negative' ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {factor.impact}
                                </span>
                                <span className="text-xs text-gray-500">{(factor.weight * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Risk Factors</h4>
                        <ul className="space-y-2">
                          {prediction.risk_factors.map((risk, index) => (
                            <li key={index} className="flex items-start">
                              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                      <ul className="space-y-2">
                        {prediction.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <LightBulbIcon className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Practice Area Analysis Tab */}
            {activeTab === 'practice_areas' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {practiceAreaAnalysis.map((area) => (
                    <div key={area.practice_area} className="card">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{area.practice_area}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMarketPositionColor(area.market_position)}`}>
                          {area.market_position}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{area.success_rate.toFixed(1)}%</div>
                          <div className="text-sm text-gray-600">Success Rate</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{formatCurrency(area.average_value)}</div>
                          <div className="text-sm text-gray-600">Avg Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">{area.average_duration.toFixed(1)}mo</div>
                          <div className="text-sm text-gray-600">Avg Duration</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">{area.client_satisfaction.toFixed(1)}/10</div>
                          <div className="text-sm text-gray-600">Satisfaction</div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Key Success Factors</h4>
                          <div className="flex flex-wrap gap-1">
                            {area.key_success_factors.map((factor, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Common Challenges</h4>
                          <div className="flex flex-wrap gap-1">
                            {area.common_challenges.map((challenge, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                                {challenge}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Growth Trend</span>
                          <span className={`font-medium ${area.growth_trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {area.growth_trend >= 0 ? '+' : ''}{area.growth_trend.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mt-1">
                          <span className="text-gray-600">Profitability Score</span>
                          <span className="font-medium text-blue-600">{area.profitability_score.toFixed(1)}/10</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Analysis Tab */}
            {activeTab === 'timeline' && (
              <div className="space-y-6">
                {timelineAnalysis.map((phase, index) => (
                  <div key={index} className="card">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{phase.phase}</h3>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Avg Duration</div>
                        <div className="text-lg font-bold text-blue-600">{phase.average_duration} months</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900">Success Correlation</div>
                        <div className="text-lg font-bold text-green-600">{(phase.success_correlation * 100).toFixed(0)}%</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900">Bottleneck Risk</div>
                        <div className="text-lg font-bold text-red-600">{(phase.bottleneck_probability * 100).toFixed(0)}%</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-900">Optimization Score</div>
                        <div className="text-lg font-bold text-purple-600">{(10 - phase.bottleneck_probability * 10).toFixed(1)}/10</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Optimization Opportunities</h4>
                        <ul className="space-y-2">
                          {phase.optimization_opportunities.map((opportunity, idx) => (
                            <li key={idx} className="flex items-start">
                              <ArrowTrendingUpIcon className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{opportunity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">Best Practices</h4>
                        <ul className="space-y-2">
                          {phase.best_practices.map((practice, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircleIcon className="h-4 w-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                              <span className="text-sm text-gray-700">{practice}</span>
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