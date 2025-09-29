/**
 * Document Transformation API - Format conversion and processing
 * T075: Document transformation pipeline API
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { documentTransformationPipeline } from '@/lib/middleware/document-transformation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface TransformRequest {
  document_id: string;
  target_format: string;
  options?: {
    pdf_quality?: 'high' | 'medium' | 'low';
    pdf_compression?: boolean;
    pdf_watermark?: {
      text: string;
      opacity: number;
      position: 'center' | 'bottom-right' | 'top-left';
    };
    thumbnail_size?: { width: number; height: number };
    thumbnail_quality?: number;
    image_format?: 'jpeg' | 'png' | 'webp';
    docx_include_images?: boolean;
    docx_preserve_formatting?: boolean;
    html_include_styles?: boolean;
    html_responsive?: boolean;
    preserve_metadata?: boolean;
    output_filename?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse request body
    const requestData = await parseRequestBody<TransformRequest>(request);
    
    // Validate required fields
    if (!requestData.document_id || !requestData.target_format) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'document_id and target_format are required',
        400
      ));
    }
    
    // Get document information
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id, title, file_path, file_name, mime_type')
      .eq('id', requestData.document_id)
      .single();
    
    if (docError || !document) {
      return addCORSHeaders(createErrorResponse(
        'DOCUMENT_NOT_FOUND',
        `Document ${requestData.document_id} not found`,
        404
      ));
    }
    
    // Check if file exists in storage
    if (!document.file_path) {
      return addCORSHeaders(createErrorResponse(
        'NO_FILE_ATTACHED',
        'Document has no file attached',
        400
      ));
    }
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_path);
    
    if (downloadError || !fileData) {
      return addCORSHeaders(createErrorResponse(
        'FILE_DOWNLOAD_FAILED',
        `Failed to download file: ${downloadError?.message || 'File not found'}`,
        500
      ));
    }
    
    // Convert file to buffer
    const fileBuffer = Buffer.from(await fileData.arrayBuffer());
    
    // Validate supported formats
    const supportedFormats = ['pdf', 'docx', 'html', 'txt', 'jpeg', 'png', 'webp'];
    if (!supportedFormats.includes(requestData.target_format)) {
      return addCORSHeaders(createErrorResponse(
        'UNSUPPORTED_FORMAT',
        `Target format '${requestData.target_format}' is not supported. Supported formats: ${supportedFormats.join(', ')}`,
        400
      ));
    }
    
    // Perform transformation
    const result = await documentTransformationPipeline.transformDocument(
      requestData.document_id,
      fileBuffer,
      document.mime_type,
      requestData.target_format,
      requestData.options || {}
    );
    
    // Log audit event
    await logAuditEvent(
      'document_transformed',
      user.uid,
      request,
      {
        document_id: requestData.document_id,
        source_format: document.mime_type,
        target_format: requestData.target_format,
        job_id: result.job_id,
        success: result.success,
        processing_time_ms: result.processing_time_ms,
        output_file_size: result.output_file_size
      }
    );
    
    if (result.success) {
      return addCORSHeaders(createSuccessResponse({
        job_id: result.job_id,
        document_id: requestData.document_id,
        source_format: document.mime_type,
        target_format: requestData.target_format,
        output_file_path: result.output_file_path,
        output_file_size: result.output_file_size,
        thumbnail_path: result.thumbnail_path,
        processing_time_ms: result.processing_time_ms,
        metadata: result.metadata,
        download_url: result.output_file_path ? 
          supabase.storage.from('documents').getPublicUrl(result.output_file_path).data.publicUrl : 
          null,
        message: `Document successfully transformed to ${requestData.target_format}`
      }));
    } else {
      return addCORSHeaders(createErrorResponse(
        'TRANSFORMATION_FAILED',
        result.error || 'Document transformation failed',
        500
      ));
    }
    
  } catch (error) {
    console.error('Document transformation error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to transform document';
    return addCORSHeaders(createErrorResponse(
      'TRANSFORMATION_ERROR',
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
    const documentId = url.searchParams.get('document_id');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    if (jobId) {
      // Get specific transformation job
      const { data: job, error } = await supabase
        .from('transformation_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();
      
      if (error || !job) {
        return addCORSHeaders(createErrorResponse(
          'JOB_NOT_FOUND',
          `Transformation job ${jobId} not found`,
          404
        ));
      }
      
      return addCORSHeaders(createSuccessResponse({
        job_id: job.job_id,
        document_id: job.document_id,
        source_format: job.source_format,
        target_format: job.target_format,
        status: job.status,
        options: job.options,
        result_file_path: job.result_file_path,
        result_file_size: job.result_file_size,
        error_message: job.error_message,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        download_url: job.result_file_path ? 
          supabase.storage.from('documents').getPublicUrl(job.result_file_path).data.publicUrl : 
          null
      }));
    }
    
    // Build query for listing jobs
    let query = supabase
      .from('transformation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));
    
    if (documentId) {
      query = query.eq('document_id', documentId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: jobs, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get transformation jobs: ${error.message}`);
    }
    
    // Add download URLs
    const jobsWithUrls = (jobs || []).map(job => ({
      ...job,
      download_url: job.result_file_path ? 
        supabase.storage.from('documents').getPublicUrl(job.result_file_path).data.publicUrl : 
        null
    }));
    
    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      {
        resource: 'transformation_jobs',
        action: 'list',
        filters: { document_id: documentId, status },
        result_count: jobsWithUrls.length
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      jobs: jobsWithUrls,
      total: jobsWithUrls.length,
      filters: {
        document_id: documentId,
        status,
        limit
      },
      message: 'Transformation jobs retrieved successfully'
    }));
    
  } catch (error) {
    console.error('Get transformation jobs error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get transformation jobs';
    return addCORSHeaders(createErrorResponse(
      'GET_JOBS_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}