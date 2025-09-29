'use client'

import { useState } from 'react'
import { 
  ChartBarIcon, 
  ArrowTrendingUpIcon, 
  CurrencyDollarIcon,
  GlobeAltIcon,
  LightBulbIcon,
  TagIcon as TargetIcon,
  ArrowDownTrayIcon,
  PresentationChartLineIcon,
  ChartPieIcon
} from '@heroicons/react/24/outline'

interface MarketMetrics {
  market_size: number
  growth_rate: number
  market_share: number
  competitor_count: number
  opportunity_score: number
  saturation_level: number
  entry_barriers: number
  profitability_index: number
}

interface CompetitorAnalysis {
  id: string
  name: string
  market_share: number
  revenue_estimate: number
  practice_areas: string[]
  strengths: string[]
  weaknesses: string[]
  threat_level: 'low' | 'medium' | 'high'
  opportunity_rating: number
}

interface MarketOpportunity {
  id: string
  area: string
  potential_revenue: number
  investment_required: number
  roi_projection: number
  time_to_market: string
  risk_level: 'low' | 'medium' | 'high'
  market_demand: number
  competitive_intensity: number
  recommendation: string
}

interface BusinessInsight {
  id: string
  category: string
  insight: string
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
  data_sources: string[]
  confidence_level: number
  recommended_action: string
  potential_value: number
}

interface GeographicAnalysis {
  region: string
  market_size: number
  growth_potential: number
  competition_level: number
  avg_billing_rate: number
  client_concentration: number
  expansion_score: number
}

export default function BusinessIntelligence() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState('last_12_months')
  const [_selectedRegion, _setSelectedRegion] = useState('all')

  const marketMetrics: MarketMetrics = {
    market_size: 125000000,
    growth_rate: 8.3,
    market_share: 2.8,
    competitor_count: 47,
    opportunity_score: 76.5,
    saturation_level: 65.2,
    entry_barriers: 45.8,
    profitability_index: 82.1
  }

  const competitors: CompetitorAnalysis[] = [
    {
      id: '1',
      name: 'Metropolitan Legal Group',
      market_share: 15.2,
      revenue_estimate: 18500000,
      practice_areas: ['Corporate Law', 'Real Estate', 'Litigation'],
      strengths: ['Large client base', 'Established reputation', 'Strong corporate connections'],
      weaknesses: ['High overhead', 'Slow innovation', 'Limited technology adoption'],
      threat_level: 'high',
      opportunity_rating: 65
    },
    {
      id: '2',
      name: 'TechLaw Associates',
      market_share: 8.7,
      revenue_estimate: 10800000,
      practice_areas: ['IP Law', 'Technology', 'Startups'],
      strengths: ['Technology focus', 'Young talent', 'Agile processes'],
      weaknesses: ['Limited resources', 'Narrow expertise', 'Small client base'],
      threat_level: 'medium',
      opportunity_rating: 78
    },
    {
      id: '3',
      name: 'Heritage & Partners',
      market_share: 12.1,
      revenue_estimate: 15200000,
      practice_areas: ['Family Law', 'Estate Planning', 'Immigration'],
      strengths: ['Community presence', 'Personal service', 'Long-term relationships'],
      weaknesses: ['Aging client base', 'Limited growth', 'Traditional methods'],
      threat_level: 'low',
      opportunity_rating: 45
    }
  ]

  const opportunities: MarketOpportunity[] = [
    {
      id: '1',
      area: 'ESG Compliance Consulting',
      potential_revenue: 2800000,
      investment_required: 350000,
      roi_projection: 247,
      time_to_market: '6 months',
      risk_level: 'medium',
      market_demand: 85,
      competitive_intensity: 35,
      recommendation: 'High priority - growing regulatory requirements'
    },
    {
      id: '2',
      area: 'Remote Legal Services',
      potential_revenue: 1950000,
      investment_required: 180000,
      roi_projection: 194,
      time_to_market: '3 months',
      risk_level: 'low',
      market_demand: 78,
      competitive_intensity: 45,
      recommendation: 'Quick win - expand virtual service delivery'
    },
    {
      id: '3',
      area: 'AI-Powered Contract Review',
      potential_revenue: 3200000,
      investment_required: 750000,
      roi_projection: 167,
      time_to_market: '12 months',
      risk_level: 'high',
      market_demand: 92,
      competitive_intensity: 25,
      recommendation: 'Strategic investment - differentiation opportunity'
    },
    {
      id: '4',
      area: 'Cryptocurrency Legal Services',
      potential_revenue: 1600000,
      investment_required: 280000,
      roi_projection: 186,
      time_to_market: '4 months',
      risk_level: 'high',
      market_demand: 68,
      competitive_intensity: 15,
      recommendation: 'Emerging market - early mover advantage'
    }
  ]

  const insights: BusinessInsight[] = [
    {
      id: '1',
      category: 'Revenue Optimization',
      insight: 'Corporate clients show 23% higher lifetime value than individual clients',
      impact: 'high',
      actionable: true,
      data_sources: ['Client Database', 'Financial Reports'],
      confidence_level: 94,
      recommended_action: 'Increase corporate client acquisition efforts',
      potential_value: 1250000
    },
    {
      id: '2',
      category: 'Market Positioning',
      insight: 'Technology law services command 35% premium in current market',
      impact: 'high',
      actionable: true,
      data_sources: ['Market Research', 'Competitor Analysis'],
      confidence_level: 87,
      recommended_action: 'Expand technology law practice area',
      potential_value: 890000
    },
    {
      id: '3',
      category: 'Operational Efficiency',
      insight: 'Document automation reduces case processing time by 40%',
      impact: 'medium',
      actionable: true,
      data_sources: ['Time Tracking', 'Process Analytics'],
      confidence_level: 91,
      recommended_action: 'Implement comprehensive document automation',
      potential_value: 420000
    },
    {
      id: '4',
      category: 'Client Satisfaction',
      insight: 'Response time under 4 hours correlates with 85% client retention',
      impact: 'high',
      actionable: true,
      data_sources: ['Client Surveys', 'Communication Logs'],
      confidence_level: 89,
      recommended_action: 'Establish rapid response protocols',
      potential_value: 650000
    }
  ]

  const geographicData: GeographicAnalysis[] = [
    {
      region: 'Downtown Core',
      market_size: 45000000,
      growth_potential: 12.5,
      competition_level: 85,
      avg_billing_rate: 485,
      client_concentration: 78,
      expansion_score: 72
    },
    {
      region: 'Tech District',
      market_size: 28000000,
      growth_potential: 18.7,
      competition_level: 65,
      avg_billing_rate: 520,
      client_concentration: 45,
      expansion_score: 89
    },
    {
      region: 'Suburban Markets',
      market_size: 35000000,
      growth_potential: 9.3,
      competition_level: 55,
      avg_billing_rate: 385,
      client_concentration: 35,
      expansion_score: 78
    },
    {
      region: 'Adjacent Counties',
      market_size: 17000000,
      growth_potential: 15.2,
      competition_level: 40,
      avg_billing_rate: 350,
      client_concentration: 25,
      expansion_score: 82
    }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const tabs = [
    { id: 'overview', name: 'Market Overview', icon: ChartBarIcon },
    { id: 'competitors', name: 'Competitive Analysis', icon: TargetIcon },
    { id: 'opportunities', name: 'Market Opportunities', icon: LightBulbIcon },
    { id: 'insights', name: 'Business Insights', icon: PresentationChartLineIcon },
    { id: 'geographic', name: 'Geographic Analysis', icon: GlobeAltIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Business Intelligence & Market Analysis</h1>
                  <p className="text-sm text-gray-500">Strategic insights for legal practice growth and optimization</p>
                </div>
              </div>
              <div className="flex space-x-3">
                <select
                  value={selectedTimeframe}
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="last_6_months">Last 6 Months</option>
                  <option value="last_12_months">Last 12 Months</option>
                  <option value="last_24_months">Last 24 Months</option>
                </select>
                <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Export Analysis
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
                      <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Market Size</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatCurrency(marketMetrics.market_size)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ArrowTrendingUpIcon className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Market Growth Rate</dt>
                        <dd className="text-lg font-medium text-gray-900">{marketMetrics.growth_rate}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ChartPieIcon className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Market Share</dt>
                        <dd className="text-lg font-medium text-gray-900">{marketMetrics.market_share}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TargetIcon className="h-6 w-6 text-orange-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Opportunity Score</dt>
                        <dd className="text-lg font-medium text-gray-900">{marketMetrics.opportunity_score}/100</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Market Dynamics</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Saturation Level</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${marketMetrics.saturation_level}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{marketMetrics.saturation_level}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Entry Barriers</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${marketMetrics.entry_barriers}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{marketMetrics.entry_barriers}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Profitability Index</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${marketMetrics.profitability_index}%` }}></div>
                        </div>
                        <span className="text-sm text-gray-600">{marketMetrics.profitability_index}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Top Business Insights</h3>
                  <div className="space-y-4">
                    {insights.slice(0, 3).map((insight) => (
                      <div key={insight.id} className="border-l-4 border-indigo-400 pl-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{insight.category}</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} impact
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{insight.insight}</p>
                        <p className="mt-1 text-xs text-indigo-600">Potential Value: {formatCurrency(insight.potential_value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'competitors' && (
          <div className="space-y-6">
            {competitors.map((competitor) => (
              <div key={competitor.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">{competitor.name}</h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Market Share: {competitor.market_share}% • Revenue: {formatCurrency(competitor.revenue_estimate)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        competitor.threat_level === 'high' ? 'text-red-600 bg-red-50' :
                        competitor.threat_level === 'medium' ? 'text-yellow-600 bg-yellow-50' :
                        'text-green-600 bg-green-50'
                      }`}>
                        {competitor.threat_level} threat
                      </span>
                      <div className="text-sm text-gray-500">
                        Opportunity: {competitor.opportunity_rating}/100
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Practice Areas</h4>
                      <div className="space-y-1">
                        {competitor.practice_areas.map((area, index) => (
                          <span key={index} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Strengths</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {competitor.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Weaknesses</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {competitor.weaknesses.map((weakness, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {weakness}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'opportunities' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {opportunities.map((opportunity) => (
              <div key={opportunity.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">{opportunity.area}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(opportunity.risk_level)}`}>
                      {opportunity.risk_level} risk
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Potential Revenue:</span>
                      <div className="font-medium text-green-600">{formatCurrency(opportunity.potential_revenue)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Investment Required:</span>
                      <div className="font-medium text-gray-900">{formatCurrency(opportunity.investment_required)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">ROI Projection:</span>
                      <div className="font-medium text-blue-600">{opportunity.roi_projection}%</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Time to Market:</span>
                      <div className="font-medium text-gray-900">{opportunity.time_to_market}</div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Market Demand</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${opportunity.market_demand}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{opportunity.market_demand}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Competition</span>
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: `${opportunity.competitive_intensity}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{opportunity.competitive_intensity}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">{opportunity.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6">
            {insights.map((insight) => (
              <div key={insight.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">{insight.category}</h3>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                            {insight.impact} impact
                          </span>
                          {insight.actionable && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-600 bg-green-50">
                              Actionable
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-gray-600">{insight.insight}</p>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Confidence Level:</span>
                          <div className="flex items-center mt-1">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${insight.confidence_level}%` }}></div>
                            </div>
                            <span className="text-xs text-gray-600">{insight.confidence_level}%</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Data Sources:</span>
                          <div className="mt-1">{insight.data_sources.join(', ')}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Potential Value:</span>
                          <div className="mt-1 font-medium text-green-600">{formatCurrency(insight.potential_value)}</div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-indigo-50 rounded-md">
                        <h4 className="text-sm font-medium text-indigo-900">Recommended Action</h4>
                        <p className="mt-1 text-sm text-indigo-800">{insight.recommended_action}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'geographic' && (
          <div className="space-y-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Geographic Market Analysis</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Regional opportunities and market penetration analysis
                </p>
              </div>
              <ul className="divide-y divide-gray-200">
                {geographicData.map((region, index) => (
                  <li key={index} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900">{region.region}</h4>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Market Size:</span>
                            <div className="font-medium">{formatCurrency(region.market_size)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Growth Potential:</span>
                            <div className="font-medium text-green-600">{region.growth_potential}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Competition:</span>
                            <div className="font-medium">{region.competition_level}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Avg Billing Rate:</span>
                            <div className="font-medium">${region.avg_billing_rate}/hr</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Client Concentration:</span>
                            <div className="font-medium">{region.client_concentration}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Expansion Score:</span>
                            <div className="font-medium text-blue-600">{region.expansion_score}/100</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Expansion Opportunity</span>
                            <span className="text-gray-600">{region.expansion_score}/100</span>
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" 
                              style={{ width: `${region.expansion_score}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}