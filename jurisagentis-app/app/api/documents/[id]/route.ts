/**
 * Individual Document API - CRUD operations for specific documents
 * T018: App integration layer for Document Management System
 */

import { NextRequest } from 'next/server';
import { DocumentService, DocumentUpdateInput } from '@jurisagentis/document-management';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody,
  validateContentType
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client for the document service
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize document service
const documentService = new DocumentService(supabase);

interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  due_date?: string;
  client_notes?: string;
  confidentiality_level?: 'public' | 'internal' | 'client_confidential' | 'attorney_client_privileged';
  requires_signature?: boolean;
  completed_at?: string;
  signed_at?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    const { id: documentId } = await params;
    
    // Check if user wants versions included
    const url = new URL(request.url);
    const includeVersions = url.searchParams.get('include_versions') === 'true';

    // Get document using our library
    const document = includeVersions 
      ? await documentService.getDocumentWithVersions(documentId)
      : await documentService.getDocument(documentId);

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'document',
        document_id: documentId,
        action: 'view',
        include_versions: includeVersions
      }
    );

    return addCORSHeaders(createSuccessResponse({
      document
    }));

  } catch (error: unknown) {
    console.error('Document get error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }

    // Handle document not found
    if (error.name === 'DocumentNotFoundError') {
      return addCORSHeaders(createErrorResponse(
        'DOCUMENT_NOT_FOUND',
        `Document with ID ${documentId} not found`,
        404
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve document',
      500
    ));
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ));
    }

    // Get authenticated user
    const user = await authenticate(request);
    
    const { id: documentId } = await params;
    
    // Parse request body
    const updateData = await parseRequestBody<UpdateDocumentRequest>(request);

    // Convert string dates to Date objects
    const processedUpdateData: DocumentUpdateInput = { ...updateData };
    if (updateData.due_date) {
      processedUpdateData.due_date = new Date(updateData.due_date);
    }
    if (updateData.completed_at) {
      processedUpdateData.completed_at = new Date(updateData.completed_at);
    }
    if (updateData.signed_at) {
      processedUpdateData.signed_at = new Date(updateData.signed_at);
    }

    // Update document using our library
    const document = await documentService.updateDocument(documentId, processedUpdateData);

    // Log audit event
    await logAuditEvent(
      'document_updated',
      user.uid,
      request,
      { 
        document_id: documentId,
        updated_fields: Object.keys(updateData),
        previous_status: updateData.status,
        new_status: document.status
      }
    );

    return addCORSHeaders(createSuccessResponse({
      document,
      message: 'Document updated successfully'
    }));

  } catch (error: unknown) {
    console.error('Document update error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }

    // Handle document not found
    if (error.name === 'DocumentNotFoundError') {
      return addCORSHeaders(createErrorResponse(
        'DOCUMENT_NOT_FOUND',
        `Document with ID ${documentId} not found`,
        404
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to update document',
      500
    ));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    const { id: documentId } = await params;

    // Delete (archive) document using our library
    await documentService.deleteDocument(documentId, user.uid);

    // Log audit event
    await logAuditEvent(
      'document_deleted',
      user.uid,
      request,
      { 
        document_id: documentId,
        action: 'archive'
      }
    );

    return addCORSHeaders(createSuccessResponse({
      message: 'Document archived successfully'
    }));

  } catch (error: unknown) {
    console.error('Document delete error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }

    // Handle document not found
    if (error.name === 'DocumentNotFoundError') {
      return addCORSHeaders(createErrorResponse(
        'DOCUMENT_NOT_FOUND',
        `Document with ID ${documentId} not found`,
        404
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to archive document',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}