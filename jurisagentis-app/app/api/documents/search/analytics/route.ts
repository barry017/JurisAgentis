/**
 * Search Analytics API - Insights and metrics for document search
 * T074: Document indexing and search middleware analytics
 */

import { NextRequest } from 'next/server';
import { SearchService } from '@jurisagentis/document-management';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';

// Initialize services
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const searchService = new SearchService(supabase);

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const dateRange = {
      start: url.searchParams.get('start_date') ? new Date(url.searchParams.get('start_date')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default to 30 days ago
      end: url.searchParams.get('end_date') ? new Date(url.searchParams.get('end_date')!) : new Date()
    };
    
    const includeDetails = url.searchParams.get('include_details') === 'true';
    
    // Get search analytics from the service
    const analytics = await searchService.getSearchAnalytics(dateRange);
    
    // Get additional analytics data
    const [
      recentSearches,
      searchTrends,
      indexStats
    ] = await Promise.all([
      includeDetails ? searchService.getRecentSearches(20) : Promise.resolve([]),
      getSearchTrends(dateRange),
      getIndexingStats()
    ]);
    
    // Calculate derived metrics
    const zeroResultRate = analytics.total_searches > 0 ? 
      (analytics.zero_result_queries.reduce((sum, q) => sum + q.count, 0) / analytics.total_searches * 100) : 0;
    
    const response = {
      period: {
        start_date: dateRange.start.toISOString(),
        end_date: dateRange.end.toISOString(),
        days: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
      },
      summary: {
        total_searches: analytics.total_searches,
        unique_queries: analytics.popular_queries.length,
        zero_result_rate: `${zeroResultRate.toFixed(1)}%`,
        avg_execution_time_ms: analytics.avg_execution_time_ms,
        searches_per_day: analytics.total_searches / Math.max(1, Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)))
      },
      popular_queries: analytics.popular_queries.slice(0, 10),
      zero_result_queries: analytics.zero_result_queries.slice(0, 10),
      search_patterns: analytics.search_patterns,
      trends: searchTrends,
      index_stats: indexStats
    };
    
    if (includeDetails) {
      response.recent_searches = recentSearches;
    }
    
    // Log audit event
    await logAuditEvent(
      'search_analytics_accessed',
      user.uid,
      request,
      {
        date_range: dateRange,
        include_details: includeDetails,
        total_searches: analytics.total_searches
      }
    );
    
    return addCORSHeaders(createSuccessResponse(response));
    
  } catch (error) {
    console.error('Search analytics error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get search analytics';
    return addCORSHeaders(createErrorResponse(
      'ANALYTICS_FAILED',
      errorMessage,
      500
    ));
  }
}

/**
 * Get search trends over time
 */
async function getSearchTrends(dateRange: { start: Date; end: Date }) {
  try {
    const { data, error } = await supabase
      .from('search_queries')
      .select('created_at, query_text, results_count')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())
      .order('created_at', { ascending: true });
    
    if (error) {
      throw new Error(`Failed to get search trends: ${error.message}`);
    }
    
    // Group by day
    const dailyStats = new Map<string, { searches: number; avg_results: number; total_results: number }>();
    
    (data || []).forEach(search => {
      const day = new Date(search.created_at).toISOString().split('T')[0];
      const existing = dailyStats.get(day) || { searches: 0, avg_results: 0, total_results: 0 };
      
      existing.searches += 1;
      existing.total_results += search.results_count || 0;
      existing.avg_results = existing.total_results / existing.searches;
      
      dailyStats.set(day, existing);
    });
    
    // Convert to array and sort
    return Array.from(dailyStats.entries())
      .map(([date, stats]) => ({
        date,
        searches: stats.searches,
        avg_results: Math.round(stats.avg_results * 10) / 10
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
  } catch (error) {
    console.error('Error getting search trends:', error);
    return [];
  }
}

/**
 * Get indexing statistics
 */
async function getIndexingStats() {
  try {
    const { data: indexStats, error } = await supabase
      .from('document_search_index')
      .select('document_id, content, keywords, indexed_at');
    
    if (error) {
      throw new Error(`Failed to get index stats: ${error.message}`);
    }
    
    const stats = {
      total_indexed_documents: indexStats?.length || 0,
      total_content_size: 0,
      total_keywords: 0,
      avg_keywords_per_doc: 0,
      last_indexed: null as string | null,
      index_health: 'good' as 'good' | 'warning' | 'error'
    };
    
    if (indexStats && indexStats.length > 0) {
      // Calculate content size and keywords
      indexStats.forEach(doc => {
        stats.total_content_size += (doc.content || '').length;
        stats.total_keywords += (doc.keywords || []).length;
      });
      
      stats.avg_keywords_per_doc = Math.round((stats.total_keywords / stats.total_indexed_documents) * 10) / 10;
      
      // Find most recent indexing
      const sortedByDate = indexStats
        .filter(doc => doc.indexed_at)
        .sort((a, b) => new Date(b.indexed_at).getTime() - new Date(a.indexed_at).getTime());
      
      if (sortedByDate.length > 0) {
        stats.last_indexed = sortedByDate[0].indexed_at;
      }
      
      // Determine index health
      const daysSinceLastIndex = stats.last_indexed ? 
        (Date.now() - new Date(stats.last_indexed).getTime()) / (1000 * 60 * 60 * 24) : null;
      
      if (daysSinceLastIndex === null || daysSinceLastIndex > 7) {
        stats.index_health = 'warning';
      } else if (daysSinceLastIndex > 14) {
        stats.index_health = 'error';
      }
    }
    
    return stats;
    
  } catch (error) {
    console.error('Error getting index stats:', error);
    return {
      total_indexed_documents: 0,
      total_content_size: 0,
      total_keywords: 0,
      avg_keywords_per_doc: 0,
      last_indexed: null,
      index_health: 'error' as const
    };
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}