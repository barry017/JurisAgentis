/**
 * Document Reindexing API - Batch reindexing and search management
 * T074: Document indexing and search middleware
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { processBatchReindexing } from '@/lib/middleware/document-processing';
import { searchIndexingMiddleware } from '@/lib/middleware/search-indexing';

interface ReindexRequest {
  document_ids?: string[];
  reindex_all?: boolean;
  force_reindex?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse request body
    const requestData = await parseRequestBody<ReindexRequest>(request);
    
    // Validate request
    if (!requestData.reindex_all && (!requestData.document_ids || requestData.document_ids.length === 0)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_REQUEST',
        'Either reindex_all must be true or document_ids must be provided',
        400
      ));
    }
    
    // Determine which documents to reindex
    let documentIds: string[] | undefined;
    if (!requestData.reindex_all) {
      documentIds = requestData.document_ids;
    }
    
    // Start batch reindexing process
    const result = await processBatchReindexing(documentIds);
    
    // Log audit event
    await logAuditEvent(
      'documents_reindexed',
      user.uid,
      request,
      {
        job_id: result.job_id,
        reindex_all: requestData.reindex_all || false,
        document_count: documentIds?.length || 'all',
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        status: result.status
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      job_id: result.job_id,
      status: result.status,
      summary: {
        processed: result.processed,
        successful: result.successful,
        failed: result.failed,
        success_rate: result.processed > 0 ? (result.successful / result.processed * 100).toFixed(1) + '%' : '0%'
      },
      errors: result.errors,
      message: `Reindexing ${result.status}. Processed ${result.processed} documents.`
    }));
    
  } catch (error) {
    console.error('Document reindexing error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to start reindexing';
    return addCORSHeaders(createErrorResponse(
      'REINDEX_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    
    if (jobId) {
      // Get specific job status
      const { data: job, error } = await require('@supabase/supabase-js')
        .createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        .from('background_jobs')
        .select('*')
        .eq('job_id', jobId)
        .eq('job_type', 'document_reindexing')
        .single();
      
      if (error || !job) {
        return addCORSHeaders(createErrorResponse(
          'JOB_NOT_FOUND',
          `Reindexing job ${jobId} not found`,
          404
        ));
      }
      
      return addCORSHeaders(createSuccessResponse({
        job_id: job.job_id,
        status: job.status,
        created_at: job.created_at,
        completed_at: job.completed_at,
        details: job.details,
        error_message: job.error_message
      }));
    }
    
    // Get recent reindexing jobs
    const { data: jobs, error } = await require('@supabase/supabase-js')
      .createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      .from('background_jobs')
      .select('*')
      .eq('job_type', 'document_reindexing')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      throw new Error(`Failed to get reindexing jobs: ${error.message}`);
    }
    
    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      {
        resource: 'reindexing_jobs',
        action: 'list',
        result_count: jobs?.length || 0
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      jobs: jobs || [],
      message: 'Reindexing jobs retrieved successfully'
    }));
    
  } catch (error) {
    console.error('Get reindexing jobs error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get reindexing status';
    return addCORSHeaders(createErrorResponse(
      'GET_JOBS_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const documentId = url.searchParams.get('document_id');
    
    if (!documentId) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_DOCUMENT_ID',
        'document_id parameter is required',
        400
      ));
    }
    
    // Remove document from search index
    await searchIndexingMiddleware.removeDocumentFromIndex(documentId);
    
    // Log audit event
    await logAuditEvent(
      'document_deindexed',
      user.uid,
      request,
      {
        document_id: documentId
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      document_id: documentId,
      message: 'Document removed from search index successfully'
    }));
    
  } catch (error) {
    console.error('Document deindexing error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to remove document from index';
    return addCORSHeaders(createErrorResponse(
      'DEINDEX_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}