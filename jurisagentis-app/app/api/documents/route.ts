/**
 * Documents API - Core document management using @jurisagentis/document-management
 * T018: App integration layer for Document Management System
 */

import { NextRequest } from 'next/server';
import { DocumentService, DocumentType, DocumentStatus, DocumentConfidentialityLevel } from '@jurisagentis/document-management';
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

interface CreateDocumentRequest {
  matter_id: string;
  template_id?: string;
  title: string;
  description?: string;
  document_type: DocumentType;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  confidentiality_level?: DocumentConfidentialityLevel;
  tags?: string[];
  due_date?: string;
  auto_populated_fields?: Record<string, unknown>;
  client_id?: string;
}

export async function POST(request: NextRequest) {
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
    
    // Parse request body
    const documentData = await parseRequestBody<CreateDocumentRequest>(request);

    // Validate required fields
    if (!documentData.matter_id || !documentData.title || !documentData.document_type) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'matter_id, title, and document_type are required',
        400
      ));
    }

    // Create document using our library
    const document = await documentService.createDocument({
      matter_id: documentData.matter_id,
      template_id: documentData.template_id,
      title: documentData.title,
      description: documentData.description,
      document_type: documentData.document_type,
      priority: documentData.priority,
      confidentiality_level: documentData.confidentiality_level,
      tags: documentData.tags,
      due_date: documentData.due_date ? new Date(documentData.due_date) : undefined,
      auto_populated_fields: documentData.auto_populated_fields,
      created_by: user.uid,
      client_id: documentData.client_id
    });

    // Log audit event
    await logAuditEvent(
      'document_created',
      user.uid,
      request,
      { 
        document_id: document.id,
        matter_id: document.matter_id,
        document_type: document.document_type,
        title: document.title
      }
    );

    return addCORSHeaders(createSuccessResponse({
      document,
      message: 'Document created successfully'
    }));

  } catch (error) {
    console.error('Document creation error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to create document',
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
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || undefined;
    const matter_id = url.searchParams.get('matter_id') || undefined;
    const client_id = url.searchParams.get('client_id') || undefined;
    const document_type = url.searchParams.get('document_type') as DocumentType | null;
    const status = url.searchParams.get('status') as DocumentStatus | null;
    const confidentiality_level = url.searchParams.get('confidentiality_level') as DocumentConfidentialityLevel | null;
    const include_archived = url.searchParams.get('include_archived') === 'true';

    // List documents using our library
    const result = await documentService.listDocuments({
      page: Math.max(page, 1),
      limit: Math.max(Math.min(limit, 100), 1), // Cap at 100
      search,
      matter_id,
      client_id,
      document_type,
      status,
      confidentiality_level,
      include_archived
    });

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'documents',
        action: 'list',
        filters: { matter_id, client_id, document_type, status },
        result_count: result.documents.length
      }
    );

    return addCORSHeaders(createSuccessResponse({
      documents: result.documents,
      pagination: {
        page,
        limit,
        total: result.total,
        has_more: (page * limit) < result.total
      }
    }));

  } catch (error) {
    console.error('Documents list error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve documents',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}