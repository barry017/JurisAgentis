/**
 * Legal Research Integration - AI-powered legal research and analysis
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  BookOpenIcon,
  ArrowLeftIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  DocumentTextIcon,
  BookmarkIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  TagIcon,
  ChartBarIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  LinkIcon,
  LightBulbIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline'

interface LegalResearchQuery {
  id: string
  query: string
  jurisdiction: string
  practice_area: string
  search_scope: 'cases' | 'statutes' | 'regulations' | 'secondary' | 'all'
  date_range?: {
    start: string
    end: string
  }
  created_at: string
}

interface LegalAuthority {
  id: string
  type: 'case' | 'statute' | 'regulation' | 'secondary_source' | 'law_review' | 'treatise'
  title: string
  citation: string
  jurisdiction: string
  court?: string
  date: string
  relevance_score: number
  key_holdings: string[]
  summary: string
  full_text_url?: string
  shepardized: boolean
  treatment: 'positive' | 'negative' | 'neutral' | 'unknown'
  cited_by_count: number
  practice_areas: string[]
  key_phrases: string[]
}

interface ResearchResult {
  query_id: string
  total_results: number
  processing_time: string
  authorities: LegalAuthority[]
  ai_analysis: {
    summary: string
    key_trends: string[]
    practical_implications: string[]
    recommended_strategy: string[]
    confidence_score: number
    gaps_identified: string[]
  }
  related_queries: string[]
  citations_formatted: {
    bluebook: string
    alwd: string
    chicago: string
  }[]
}

interface SavedResearch {
  id: string
  title: string
  description: string
  query: LegalResearchQuery
  results: ResearchResult
  tags: string[]
  created_at: string
  last_accessed: string
  shared_with: string[]
  notes: string
}

export default function LegalResearchPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState<'search' | 'results' | 'saved' | 'analytics'>('search')
  const [query, setQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState({
    jurisdiction: 'federal',
    practice_area: 'all',
    search_scope: 'all' as 'cases' | 'statutes' | 'regulations' | 'secondary' | 'all',
    date_range: {
      start: '',
      end: ''
    }
  })
  
  const [searchResults, setSearchResults] = useState<ResearchResult | null>(null)
  const [savedResearch, setSavedResearch] = useState<SavedResearch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Advanced search states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [searchHistory, setSearchHistory] = useState<LegalResearchQuery[]>([])

  // Check permissions
  const canUseResearch = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canUseResearch) {
      router.push('/dashboard')
    }
  }, [user, canUseResearch, router])

  // Load data
  useEffect(() => {
    if (user && canUseResearch) {
      loadSavedResearch()
      loadSearchHistory()
    }
  }, [user, canUseResearch])

  const loadSavedResearch = async () => {
    try {
      // Mock saved research data
      const mockSavedResearch: SavedResearch[] = [
        {
          id: '1',
          title: 'Contract Formation in Digital Agreements',
          description: 'Research on electronic signature validity and contract formation requirements',
          query: {
            id: 'q1',
            query: 'electronic signature validity contract formation',
            jurisdiction: 'federal',
            practice_area: 'contract_law',
            search_scope: 'all',
            created_at: '2025-01-15T10:30:00Z'
          },
          results: {} as ResearchResult, // Simplified for mock
          tags: ['contracts', 'e-signature', 'digital'],
          created_at: '2025-01-15T10:30:00Z',
          last_accessed: '2025-01-18T14:20:00Z',
          shared_with: ['paralegal@firm.com'],
          notes: 'Key research for Johnson Industries case - focus on E-SIGN Act compliance'
        },
        {
          id: '2',
          title: 'Employment Law Remote Work Regulations',
          description: 'California employment law changes affecting remote work policies',
          query: {
            id: 'q2',
            query: 'California employment law remote work regulations 2024',
            jurisdiction: 'california',
            practice_area: 'employment_law',
            search_scope: 'statutes',
            created_at: '2025-01-12T09:15:00Z'
          },
          results: {} as ResearchResult,
          tags: ['employment', 'California', 'remote work'],
          created_at: '2025-01-12T09:15:00Z',
          last_accessed: '2025-01-17T11:45:00Z',
          shared_with: [],
          notes: 'Urgent research for client policy updates - deadline Jan 30'
        }
      ]

      setSavedResearch(mockSavedResearch)
      
    } catch {
      setError('Failed to load saved research')
    }
  }

  const loadSearchHistory = async () => {
    try {
      // Mock search history
      const mockHistory: LegalResearchQuery[] = [
        {
          id: 'h1',
          query: 'breach of contract damages calculation',
          jurisdiction: 'federal',
          practice_area: 'contract_law',
          search_scope: 'cases',
          created_at: '2025-01-18T13:00:00Z'
        },
        {
          id: 'h2',
          query: 'discovery sanctions federal courts',
          jurisdiction: 'federal',
          practice_area: 'litigation',
          search_scope: 'cases',
          created_at: '2025-01-18T11:30:00Z'
        },
        {
          id: 'h3',
          query: 'non-compete agreement enforceability California',
          jurisdiction: 'california',
          practice_area: 'employment_law',
          search_scope: 'all',
          created_at: '2025-01-17T16:45:00Z'
        }
      ]

      setSearchHistory(mockHistory)
      
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  }

  const performLegalResearch = async () => {
    if (!query.trim()) {
      setError('Please enter a research query')
      return
    }

    try {
      setIsSearching(true)
      setError('')
      
      // Simulate GPT-5 powered legal research
      await new Promise(resolve => setTimeout(resolve, 3000))

      const mockAuthorities: LegalAuthority[] = [
        {
          id: 'auth1',
          type: 'case',
          title: 'Smith v. Johnson Industries',
          citation: '456 F.3d 789 (9th Cir. 2023)',
          jurisdiction: 'Federal (9th Circuit)',
          court: 'United States Court of Appeals for the Ninth Circuit',
          date: '2023-03-15',
          relevance_score: 0.94,
          key_holdings: [
            'Electronic signatures under E-SIGN Act are presumptively valid in commercial contracts',
            'Burden of proof for challenging electronic signature validity rests with challenging party',
            'Technical compliance with digital signature standards creates strong presumption of authenticity'
          ],
          summary: 'Landmark decision establishing strong presumption of validity for electronic signatures in commercial transactions. Court emphasized that E-SIGN Act creates federal framework that preempts most state law challenges to electronic signature validity.',
          full_text_url: 'https://example.com/cases/smith-v-johnson',
          shepardized: true,
          treatment: 'positive',
          cited_by_count: 127,
          practice_areas: ['contract_law', 'commercial_law', 'technology_law'],
          key_phrases: ['electronic signature', 'E-SIGN Act', 'commercial contracts', 'digital authentication']
        },
        {
          id: 'auth2',
          type: 'statute',
          title: 'Electronic Signatures in Global and National Commerce Act',
          citation: '15 U.S.C. § 7001 et seq.',
          jurisdiction: 'Federal',
          date: '2000-06-30',
          relevance_score: 0.91,
          key_holdings: [
            'Electronic signatures and records have same legal effect as written signatures',
            'Cannot deny legal effect solely because in electronic form',
            'Consumer consent requirements for electronic transactions'
          ],
          summary: 'Federal statute establishing the legal framework for electronic signatures and records in interstate and international commerce. Provides foundational legal authority for electronic contract formation.',
          shepardized: true,
          treatment: 'positive',
          cited_by_count: 2543,
          practice_areas: ['contract_law', 'commercial_law', 'technology_law'],
          key_phrases: ['electronic signature', 'electronic record', 'consumer consent', 'interstate commerce']
        },
        {
          id: 'auth3',
          type: 'case',
          title: 'Tech Corp v. Innovation LLC',
          citation: '234 F.Supp.3d 567 (N.D. Cal. 2022)',
          jurisdiction: 'Federal (N.D. Cal.)',
          court: 'United States District Court for the Northern District of California',
          date: '2022-08-22',
          relevance_score: 0.87,
          key_holdings: [
            'Digital signature platforms must maintain adequate security measures',
            'Audit trails and timestamp records are crucial for electronic signature validity',
            'Multi-factor authentication enhances electronic signature reliability'
          ],
          summary: 'District court decision addressing technical requirements for electronic signature platforms in high-value commercial transactions. Provides practical guidance on security measures and documentation requirements.',
          full_text_url: 'https://example.com/cases/tech-corp-v-innovation',
          shepardized: true,
          treatment: 'positive',
          cited_by_count: 89,
          practice_areas: ['contract_law', 'technology_law', 'commercial_law'],
          key_phrases: ['digital signature platform', 'security measures', 'audit trail', 'multi-factor authentication']
        },
        {
          id: 'auth4',
          type: 'law_review',
          title: 'Electronic Contract Formation in the Digital Age: Challenges and Solutions',
          citation: '45 Harvard Law Review 234 (2023)',
          jurisdiction: 'Academic',
          date: '2023-02-01',
          relevance_score: 0.83,
          key_holdings: [
            'Analysis of emerging issues in electronic contract formation',
            'Recommendations for best practices in digital signature implementation',
            'Comparison of international electronic signature frameworks'
          ],
          summary: 'Comprehensive academic analysis of current electronic contract formation law with practical recommendations for practitioners. Includes comparative analysis of international approaches and emerging technology considerations.',
          shepardized: false,
          treatment: 'neutral',
          cited_by_count: 45,
          practice_areas: ['contract_law', 'technology_law', 'international_law'],
          key_phrases: ['electronic contract formation', 'digital signature implementation', 'international frameworks', 'best practices']
        }
      ]

      const mockResults: ResearchResult = {
        query_id: Date.now().toString(),
        total_results: mockAuthorities.length,
        processing_time: '2.8 seconds',
        authorities: mockAuthorities,
        ai_analysis: {
          summary: 'Research reveals strong legal framework supporting electronic signature validity in commercial contracts. Federal E-SIGN Act provides comprehensive foundation, with recent case law strengthening enforceability standards.',
          key_trends: [
            'Courts increasingly favor electronic signature validity',
            'Technical compliance requirements becoming more stringent',
            'Multi-factor authentication gaining importance',
            'International harmonization of electronic signature standards'
          ],
          practical_implications: [
            'Ensure electronic signature platforms maintain robust audit trails',
            'Implement multi-factor authentication for high-value transactions',
            'Maintain technical compliance with industry standards',
            'Document security measures and authentication procedures',
            'Consider jurisdiction-specific requirements for international contracts'
          ],
          recommended_strategy: [
            'Rely on federal E-SIGN Act as primary legal authority',
            'Use Smith v. Johnson Industries for strong precedent support',
            'Implement technical safeguards per Tech Corp decision',
            'Document compliance procedures thoroughly',
            'Consider academic perspectives for comprehensive understanding'
          ],
          confidence_score: 0.89,
          gaps_identified: [
            'Limited case law on blockchain-based signatures',
            'Unclear standards for AI-generated signature verification',
            'International treaty implications not fully developed'
          ]
        },
        related_queries: [
          'blockchain electronic signatures legal validity',
          'international electronic signature recognition',
          'AI signature verification legal standards',
          'electronic signature consumer protection requirements'
        ],
        citations_formatted: [
          {
            bluebook: 'Smith v. Johnson Indus., 456 F.3d 789 (9th Cir. 2023).',
            alwd: 'Smith v. Johnson Indus., 456 F.3d 789 (9th Cir. 2023).',
            chicago: 'Smith v. Johnson Industries, 456 F.3d 789 (9th Cir. 2023).'
          }
        ]
      }

      setSearchResults(mockResults)
      setActiveTab('results')
      setSuccess('Research completed using GPT-5 legal analysis!')
      setTimeout(() => setSuccess(''), 3000)

      // Add to search history
      const newQuery: LegalResearchQuery = {
        id: Date.now().toString(),
        query,
        jurisdiction: searchFilters.jurisdiction,
        practice_area: searchFilters.practice_area,
        search_scope: searchFilters.search_scope,
        created_at: new Date().toISOString()
      }
      setSearchHistory(prev => [newQuery, ...prev.slice(0, 9)]) // Keep last 10 searches

    } catch {
      setError('Failed to perform legal research')
    } finally {
      setIsSearching(false)
    }
  }

  const saveResearch = async () => {
    if (!searchResults) return

    try {
      const savedItem: SavedResearch = {
        id: Date.now().toString(),
        title: query,
        description: `Research on: ${query}`,
        query: {
          id: searchResults.query_id,
          query,
          jurisdiction: searchFilters.jurisdiction,
          practice_area: searchFilters.practice_area,
          search_scope: searchFilters.search_scope,
          created_at: new Date().toISOString()
        },
        results: searchResults,
        tags: [searchFilters.practice_area, searchFilters.jurisdiction],
        created_at: new Date().toISOString(),
        last_accessed: new Date().toISOString(),
        shared_with: [],
        notes: ''
      }

      setSavedResearch(prev => [savedItem, ...prev])
      setSuccess('Research saved successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Failed to save research')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getAuthorityIcon = (type: string) => {
    const icons = {
      case: ScaleIcon,
      statute: BookOpenIcon,
      regulation: DocumentTextIcon,
      secondary_source: NewspaperIcon,
      law_review: AcademicCapIcon,
      treatise: BuildingLibraryIcon
    }
    const IconComponent = icons[type as keyof typeof icons] || DocumentTextIcon
    return <IconComponent className="h-5 w-5" />
  }

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800'
    if (score >= 0.8) return 'bg-blue-100 text-blue-800'
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getTreatmentColor = (treatment: string) => {
    const colors = {
      positive: 'text-green-600',
      negative: 'text-red-600',
      neutral: 'text-gray-600',
      unknown: 'text-gray-400'
    }
    return colors[treatment as keyof typeof colors] || colors.neutral
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canUseResearch) {
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
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg p-2 mr-3">
                  <BookOpenIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Legal Research Integration</h1>
                  <p className="text-gray-600 mt-1">
                    AI-powered legal research using GPT-5
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {searchResults && (
                <button
                  onClick={saveResearch}
                  className="btn-secondary flex items-center"
                >
                  <BookmarkIcon className="h-4 w-4 mr-2" />
                  Save Research
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

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'search', label: 'Research', icon: MagnifyingGlassIcon },
              { id: 'results', label: 'Results', icon: DocumentTextIcon },
              { id: 'saved', label: 'Saved Research', icon: BookmarkIcon },
              { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'search' | 'results' | 'saved' | 'analytics')}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Legal Research Query</h3>
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="btn-secondary text-sm flex items-center"
                >
                  <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                  Advanced Filters
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Research Query</label>
                  <div className="relative">
                    <textarea
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter your legal research query (e.g., 'electronic signature validity in commercial contracts', 'non-compete agreement enforceability California')"
                      rows={3}
                      className="input-field pr-12"
                    />
                    <button
                      onClick={performLegalResearch}
                      disabled={isSearching || !query.trim()}
                      className="absolute bottom-2 right-2 btn-primary text-sm flex items-center"
                    >
                      {isSearching ? (
                        <>
                          <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" />
                          Researching...
                        </>
                      ) : (
                        <>
                          <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                          Research
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                    <select
                      value={searchFilters.jurisdiction}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, jurisdiction: e.target.value }))}
                      className="input-field"
                    >
                      <option value="federal">Federal</option>
                      <option value="california">California</option>
                      <option value="new_york">New York</option>
                      <option value="texas">Texas</option>
                      <option value="florida">Florida</option>
                      <option value="all">All Jurisdictions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Practice Area</label>
                    <select
                      value={searchFilters.practice_area}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, practice_area: e.target.value }))}
                      className="input-field"
                    >
                      <option value="all">All Practice Areas</option>
                      <option value="contract_law">Contract Law</option>
                      <option value="employment_law">Employment Law</option>
                      <option value="corporate_law">Corporate Law</option>
                      <option value="litigation">Litigation</option>
                      <option value="real_estate">Real Estate</option>
                      <option value="intellectual_property">Intellectual Property</option>
                      <option value="tax_law">Tax Law</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Scope</label>
                    <select
                      value={searchFilters.search_scope}
                      onChange={(e) => setSearchFilters(prev => ({ ...prev, search_scope: e.target.value as 'cases' | 'statutes' | 'regulations' | 'secondary' | 'all' }))}
                      className="input-field"
                    >
                      <option value="all">All Sources</option>
                      <option value="cases">Cases Only</option>
                      <option value="statutes">Statutes Only</option>
                      <option value="regulations">Regulations Only</option>
                      <option value="secondary">Secondary Sources</option>
                    </select>
                  </div>
                </div>

                {showAdvancedFilters && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Advanced Search Options</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range (Start)</label>
                        <input
                          type="date"
                          value={searchFilters.date_range.start}
                          onChange={(e) => setSearchFilters(prev => ({ 
                            ...prev, 
                            date_range: { ...prev.date_range, start: e.target.value }
                          }))}
                          className="input-field"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range (End)</label>
                        <input
                          type="date"
                          value={searchFilters.date_range.end}
                          onChange={(e) => setSearchFilters(prev => ({ 
                            ...prev, 
                            date_range: { ...prev.date_range, end: e.target.value }
                          }))}
                          className="input-field"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Searches</h3>
                <div className="space-y-2">
                  {searchHistory.slice(0, 5).map((historyItem) => (
                    <button
                      key={historyItem.id}
                      onClick={() => {
                        setQuery(historyItem.query)
                        setSearchFilters({
                          jurisdiction: historyItem.jurisdiction,
                          practice_area: historyItem.practice_area,
                          search_scope: historyItem.search_scope,
                          date_range: { start: '', end: '' }
                        })
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{historyItem.query}</span>
                        <span className="text-xs text-gray-500">{formatDate(historyItem.created_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-600 capitalize">{historyItem.jurisdiction}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-600 capitalize">{historyItem.practice_area.replace('_', ' ')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && searchResults && (
          <div className="space-y-6">
            {/* AI Analysis Summary */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-purple-600" />
                  GPT-5 Legal Analysis
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {searchResults.total_results} results • {searchResults.processing_time}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {Math.round(searchResults.ai_analysis.confidence_score * 100)}% confidence
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Analysis Summary</h4>
                  <p className="text-gray-700">{searchResults.ai_analysis.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Trends</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {searchResults.ai_analysis.key_trends.map((trend, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-500 mr-2">•</span>
                          {trend}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Practical Implications</h4>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {searchResults.ai_analysis.practical_implications.slice(0, 4).map((implication, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          {implication}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recommended Strategy</h4>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <ul className="text-sm text-blue-800 space-y-1">
                      {searchResults.ai_analysis.recommended_strategy.map((strategy, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-blue-600 mr-2">→</span>
                          {strategy}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Legal Authorities */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Legal Authorities</h3>
                <div className="flex space-x-2">
                  <button className="btn-secondary text-sm flex items-center">
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    Filter
                  </button>
                  <button className="btn-secondary text-sm flex items-center">
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {searchResults.authorities.map((authority) => (
                  <div key={authority.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start">
                        <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                          {getAuthorityIcon(authority.type)}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{authority.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">{authority.citation}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{authority.jurisdiction}</span>
                            <span>•</span>
                            <span>{formatDate(authority.date)}</span>
                            {authority.court && (
                              <>
                                <span>•</span>
                                <span>{authority.court}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRelevanceColor(authority.relevance_score)}`}>
                          {Math.round(authority.relevance_score * 100)}% relevant
                        </span>
                        {authority.shepardized && (
                          <span className={`text-xs font-medium ${getTreatmentColor(authority.treatment)}`}>
                            ● {authority.treatment} treatment
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{authority.summary}</p>

                    {authority.key_holdings.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-gray-700 mb-1">Key Holdings:</h5>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {authority.key_holdings.slice(0, 2).map((holding, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-gray-400 mr-2">•</span>
                              {holding}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="flex space-x-4 text-xs text-gray-500">
                        <span>Cited by {authority.cited_by_count}</span>
                        <span>•</span>
                        <span>{authority.practice_areas.slice(0, 2).join(', ')}</span>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800 flex items-center">
                          <EyeIcon className="h-3 w-3 mr-1" />
                          View Full Text
                        </button>
                        <button className="text-xs text-gray-600 hover:text-gray-800 flex items-center">
                          <BookmarkIcon className="h-3 w-3 mr-1" />
                          Save
                        </button>
                        <button className="text-xs text-gray-600 hover:text-gray-800 flex items-center">
                          <LinkIcon className="h-3 w-3 mr-1" />
                          Cite
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Related Research Suggestions */}
            {searchResults.related_queries.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-500" />
                  Related Research Suggestions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {searchResults.related_queries.map((relatedQuery, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(relatedQuery)
                        setActiveTab('search')
                      }}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                    >
                      {relatedQuery}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Saved Research Tab */}
        {activeTab === 'saved' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Saved Research</h3>
              <div className="flex space-x-3">
                <button className="btn-secondary text-sm flex items-center">
                  <TagIcon className="h-4 w-4 mr-2" />
                  Filter by Tags
                </button>
                <button className="btn-secondary text-sm flex items-center">
                  <ShareIcon className="h-4 w-4 mr-2" />
                  Share Research
                </button>
              </div>
            </div>

            {savedResearch.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {savedResearch.map((saved) => (
                  <div key={saved.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{saved.title}</h4>
                        <p className="text-sm text-gray-600 mb-2">{saved.description}</p>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>Created {formatDate(saved.created_at)}</span>
                          <span>•</span>
                          <span>Last accessed {formatDate(saved.last_accessed)}</span>
                        </div>
                      </div>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <BookmarkIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      {saved.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                          {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>

                    {saved.notes && (
                      <div className="mb-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-800">{saved.notes}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        {saved.shared_with.length > 0 ? `Shared with ${saved.shared_with.length} people` : 'Private'}
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-xs text-blue-600 hover:text-blue-800">
                          Open
                        </button>
                        <button className="text-xs text-gray-600 hover:text-gray-800">
                          Edit
                        </button>
                        <button className="text-xs text-gray-600 hover:text-gray-800">
                          Share
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <BookmarkIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No saved research</h3>
                <p className="text-gray-600 mb-4">Start researching and save important findings for easy access later</p>
                <button
                  onClick={() => setActiveTab('search')}
                  className="btn-primary"
                >
                  Start Research
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Research Analytics</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card text-center">
                <div className="text-2xl font-bold text-blue-600 mb-1">47</div>
                <div className="text-sm text-gray-600">Searches This Month</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">23</div>
                <div className="text-sm text-gray-600">Saved Research Items</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-purple-600 mb-1">8.7</div>
                <div className="text-sm text-gray-600">Avg Relevance Score</div>
              </div>
              <div className="card text-center">
                <div className="text-2xl font-bold text-orange-600 mb-1">156</div>
                <div className="text-sm text-gray-600">Authorities Reviewed</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Top Practice Areas Researched</h4>
                <div className="space-y-2">
                  {[
                    { area: 'Contract Law', count: 15, percentage: 32 },
                    { area: 'Employment Law', count: 12, percentage: 26 },
                    { area: 'Corporate Law', count: 8, percentage: 17 },
                    { area: 'Litigation', count: 7, percentage: 15 },
                    { area: 'Real Estate', count: 5, percentage: 10 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{item.area}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 className="font-medium text-gray-900 mb-4">Research Efficiency Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Average Search Time</span>
                    <span className="text-sm font-medium text-gray-900">2.4 seconds</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Results per Search</span>
                    <span className="text-sm font-medium text-gray-900">12.3 avg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Time Saved vs Manual</span>
                    <span className="text-sm font-medium text-green-600">85% faster</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">AI Confidence Average</span>
                    <span className="text-sm font-medium text-gray-900">87%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}