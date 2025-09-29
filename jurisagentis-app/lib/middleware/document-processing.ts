/**
 * Document Processing Middleware - Handles document uploads with indexing
 * T074: Document indexing and search middleware integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleDocumentIndexing, searchIndexingMiddleware } from './search-indexing';
import { DocumentService } from '@jurisagentis/document-management';
import { createClient } from '@supabase/supabase-js';
import { authenticate, logAuditEvent } from '@/lib/auth/middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const documentService = new DocumentService(supabase);

export interface DocumentUploadResult {
  document_id: string;
  file_path: string;
  indexing_result: {
    success: boolean;
    content_length: number;
    entities_count: number;
    keywords_count: number;
    processing_time_ms: number;
    errors?: string[];
  };
  webhook_triggered: boolean;
}

/**
 * Enhanced document upload middleware with real-time indexing
 */
export async function processDocumentUpload(
  request: NextRequest,
  formData: FormData,
  metadata: Record<string, any>
): Promise<DocumentUploadResult> {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Extract file from form data
    const file = formData.get('file') as File;
    if (!file) {
      throw new Error('No file provided');
    }
    
    // Validate file
    await validateFile(file);
    
    // Create document record first
    const document = await documentService.createDocument({
      matter_id: metadata.matter_id,
      title: metadata.title || file.name,
      description: metadata.description,
      document_type: metadata.document_type || 'other',
      status: 'draft',
      priority: metadata.priority || 'medium',
      confidentiality_level: metadata.confidentiality_level || 'client_confidential',
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      tags: metadata.tags || [],
      created_by: user.uid
    });
    
    // Get file buffer for processing
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Process file upload and indexing in parallel
    const [uploadResult, indexingResult] = await Promise.all([
      // Upload file to storage
      uploadFileToStorage(document.id, file, fileBuffer),
      
      // Index document content
      handleDocumentIndexing(
        document.id,
        file.name,
        fileBuffer,
        {
          ...metadata,
          user_id: user.uid,
          title: document.title,
          document_type: document.document_type
        }
      )
    ]);
    
    // Update document with file path
    await documentService.updateDocument(document.id, {
      file_path: uploadResult.file_path,
      file_hash: uploadResult.file_hash
    });
    
    // Trigger webhooks for document processing
    const webhookTriggered = await triggerDocumentWebhooks(document.id, 'document.uploaded');
    
    // Log audit event
    await logAuditEvent(
      'document_uploaded',
      user.uid,
      request,
      {
        document_id: document.id,
        file_name: file.name,
        file_size: file.size,
        indexing_success: indexingResult.success,
        processing_time_ms: indexingResult.processing_time_ms
      }
    );
    
    return {
      document_id: document.id,
      file_path: uploadResult.file_path,
      indexing_result: indexingResult,
      webhook_triggered: webhookTriggered
    };
    
  } catch (error) {
    throw new Error(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate uploaded file
 */
async function validateFile(file: File): Promise<void> {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/html',
    'application/rtf'
  ];
  
  if (file.size > maxSize) {
    throw new Error(`File size exceeds maximum limit of ${maxSize / (1024 * 1024)}MB`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not supported`);
  }
  
  // Additional validation for file content
  const fileName = file.name.toLowerCase();
  const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
  
  if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
    throw new Error('File type not allowed for security reasons');
  }
}

/**
 * Upload file to storage
 */
async function uploadFileToStorage(
  documentId: string,
  file: File,
  fileBuffer: Buffer
): Promise<{ file_path: string; file_hash: string }> {
  const timestamp = Date.now();
  const fileName = `${documentId}_${timestamp}_${file.name}`;
  const filePath = `documents/${new Date().getFullYear()}/${fileName}`;
  
  // Upload to Supabase storage
  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      metadata: {
        document_id: documentId,
        original_name: file.name
      }
    });
  
  if (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
  
  // Generate file hash
  const crypto = require('crypto');
  const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  
  return {
    file_path: filePath,
    file_hash: fileHash
  };
}

/**
 * Trigger webhooks for document processing events
 */
async function triggerDocumentWebhooks(documentId: string, event: string): Promise<boolean> {
  try {
    // Get active webhooks for this event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('event_type', event)
      .eq('is_active', true);
    
    if (error || !webhooks || webhooks.length === 0) {
      return false;
    }
    
    // Trigger webhooks asynchronously
    const webhookPromises = webhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.endpoint_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhook.secret_key || ''
          },
          body: JSON.stringify({
            event,
            document_id: documentId,
            timestamp: new Date().toISOString(),
            webhook_id: webhook.id
          })
        });
        
        // Log webhook result
        await supabase
          .from('webhook_logs')
          .insert({
            webhook_id: webhook.id,
            event_type: event,
            payload: { document_id: documentId },
            response_status: response.status,
            response_body: response.ok ? 'success' : await response.text(),
            created_at: new Date().toISOString()
          });
        
        return response.ok;
      } catch (error) {
        console.error(`Webhook ${webhook.id} failed:`, error);
        return false;
      }
    });
    
    const results = await Promise.all(webhookPromises);
    return results.some(result => result);
    
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    return false;
  }
}

/**
 * Middleware for handling document updates with re-indexing
 */
export async function processDocumentUpdate(
  request: NextRequest,
  documentId: string,
  updates: Record<string, any>
): Promise<void> {
  try {
    const user = await authenticate(request);
    
    // Update document
    await documentService.updateDocument(documentId, updates);
    
    // If content-related fields were updated, trigger re-indexing
    const contentFields = ['title', 'description', 'tags', 'content'];
    const hasContentUpdates = Object.keys(updates).some(key => 
      contentFields.includes(key)
    );
    
    if (hasContentUpdates) {
      // Update search index
      await searchIndexingMiddleware.updateDocumentIndex(documentId, {
        title: updates.title,
        content: updates.content,
        metadata: {
          description: updates.description,
          tags: updates.tags,
          updated_by: user.uid,
          updated_at: new Date().toISOString()
        }
      });
      
      // Trigger re-indexing webhook
      await triggerDocumentWebhooks(documentId, 'document.updated');
    }
    
    // Log audit event
    await logAuditEvent(
      'document_updated',
      user.uid,
      request,
      {
        document_id: documentId,
        updated_fields: Object.keys(updates),
        content_updated: hasContentUpdates
      }
    );
    
  } catch (error) {
    throw new Error(`Document update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Middleware for handling document deletion with index cleanup
 */
export async function processDocumentDeletion(
  request: NextRequest,
  documentId: string
): Promise<void> {
  try {
    const user = await authenticate(request);
    
    // Get document info before deletion
    const document = await documentService.getDocumentById(documentId);
    
    // Remove from search index
    await searchIndexingMiddleware.removeDocumentFromIndex(documentId);
    
    // Delete file from storage
    if (document.file_path) {
      await supabase.storage
        .from('documents')
        .remove([document.file_path]);
    }
    
    // Delete document record
    await documentService.deleteDocument(documentId);
    
    // Trigger deletion webhook
    await triggerDocumentWebhooks(documentId, 'document.deleted');
    
    // Log audit event
    await logAuditEvent(
      'document_deleted',
      user.uid,
      request,
      {
        document_id: documentId,
        title: document.title,
        file_path: document.file_path
      }
    );
    
  } catch (error) {
    throw new Error(`Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Background job for batch reindexing
 */
export async function processBatchReindexing(
  documentIds?: string[]
): Promise<{
  job_id: string;
  status: 'started' | 'completed' | 'failed';
  processed: number;
  successful: number;
  failed: number;
  errors?: string[];
}> {
  const jobId = `reindex_${Date.now()}`;
  
  try {
    // If no specific documents provided, get all documents
    if (!documentIds || documentIds.length === 0) {
      const { data: documents, error } = await supabase
        .from('documents')
        .select('id')
        .eq('status', 'active');
      
      if (error) {
        throw new Error(`Failed to get documents: ${error.message}`);
      }
      
      documentIds = documents?.map(doc => doc.id) || [];
    }
    
    // Start reindexing process
    const result = await searchIndexingMiddleware.reindexDocuments(documentIds);
    
    // Log job completion
    await supabase
      .from('background_jobs')
      .insert({
        job_id: jobId,
        job_type: 'document_reindexing',
        status: result.failed > 0 ? 'completed_with_errors' : 'completed',
        details: {
          processed: result.processed,
          successful: result.successful,
          failed: result.failed,
          errors: result.errors
        },
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    
    return {
      job_id: jobId,
      status: result.failed > 0 ? 'completed' : 'completed',
      processed: result.processed,
      successful: result.successful,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined
    };
    
  } catch (error) {
    await supabase
      .from('background_jobs')
      .insert({
        job_id: jobId,
        job_type: 'document_reindexing',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    
    return {
      job_id: jobId,
      status: 'failed',
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}