/**
 * Integration Test: Advanced Search & Organization
 * T026: Scenario 5 - Comprehensive search, filtering, and organization capabilities
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Advanced Search & Organization', () => {
  const testDocumentIds: string[] = [];
  const testMatterIds: string[] = [];

  beforeAll(async () => {
    // Create test matters and documents for comprehensive search testing
    const matters = [
      { name: 'Smith Estate Planning', practice_area: 'estate_planning', client_name: 'John Smith' },
      { name: 'Johnson Business Formation', practice_area: 'business_law', client_name: 'Jane Johnson' },
      { name: 'Williams Real Estate Transaction', practice_area: 'real_estate', client_name: 'Bob Williams' }
    ];

    // Create test matters
    for (const matter of matters) {
      const matterResponse = await fetch(`${API_BASE}/api/matters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-attorney'
        },
        body: JSON.stringify(matter)
      });
      const createdMatter = await matterResponse.json();
      testMatterIds.push(createdMatter.id);
    }

    // Create diverse test documents
    const documents = [
      {
        matter_id: testMatterIds[0],
        title: 'Smith Revocable Living Trust',
        document_type: 'trust',
        status: 'draft',
        tags: ['estate_planning', 'revocable_trust', 'high_priority'],
        content_keywords: 'trust grantor beneficiary successor trustee assets'
      },
      {
        matter_id: testMatterIds[0],
        title: 'Smith Last Will and Testament',
        document_type: 'will',
        status: 'review',
        tags: ['estate_planning', 'will', 'probate'],
        content_keywords: 'will executor beneficiary guardian personal property'
      },
      {
        matter_id: testMatterIds[1],
        title: 'Johnson LLC Operating Agreement',
        document_type: 'operating_agreement',
        status: 'executed',
        tags: ['business_law', 'llc', 'operating_agreement'],
        content_keywords: 'limited liability company members management distributions'
      },
      {
        matter_id: testMatterIds[1],
        title: 'Johnson Business License Application',
        document_type: 'application',
        status: 'pending',
        tags: ['business_law', 'license', 'application'],
        content_keywords: 'business license application state federal compliance'
      },
      {
        matter_id: testMatterIds[2],
        title: 'Williams Purchase Agreement',
        document_type: 'contract',
        status: 'executed',
        tags: ['real_estate', 'purchase', 'contract'],
        content_keywords: 'real estate purchase agreement seller buyer closing'
      },
      {
        matter_id: testMatterIds[2],
        title: 'Williams Title Insurance Policy',
        document_type: 'insurance',
        status: 'active',
        tags: ['real_estate', 'title_insurance', 'policy'],
        content_keywords: 'title insurance policy coverage exceptions liens'
      }
    ];

    // Create test documents
    for (const doc of documents) {
      const docResponse = await fetch(`${API_BASE}/api/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token-attorney'
        },
        body: JSON.stringify(doc)
      });
      const createdDoc = await docResponse.json();
      testDocumentIds.push(createdDoc.id);
    }
  });

  afterAll(async () => {
    // Cleanup test data
    for (const docId of testDocumentIds) {
      await fetch(`${API_BASE}/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token-attorney' }
      });
    }
    
    for (const matterId of testMatterIds) {
      await fetch(`${API_BASE}/api/matters/${matterId}`, {
        method: 'DELETE', 
        headers: { 'Authorization': 'Bearer test-token-attorney' }
      });
    }
  });

  it('should perform comprehensive text search across documents', async () => {
    // Full-text search across document content
    const searchResponse = await fetch(`${API_BASE}/api/search/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        query: 'trust beneficiary',
        search_fields: ['title', 'content', 'tags'],
        highlight: true,
        limit: 10
      })
    });

    expect(searchResponse.status).toBe(200);
    const searchResults = await searchResponse.json();
    
    expect(searchResults.total).toBeGreaterThan(0);
    expect(Array.isArray(searchResults.documents)).toBe(true);
    
    const trustDoc = searchResults.documents.find((doc: { title: string; highlights?: string; relevance_score: number }) => 
      doc.title.includes('Trust')
    );
    
    expect(trustDoc).toBeDefined();
    expect(trustDoc.highlights).toBeDefined();
    expect(trustDoc.relevance_score).toBeGreaterThan(0);

    // Verify search ranking
    const scores = searchResults.documents.map((doc: { relevance_score: number }) => doc.relevance_score);
    const sortedScores = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sortedScores);
  });

  it('should support advanced filtering and faceted search', async () => {
    // Multi-faceted search with filters
    const facetedSearchResponse = await fetch(`${API_BASE}/api/search/documents/faceted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        filters: {
          practice_area: ['estate_planning'],
          document_type: ['trust', 'will'],
          status: ['draft', 'review'],
          date_range: {
            start: '2025-01-01',
            end: '2025-12-31'
          },
          tags: ['estate_planning']
        },
        facets: ['document_type', 'status', 'practice_area', 'tags'],
        sort: {
          field: 'created_at',
          direction: 'desc'
        }
      })
    });

    expect(facetedSearchResponse.status).toBe(200);
    const facetedResults = await facetedSearchResponse.json();
    
    expect(facetedResults.documents).toBeDefined();
    expect(facetedResults.facets).toBeDefined();
    
    // Check facet counts
    const typeFacet = facetedResults.facets.document_type;
    expect(typeFacet.trust).toBeGreaterThan(0);
    expect(typeFacet.will).toBeGreaterThan(0);
    
    // Verify filtering worked
    facetedResults.documents.forEach((doc: { document_type: string; status: string }) => {
      expect(['trust', 'will']).toContain(doc.document_type);
      expect(['draft', 'review']).toContain(doc.status);
    });
  });

  it('should support semantic and AI-powered search', async () => {
    // AI-powered semantic search
    const semanticSearchResponse = await fetch(`${API_BASE}/api/search/documents/semantic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        query: 'documents related to business formation and corporate structure',
        enable_ai_summary: true,
        similarity_threshold: 0.7
      })
    });

    expect(semanticSearchResponse.status).toBe(200);
    const semanticResults = await semanticSearchResponse.json();
    
    expect(semanticResults.documents).toBeDefined();
    expect(semanticResults.ai_summary).toBeDefined();
    
    // Should find business-related documents
    const businessDoc = semanticResults.documents.find((doc: { title: string; semantic_score: number }) => 
      doc.title.includes('LLC') || doc.title.includes('Business')
    );
    
    expect(businessDoc).toBeDefined();
    expect(businessDoc.semantic_score).toBeGreaterThan(0.7);
  });

  it('should provide document organization and categorization', async () => {
    // Get document organization suggestions
    const organizationResponse = await fetch(`${API_BASE}/api/documents/organization/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        document_ids: testDocumentIds,
        organization_type: 'matter_lifecycle',
        include_ai_insights: true
      })
    });

    expect(organizationResponse.status).toBe(200);
    const organization = await organizationResponse.json();
    
    expect(organization.suggested_folders).toBeDefined();
    expect(organization.lifecycle_stages).toBeDefined();
    expect(organization.ai_insights).toBeDefined();
    
    // Verify lifecycle categorization
    const planningStage = organization.lifecycle_stages.find((stage: { name: string; documents: unknown[] }) => 
      stage.name === 'planning'
    );
    expect(planningStage).toBeDefined();
    expect(planningStage.documents.length).toBeGreaterThan(0);
  });

  it('should support saved searches and alerts', async () => {
    // Create saved search
    const savedSearchResponse = await fetch(`${API_BASE}/api/search/saved`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        name: 'Estate Planning Documents - Draft Status',
        query: {
          filters: {
            practice_area: ['estate_planning'],
            status: ['draft']
          },
          search_fields: ['title', 'content']
        },
        alert_settings: {
          enabled: true,
          frequency: 'daily',
          notify_on_new_matches: true
        }
      })
    });

    expect(savedSearchResponse.status).toBe(201);
    const savedSearch = await savedSearchResponse.json();
    
    expect(savedSearch.id).toBeDefined();
    expect(savedSearch.name).toBe('Estate Planning Documents - Draft Status');
    expect(savedSearch.alert_settings.enabled).toBe(true);

    // Test saved search execution
    const executeSearchResponse = await fetch(`${API_BASE}/api/search/saved/${savedSearch.id}/execute`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(executeSearchResponse.status).toBe(200);
    const executionResults = await executeSearchResponse.json();
    
    expect(executionResults.documents).toBeDefined();
    expect(executionResults.total).toBeGreaterThan(0);
  });

  it('should support bulk document operations from search results', async () => {
    // Search for specific documents
    const bulkSearchResponse = await fetch(`${API_BASE}/api/search/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        query: 'estate_planning',
        search_fields: ['tags']
      })
    });

    const searchResults = await bulkSearchResponse.json();
    const documentIds = searchResults.documents.map((doc: { id: string }) => doc.id);

    // Bulk update operation
    const bulkUpdateResponse = await fetch(`${API_BASE}/api/documents/bulk/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        document_ids: documentIds.slice(0, 2),
        updates: {
          tags: ['estate_planning', 'bulk_updated'],
          priority: 'high'
        }
      })
    });

    expect(bulkUpdateResponse.status).toBe(200);
    const bulkResult = await bulkUpdateResponse.json();
    
    expect(bulkResult.updated_count).toBe(2);
    expect(bulkResult.failed_count).toBe(0);
    
    // Verify updates applied
    const verifyResponse = await fetch(`${API_BASE}/api/documents/${documentIds[0]}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });
    
    const updatedDoc = await verifyResponse.json();
    expect(updatedDoc.tags).toContain('bulk_updated');
    expect(updatedDoc.priority).toBe('high');
  });

  it('should provide search analytics and insights', async () => {
    const analyticsResponse = await fetch(`${API_BASE}/api/search/analytics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        date_range: {
          start: '2025-09-01',
          end: '2025-09-18'
        },
        include_query_patterns: true,
        include_content_gaps: true
      })
    });

    expect(analyticsResponse.status).toBe(200);
    const analytics = await analyticsResponse.json();
    
    expect(analytics.total_searches).toBeGreaterThan(0);
    expect(analytics.popular_queries).toBeDefined();
    expect(analytics.content_coverage).toBeDefined();
    expect(analytics.search_patterns).toBeDefined();
    
    // Verify query pattern analysis
    expect(Array.isArray(analytics.popular_queries)).toBe(true);
    if (analytics.popular_queries.length > 0) {
      expect(analytics.popular_queries[0]).toHaveProperty('query');
      expect(analytics.popular_queries[0]).toHaveProperty('count');
    }
  });

  it('should support export of search results', async () => {
    // Export search results to various formats
    const exportResponse = await fetch(`${API_BASE}/api/search/documents/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        query: {
          filters: {
            practice_area: ['estate_planning']
          }
        },
        format: 'csv',
        include_fields: ['title', 'document_type', 'status', 'created_at', 'matter_name'],
        include_metadata: true
      })
    });

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get('content-type')).toContain('text/csv');
    
    const csvContent = await exportResponse.text();
    expect(csvContent).toContain('title,document_type,status');
    expect(csvContent.split('\n').length).toBeGreaterThan(1);
  });

  it('should handle complex nested queries and boolean logic', async () => {
    const complexQueryResponse = await fetch(`${API_BASE}/api/search/documents/advanced`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { match: { practice_area: 'estate_planning' } }
            ],
            should: [
              { match: { document_type: 'trust' } },
              { match: { document_type: 'will' } }
            ],
            must_not: [
              { match: { status: 'archived' } }
            ],
            filter: [
              { range: { created_at: { gte: '2025-01-01' } } }
            ]
          }
        },
        min_score: 0.5
      })
    });

    expect(complexQueryResponse.status).toBe(200);
    const complexResults = await complexQueryResponse.json();
    
    expect(complexResults.documents).toBeDefined();
    expect(complexResults.query_explanation).toBeDefined();
    
    // Verify boolean logic applied correctly
    complexResults.documents.forEach((doc: { practice_area: string; status: string; document_type: string }) => {
      expect(doc.practice_area).toBe('estate_planning');
      expect(doc.status).not.toBe('archived');
      expect(['trust', 'will']).toContain(doc.document_type);
    });
  });
});

export {};