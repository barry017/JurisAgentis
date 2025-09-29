/**
 * Document Upload API - File upload with search indexing
 * T074: Document indexing and search middleware integration
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { processDocumentUpload } from '@/lib/middleware/document-processing';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_FILE',
        'No file provided in request',
        400
      ));
    }
    
    // Extract metadata from form data
    const metadata = {
      matter_id: formData.get('matter_id') as string,
      title: formData.get('title') as string || file.name,
      description: formData.get('description') as string || undefined,
      document_type: formData.get('document_type') as string || 'other',
      priority: formData.get('priority') as string || 'medium',
      confidentiality_level: formData.get('confidentiality_level') as string || 'client_confidential',
      tags: formData.get('tags') ? (formData.get('tags') as string).split(',').map(tag => tag.trim()) : [],
      due_date: formData.get('due_date') as string || undefined,
      client_id: formData.get('client_id') as string || undefined
    };
    
    // Validate required fields
    if (!metadata.matter_id) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'matter_id is required',
        400
      ));
    }
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return addCORSHeaders(createErrorResponse(
        'FILE_TOO_LARGE',
        `File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`,
        400
      ));
    }
    
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/html',
      'application/rtf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return addCORSHeaders(createErrorResponse(
        'UNSUPPORTED_FILE_TYPE',
        `File type ${file.type} is not supported. Allowed types: ${allowedTypes.join(', ')}`,
        400
      ));
    }
    
    // Process document upload with indexing
    const result = await processDocumentUpload(request, formData, metadata);
    
    // Log audit event
    await logAuditEvent(
      'document_uploaded',
      user.uid,
      request,
      {
        document_id: result.document_id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        matter_id: metadata.matter_id,
        indexing_success: result.indexing_result.success,
        content_length: result.indexing_result.content_length,
        entities_count: result.indexing_result.entities_count,
        keywords_count: result.indexing_result.keywords_count,
        processing_time_ms: result.indexing_result.processing_time_ms
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      document_id: result.document_id,
      file_path: result.file_path,
      indexing: {
        success: result.indexing_result.success,
        content_length: result.indexing_result.content_length,
        entities_extracted: result.indexing_result.entities_count,
        keywords_extracted: result.indexing_result.keywords_count,
        processing_time_ms: result.indexing_result.processing_time_ms,
        errors: result.indexing_result.errors
      },
      webhook_triggered: result.webhook_triggered,
      message: 'Document uploaded and indexed successfully'
    }));
    
  } catch (error) {
    console.error('Document upload error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload document';
    return addCORSHeaders(createErrorResponse(
      'UPLOAD_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}