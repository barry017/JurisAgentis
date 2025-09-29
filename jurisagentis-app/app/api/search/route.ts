/**
 * Global Search API Route - Cross-entity search functionality
 * T069: Global search endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/lib/services/document-management';
import { z } from 'zod';

// Validation schemas
const GlobalSearchSchema = z.object({
  query: z.string().min(1),
  types: z.array(z.enum(['document', 'template', 'signature_request'])).optional(),
  filters: z.object({
    matter_id: z.string().uuid().optional(),
    document_type: z.array(z.string()).optional(),
    status: z.array(z.string()).optional(),
    created_after: z.string().datetime().optional(),
    created_before: z.string().datetime().optional(),
    created_by: z.string().uuid().optional(),
    tags: z.array(z.string()).optional()
  }).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0),
  sort_by: z.enum(['relevance', 'created_at', 'updated_at', 'title']).optional().default('relevance'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  highlight: z.boolean().optional().default(true),
  include_content: z.boolean().optional().default(false)
});

/**
 * GET /api/search - Global search across documents, templates, and signatures
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // Handle array parameters
    ['types', 'document_type', 'status', 'tags'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = queryParams[param].split(',');
      }
    });
    
    // Handle nested filter parameters
    const filters: Record<string, unknown> = {};
    Object.entries(queryParams).forEach(([key, value]) => {
      if (key.startsWith('filter_')) {
        const filterKey = key.replace('filter_', '');
        if (filterKey === 'document_type' || filterKey === 'status' || filterKey === 'tags') {
          filters[filterKey] = Array.isArray(value) ? value : [value];
        } else {
          filters[filterKey] = value;
        }
      }
    });

    if (Object.keys(filters).length > 0) {
      queryParams.filters = filters;
    }
    
    // Handle numeric parameters
    ['limit', 'offset'].forEach(param => {
      if (queryParams[param]) {
        queryParams[param] = parseInt(queryParams[param] as string);
      }
    });

    // Handle boolean parameters
    ['highlight', 'include_content'].forEach(param => {
      if (queryParams[param] !== undefined) {
        queryParams[param] = queryParams[param] === 'true';
      }
    });

    // Validate parameters
    const searchParams = GlobalSearchSchema.parse(queryParams);

    // Convert string dates to Date objects in filters
    if (searchParams.filters) {
      const filters = {
        ...searchParams.filters,
        created_after: searchParams.filters.created_after ? new Date(searchParams.filters.created_after) : undefined,
        created_before: searchParams.filters.created_before ? new Date(searchParams.filters.created_before) : undefined
      };
      searchParams.filters = filters;
    }

    // Execute search
    const result = await searchService.searchDocuments(searchParams);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Global search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/search - Advanced search with complex queries
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    // Validate input
    const validatedData = GlobalSearchSchema.parse(body);

    // Convert string dates to Date objects in filters
    if (validatedData.filters) {
      const filters = {
        ...validatedData.filters,
        created_after: validatedData.filters.created_after ? new Date(validatedData.filters.created_after) : undefined,
        created_before: validatedData.filters.created_before ? new Date(validatedData.filters.created_before) : undefined
      };
      validatedData.filters = filters;
    }

    // Execute search
    const result = await searchService.searchDocuments(validatedData);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('Advanced search error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Advanced search failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}