/**
 * Batch Document Transformation API - Process multiple documents
 * T075: Document transformation pipeline - batch operations
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { documentTransformationPipeline, TransformationOptions } from '@/lib/middleware/document-transformation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface BatchTransformRequest {
  operations: Array<{
    document_id: string;
    target_format: string;
    options?: TransformationOptions;
  }>;
  batch_name?: string;
  notify_on_completion?: boolean;
  max_concurrent?: number;
}

interface BatchJob {
  id: string;
  name?: string;
  total_operations: number;
  completed_operations: number;
  failed_operations: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse request body
    const requestData = await parseRequestBody<BatchTransformRequest>(request);
    
    // Validate required fields
    if (!requestData.operations || requestData.operations.length === 0) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_OPERATIONS',
        'At least one operation is required',
        400
      ));
    }
    
    // Validate operations limit
    const maxOperations = 50;
    if (requestData.operations.length > maxOperations) {
      return addCORSHeaders(createErrorResponse(
        'TOO_MANY_OPERATIONS',
        `Maximum ${maxOperations} operations allowed per batch`,
        400
      ));
    }
    
    // Validate each operation
    const validationErrors: string[] = [];
    const supportedFormats = ['pdf', 'docx', 'html', 'txt', 'jpeg', 'png', 'webp'];
    
    requestData.operations.forEach((op, index) => {
      if (!op.document_id) {
        validationErrors.push(`Operation ${index + 1}: document_id is required`);
      }
      if (!op.target_format) {
        validationErrors.push(`Operation ${index + 1}: target_format is required`);
      } else if (!supportedFormats.includes(op.target_format)) {
        validationErrors.push(`Operation ${index + 1}: unsupported target_format '${op.target_format}'`);
      }
    });
    
    if (validationErrors.length > 0) {
      return addCORSHeaders(createErrorResponse(
        'VALIDATION_ERRORS',
        validationErrors.join('; '),
        400
      ));
    }
    
    // Create batch job
    const batchJob = await createBatchJob(
      requestData.batch_name,
      requestData.operations.length,
      user.uid
    );
    
    // Process transformations in background
    processBatchTransformations(
      batchJob.id,
      requestData.operations,
      requestData.max_concurrent || 3,
      user.uid,
      requestData.notify_on_completion || false
    ).catch(error => {
      console.error('Batch processing error:', error);
    });
    
    // Log audit event
    await logAuditEvent(
      'batch_transformation_started',
      user.uid,
      request,
      {
        batch_id: batchJob.id,
        batch_name: requestData.batch_name,
        operation_count: requestData.operations.length,
        max_concurrent: requestData.max_concurrent || 3
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      batch_id: batchJob.id,
      batch_name: batchJob.name,
      operation_count: batchJob.total_operations,
      status: batchJob.status,
      created_at: batchJob.created_at,
      message: 'Batch transformation job created and processing started'
    }));
    
  } catch (error) {
    console.error('Batch transformation error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to start batch transformation';
    return addCORSHeaders(createErrorResponse(
      'BATCH_TRANSFORMATION_FAILED',
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
    const batchId = url.searchParams.get('batch_id');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    if (batchId) {
      // Get specific batch job
      const { data: batch, error } = await supabase
        .from('batch_transformation_jobs')
        .select(`
          *,
          batch_transformation_operations (
            operation_id,
            document_id,
            target_format,
            status,
            result_file_path,
            error_message,
            created_at,
            completed_at
          )
        `)
        .eq('batch_id', batchId)
        .single();
      
      if (error || !batch) {
        return addCORSHeaders(createErrorResponse(
          'BATCH_NOT_FOUND',
          `Batch job ${batchId} not found`,
          404
        ));
      }
      
      // Calculate progress
      const operations = batch.batch_transformation_operations || [];
      const completed = operations.filter((op: any) => op.status === 'completed').length;
      const failed = operations.filter((op: any) => op.status === 'failed').length;
      const progress = operations.length > 0 ? Math.round((completed + failed) / operations.length * 100) : 0;
      
      return addCORSHeaders(createSuccessResponse({
        batch_id: batch.batch_id,
        batch_name: batch.batch_name,
        status: batch.status,
        progress: `${progress}%`,
        summary: {
          total_operations: batch.total_operations,
          completed_operations: completed,
          failed_operations: failed,
          pending_operations: operations.length - completed - failed
        },
        operations: operations.map((op: any) => ({
          operation_id: op.operation_id,
          document_id: op.document_id,
          target_format: op.target_format,
          status: op.status,
          result_file_path: op.result_file_path,
          download_url: op.result_file_path ? 
            supabase.storage.from('documents').getPublicUrl(op.result_file_path).data.publicUrl : 
            null,
          error_message: op.error_message,
          created_at: op.created_at,
          completed_at: op.completed_at
        })),
        created_at: batch.created_at,
        started_at: batch.started_at,
        completed_at: batch.completed_at
      }));
    }
    
    // List batch jobs
    let query = supabase
      .from('batch_transformation_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 100));
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data: batches, error } = await query;
    
    if (error) {
      throw new Error(`Failed to get batch jobs: ${error.message}`);
    }
    
    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      {
        resource: 'batch_transformation_jobs',
        action: 'list',
        filters: { status },
        result_count: batches?.length || 0
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      batches: batches || [],
      total: batches?.length || 0,
      filters: { status, limit },
      message: 'Batch jobs retrieved successfully'
    }));
    
  } catch (error) {
    console.error('Get batch jobs error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get batch jobs';
    return addCORSHeaders(createErrorResponse(
      'GET_BATCH_JOBS_FAILED',
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
    const batchId = url.searchParams.get('batch_id');
    
    if (!batchId) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_BATCH_ID',
        'batch_id parameter is required',
        400
      ));
    }
    
    // Get batch job
    const { data: batch, error: getBatchError } = await supabase
      .from('batch_transformation_jobs')
      .select('status')
      .eq('batch_id', batchId)
      .single();
    
    if (getBatchError || !batch) {
      return addCORSHeaders(createErrorResponse(
        'BATCH_NOT_FOUND',
        `Batch job ${batchId} not found`,
        404
      ));
    }
    
    // Only allow cancellation of pending or processing jobs
    if (!['pending', 'processing'].includes(batch.status)) {
      return addCORSHeaders(createErrorResponse(
        'CANNOT_CANCEL_BATCH',
        `Cannot cancel batch job with status '${batch.status}'`,
        400
      ));
    }
    
    // Update batch status to cancelled
    const { error: updateError } = await supabase
      .from('batch_transformation_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: 'Cancelled by user'
      })
      .eq('batch_id', batchId);
    
    if (updateError) {
      throw new Error(`Failed to cancel batch job: ${updateError.message}`);
    }
    
    // Update pending operations to cancelled
    await supabase
      .from('batch_transformation_operations')
      .update({
        status: 'failed',
        error_message: 'Batch cancelled by user',
        completed_at: new Date().toISOString()
      })
      .eq('batch_id', batchId)
      .eq('status', 'pending');
    
    // Log audit event
    await logAuditEvent(
      'batch_transformation_cancelled',
      user.uid,
      request,
      {
        batch_id: batchId
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      batch_id: batchId,
      message: 'Batch job cancelled successfully'
    }));
    
  } catch (error) {
    console.error('Cancel batch job error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel batch job';
    return addCORSHeaders(createErrorResponse(
      'CANCEL_BATCH_FAILED',
      errorMessage,
      500
    ));
  }
}

/**
 * Create a new batch job record
 */
async function createBatchJob(
  batchName: string | undefined,
  operationCount: number,
  userId: string
): Promise<BatchJob> {
  const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const batch: BatchJob = {
    id: batchId,
    name: batchName,
    total_operations: operationCount,
    completed_operations: 0,
    failed_operations: 0,
    status: 'pending',
    created_at: new Date(),
    created_by: userId
  };
  
  const { error } = await supabase
    .from('batch_transformation_jobs')
    .insert({
      batch_id: batch.id,
      batch_name: batch.name,
      total_operations: batch.total_operations,
      completed_operations: batch.completed_operations,
      failed_operations: batch.failed_operations,
      status: batch.status,
      created_at: batch.created_at.toISOString(),
      created_by: batch.created_by
    });
  
  if (error) {
    throw new Error(`Failed to create batch job: ${error.message}`);
  }
  
  return batch;
}

/**
 * Process batch transformations in background
 */
async function processBatchTransformations(
  batchId: string,
  operations: Array<{
    document_id: string;
    target_format: string;
    options?: TransformationOptions;
  }>,
  maxConcurrent: number,
  userId: string,
  notifyOnCompletion: boolean
): Promise<void> {
  try {
    // Update batch status to processing
    await supabase
      .from('batch_transformation_jobs')
      .update({
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('batch_id', batchId);
    
    // Create operation records
    const operationRecords = operations.map((op, index) => ({
      batch_id: batchId,
      operation_id: `${batchId}_op_${index + 1}`,
      document_id: op.document_id,
      target_format: op.target_format,
      options: op.options || {},
      status: 'pending',
      created_at: new Date().toISOString()
    }));
    
    await supabase
      .from('batch_transformation_operations')
      .insert(operationRecords);
    
    // Process operations with concurrency limit
    const semaphore = new Array(maxConcurrent).fill(null);
    let completedCount = 0;
    let failedCount = 0;
    
    const processOperation = async (operation: typeof operations[0], operationId: string) => {
      try {
        // Get document
        const { data: document } = await supabase
          .from('documents')
          .select('file_path, mime_type')
          .eq('id', operation.document_id)
          .single();
        
        if (!document?.file_path) {
          throw new Error('Document file not found');
        }
        
        // Download file
        const { data: fileData } = await supabase.storage
          .from('documents')
          .download(document.file_path);
        
        if (!fileData) {
          throw new Error('Failed to download document file');
        }
        
        const fileBuffer = Buffer.from(await fileData.arrayBuffer());
        
        // Transform document
        const result = await documentTransformationPipeline.transformDocument(
          operation.document_id,
          fileBuffer,
          document.mime_type,
          operation.target_format,
          operation.options || {}
        );
        
        // Update operation record
        await supabase
          .from('batch_transformation_operations')
          .update({
            status: result.success ? 'completed' : 'failed',
            result_file_path: result.output_file_path,
            result_file_size: result.output_file_size,
            error_message: result.error,
            completed_at: new Date().toISOString()
          })
          .eq('operation_id', operationId);
        
        if (result.success) {
          completedCount++;
        } else {
          failedCount++;
        }
        
      } catch (error) {
        failedCount++;
        
        await supabase
          .from('batch_transformation_operations')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('operation_id', operationId);
      }
    };
    
    // Process operations with concurrency control
    const promises = operations.map(async (operation, index) => {
      const operationId = operationRecords[index].operation_id;
      return processOperation(operation, operationId);
    });
    
    // Execute with concurrency limit
    for (let i = 0; i < promises.length; i += maxConcurrent) {
      const batch = promises.slice(i, i + maxConcurrent);
      await Promise.all(batch);
    }
    
    // Update batch job completion
    const finalStatus = failedCount === 0 ? 'completed' : failedCount === operations.length ? 'failed' : 'completed';
    
    await supabase
      .from('batch_transformation_jobs')
      .update({
        status: finalStatus,
        completed_operations: completedCount,
        failed_operations: failedCount,
        completed_at: new Date().toISOString()
      })
      .eq('batch_id', batchId);
    
  } catch (error) {
    console.error('Batch processing failed:', error);
    
    await supabase
      .from('batch_transformation_jobs')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Batch processing failed',
        completed_at: new Date().toISOString()
      })
      .eq('batch_id', batchId);
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}