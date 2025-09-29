/**
 * Search Suggestions API
 * 
 * Provides intelligent search suggestions and autocomplete
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

interface SearchSuggestion {
  text: string
  type: 'query' | 'client' | 'matter' | 'document' | 'recent'
  category?: string
  metadata?: Record<string, Record<string, unknown>>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (query.length < 2) {
      // Return popular/recent suggestions when no query
      const popularSuggestions: SearchSuggestion[] = [
        { text: 'trust documents', type: 'query', category: 'estate-planning' },
        { text: 'estate planning', type: 'query', category: 'practice-area' },
        { text: 'high net worth clients', type: 'query', category: 'client-type' },
        { text: 'asset protection', type: 'query', category: 'legal-concept' },
        { text: 'succession planning', type: 'query', category: 'legal-concept' },
        { text: 'tax optimization', type: 'query', category: 'legal-concept' },
        { text: 'business entities', type: 'query', category: 'practice-area' },
        { text: 'probate matters', type: 'query', category: 'practice-area' }
      ]

      return NextResponse.json({
        success: true,
        suggestions: popularSuggestions.slice(0, limit)
      })
    }

    const suggestions: SearchSuggestion[] = []
    const queryLower = query.toLowerCase()

    // Get client suggestions
    try {
      const { data: clients, error } = await supabaseServer
        .from('clients')
        .select('id, first_name, last_name, business_name, client_type, practice_areas')
        .or(`first_name.ilike.%${queryLower}%,last_name.ilike.%${queryLower}%,business_name.ilike.%${queryLower}%`)
        .is('deleted_at', null)
        .limit(5)

      if (!error && clients) {
        clients.forEach(client => {
          const name = client.business_name || `${client.first_name} ${client.last_name}`
          suggestions.push({
            text: name,
            type: 'client',
            category: client.client_type,
            metadata: {
              id: client.id,
              practiceAreas: client.practice_areas
            }
          })
        })
      }
    } catch (error) {
      console.error('Client suggestions error:', error)
    }

    // Get matter suggestions
    try {
      const { data: matters, error } = await supabaseServer
        .from('matters')
        .select('id, title, matter_type, practice_area, status')
        .ilike('title', `%${queryLower}%`)
        .is('deleted_at', null)
        .limit(5)

      if (!error && matters) {
        matters.forEach(matter => {
          suggestions.push({
            text: matter.title,
            type: 'matter',
            category: matter.practice_area,
            metadata: {
              id: matter.id,
              matterType: matter.matter_type,
              status: matter.status
            }
          })
        })
      }
    } catch (error) {
      console.error('Matter suggestions error:', error)
    }

    // Get document suggestions
    try {
      const { data: documents, error } = await supabaseServer
        .from('documents')
        .select('id, title, document_type, document_category')
        .ilike('title', `%${queryLower}%`)
        .is('deleted_at', null)
        .limit(5)

      if (!error && documents) {
        documents.forEach(doc => {
          suggestions.push({
            text: doc.title,
            type: 'document',
            category: doc.document_category,
            metadata: {
              id: doc.id,
              documentType: doc.document_type
            }
          })
        })
      }
    } catch (error) {
      console.error('Document suggestions error:', error)
    }

    // Add semantic query suggestions based on partial input
    const semanticSuggestions: SearchSuggestion[] = []
    
    // Legal terms and concepts
    const legalTerms = [
      'trust documents', 'estate planning', 'will preparation', 'asset protection',
      'succession planning', 'tax optimization', 'business entities', 'probate matters',
      'charitable giving', 'family limited partnerships', 'irrevocable trusts',
      'revocable trusts', 'power of attorney', 'healthcare directives', 'guardianship',
      'conservatorship', 'business succession', 'buy-sell agreements', 'valuation',
      'tax returns', 'gift tax', 'estate tax', 'generation skipping', 'dynasty trusts'
    ]

    legalTerms.forEach(term => {
      if (term.toLowerCase().includes(queryLower) || 
          queryLower.split(' ').some(word => term.toLowerCase().includes(word))) {
        semanticSuggestions.push({
          text: term,
          type: 'query',
          category: 'legal-concept'
        })
      }
    })

    // Practice area suggestions
    const practiceAreas = [
      'estate planning', 'business formation', 'real estate', 'tax law',
      'probate administration', 'trust administration', 'elder law',
      'special needs planning', 'charitable planning', 'business succession'
    ]

    practiceAreas.forEach(area => {
      if (area.toLowerCase().includes(queryLower)) {
        semanticSuggestions.push({
          text: area,
          type: 'query',
          category: 'practice-area'
        })
      }
    })

    // Client type suggestions
    const clientTypes = [
      'high net worth clients', 'business clients', 'individual clients',
      'family clients', 'nonprofit clients', 'elderly clients',
      'young professionals', 'entrepreneurs', 'retirees'
    ]

    clientTypes.forEach(type => {
      if (type.toLowerCase().includes(queryLower)) {
        semanticSuggestions.push({
          text: type,
          type: 'query',
          category: 'client-type'
        })
      }
    })

    // Merge all suggestions and remove duplicates
    const allSuggestions = [...suggestions, ...semanticSuggestions]
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) => 
      index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
    )

    // Sort by relevance (prioritize exact matches, then client/matter matches, then semantic matches)
    uniqueSuggestions.sort((a, b) => {
      const aExact = a.text.toLowerCase().startsWith(queryLower) ? 1000 : 0
      const bExact = b.text.toLowerCase().startsWith(queryLower) ? 1000 : 0
      
      const aTypeScore = a.type === 'client' ? 100 : a.type === 'matter' ? 90 : a.type === 'document' ? 80 : 0
      const bTypeScore = b.type === 'client' ? 100 : b.type === 'matter' ? 90 : b.type === 'document' ? 80 : 0
      
      const aRelevance = aExact + aTypeScore
      const bRelevance = bExact + bTypeScore
      
      return bRelevance - aRelevance
    })

    return NextResponse.json({
      success: true,
      suggestions: uniqueSuggestions.slice(0, limit),
      query
    })

  } catch (error) {
    console.error('Search suggestions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { queries } = body

    if (!Array.isArray(queries)) {
      return NextResponse.json(
        { error: 'Queries must be an array' },
        { status: 400 }
      )
    }

    // Store search queries for analytics and improving suggestions
    // In a real implementation, you might want to store these in a search_analytics table
    console.log('Search queries for analytics:', queries)

    return NextResponse.json({
      success: true,
      message: 'Search queries logged successfully'
    })

  } catch (error) {
    console.error('Search analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}