/**
 * Contextual AI Understanding - Advanced context awareness for legal AI assistant
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  CpuChipIcon as BrainIcon, // Using CpuChipIcon as BrainIcon equivalent
  ArrowLeftIcon,
  SparklesIcon,
  DocumentTextIcon,
  UserIcon,
  BriefcaseIcon,
  ChartBarIcon,
  LightBulbIcon,
  Cog6ToothIcon as CogIcon,
  EyeIcon,
  ClockIcon,
  // LinkIcon, // Removed unused import
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  // CheckCircleIcon, // Removed unused import
  InformationCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  // TagIcon, // Removed unused import
  BookOpenIcon,
  ScaleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

interface ContextualInsight {
  id: string
  type: 'case_pattern' | 'client_preference' | 'legal_trend' | 'deadline_risk' | 'document_gap' | 'opportunity'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  category: string
  related_entities: string[]
  suggested_actions: string[]
  created_at: string
}

interface ContextMap {
  client_id: string
  client_name: string
  active_cases: CaseContext[]
  communication_patterns: CommunicationPattern[]
  document_preferences: DocumentPreference[]
  relationship_insights: RelationshipInsight[]
  risk_factors: RiskFactor[]
  opportunities: Opportunity[]
}

interface CaseContext {
  case_id: string
  case_name: string
  case_type: string
  status: string
  key_dates: KeyDate[]
  related_documents: string[]
  opposing_parties: string[]
  settlement_history: SettlementEvent[]
  communication_frequency: number
}

interface CommunicationPattern {
  type: 'email' | 'phone' | 'meeting'
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed'
  preferred_time: string
  response_time_expectation: string
  communication_style: 'formal' | 'casual' | 'detailed' | 'brief'
}

interface DocumentPreference {
  format: 'pdf' | 'docx' | 'email'
  delivery_method: 'email' | 'portal' | 'mail'
  review_timeline: string
  approval_process: string
}

interface RelationshipInsight {
  insight_type: 'satisfaction' | 'engagement' | 'trust' | 'concern'
  score: number
  trend: 'improving' | 'stable' | 'declining'
  indicators: string[]
  recommendations: string[]
}

interface RiskFactor {
  risk_type: 'deadline' | 'compliance' | 'financial' | 'relationship' | 'legal'
  severity: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  description: string
  mitigation_strategies: string[]
}

interface Opportunity {
  opportunity_type: 'upsell' | 'referral' | 'efficiency' | 'settlement' | 'expansion'
  value_potential: 'low' | 'medium' | 'high'
  description: string
  required_actions: string[]
  timeline: string
}

interface KeyDate {
  date: string
  event: string
  importance: 'low' | 'medium' | 'high' | 'critical'
  status: 'upcoming' | 'completed' | 'missed'
}

interface SettlementEvent {
  date: string
  type: 'offer' | 'counteroffer' | 'acceptance' | 'rejection'
  amount?: number
  terms: string
  outcome: string
}

export default function ContextualUnderstandingPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState<'insights' | 'context_map' | 'patterns' | 'settings'>('insights')
  const [insights, setInsights] = useState<ContextualInsight[]>([])
  const [contextMaps, setContextMaps] = useState<ContextMap[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [_loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<string>('')

  // Analysis states
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // const [analysisType, setAnalysisType] = useState<'client' | 'case' | 'practice' | 'all'>('all') // Removed unused variable
  const [analysisResults, setAnalysisResults] = useState<unknown>(null)

  // Check permissions
  const canUseContextualAI = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canManageSettings = user && ['admin', 'associate_attorney'].includes(user.role)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canUseContextualAI) {
      router.push('/dashboard')
    }
  }, [user, canUseContextualAI, router])

  // Load data
  useEffect(() => {
    if (user && canUseContextualAI) {
      loadContextualInsights()
      loadContextMaps()
    }
  }, [user, canUseContextualAI])

  const loadContextualInsights = async () => {
    try {
      setLoading(true)
      
      // Mock insights - in real implementation, this would use GPT-5 for analysis
      const mockInsights: ContextualInsight[] = [
        {
          id: '1',
          type: 'deadline_risk',
          title: 'High Risk: Johnson Industries Discovery Deadline',
          description: 'Discovery responses for Johnson Industries case are due in 3 days. Based on past patterns, this client typically needs 5-7 days for document review. Recommend immediate contact.',
          confidence: 0.94,
          impact: 'high',
          category: 'Risk Management',
          related_entities: ['Johnson Industries', 'Contract Dispute Case'],
          suggested_actions: [
            'Contact client immediately',
            'Offer document review assistance',
            'Request extension if needed',
            'Schedule emergency meeting'
          ],
          created_at: '2025-01-18T14:30:00Z'
        },
        {
          id: '2',
          type: 'client_preference',
          title: 'Communication Pattern Insight: Sarah Williams',
          description: 'Sarah Williams prefers detailed email updates every 2 weeks and responds best to calls on Tuesday/Thursday mornings. Her engagement increased 40% when we switched to this pattern.',
          confidence: 0.87,
          impact: 'medium',
          category: 'Client Relations',
          related_entities: ['Sarah Williams', 'Estate Planning'],
          suggested_actions: [
            'Schedule bi-weekly email updates',
            'Plan calls for Tuesday/Thursday AM',
            'Include detailed timeline in communications',
            'Provide written summaries after calls'
          ],
          created_at: '2025-01-18T12:15:00Z'
        },
        {
          id: '3',
          type: 'opportunity',
          title: 'Upsell Opportunity: Tech Startup LLC',
          description: 'Tech Startup LLC has mentioned expansion plans 3 times in recent communications. Their business formation is complete, and they may need employment law services, IP protection, and additional corporate governance.',
          confidence: 0.76,
          impact: 'high',
          category: 'Business Development',
          related_entities: ['Tech Startup LLC', 'Business Formation'],
          suggested_actions: [
            'Prepare expansion services proposal',
            'Schedule strategic planning meeting',
            'Review employment law needs',
            'Discuss IP protection strategy'
          ],
          created_at: '2025-01-18T10:45:00Z'
        },
        {
          id: '4',
          type: 'case_pattern',
          title: 'Settlement Pattern Analysis: Contract Disputes',
          description: 'Analysis of your last 15 contract dispute cases shows 73% settle within 45 days when mediation is proposed early. Cases without early mediation take average 180 days longer.',
          confidence: 0.91,
          impact: 'medium',
          category: 'Case Strategy',
          related_entities: ['Contract Disputes', 'Settlement Strategy'],
          suggested_actions: [
            'Propose mediation early in contract disputes',
            'Update standard case strategy templates',
            'Train team on early mediation benefits',
            'Track settlement timing metrics'
          ],
          created_at: '2025-01-18T09:20:00Z'
        },
        {
          id: '5',
          type: 'legal_trend',
          title: 'Legal Trend Alert: Employment Law Changes',
          description: 'Recent California employment law changes affect 4 of your active clients. New regulations on remote work policies take effect in 30 days, requiring policy updates.',
          confidence: 0.88,
          impact: 'high',
          category: 'Compliance',
          related_entities: ['Employment Law', 'California Regulations'],
          suggested_actions: [
            'Review client employment policies',
            'Draft compliance update memo',
            'Schedule client notification calls',
            'Prepare policy update templates'
          ],
          created_at: '2025-01-18T08:00:00Z'
        }
      ]

      setInsights(mockInsights)
      
    } catch {
      setError('Failed to load contextual insights')
    } finally {
      setLoading(false)
    }
  }

  const loadContextMaps = async () => {
    try {
      // Mock context maps - in real implementation, this would aggregate data from multiple sources
      const mockContextMaps: ContextMap[] = [
        {
          client_id: 'client_123',
          client_name: 'Johnson Industries Inc.',
          active_cases: [
            {
              case_id: 'case_456',
              case_name: 'Contract Dispute Resolution',
              case_type: 'Commercial Litigation',
              status: 'Discovery Phase',
              key_dates: [
                {
                  date: '2025-01-21T17:00:00Z',
                  event: 'Discovery Response Due',
                  importance: 'critical',
                  status: 'upcoming'
                },
                {
                  date: '2025-02-15T10:00:00Z',
                  event: 'Mediation Session',
                  importance: 'high',
                  status: 'upcoming'
                }
              ],
              related_documents: ['Contract Agreement', 'Breach Notice', 'Discovery Requests'],
              opposing_parties: ['Competitive Corp'],
              settlement_history: [
                {
                  date: '2025-01-10T14:00:00Z',
                  type: 'offer',
                  amount: 150000,
                  terms: 'Full settlement with confidentiality',
                  outcome: 'Under consideration'
                }
              ],
              communication_frequency: 3.2
            }
          ],
          communication_patterns: [
            {
              type: 'email',
              frequency: 'weekly',
              preferred_time: '9:00 AM - 11:00 AM',
              response_time_expectation: '24 hours',
              communication_style: 'detailed'
            }
          ],
          document_preferences: [
            {
              format: 'pdf',
              delivery_method: 'email',
              review_timeline: '3-5 business days',
              approval_process: 'CEO and Legal Counsel review'
            }
          ],
          relationship_insights: [
            {
              insight_type: 'satisfaction',
              score: 8.5,
              trend: 'stable',
              indicators: ['Prompt payments', 'Responsive to communications', 'Follows recommendations'],
              recommendations: ['Continue current service level', 'Explore additional service opportunities']
            }
          ],
          risk_factors: [
            {
              risk_type: 'deadline',
              severity: 'high',
              probability: 0.85,
              description: 'Upcoming discovery deadline with complex document review requirements',
              mitigation_strategies: ['Extended deadline request', 'Additional paralegal support', 'Document review software']
            }
          ],
          opportunities: [
            {
              opportunity_type: 'upsell',
              value_potential: 'medium',
              description: 'Employment policy review needed for new remote work regulations',
              required_actions: ['Draft proposal', 'Schedule meeting', 'Review current policies'],
              timeline: '30 days'
            }
          ]
        }
      ]

      setContextMaps(mockContextMaps)
      
    } catch {
      setError('Failed to load context maps')
    }
  }

  const runContextualAnalysis = async () => {
    try {
      setIsAnalyzing(true)
      setError('')

      // Simulate GPT-5 powered analysis
      await new Promise(resolve => setTimeout(resolve, 3000))

      const analysisResults = {
        summary: 'Comprehensive contextual analysis completed using GPT-5 advanced reasoning capabilities',
        insights_discovered: 12,
        patterns_identified: 8,
        risks_detected: 3,
        opportunities_found: 5,
        confidence_score: 0.89,
        analysis_areas: [
          {
            area: 'Client Relationship Health',
            score: 8.2,
            trend: 'improving',
            key_findings: [
              'Johnson Industries showing increased engagement',
              'Sarah Williams communication pattern optimization successful',
              'Tech Startup LLC expansion signals detected'
            ]
          },
          {
            area: 'Case Success Predictors',
            score: 7.8,
            trend: 'stable',
            key_findings: [
              'Early mediation correlation with faster settlements',
              'Document preparation time affects case outcomes',
              'Client communication frequency impacts satisfaction'
            ]
          },
          {
            area: 'Risk Assessment',
            score: 6.5,
            trend: 'attention_needed',
            key_findings: [
              'Discovery deadline risks in 2 active cases',
              'Regulatory compliance updates needed',
              'Client capacity concerns for document review'
            ]
          },
          {
            area: 'Business Development',
            score: 9.1,
            trend: 'improving',
            key_findings: [
              'Multiple upselling opportunities identified',
              'Referral potential from satisfied clients',
              'Practice area expansion possibilities'
            ]
          }
        ]
      }

      setAnalysisResults(analysisResults)
      setSuccess('Contextual analysis completed successfully using GPT-5!')
      setTimeout(() => setSuccess(''), 5000)

    } catch {
      setError('Failed to complete contextual analysis')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[impact as keyof typeof colors] || colors.medium
  }

  const getInsightIcon = (type: string) => {
    const icons = {
      case_pattern: ScaleIcon,
      client_preference: UserIcon,
      legal_trend: BookOpenIcon,
      deadline_risk: ClockIcon,
      document_gap: DocumentTextIcon,
      opportunity: LightBulbIcon
    }
    const IconComponent = icons[type as keyof typeof icons] || InformationCircleIcon
    return <IconComponent className="h-5 w-5" />
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canUseContextualAI) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/ai-assistant')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-2 mr-3">
                  <BrainIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Contextual AI Understanding</h1>
                  <p className="text-gray-600 mt-1">
                    Advanced context awareness powered by GPT-5
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={runContextualAnalysis}
                disabled={isAnalyzing}
                className="btn-primary flex items-center"
              >
                {isAnalyzing ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Run Analysis
                  </>
                )}
              </button>
              
              <button
                onClick={() => router.push('/ai-assistant')}
                className="btn-secondary"
              >
                Back to Assistant
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Status Messages */}
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="alert-success mb-6">
            {success}
          </div>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <div className="mb-8 card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-purple-600" />
                Latest Analysis Results
              </h3>
              <span className="text-sm text-gray-500">
                Confidence: {Math.round(analysisResults.confidence_score * 100)}%
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{analysisResults.insights_discovered}</p>
                <p className="text-sm text-blue-800">Insights Discovered</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{analysisResults.patterns_identified}</p>
                <p className="text-sm text-green-800">Patterns Identified</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{analysisResults.risks_detected}</p>
                <p className="text-sm text-orange-800">Risks Detected</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{analysisResults.opportunities_found}</p>
                <p className="text-sm text-purple-800">Opportunities Found</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(analysisResults as {analysis_areas?: Array<{area: string; score: number; trend: string; key_findings: string[]}>})?.analysis_areas?.map((area, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{area.area}</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">{area.score}/10</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        area.trend === 'improving' ? 'bg-green-100 text-green-800' :
                        area.trend === 'stable' ? 'bg-blue-100 text-blue-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {area.trend.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {area.key_findings.map((finding: string, fIndex: number) => (
                      <li key={fIndex} className="flex items-start">
                        <span className="text-gray-400 mr-2">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'insights', label: 'AI Insights', icon: LightBulbIcon },
              { id: 'context_map', label: 'Context Maps', icon: MagnifyingGlassIcon },
              { id: 'patterns', label: 'Patterns', icon: ChartBarIcon },
              { id: 'settings', label: 'Settings', icon: CogIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'insights' | 'context_map' | 'patterns' | 'settings')}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* AI Insights Tab */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Contextual AI Insights</h3>
              <div className="text-sm text-gray-500">
                Powered by GPT-5 • Updated in real-time
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {insights.map((insight) => (
                <div key={insight.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg mr-3">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.category}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getImpactColor(insight.impact)}`}>
                        {insight.impact}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-4">{insight.description}</p>

                  <div className="space-y-3">
                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Related Entities:</h5>
                      <div className="flex flex-wrap gap-1">
                        {insight.related_entities.map((entity, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-800">
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-medium text-gray-700 mb-1">Suggested Actions:</h5>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {insight.suggested_actions.slice(0, 3).map((action, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-gray-400 mr-1">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      {formatDate(insight.created_at)}
                    </span>
                    <div className="flex space-x-2">
                      <button className="text-xs text-blue-600 hover:text-blue-800">
                        View Details
                      </button>
                      <button className="text-xs text-green-600 hover:text-green-800">
                        Take Action
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Context Maps Tab */}
        {activeTab === 'context_map' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Client Context Maps</h3>
              <div className="flex space-x-3">
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="input-field text-sm"
                >
                  <option value="">All Clients</option>
                  {contextMaps.map((map) => (
                    <option key={map.client_id} value={map.client_id}>
                      {map.client_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {contextMaps.map((contextMap) => (
              <div key={contextMap.client_id} className="card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <UserIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{contextMap.client_name}</h4>
                      <p className="text-sm text-gray-600">{contextMap.active_cases.length} active cases</p>
                    </div>
                  </div>
                  <button className="btn-secondary text-sm">
                    <EyeIcon className="h-4 w-4 mr-2" />
                    View Full Context
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Relationship Health */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <ShieldCheckIcon className="h-4 w-4 mr-2 text-green-600" />
                      Relationship Health
                    </h5>
                    {contextMap.relationship_insights.map((insight, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Satisfaction</span>
                          <span className="text-sm font-medium text-gray-900">{insight.score}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${insight.score * 10}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600">{insight.trend} trend</p>
                      </div>
                    ))}
                  </div>

                  {/* Active Cases */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <BriefcaseIcon className="h-4 w-4 mr-2 text-blue-600" />
                      Active Cases
                    </h5>
                    <div className="space-y-2">
                      {contextMap.active_cases.map((caseItem, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium text-gray-900">{caseItem.case_name}</p>
                          <p className="text-gray-600">{caseItem.status}</p>
                          <p className="text-xs text-gray-500">
                            {caseItem.key_dates.length} upcoming dates
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Communication Patterns */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2 text-purple-600" />
                      Communication
                    </h5>
                    <div className="space-y-2">
                      {contextMap.communication_patterns.map((pattern, index) => (
                        <div key={index} className="text-sm">
                          <p className="font-medium text-gray-900 capitalize">{pattern.type}</p>
                          <p className="text-gray-600">{pattern.frequency}</p>
                          <p className="text-xs text-gray-500">{pattern.preferred_time}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-2 text-orange-600" />
                      Risk Factors
                    </h5>
                    <div className="space-y-2">
                      {contextMap.risk_factors.map((risk, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 capitalize">{risk.risk_type}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getImpactColor(risk.severity)}`}>
                              {risk.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{Math.round(risk.probability * 100)}% probability</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Patterns Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Pattern Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Case Success Patterns</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Early mediation success rate</span>
                    <span className="text-sm font-medium text-green-600">73%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Document prep impact</span>
                    <span className="text-sm font-medium text-blue-600">+15% faster</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client communication correlation</span>
                    <span className="text-sm font-medium text-purple-600">0.87</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Client Behavior Patterns</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Preferred communication time</span>
                    <span className="text-sm font-medium text-gray-900">9-11 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Document review time</span>
                    <span className="text-sm font-medium text-gray-900">3-5 days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Response time expectation</span>
                    <span className="text-sm font-medium text-gray-900">24 hours</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && canManageSettings && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Contextual AI Settings</h3>
            
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-4">Analysis Configuration</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Frequency</label>
                  <select className="input-field">
                    <option>Real-time</option>
                    <option>Hourly</option>
                    <option>Daily</option>
                    <option>Weekly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GPT-5 Model Configuration</label>
                  <select className="input-field">
                    <option>GPT-5 Standard</option>
                    <option>GPT-5 Legal Specialized</option>
                    <option>GPT-5 Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Context Window Size</label>
                  <select className="input-field">
                    <option>128K tokens</option>
                    <option>256K tokens</option>
                    <option>512K tokens</option>
                    <option>1M tokens</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}