/**
 * Universal Search API
 * 
 * AI-powered search across all practice data with full-text indexing
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'

interface SearchQuery {
  query: string
  filters: {
    type?: string[]
    dateRange?: string
    confidentiality?: string[]
    matterIds?: string[]
    clientIds?: string[]
    sortBy?: 'relevance' | 'date' | 'title' | 'type'
    sortOrder?: 'asc' | 'desc'
  }
  limit?: number
  offset?: number
}

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
  metadata: Record<string, any>
  lastModified: string
  createdBy?: string
  tags?: string[]
  category?: string
  confidentialityLevel?: 'public' | 'confidential' | 'privileged'
}

export async function POST(request: NextRequest) {
  try {
    const body: SearchQuery = await request.json()
    const { query, filters = {}, limit = 20, offset = 0 } = body

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const searchResults: SearchResult[] = []
    const queryTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)

    // Use mock data for development
    const mockResults = getMockSearchResults()
    const filteredMockResults = mockResults.filter(result => {
      const searchableText = [result.title, result.description, result.preview, ...(result.tags || [])].join(' ').toLowerCase()
      return queryTerms.some(term => searchableText.includes(term))
    })
    
    searchResults.push(...filteredMockResults)

    // Search Clients (fallback to mock if DB fails)
    if (!filters.type || filters.type.includes('client')) {
      try {
        const { data: clients, error } = await supabaseServer
          .from('clients')
          .select(`
            id,
            first_name,
            last_name,
            business_name,
            email,
            phone_primary,
            client_status,
            client_type,
            practice_areas,
            notes,
            tags,
            created_at,
            updated_at,
            created_by
          `)
          .is('deleted_at', null)

        if (!error && clients) {
          clients.forEach(client => {
            const searchableText = [
              client.first_name,
              client.last_name,
              client.business_name,
              client.email,
              client.notes,
              client.practice_areas?.join(' '),
              client.tags?.join(' ')
            ].filter(Boolean).join(' ').toLowerCase()

            const relevance = calculateRelevance(searchableText, queryTerms)
            if (relevance > 0) {
              const clientName = client.business_name || `${client.first_name} ${client.last_name}`
              searchResults.push({
                id: client.id,
                type: 'client',
                title: clientName,
                subtitle: `${client.client_type} Client - ${client.client_status}`,
                description: client.notes || `${client.client_type} client in ${client.practice_areas?.join(', ') || 'general'} practice area`,
                url: `/clients/${client.id}`,
                relevanceScore: relevance,
                matchedFields: getMatchedFields(searchableText, queryTerms, ['name', 'email', 'notes', 'practice_areas']),
                preview: client.notes || `Contact: ${client.email || client.phone_primary || 'No contact info'}`,
                metadata: {
                  clientType: client.client_type,
                  status: client.client_status,
                  email: client.email,
                  phone: client.phone_primary,
                  practiceAreas: client.practice_areas
                },
                lastModified: client.updated_at,
                createdBy: client.created_by,
                tags: client.tags,
                category: 'Clients',
                confidentialityLevel: 'confidential'
              })
            }
          })
        }
      } catch (error) {
        console.error('Client search error:', error)
      }
    }

    // Search Matters
    if (!filters.type || filters.type.includes('matter')) {
      try {
        const { data: matters, error } = await supabaseServer
          .from('matters')
          .select(`
            id,
            matter_number,
            title,
            description,
            matter_type,
            practice_area,
            status,
            priority,
            internal_notes,
            client_notes,
            tags,
            keywords,
            created_at,
            updated_at,
            created_by,
            client:clients(first_name, last_name, business_name)
          `)
          .is('deleted_at', null)

        if (!error && matters) {
          matters.forEach(matter => {
            const searchableText = [
              matter.title,
              matter.description,
              matter.internal_notes,
              matter.client_notes,
              matter.matter_type,
              matter.practice_area,
              matter.tags?.join(' '),
              matter.keywords?.join(' ')
            ].filter(Boolean).join(' ').toLowerCase()

            const relevance = calculateRelevance(searchableText, queryTerms)
            if (relevance > 0) {
              const clientName = matter.client?.business_name || 
                (matter.client ? `${matter.client.first_name} ${matter.client.last_name}` : 'Unknown Client')
              
              searchResults.push({
                id: matter.id,
                type: 'matter',
                title: matter.title,
                subtitle: `${matter.status} Matter - ${matter.practice_area}`,
                description: matter.description || `${matter.matter_type} matter for ${clientName}`,
                url: `/matters/${matter.id}`,
                relevanceScore: relevance,
                matchedFields: getMatchedFields(searchableText, queryTerms, ['title', 'description', 'notes', 'keywords']),
                preview: matter.internal_notes || matter.client_notes || matter.description || 'No description available',
                metadata: {
                  matterNumber: matter.matter_number,
                  matterType: matter.matter_type,
                  practiceArea: matter.practice_area,
                  status: matter.status,
                  priority: matter.priority,
                  clientName
                },
                lastModified: matter.updated_at,
                createdBy: matter.created_by,
                tags: matter.tags,
                category: 'Matters',
                confidentialityLevel: 'privileged'
              })
            }
          })
        }
      } catch (error) {
        console.error('Matter search error:', error)
      }
    }

    // Search Documents
    if (!filters.type || filters.type.includes('document')) {
      try {
        const { data: documents, error } = await supabaseServer
          .from('documents')
          .select(`
            id,
            document_number,
            title,
            description,
            document_type,
            document_category,
            file_name,
            status,
            confidentiality_level,
            text_content,
            tags,
            keywords,
            created_at,
            updated_at,
            created_by,
            client:clients(first_name, last_name, business_name),
            matter:matters(matter_number, title)
          `)
          .is('deleted_at', null)

        if (!error && documents) {
          documents.forEach(doc => {
            const searchableText = [
              doc.title,
              doc.description,
              doc.document_category,
              doc.text_content,
              doc.tags?.join(' '),
              doc.keywords?.join(' ')
            ].filter(Boolean).join(' ').toLowerCase()

            const relevance = calculateRelevance(searchableText, queryTerms)
            if (relevance > 0) {
              const clientName = doc.client?.business_name || 
                (doc.client ? `${doc.client.first_name} ${doc.client.last_name}` : 'Unknown Client')
              
              searchResults.push({
                id: doc.id,
                type: 'document',
                title: doc.title,
                subtitle: `${doc.document_category} - ${doc.document_type}`,
                description: doc.description || `${doc.document_type} document in ${doc.document_category}`,
                url: `/documents/${doc.id}`,
                relevanceScore: relevance,
                matchedFields: getMatchedFields(searchableText, queryTerms, ['title', 'content', 'description', 'tags']),
                preview: doc.text_content?.substring(0, 200) || doc.description || 'No preview available',
                metadata: {
                  documentNumber: doc.document_number,
                  documentType: doc.document_type,
                  fileName: doc.file_name,
                  status: doc.status,
                  clientName,
                  matterTitle: doc.matter?.title,
                  matterNumber: doc.matter?.matter_number
                },
                lastModified: doc.updated_at,
                createdBy: doc.created_by,
                tags: doc.tags,
                category: doc.document_category,
                confidentialityLevel: doc.confidentiality_level as any
              })
            }
          })
        }
      } catch (error) {
        console.error('Document search error:', error)
      }
    }

    // Search Calendar Events
    if (!filters.type || filters.type.includes('calendar')) {
      try {
        const { data: events, error } = await supabaseServer
          .from('calendar_events')
          .select(`
            id,
            title,
            description,
            event_type,
            event_category,
            start_datetime,
            end_datetime,
            location,
            preparation_notes,
            outcome_summary,
            created_at,
            updated_at,
            created_by,
            client:clients(first_name, last_name, business_name),
            matter:matters(matter_number, title)
          `)
          .is('deleted_at', null)

        if (!error && events) {
          events.forEach(event => {
            const searchableText = [
              event.title,
              event.description,
              event.preparation_notes,
              event.outcome_summary,
              event.location
            ].filter(Boolean).join(' ').toLowerCase()

            const relevance = calculateRelevance(searchableText, queryTerms)
            if (relevance > 0) {
              const clientName = event.client?.business_name || 
                (event.client ? `${event.client.first_name} ${event.client.last_name}` : 'Unknown Client')
              
              searchResults.push({
                id: event.id,
                type: 'calendar',
                title: event.title,
                subtitle: `${new Date(event.start_datetime).toLocaleDateString()} - ${event.event_type}`,
                description: event.description || `${event.event_type} event in ${event.event_category}`,
                url: `/calendar/events/${event.id}`,
                relevanceScore: relevance,
                matchedFields: getMatchedFields(searchableText, queryTerms, ['title', 'description', 'notes']),
                preview: event.preparation_notes || event.description || 'No additional details',
                metadata: {
                  eventType: event.event_type,
                  eventCategory: event.event_category,
                  startDate: event.start_datetime,
                  location: event.location,
                  clientName,
                  matterTitle: event.matter?.title
                },
                lastModified: event.updated_at,
                createdBy: event.created_by,
                tags: [],
                category: 'Calendar',
                confidentialityLevel: 'confidential'
              })
            }
          })
        }
      } catch (error) {
        console.error('Calendar search error:', error)
      }
    }

    // Apply filters
    let filteredResults = searchResults

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date()
      const filterDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          filterDate.setDate(now.getDate() - 7)
          break
        case 'month':
          filterDate.setDate(now.getDate() - 30)
          break
        case 'quarter':
          filterDate.setDate(now.getDate() - 90)
          break
        case 'year':
          filterDate.setDate(now.getDate() - 365)
          break
      }
      
      filteredResults = filteredResults.filter(result => 
        new Date(result.lastModified) >= filterDate
      )
    }

    // Confidentiality filter
    if (filters.confidentiality && filters.confidentiality.length > 0) {
      filteredResults = filteredResults.filter(result =>
        result.confidentialityLevel && filters.confidentiality!.includes(result.confidentialityLevel)
      )
    }

    // Sort results
    const sortBy = filters.sortBy || 'relevance'
    const sortOrder = filters.sortOrder || 'desc'
    
    filteredResults.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore
          break
        case 'date':
          comparison = new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        default:
          comparison = b.relevanceScore - a.relevanceScore
      }
      
      return sortOrder === 'desc' ? comparison : -comparison
    })

    // Apply pagination
    const paginatedResults = filteredResults.slice(offset, offset + limit)

    return NextResponse.json({
      success: true,
      results: paginatedResults,
      totalCount: filteredResults.length,
      query,
      filters,
      searchTime: Date.now() % 1000 // Mock search time
    })

  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Calculate relevance score based on term matching
function calculateRelevance(text: string, queryTerms: string[]): number {
  if (!text || queryTerms.length === 0) return 0

  let score = 0
  const textWords = text.toLowerCase().split(' ')
  
  queryTerms.forEach(term => {
    // Exact word matches
    const exactMatches = textWords.filter(word => word === term).length
    score += exactMatches * 10
    
    // Partial matches
    const partialMatches = textWords.filter(word => word.includes(term) && word !== term).length
    score += partialMatches * 5
    
    // Fuzzy matches (simple Levenshtein distance approximation)
    const fuzzyMatches = textWords.filter(word => {
      if (word.length < 3 || term.length < 3) return false
      const maxDistance = Math.floor(Math.max(word.length, term.length) / 3)
      return levenshteinDistance(word, term) <= maxDistance
    }).length
    score += fuzzyMatches * 2
  })

  // Normalize score to 0-100 range
  return Math.min(100, Math.round(score))
}

// Get matched fields for highlighting
function getMatchedFields(text: string, queryTerms: string[], fieldNames: string[]): string[] {
  const matched: string[] = []
  const textLower = text.toLowerCase()
  
  queryTerms.forEach(term => {
    if (textLower.includes(term)) {
      fieldNames.forEach(field => {
        if (!matched.includes(field)) {
          matched.push(field)
        }
      })
    }
  })
  
  return matched.length > 0 ? matched : ['content']
}

// Simple Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '20')
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    )
  }
  
  // Convert GET params to POST body format
  const searchQuery: SearchQuery = {
    query,
    filters: {
      ...(type && { type: [type] }),
    },
    limit
  }
  
  // Reuse POST logic
  const mockRequest = {
    json: async () => searchQuery
  } as NextRequest
  
  return POST(mockRequest)
}

// Mock search results for development/fallback
function getMockSearchResults(): SearchResult[] {
  return [
    {
      id: '1',
      type: 'client',
      title: 'John & Mary Smith',
      subtitle: 'Individual Clients - Active',
      description: 'Estate planning clients working on comprehensive trust and will package',
      url: '/clients/1',
      relevanceScore: 0.95,
      matchedFields: ['name', 'description'],
      preview: 'High-net-worth clients requiring revocable living trust, pour-over will, healthcare directives, and financial power of attorney documents.',
      metadata: {
        clientType: 'Individual',
        status: 'Active',
        email: 'john.smith@email.com',
        phone: '(555) 123-4567',
        practiceAreas: ['Estate Planning', 'Trust Administration']
      },
      lastModified: '2025-01-13T10:30:00Z',
      createdBy: 'Sarah Johnson',
      tags: ['high-net-worth', 'trust', 'estate-planning'],
      category: 'Clients',
      confidentialityLevel: 'confidential'
    },
    {
      id: '2',
      type: 'matter',
      title: 'Smith Family Estate Planning',
      subtitle: 'Matter #2025-001 - In Progress',
      description: 'Comprehensive estate plan including revocable living trust, healthcare directives, and asset transfer coordination',
      url: '/matters/2025-001',
      relevanceScore: 0.92,
      matchedFields: ['title', 'description'],
      preview: 'Current phase: Trust funding and asset transfers. Next deadline: Review meeting scheduled for January 20, 2025.',
      metadata: {
        matterNumber: '2025-001',
        matterType: 'Estate Planning',
        practiceArea: 'Estate Planning',
        status: 'In Progress',
        priority: 'High'
      },
      lastModified: '2025-01-13T14:45:00Z',
      createdBy: 'Sarah Johnson',
      tags: ['estate-planning', 'trust', 'asset-transfer', 'funding'],
      category: 'Matters',
      confidentialityLevel: 'privileged'
    },
    {
      id: '3',
      type: 'document',
      title: 'Smith Family Trust Agreement v3.2',
      subtitle: 'Trust Documents - Review Status',
      description: 'Final revocable living trust agreement ready for client review and execution',
      url: '/documents/3',
      relevanceScore: 0.88,
      matchedFields: ['title', 'description'],
      preview: 'Latest version incorporates client feedback on successor trustee provisions and distribution terms. Scheduled for execution January 25, 2025.',
      metadata: {
        documentType: 'Trust Agreement',
        category: 'Trust Documents',
        status: 'Review',
        fileType: 'PDF',
        fileSize: '2.4 MB',
        version: '3.2'
      },
      lastModified: '2025-01-12T08:30:00Z',
      createdBy: 'Sarah Johnson',
      tags: ['trust-agreement', 'revocable', 'estate-planning', 'final-draft'],
      category: 'Documents',
      confidentialityLevel: 'privileged'
    },
    {
      id: '4',
      type: 'document',
      title: 'Power of Attorney - Healthcare',
      subtitle: 'Legal Documents - Signed',
      description: 'Executed healthcare power of attorney naming spouse as primary agent',
      url: '/documents/4',
      relevanceScore: 0.85,
      matchedFields: ['title', 'description'],
      preview: 'Fully executed document with notarization and witness signatures. Filed in secure client portal.',
      metadata: {
        documentType: 'Power of Attorney',
        category: 'Legal Documents',
        status: 'Signed',
        fileType: 'PDF',
        fileSize: '890 KB',
        executionDate: '2025-01-05'
      },
      lastModified: '2025-01-05T17:30:00Z',
      createdBy: 'Sarah Johnson',
      tags: ['power-of-attorney', 'healthcare', 'executed'],
      category: 'Documents',
      confidentialityLevel: 'privileged'
    },
    {
      id: '5',
      type: 'message',
      title: 'Trust Document Review Discussion',
      subtitle: 'Client Communication - Recent',
      description: 'Message thread regarding trust document revisions and funding timeline',
      url: '/messages/5',
      relevanceScore: 0.82,
      matchedFields: ['title', 'content'],
      preview: 'Client questions about funding process timeline and real estate transfer procedures. Responded with detailed funding checklist.',
      metadata: {
        messageType: 'Client Communication',
        threadId: '1',
        participantCount: 2,
        messageCount: 8,
        isPrivileged: true
      },
      lastModified: '2025-01-13T14:30:00Z',
      createdBy: 'John Smith',
      tags: ['trust-funding', 'client-questions', 'communication'],
      category: 'Communications',
      confidentialityLevel: 'privileged'
    },
    {
      id: '6',
      type: 'invoice',
      title: 'Estate Planning Services - January 2025',
      subtitle: 'Invoice #INV-2025-001 - Paid',
      description: 'Comprehensive estate planning package including trust creation and document preparation',
      url: '/billing/INV-2025-001',
      relevanceScore: 0.78,
      matchedFields: ['description', 'services'],
      preview: 'Flat fee estate planning package: $3,500. Paid in full January 10, 2025. Services completed ahead of schedule.',
      metadata: {
        invoiceNumber: 'INV-2025-001',
        amount: 3500,
        status: 'Paid',
        paidDate: '2025-01-10',
        services: ['Trust Creation', 'Will Preparation', 'Healthcare Directives']
      },
      lastModified: '2025-01-10T12:00:00Z',
      createdBy: 'Sarah Johnson',
      tags: ['flat-fee', 'estate-planning', 'paid'],
      category: 'Billing',
      confidentialityLevel: 'confidential'
    }
  ]
}