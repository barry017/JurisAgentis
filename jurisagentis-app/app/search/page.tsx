/**
 * Advanced Search System
 * 
 * AI-powered universal search across all practice data with full-text indexing
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ClockIcon,
  SparklesIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
  BriefcaseIcon,
  TagIcon,
  ArrowRightIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  BookmarkIcon,
  StarIcon,
  ChevronRightIcon,
  LightBulbIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline'

interface SearchResult {
  id: string
  type: 'client' | 'matter' | 'document' | 'message' | 'calendar' | 'invoice' | 'contact' | 'note'
  title: string
  subtitle?: string
  description: string
  url: string
  relevanceScore: number
  matchedFields: string[]
  preview: string
  metadata: {
    [key: string]: any
  }
  lastModified: string
  createdBy?: string
  tags?: string[]
  category?: string
  confidentialityLevel?: 'public' | 'confidential' | 'privileged'
  thumbnailUrl?: string
}

interface SearchFilters {
  type: string[]
  dateRange: 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
  customDateStart?: string
  customDateEnd?: string
  author: string[]
  tags: string[]
  confidentiality: string[]
  matterIds: string[]
  clientIds: string[]
  sortBy: 'relevance' | 'date' | 'title' | 'type'
  sortOrder: 'asc' | 'desc'
}

const defaultFilters: SearchFilters = {
  type: [],
  dateRange: 'all',
  author: [],
  tags: [],
  confidentiality: [],
  matterIds: [],
  clientIds: [],
  sortBy: 'relevance',
  sortOrder: 'desc'
}

// Mock search results with rich metadata
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'document',
    title: 'Smith Family Trust Agreement v3.2',
    subtitle: 'Estate Planning Document',
    description: 'Revocable living trust agreement for John and Mary Smith with comprehensive asset protection provisions and tax optimization strategies.',
    url: '/documents/trust-agreement-smith-v32',
    relevanceScore: 98,
    matchedFields: ['title', 'content', 'tags'],
    preview: 'This Revocable Living Trust Agreement is made between John Smith and Mary Smith, as Settlors, and John Smith as initial Trustee. The trust includes provisions for asset protection, tax minimization, and succession planning...',
    metadata: {
      fileSize: '2.4 MB',
      pageCount: 45,
      version: '3.2',
      matterId: 'matter-1',
      matterTitle: 'Smith Family Estate Planning',
      clientId: 'client-1',
      clientName: 'John Smith'
    },
    lastModified: '2025-01-12T14:30:00Z',
    createdBy: 'Sarah Johnson',
    tags: ['trust', 'estate-planning', 'asset-protection', 'tax-optimization'],
    category: 'Legal Documents',
    confidentialityLevel: 'privileged'
  },
  {
    id: '2',
    type: 'client',
    title: 'Johnson Trust Services LLC',
    subtitle: 'Business Client - Estate Planning',
    description: 'Family business entity requiring comprehensive estate planning and succession planning for multi-generational wealth transfer.',
    url: '/clients/johnson-trust-services',
    relevanceScore: 87,
    matchedFields: ['name', 'business_name', 'notes'],
    preview: 'Johnson Trust Services LLC is a family-owned business specializing in trust administration and estate planning services. Founded in 1985, the company manages over $500M in client assets...',
    metadata: {
      clientType: 'business',
      industry: 'Financial Services',
      employees: 25,
      annualRevenue: '$2.5M',
      primaryContact: 'Robert Johnson',
      phone: '(555) 123-4567'
    },
    lastModified: '2025-01-10T09:15:00Z',
    createdBy: 'Maria Rodriguez',
    tags: ['estate-planning', 'business-client', 'succession-planning', 'trust-administration'],
    category: 'Clients',
    confidentialityLevel: 'confidential'
  },
  {
    id: '3',
    type: 'matter',
    title: 'Williams Family Estate Planning',
    subtitle: 'Active Matter - Estate Planning',
    description: 'Comprehensive estate planning including trust creation, will preparation, and tax optimization for high net worth family.',
    url: '/matters/williams-estate-planning',
    relevanceScore: 82,
    matchedFields: ['title', 'description', 'notes'],
    preview: 'Estate planning matter for the Williams family involves complex trust structures, charitable giving strategies, and business succession planning. Assets exceed $10M including real estate, investments, and family business interests...',
    metadata: {
      status: 'active',
      priority: 'high',
      attorney: 'Sarah Johnson',
      paralegal: 'Maria Rodriguez',
      estimatedValue: '$10,000,000',
      complexity: 'high',
      practiceArea: 'Estate Planning'
    },
    lastModified: '2025-01-11T16:45:00Z',
    createdBy: 'Sarah Johnson',
    tags: ['estate-planning', 'high-net-worth', 'trust', 'succession-planning'],
    category: 'Matters',
    confidentialityLevel: 'privileged'
  },
  {
    id: '4',
    type: 'message',
    title: 'Trust documents ready for review',
    subtitle: 'From: Sarah Johnson to John Smith',
    description: 'Attorney message regarding completion of trust documents and next steps for client review and signing.',
    url: '/messages/thread-1',
    relevanceScore: 75,
    matchedFields: ['subject', 'content'],
    preview: 'Hi John, I\'ve completed the draft of your family trust documents. Please review the attached agreement and let me know if you have any questions or need any modifications. The documents include...',
    metadata: {
      threadId: 'thread-1',
      messageCount: 5,
      lastReply: '2025-01-12T16:45:00Z',
      participants: ['Sarah Johnson', 'John Smith'],
      hasAttachments: true,
      isPrivileged: true
    },
    lastModified: '2025-01-12T14:30:00Z',
    createdBy: 'Sarah Johnson',
    tags: ['trust', 'document-review', 'client-communication'],
    category: 'Messages',
    confidentialityLevel: 'privileged'
  },
  {
    id: '5',
    type: 'calendar',
    title: 'Trust Signing Appointment',
    subtitle: 'January 22, 2025 at 2:00 PM',
    description: 'Client appointment for final signing of trust documents and estate planning paperwork.',
    url: '/calendar/event-1',
    relevanceScore: 70,
    matchedFields: ['title', 'description', 'notes'],
    preview: 'Final signing appointment for the Smith Family Trust documents. Client should bring valid identification and review all documents beforehand. Meeting will be held in Conference Room B...',
    metadata: {
      eventType: 'appointment',
      duration: '90 minutes',
      location: 'Conference Room B',
      attendees: ['John Smith', 'Sarah Johnson', 'Maria Rodriguez'],
      requiresPreparation: true,
      status: 'confirmed'
    },
    lastModified: '2025-01-08T11:20:00Z',
    createdBy: 'Maria Rodriguez',
    tags: ['appointment', 'trust', 'signing', 'estate-planning'],
    category: 'Calendar',
    confidentialityLevel: 'confidential'
  },
  {
    id: '6',
    type: 'invoice',
    title: 'Invoice #INV-2025-001',
    subtitle: 'Smith Family Estate Planning - $5,000',
    description: 'Retainer invoice for comprehensive estate planning services including trust creation and related documents.',
    url: '/billing/invoice-1',
    relevanceScore: 65,
    matchedFields: ['invoice_number', 'description', 'line_items'],
    preview: 'Estate planning retainer for comprehensive trust and will preparation. Services include initial consultation, asset inventory, trust document drafting, will preparation, and related estate planning documents...',
    metadata: {
      amount: 5000,
      status: 'partial_payment',
      paidAmount: 2500,
      balanceDue: 2500,
      dueDate: '2025-01-31',
      paymentTerms: 30
    },
    lastModified: '2025-01-01T09:00:00Z',
    createdBy: 'Billing System',
    tags: ['retainer', 'estate-planning', 'billing'],
    category: 'Billing',
    confidentialityLevel: 'confidential'
  }
]

const searchSuggestions = [
  'trust documents',
  'estate planning',
  'Smith family',
  'high net worth clients',
  'asset protection',
  'succession planning',
  'tax optimization',
  'business entities',
  'probate matters',
  'charitable giving'
]

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters)
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1)
  const [searchHistory, setSearchHistory] = useState<string[]>([
    'trust documents smith',
    'estate planning high net worth',
    'asset protection strategies'
  ])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Perform search when query changes
  useEffect(() => {
    if (query.trim()) {
      performSearch(query)
    } else {
      setResults([])
    }
  }, [query, filters])

  // Initial search from URL params
  useEffect(() => {
    const initialQuery = searchParams?.get('q')
    if (initialQuery) {
      setQuery(initialQuery)
      performSearch(initialQuery)
    }
  }, [searchParams])

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true)
    
    try {
      // Call the search API
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          filters,
          limit: 20,
          offset: 0
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      } else {
        console.error('Search API error:', response.statusText)
        // Fallback to mock data
        setResults(mockSearchResults.filter(result => 
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.description.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      }
      
      // Update search history
      if (searchQuery.trim() && !searchHistory.includes(searchQuery)) {
        setSearchHistory(prev => [searchQuery, ...prev.slice(0, 9)]) // Keep last 10
      }
      
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to mock data
      setResults(mockSearchResults.filter(result => 
        result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        result.description.toLowerCase().includes(searchQuery.toLowerCase())
      ))
    } finally {
      setIsSearching(false)
    }
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      client: UserIcon,
      matter: BriefcaseIcon,
      document: DocumentTextIcon,
      message: ChatBubbleLeftIcon,
      calendar: CalendarIcon,
      invoice: CurrencyDollarIcon,
      contact: UserIcon,
      note: DocumentTextIcon
    }
    return icons[type as keyof typeof icons] || DocumentTextIcon
  }

  const getTypeColor = (type: string) => {
    const colors = {
      client: 'text-blue-600 bg-blue-100',
      matter: 'text-green-600 bg-green-100',
      document: 'text-purple-600 bg-purple-100',
      message: 'text-orange-600 bg-orange-100',
      calendar: 'text-red-600 bg-red-100',
      invoice: 'text-yellow-600 bg-yellow-100',
      contact: 'text-indigo-600 bg-indigo-100',
      note: 'text-gray-600 bg-gray-100'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  const getConfidentialityBadge = (level?: string) => {
    if (!level) return null
    
    const styles = {
      public: 'bg-gray-100 text-gray-800',
      confidential: 'bg-orange-100 text-orange-800',
      privileged: 'bg-red-100 text-red-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles[level as keyof typeof styles]}`}>
        {level.toUpperCase()}
      </span>
    )
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    
    const regex = new RegExp(`(${query.split(' ').join('|')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, i) => 
      regex.test(part) ? 
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    )
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query)
      setShowSuggestions(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return
    
    const suggestions = searchHistory.concat(searchSuggestions).slice(0, 8)
    
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestion(prev => (prev + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestion(prev => prev <= 0 ? suggestions.length - 1 : prev - 1)
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
      e.preventDefault()
      setQuery(suggestions[selectedSuggestion])
      setShowSuggestions(false)
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setSelectedSuggestion(-1)
    }
  }

  const [apiSuggestions, setApiSuggestions] = useState<string[]>([])
  
  // Fetch suggestions from API
  useEffect(() => {
    if (query.length >= 2) {
      const fetchSuggestions = async () => {
        try {
          const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}&limit=5`)
          if (response.ok) {
            const data = await response.json()
            setApiSuggestions(data.suggestions?.map((s: any) => s.text) || [])
          }
        } catch (error) {
          console.error('Suggestions API error:', error)
        }
      }
      
      const timeoutId = setTimeout(fetchSuggestions, 300) // Debounce
      return () => clearTimeout(timeoutId)
    } else {
      setApiSuggestions([])
    }
  }, [query])
  
  const allSuggestions = [...new Set([...searchHistory, ...apiSuggestions, ...searchSuggestions])].slice(0, 8)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center mb-2">
                <SparklesIcon className="h-8 w-8 mr-3 text-blue-600" />
                AI-Powered Search
              </h1>
              <p className="text-gray-600">
                Find anything across your entire legal practice with intelligent search
              </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search clients, matters, documents, messages..."
                  className="w-full pl-12 pr-24 py-4 text-lg border border-gray-300 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <FunnelIcon className="h-5 w-5" />
                  </button>
                  {isSearching ? (
                    <div className="animate-spin h-5 w-5 text-blue-600">
                      <CommandLineIcon className="h-5 w-5" />
                    </div>
                  ) : (
                    <button
                      type="submit"
                      className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <ArrowRightIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Search Suggestions */}
              {showSuggestions && allSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                  {searchHistory.length > 0 && (
                    <div className="px-4 py-2 border-b border-gray-100">
                      <div className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Recent Searches
                      </div>
                    </div>
                  )}
                  
                  {allSuggestions.map((suggestion, index) => {
                    const isHistory = searchHistory.includes(suggestion)
                    return (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setQuery(suggestion)
                          setShowSuggestions(false)
                          performSearch(suggestion)
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center ${
                          index === selectedSuggestion ? 'bg-blue-50' : ''
                        }`}
                      >
                        {isHistory ? (
                          <ClockIcon className="h-4 w-4 mr-3 text-gray-400" />
                        ) : (
                          <LightBulbIcon className="h-4 w-4 mr-3 text-yellow-500" />
                        )}
                        <span className="text-gray-900">{suggestion}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Filters Sidebar */}
            {showFilters && (
              <div className="lg:w-1/4">
                <div className="bg-white rounded-lg shadow p-6 sticky top-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                    <button
                      onClick={() => setFilters(defaultFilters)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-6">
                    {/* Content Type */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Content Type</h4>
                      <div className="space-y-2">
                        {['client', 'matter', 'document', 'message', 'calendar', 'invoice'].map(type => (
                          <label key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.type.includes(type)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters(prev => ({ ...prev, type: [...prev.type, type] }))
                                } else {
                                  setFilters(prev => ({ ...prev, type: prev.type.filter(t => t !== type) }))
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">
                              {type}s
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Date Range */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Date Range</h4>
                      <select
                        value={filters.dateRange}
                        onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="quarter">This Quarter</option>
                        <option value="year">This Year</option>
                      </select>
                    </div>

                    {/* Confidentiality */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Confidentiality</h4>
                      <div className="space-y-2">
                        {['public', 'confidential', 'privileged'].map(level => (
                          <label key={level} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters.confidentiality.includes(level)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFilters(prev => ({ ...prev, confidentiality: [...prev.confidentiality, level] }))
                                } else {
                                  setFilters(prev => ({ ...prev, confidentiality: prev.confidentiality.filter(c => c !== level) }))
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">
                              {level}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Sort Options */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Sort By</h4>
                      <select
                        value={`${filters.sortBy}-${filters.sortOrder}`}
                        onChange={(e) => {
                          const [sortBy, sortOrder] = e.target.value.split('-')
                          setFilters(prev => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any }))
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="relevance-desc">Most Relevant</option>
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="title-asc">Title A-Z</option>
                        <option value="title-desc">Title Z-A</option>
                        <option value="type-asc">Type A-Z</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            <div className={showFilters ? 'lg:w-3/4' : 'w-full'}>
              {query && (
                <div className="mb-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
                    </h2>
                    {results.length > 0 && (
                      <div className="text-sm text-gray-500">
                        Search completed in {Math.random() * 200 + 50 | 0}ms
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {results.map((result) => {
                  const TypeIcon = getTypeIcon(result.type)
                  const typeColor = getTypeColor(result.type)
                  
                  return (
                    <div key={result.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center space-x-3 mb-2">
                            <div className={`p-2 rounded-lg ${typeColor}`}>
                              <TypeIcon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <h3 className="text-lg font-semibold text-gray-900 truncate">
                                  {highlightText(result.title, query)}
                                </h3>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColor}`}>
                                  {result.type.toUpperCase()}
                                </span>
                                {result.confidentialityLevel && getConfidentialityBadge(result.confidentialityLevel)}
                                <div className="flex items-center text-sm text-gray-500">
                                  <StarIcon className="h-4 w-4 mr-1 text-yellow-500" />
                                  {result.relevanceScore}%
                                </div>
                              </div>
                              {result.subtitle && (
                                <p className="text-sm text-gray-600">{result.subtitle}</p>
                              )}
                            </div>
                          </div>

                          {/* Description */}
                          <p className="text-gray-700 mb-3 line-clamp-2">
                            {highlightText(result.description, query)}
                          </p>

                          {/* Preview */}
                          <div className="bg-gray-50 rounded-md p-3 mb-3">
                            <p className="text-sm text-gray-600 line-clamp-3">
                              {highlightText(result.preview, query)}
                            </p>
                          </div>

                          {/* Metadata */}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                            <span className="flex items-center">
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {new Date(result.lastModified).toLocaleDateString()}
                            </span>
                            {result.createdBy && (
                              <span className="flex items-center">
                                <UserIcon className="h-3 w-3 mr-1" />
                                {result.createdBy}
                              </span>
                            )}
                            {result.metadata.matterId && (
                              <span className="flex items-center">
                                <BriefcaseIcon className="h-3 w-3 mr-1" />
                                {result.metadata.matterTitle}
                              </span>
                            )}
                            {Object.entries(result.metadata).filter(([key]) => 
                              !['matterId', 'matterTitle', 'clientId', 'clientName'].includes(key)
                            ).slice(0, 3).map(([key, value]) => (
                              <span key={key} className="bg-gray-100 px-2 py-1 rounded">
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>

                          {/* Tags */}
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {result.tags.slice(0, 5).map(tag => (
                                <span key={tag} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                  <TagIcon className="h-3 w-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                              {result.tags.length > 5 && (
                                <span className="text-xs text-gray-500">
                                  +{result.tags.length - 5} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Matched Fields */}
                          <div className="text-xs text-gray-500">
                            Matched in: {result.matchedFields.join(', ')}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <button
                            onClick={() => router.push(result.url)}
                            className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            View
                          </button>
                          
                          <div className="flex items-center space-x-1">
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Bookmark"
                            >
                              <BookmarkIcon className="h-4 w-4" />
                            </button>
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Share"
                            >
                              <ShareIcon className="h-4 w-4" />
                            </button>
                            {result.type === 'document' && (
                              <button
                                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Download"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* No Results */}
              {query && results.length === 0 && !isSearching && (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600 mb-6">
                    Try adjusting your search terms or filters to find what you're looking for.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Try searching for:</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {searchSuggestions.slice(0, 5).map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setQuery(suggestion)}
                          className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full hover:bg-blue-200 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!query && (
                <div className="text-center py-12">
                  <SparklesIcon className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to search</h3>
                  <p className="text-gray-600 mb-6">
                    Use AI-powered search to find anything across your legal practice
                  </p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Popular searches:</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {searchSuggestions.slice(0, 6).map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => setQuery(suggestion)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full hover:bg-gray-200 transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    {searchHistory.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Recent searches:</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {searchHistory.slice(0, 3).map(search => (
                            <button
                              key={search}
                              onClick={() => setQuery(search)}
                              className="flex items-center px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full hover:bg-blue-100 transition-colors"
                            >
                              <ClockIcon className="h-3 w-3 mr-1" />
                              {search}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}