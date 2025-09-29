/**
 * Document Search API - Advanced search functionality
 * T018: App integration layer for Document Management System
 */

import { NextRequest } from 'next/server';
import { SearchService, DocumentSearchParams, DocumentConfidentialityLevel, DocumentType, DocumentStatus, PriorityLevel, AdvancedSearchParams } from '@jurisagentis/document-management';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client for the search service
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize search service
const searchService = new SearchService(supabase);

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const query = url.searchParams.get('query') || '';
    const matter_id = url.searchParams.get('matter_id') || undefined;
    const client_id = url.searchParams.get('client_id') || undefined;
    const document_type = url.searchParams.getAll('document_type');
    const status = url.searchParams.getAll('status');
    const priority = url.searchParams.getAll('priority');
    const confidentiality_level = url.searchParams.get('confidentiality_level') as DocumentConfidentialityLevel | null;
    const tags = url.searchParams.getAll('tags');
    const created_after = url.searchParams.get('created_after');
    const created_before = url.searchParams.get('created_before');
    const updated_after = url.searchParams.get('updated_after');
    const updated_before = url.searchParams.get('updated_before');
    const created_by = url.searchParams.get('created_by') || undefined;
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const sort_by = url.searchParams.get('sort_by') || 'created_at';
    const sort_order = url.searchParams.get('sort_order') as 'asc' | 'desc' || 'desc';
    const include_archived = url.searchParams.get('include_archived') === 'true';

    // Advanced search options
    const enable_semantic = url.searchParams.get('enable_semantic') === 'true';
    const similarity_threshold = parseFloat(url.searchParams.get('similarity_threshold') || '0.7');
    const facets = url.searchParams.getAll('facets');

    // Advanced search options
    const search_fields = url.searchParams.getAll('search_fields') as ('title' | 'content' | 'description' | 'tags')[];
    const highlight = url.searchParams.get('highlight') === 'true';
    const file_size_min = url.searchParams.get('file_size_min') ? parseInt(url.searchParams.get('file_size_min')!) : undefined;
    const file_size_max = url.searchParams.get('file_size_max') ? parseInt(url.searchParams.get('file_size_max')!) : undefined;
    const has_signature_request = url.searchParams.get('has_signature_request') === 'true' ? true : 
                                 url.searchParams.get('has_signature_request') === 'false' ? false : undefined;
    const has_comments = url.searchParams.get('has_comments') === 'true' ? true :
                        url.searchParams.get('has_comments') === 'false' ? false : undefined;
    const shared_with_clients = url.searchParams.get('shared_with_clients') === 'true' ? true :
                               url.searchParams.get('shared_with_clients') === 'false' ? false : undefined;
    const boost_recent = url.searchParams.get('boost_recent') === 'true';
    const boost_priority = url.searchParams.get('boost_priority') === 'true';
    const relevance_threshold = url.searchParams.get('relevance_threshold') ? 
                               parseFloat(url.searchParams.get('relevance_threshold')!) : undefined;

    // Build search parameters
    const searchParams: AdvancedSearchParams = {
      query,
      matter_id,
      client_id,
      document_type: document_type.length > 0 ? document_type as DocumentType[] : undefined,
      status: status.length > 0 ? status as DocumentStatus[] : undefined,
      priority: priority.length > 0 ? priority as PriorityLevel[] : undefined,
      confidentiality_level,
      include_archived,
      tags: tags.length > 0 ? tags : undefined,
      created_after: created_after ? new Date(created_after) : undefined,
      created_before: created_before ? new Date(created_before) : undefined,
      updated_after: updated_after ? new Date(updated_after) : undefined,
      updated_before: updated_before ? new Date(updated_before) : undefined,
      created_by,
      limit: Math.max(Math.min(limit, 100), 1), // Cap at 100
      offset,
      sort_by,
      sort_order,
      enable_semantic,
      similarity_threshold,
      facets: facets.length > 0 ? facets : undefined,
      // Advanced search parameters
      search_fields: search_fields.length > 0 ? search_fields : undefined,
      highlight,
      file_size_min,
      file_size_max,
      has_signature_request,
      has_comments,
      shared_with_clients,
      boost_recent,
      boost_priority,
      relevance_threshold
    };

    // Perform search using our library
    const result = await searchService.searchDocuments(searchParams);

    // Log audit event
    await logAuditEvent(
      'document_search',
      user.uid,
      request,
      { 
        query,
        filters: {
          matter_id,
          client_id,
          document_type,
          status,
          priority,
          confidentiality_level,
          tags
        },
        result_count: result.documents.length,
        execution_time_ms: result.execution_time_ms
      }
    );

    return addCORSHeaders(createSuccessResponse({
      documents: result.documents,
      total: result.total,
      facets: result.facets,
      suggestions: result.suggestions,
      execution_time_ms: result.execution_time_ms,
      pagination: {
        limit,
        offset,
        has_more: (offset + limit) < result.total
      }
    }));

  } catch (error: unknown) {
    console.error('Document search error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Search failed',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}