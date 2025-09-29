/**
 * Smart Case Analysis and Insights - AI-powered case strategy and analysis
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  ScaleIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ChartBarIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentTextIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

interface CaseData {
  id: string
  case_name: string
  case_number: string
  case_type: string
  status: string
  filing_date: string
  client_id: string
  client_name: string
  opposing_parties: string[]
  court: string
  jurisdiction: string
  practice_area: string
  estimated_value: number
  attorney_assigned: string
  created_at: string
  updated_at: string
}

interface CaseAnalysis {
  case_id: string
  analysis_date: string
  overall_score: number
  confidence_level: number
  analysis_summary: string
  strengths: CaseStrength[]
  weaknesses: CaseWeakness[]
  opportunities: CaseOpportunity[]
  threats: CaseThreat[]
  strategic_recommendations: StrategicRecommendation[]
  timeline_analysis: TimelineAnalysis
  outcome_predictions: OutcomePrediction[]
  risk_assessment: RiskAssessment
  financial_analysis: FinancialAnalysis
  competitive_analysis: CompetitiveAnalysis
}

interface CaseStrength {
  id: string
  category: 'legal' | 'factual' | 'procedural' | 'strategic'
  title: string
  description: string
  impact_score: number
  supporting_evidence: string[]
  strategic_value: 'high' | 'medium' | 'low'
}

interface CaseWeakness {
  id: string
  category: 'legal' | 'factual' | 'procedural' | 'strategic'
  title: string
  description: string
  risk_level: 'high' | 'medium' | 'low'
  mitigation_strategies: string[]
  impact_on_outcome: number
}

interface CaseOpportunity {
  id: string
  type: 'settlement' | 'motion' | 'discovery' | 'strategic'
  title: string
  description: string
  probability: number
  potential_impact: string
  timeline: string
  required_actions: string[]
}

interface CaseThreat {
  id: string
  type: 'legal' | 'procedural' | 'external' | 'strategic'
  title: string
  description: string
  probability: number
  potential_impact: string
  mitigation_strategies: string[]
  monitoring_required: boolean
}

interface StrategicRecommendation {
  id: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'immediate' | 'short_term' | 'long_term'
  title: string
  description: string
  rationale: string
  expected_outcome: string
  timeline: string
  resources_required: string[]
  success_metrics: string[]
}

interface TimelineAnalysis {
  current_phase: string
  estimated_completion: string
  critical_milestones: Array<{
    date: string
    event: string
    importance: 'critical' | 'high' | 'medium'
    status: 'completed' | 'upcoming' | 'at_risk'
  }>
  bottlenecks: string[]
  acceleration_opportunities: string[]
}

interface OutcomePrediction {
  scenario: 'best_case' | 'most_likely' | 'worst_case'
  probability: number
  description: string
  financial_impact: {
    damages_awarded: number
    legal_costs: number
    net_outcome: number
  }
  timeline_impact: string
  strategic_implications: string[]
}

interface RiskAssessment {
  overall_risk_level: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: Array<{
    factor: string
    impact: 'low' | 'medium' | 'high'
    probability: number
    mitigation_status: 'none' | 'partial' | 'complete'
  }>
  contingency_plans: string[]
  monitoring_requirements: string[]
}

interface FinancialAnalysis {
  estimated_total_costs: number
  cost_breakdown: {
    attorney_fees: number
    court_costs: number
    expert_witnesses: number
    discovery_costs: number
    other_expenses: number
  }
  cost_efficiency_score: number
  roi_projections: Array<{
    scenario: string
    probability: number
    return_multiple: number
  }>
  budget_recommendations: string[]
}

interface CompetitiveAnalysis {
  opposing_counsel_profile: {
    firm_name: string
    attorney_name: string
    experience_level: string
    track_record: string
    typical_strategies: string[]
  }
  historical_patterns: string[]
  predicted_strategies: string[]
  counter_strategies: string[]
  negotiation_insights: string[]
}

export default function CaseAnalysisPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'insights' | 'reports'>('dashboard')
  const [selectedCase, setSelectedCase] = useState<string>('')
  const [cases, setCases] = useState<CaseData[]>([])
  const [analysisData, setAnalysisData] = useState<CaseAnalysis | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [_loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Analysis filters - Currently not used in UI but kept for future implementation
  // const [analysisFilters, setAnalysisFilters] = useState({
  //   practice_area: 'all',
  //   case_status: 'all',
  //   date_range: 'last_30_days',
  //   analysis_type: 'comprehensive'
  // })

  // Check permissions
  const canUseCaseAnalysis = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  // const canRunAdvancedAnalysis = user && ['admin', 'associate_attorney'].includes(user.role) // Removed unused variable
  // const canGenerateReports = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role) // Removed unused variable

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canUseCaseAnalysis) {
      router.push('/dashboard')
    }
  }, [user, canUseCaseAnalysis, router])

  // Load data
  useEffect(() => {
    if (user && canUseCaseAnalysis) {
      loadCases()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canUseCaseAnalysis])

  const loadCases = async () => {
    try {
      setLoading(true)
      
      // Mock cases data - in real implementation, fetch from database
      const mockCases: CaseData[] = [
        {
          id: 'case_1',
          case_name: 'Johnson Industries v. Competitive Corp',
          case_number: 'CV-2024-12345',
          case_type: 'Commercial Litigation',
          status: 'Discovery Phase',
          filing_date: '2024-09-15',
          client_id: 'client_123',
          client_name: 'Johnson Industries Inc.',
          opposing_parties: ['Competitive Corp', 'Strategic Solutions LLC'],
          court: 'Superior Court of California',
          jurisdiction: 'California',
          practice_area: 'Commercial Law',
          estimated_value: 2500000,
          attorney_assigned: 'Sarah Mitchell',
          created_at: '2024-09-15T10:00:00Z',
          updated_at: '2025-01-18T14:30:00Z'
        },
        {
          id: 'case_2',
          case_name: 'Williams Estate Planning Matter',
          case_number: 'PR-2024-67890',
          case_type: 'Estate Planning',
          status: 'Document Preparation',
          filing_date: '2024-11-20',
          client_id: 'client_456',
          client_name: 'Sarah Williams',
          opposing_parties: [],
          court: 'Probate Court',
          jurisdiction: 'California',
          practice_area: 'Estate Planning',
          estimated_value: 850000,
          attorney_assigned: 'Michael Chen',
          created_at: '2024-11-20T09:00:00Z',
          updated_at: '2025-01-17T16:20:00Z'
        },
        {
          id: 'case_3',
          case_name: 'Tech Startup Employment Agreement Review',
          case_number: 'EMP-2024-11111',
          case_type: 'Employment Law',
          status: 'Contract Review',
          filing_date: '2025-01-05',
          client_id: 'client_789',
          client_name: 'Tech Startup LLC',
          opposing_parties: [],
          court: 'N/A',
          jurisdiction: 'California',
          practice_area: 'Employment Law',
          estimated_value: 350000,
          attorney_assigned: 'David Park',
          created_at: '2025-01-05T11:30:00Z',
          updated_at: '2025-01-18T13:45:00Z'
        }
      ]

      setCases(mockCases)
      if (mockCases.length > 0 && !selectedCase) {
        setSelectedCase(mockCases[0].id)
      }
      
    } catch {
      setError('Failed to load cases')
    } finally {
      setLoading(false)
    }
  }

  const runCaseAnalysis = async (caseId: string) => {
    try {
      setIsAnalyzing(true)
      setError('')
      
      // Simulate GPT-5 powered case analysis
      await new Promise(resolve => setTimeout(resolve, 4000))

      const mockAnalysis: CaseAnalysis = {
        case_id: caseId,
        analysis_date: new Date().toISOString(),
        overall_score: 7.8,
        confidence_level: 0.89,
        analysis_summary: 'Strong case with favorable legal precedents and solid factual foundation. Primary risk factors are manageable with proper strategic approach. Settlement opportunity exists at 65-75% probability.',
        
        strengths: [
          {
            id: 'str_1',
            category: 'legal',
            title: 'Strong Contract Breach Evidence',
            description: 'Clear documentary evidence of material contract breach with well-defined damages calculation methodology.',
            impact_score: 9.2,
            supporting_evidence: ['Email correspondence', 'Contract amendments', 'Financial records', 'Third-party confirmations'],
            strategic_value: 'high'
          },
          {
            id: 'str_2',
            category: 'factual',
            title: 'Favorable Witness Testimony',
            description: 'Key witnesses provide consistent testimony supporting client position with credible, documented evidence.',
            impact_score: 8.7,
            supporting_evidence: ['Witness statements', 'Expert testimony', 'Industry standards'],
            strategic_value: 'high'
          },
          {
            id: 'str_3',
            category: 'procedural',
            title: 'Jurisdiction Advantage',
            description: 'Case filed in jurisdiction with favorable precedents and efficient court system.',
            impact_score: 7.5,
            supporting_evidence: ['Precedent analysis', 'Court statistics', 'Judge history'],
            strategic_value: 'medium'
          }
        ],
        
        weaknesses: [
          {
            id: 'weak_1',
            category: 'factual',
            title: 'Document Production Gaps',
            description: 'Some key documents from early contract negotiations are missing or incomplete.',
            risk_level: 'medium',
            mitigation_strategies: ['Request third-party records', 'Use expert reconstruction', 'Focus on available evidence'],
            impact_on_outcome: 6.3
          },
          {
            id: 'weak_2',
            category: 'strategic',
            title: 'Timeline Pressure',
            description: 'Aggressive discovery schedule may limit thorough case preparation time.',
            risk_level: 'medium',
            mitigation_strategies: ['Request schedule modification', 'Prioritize critical discovery', 'Use paralegal support'],
            impact_on_outcome: 5.8
          }
        ],
        
        opportunities: [
          {
            id: 'opp_1',
            type: 'settlement',
            title: 'Early Settlement Window',
            description: 'Opposing party showing settlement interest signals. Optimal timing for structured negotiation.',
            probability: 0.73,
            potential_impact: 'High - could resolve case favorably within 60 days',
            timeline: '30-60 days',
            required_actions: ['Prepare settlement demand', 'Engage mediator', 'Calculate settlement range']
          },
          {
            id: 'opp_2',
            type: 'motion',
            title: 'Summary Judgment Potential',
            description: 'Strong legal position supports partial summary judgment motion on liability issues.',
            probability: 0.68,
            potential_impact: 'Medium - eliminates liability dispute, focuses on damages',
            timeline: '90-120 days',
            required_actions: ['Prepare motion brief', 'Gather supporting evidence', 'Schedule expert testimony']
          }
        ],
        
        threats: [
          {
            id: 'threat_1',
            type: 'legal',
            title: 'Counterclaim Risk',
            description: 'Opposing party may file counterclaim alleging performance failures.',
            probability: 0.45,
            potential_impact: 'Medium - could complicate case and increase costs',
            mitigation_strategies: ['Prepare defensive strategy', 'Document performance compliance', 'Engage technical experts'],
            monitoring_required: true
          }
        ],
        
        strategic_recommendations: [
          {
            id: 'rec_1',
            priority: 'critical',
            category: 'immediate',
            title: 'Initiate Settlement Discussions',
            description: 'Begin structured settlement negotiations while maintaining strong litigation posture.',
            rationale: 'Opposing party signals and case strength create optimal settlement environment.',
            expected_outcome: '70% chance of favorable resolution within 60 days',
            timeline: 'Immediate - 30 days',
            resources_required: ['Senior attorney time', 'Financial analysis', 'Mediator engagement'],
            success_metrics: ['Settlement range achieved', 'Timeline met', 'Client satisfaction']
          },
          {
            id: 'rec_2',
            priority: 'high',
            category: 'short_term',
            title: 'Accelerate Key Discovery',
            description: 'Focus discovery efforts on critical evidence to strengthen negotiation position.',
            rationale: 'Strong evidence collection supports both settlement and litigation strategies.',
            expected_outcome: 'Enhanced negotiation leverage and trial preparation',
            timeline: '30-60 days',
            resources_required: ['Discovery coordination', 'Expert witness preparation', 'Document analysis'],
            success_metrics: ['Evidence quality', 'Timeline adherence', 'Cost efficiency']
          }
        ],
        
        timeline_analysis: {
          current_phase: 'Discovery Phase',
          estimated_completion: '2025-08-15',
          critical_milestones: [
            {
              date: '2025-01-25',
              event: 'Discovery Response Due',
              importance: 'critical',
              status: 'upcoming'
            },
            {
              date: '2025-02-15',
              event: 'Mediation Session',
              importance: 'high',
              status: 'upcoming'
            },
            {
              date: '2025-03-01',
              event: 'Expert Witness Deadline',
              importance: 'high',
              status: 'upcoming'
            }
          ],
          bottlenecks: ['Document production delays', 'Expert witness scheduling', 'Court calendar availability'],
          acceleration_opportunities: ['Early settlement', 'Streamlined discovery', 'Summary judgment motion']
        },
        
        outcome_predictions: [
          {
            scenario: 'best_case',
            probability: 0.25,
            description: 'Full damages award through trial victory or optimal settlement',
            financial_impact: {
              damages_awarded: 2200000,
              legal_costs: 450000,
              net_outcome: 1750000
            },
            timeline_impact: '12-18 months for trial, 3-6 months for settlement',
            strategic_implications: ['Establishes strong precedent', 'Enhances client relationship', 'Demonstrates firm capability']
          },
          {
            scenario: 'most_likely',
            probability: 0.60,
            description: 'Favorable settlement at 70-80% of claimed damages',
            financial_impact: {
              damages_awarded: 1800000,
              legal_costs: 320000,
              net_outcome: 1480000
            },
            timeline_impact: '4-6 months to resolution',
            strategic_implications: ['Satisfactory client outcome', 'Efficient resource utilization', 'Relationship preservation']
          },
          {
            scenario: 'worst_case',
            probability: 0.15,
            description: 'Minimal recovery or adverse judgment with counterclaim exposure',
            financial_impact: {
              damages_awarded: 400000,
              legal_costs: 550000,
              net_outcome: -150000
            },
            timeline_impact: '18-24 months with appeals',
            strategic_implications: ['Reputation risk', 'Client relationship strain', 'Resource drain']
          }
        ],
        
        risk_assessment: {
          overall_risk_level: 'medium',
          risk_factors: [
            {
              factor: 'Document production completeness',
              impact: 'medium',
              probability: 0.4,
              mitigation_status: 'partial'
            },
            {
              factor: 'Opposing counsel aggression',
              impact: 'medium',
              probability: 0.6,
              mitigation_status: 'partial'
            },
            {
              factor: 'Timeline pressure',
              impact: 'medium',
              probability: 0.7,
              mitigation_status: 'none'
            }
          ],
          contingency_plans: ['Alternative evidence sources', 'Schedule modification requests', 'Settlement acceleration'],
          monitoring_requirements: ['Weekly case reviews', 'Discovery milestone tracking', 'Settlement signal monitoring']
        },
        
        financial_analysis: {
          estimated_total_costs: 425000,
          cost_breakdown: {
            attorney_fees: 280000,
            court_costs: 15000,
            expert_witnesses: 85000,
            discovery_costs: 35000,
            other_expenses: 10000
          },
          cost_efficiency_score: 8.2,
          roi_projections: [
            {
              scenario: 'Settlement at 75%',
              probability: 0.6,
              return_multiple: 4.2
            },
            {
              scenario: 'Trial victory',
              probability: 0.25,
              return_multiple: 3.9
            }
          ],
          budget_recommendations: ['Focus spending on key discovery', 'Consider cost-effective experts', 'Monitor hourly rates']
        },
        
        competitive_analysis: {
          opposing_counsel_profile: {
            firm_name: 'Strategic Defense Partners',
            attorney_name: 'Robert Harrison',
            experience_level: 'Senior (15+ years)',
            track_record: 'Strong in commercial litigation, prefers aggressive tactics',
            typical_strategies: ['Extensive discovery', 'Motion practice', 'Settlement pressure tactics']
          },
          historical_patterns: ['Files multiple motions', 'Requests extensions', 'Uses economic pressure'],
          predicted_strategies: ['Counterclaim filing', 'Discovery challenges', 'Settlement timing games'],
          counter_strategies: ['Proactive motion practice', 'Efficient discovery', 'Strong settlement position'],
          negotiation_insights: ['Responds to economic arguments', 'Values certainty', 'Client cost-conscious']
        }
      }

      setAnalysisData(mockAnalysis)
      setSuccess('Case analysis completed using GPT-5 advanced reasoning!')
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Failed to complete case analysis')
    } finally {
      setIsAnalyzing(false)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-yellow-600'
    if (score >= 4) return 'text-orange-600'
    return 'text-red-600'
  }

  const getRiskColor = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[risk as keyof typeof colors] || colors.medium
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canUseCaseAnalysis) {
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
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg p-2 mr-3">
                  <ScaleIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Smart Case Analysis & Insights</h1>
                  <p className="text-gray-600 mt-1">
                    Advanced case strategy and outcome prediction with GPT-5
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {selectedCase && (
                <button
                  onClick={() => runCaseAnalysis(selectedCase)}
                  disabled={isAnalyzing}
                  className="btn-primary flex items-center"
                >
                  {isAnalyzing ? (
                    <>
                      <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </button>
              )}
              
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

        {/* Case Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Select Case for Analysis</h3>
            <div className="flex space-x-3">
              <select
                value={selectedCase}
                onChange={(e) => setSelectedCase(e.target.value)}
                className="input-field text-sm"
              >
                <option value="">Select a case...</option>
                {cases.map((caseItem) => (
                  <option key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedCase && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {cases.filter(c => c.id === selectedCase).map((caseItem) => (
                <div key={caseItem.id} className="md:col-span-4">
                  <div className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 mb-2">{caseItem.case_name}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Case Number:</span>
                            <p className="font-medium">{caseItem.case_number}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Type:</span>
                            <p className="font-medium">{caseItem.case_type}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="font-medium">{caseItem.status}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Estimated Value:</span>
                            <p className="font-medium">{formatCurrency(caseItem.estimated_value)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {caseItem.practice_area}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', label: 'Analysis Dashboard', icon: ChartBarIcon },
              { id: 'analysis', label: 'SWOT Analysis', icon: ScaleIcon },
              { id: 'insights', label: 'Strategic Insights', icon: LightBulbIcon },
              { id: 'reports', label: 'Reports', icon: DocumentTextIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'dashboard' | 'analysis' | 'insights' | 'reports')}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && analysisData && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card text-center">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(analysisData.overall_score)}`}>
                  {analysisData.overall_score}/10
                </div>
                <div className="text-sm text-gray-600">Overall Case Score</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {Math.round(analysisData.confidence_level * 100)}%
                </div>
                <div className="text-sm text-gray-600">AI Confidence</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {analysisData.outcome_predictions.find(p => p.scenario === 'most_likely')?.probability ? 
                    Math.round(analysisData.outcome_predictions.find(p => p.scenario === 'most_likely')!.probability * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Success Probability</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {formatCurrency(analysisData.outcome_predictions.find(p => p.scenario === 'most_likely')?.financial_impact.net_outcome || 0)}
                </div>
                <div className="text-sm text-gray-600">Expected Net Outcome</div>
              </div>
            </div>

            {/* Analysis Summary */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-emerald-600" />
                GPT-5 Analysis Summary
              </h3>
              <p className="text-gray-700 leading-relaxed">{analysisData.analysis_summary}</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Outcome Predictions */}
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Outcome Predictions</h4>
                <div className="space-y-3">
                  {analysisData.outcome_predictions.map((prediction, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {prediction.scenario.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-medium text-gray-600">
                          {Math.round(prediction.probability * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{prediction.description}</p>
                      <div className="text-sm">
                        <span className="font-medium">Net Outcome: </span>
                        <span className={prediction.financial_impact.net_outcome > 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(prediction.financial_impact.net_outcome)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline Analysis */}
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Timeline Analysis</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Current Phase:</span>
                    <p className="font-medium">{analysisData.timeline_analysis.current_phase}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Estimated Completion:</span>
                    <p className="font-medium">{formatDate(analysisData.timeline_analysis.estimated_completion)}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Critical Milestones:</span>
                    <div className="mt-2 space-y-2">
                      {analysisData.timeline_analysis.critical_milestones.slice(0, 3).map((milestone, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span>{milestone.event}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">{formatDate(milestone.date)}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                              milestone.importance === 'critical' ? 'bg-red-100 text-red-800' :
                              milestone.importance === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {milestone.importance}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Analysis */}
            <div className="card">
              <h4 className="font-medium text-gray-900 mb-4">Financial Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Attorney Fees:</span>
                      <span className="font-medium">{formatCurrency(analysisData.financial_analysis.cost_breakdown.attorney_fees)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expert Witnesses:</span>
                      <span className="font-medium">{formatCurrency(analysisData.financial_analysis.cost_breakdown.expert_witnesses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discovery Costs:</span>
                      <span className="font-medium">{formatCurrency(analysisData.financial_analysis.cost_breakdown.discovery_costs)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Total Estimated:</span>
                      <span className="font-bold">{formatCurrency(analysisData.financial_analysis.estimated_total_costs)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-2">ROI Projections</h5>
                  <div className="space-y-2">
                    {analysisData.financial_analysis.roi_projections.map((roi, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{roi.scenario}:</span>
                        <span className="font-medium text-green-600">{roi.return_multiple}x return</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex justify-between text-sm">
                      <span>Cost Efficiency Score:</span>
                      <span className={`font-bold ${getScoreColor(analysisData.financial_analysis.cost_efficiency_score)}`}>
                        {analysisData.financial_analysis.cost_efficiency_score}/10
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SWOT Analysis Tab */}
        {activeTab === 'analysis' && analysisData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <TrophyIcon className="h-5 w-5 mr-2 text-green-600" />
                  Strengths ({analysisData.strengths.length})
                </h3>
                <div className="space-y-3">
                  {analysisData.strengths.map((strength) => (
                    <div key={strength.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-green-900">{strength.title}</h4>
                        <span className="text-sm font-bold text-green-700">{strength.impact_score}/10</span>
                      </div>
                      <p className="text-sm text-green-800 mb-2">{strength.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          strength.strategic_value === 'high' ? 'bg-green-100 text-green-800' :
                          strength.strategic_value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {strength.strategic_value} value
                        </span>
                        <span className="text-xs text-green-700">{strength.category}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weaknesses */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
                  Weaknesses ({analysisData.weaknesses.length})
                </h3>
                <div className="space-y-3">
                  {analysisData.weaknesses.map((weakness) => (
                    <div key={weakness.id} className="border border-red-200 rounded-lg p-3 bg-red-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-red-900">{weakness.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(weakness.risk_level)}`}>
                          {weakness.risk_level} risk
                        </span>
                      </div>
                      <p className="text-sm text-red-800 mb-3">{weakness.description}</p>
                      <div>
                        <h5 className="text-xs font-medium text-red-900 mb-1">Mitigation Strategies:</h5>
                        <ul className="text-xs text-red-800 space-y-1">
                          {weakness.mitigation_strategies.slice(0, 2).map((strategy, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-red-600 mr-1">•</span>
                              {strategy}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opportunities */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <LightBulbIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Opportunities ({analysisData.opportunities.length})
                </h3>
                <div className="space-y-3">
                  {analysisData.opportunities.map((opportunity) => (
                    <div key={opportunity.id} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-blue-900">{opportunity.title}</h4>
                        <span className="text-sm font-bold text-blue-700">{Math.round(opportunity.probability * 100)}%</span>
                      </div>
                      <p className="text-sm text-blue-800 mb-2">{opportunity.description}</p>
                      <div className="text-xs text-blue-700">
                        <p><span className="font-medium">Timeline:</span> {opportunity.timeline}</p>
                        <p><span className="font-medium">Impact:</span> {opportunity.potential_impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Threats */}
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 mr-2 text-orange-600" />
                  Threats ({analysisData.threats.length})
                </h3>
                <div className="space-y-3">
                  {analysisData.threats.map((threat) => (
                    <div key={threat.id} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-orange-900">{threat.title}</h4>
                        <span className="text-sm font-bold text-orange-700">{Math.round(threat.probability * 100)}%</span>
                      </div>
                      <p className="text-sm text-orange-800 mb-3">{threat.description}</p>
                      <div>
                        <h5 className="text-xs font-medium text-orange-900 mb-1">Mitigation Strategies:</h5>
                        <ul className="text-xs text-orange-800 space-y-1">
                          {threat.mitigation_strategies.slice(0, 2).map((strategy, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-orange-600 mr-1">•</span>
                              {strategy}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strategic Insights Tab */}
        {activeTab === 'insights' && analysisData && (
          <div className="space-y-6">
            {/* Strategic Recommendations */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
              <div className="space-y-4">
                {analysisData.strategic_recommendations.map((rec) => (
                  <div key={rec.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                            {rec.priority}
                          </span>
                          <span className="text-xs text-gray-500">{rec.category}</span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Rationale:</h5>
                        <p className="text-gray-600">{rec.rationale}</p>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-1">Expected Outcome:</h5>
                        <p className="text-gray-600">{rec.expected_outcome}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Timeline: {rec.timeline}</span>
                        <span className="text-gray-600">Resources: {rec.resources_required.length} items</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Risk Assessment</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Overall Risk Level:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(analysisData.risk_assessment.overall_risk_level)}`}>
                      {analysisData.risk_assessment.overall_risk_level}
                    </span>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Key Risk Factors:</h5>
                    <div className="space-y-2">
                      {analysisData.risk_assessment.risk_factors.map((factor, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900">{factor.factor}</span>
                            <span className="text-gray-600">{Math.round(factor.probability * 100)}%</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(factor.impact)}`}>
                              {factor.impact}
                            </span>
                            <span className="text-xs text-gray-500">{factor.mitigation_status} mitigation</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Competitive Analysis */}
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Competitive Analysis</h4>
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Opposing Counsel:</h5>
                    <p className="text-sm text-gray-900">{analysisData.competitive_analysis.opposing_counsel_profile.attorney_name}</p>
                    <p className="text-xs text-gray-600">{analysisData.competitive_analysis.opposing_counsel_profile.firm_name}</p>
                    <p className="text-xs text-gray-600">{analysisData.competitive_analysis.opposing_counsel_profile.experience_level}</p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Predicted Strategies:</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {analysisData.competitive_analysis.predicted_strategies.map((strategy, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-gray-400 mr-1">•</span>
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">Counter Strategies:</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {analysisData.competitive_analysis.counter_strategies.map((strategy, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-400 mr-1">→</span>
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="text-center py-12">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Generate Comprehensive Reports</h3>
              <p className="text-gray-600 mb-6">Create detailed case analysis reports for clients and internal use</p>
              <div className="flex justify-center space-x-3">
                <button className="btn-primary flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  Executive Summary
                </button>
                <button className="btn-secondary flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Detailed Analysis
                </button>
                <button className="btn-secondary flex items-center">
                  <TrophyIcon className="h-4 w-4 mr-2" />
                  Strategy Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No Analysis State */}
        {!analysisData && !isAnalyzing && (
          <div className="text-center py-12">
            <ScaleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready for Smart Case Analysis</h3>
            <p className="text-gray-600 mb-6">
              Select a case and run our GPT-5 powered analysis to get comprehensive insights, strategic recommendations, and outcome predictions.
            </p>
            {selectedCase && (
              <button
                onClick={() => runCaseAnalysis(selectedCase)}
                className="btn-primary flex items-center mx-auto"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Start Analysis
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}