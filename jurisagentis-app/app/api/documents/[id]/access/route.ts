/**
 * Document Access API - Access control management for documents
 * T018: App integration layer for Document Management System
 */

import { NextRequest } from 'next/server';
import { AccessService } from '@jurisagentis/document-management';
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

// Initialize Supabase client for the access service
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize access service
const accessService = new AccessService(supabase);

interface GrantAccessRequest {
  user_id: string;
  access_level: 'view' | 'comment' | 'edit' | 'manage';
  permissions?: {
    can_view?: boolean;
    can_download?: boolean;
    can_comment?: boolean;
    can_edit?: boolean;
    can_share?: boolean;
    can_manage?: boolean;
    can_approve?: boolean;
  };
  expires_at?: string;
  access_reason?: string;
}

export async function POST(
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
    const accessData = await parseRequestBody<GrantAccessRequest>(request);

    // Validate required fields
    if (!accessData.user_id || !accessData.access_level) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'user_id and access_level are required',
        400
      ));
    }

    // Grant access using our library
    const access = await accessService.grantAccess(documentId, {
      user_id: accessData.user_id,
      access_level: accessData.access_level,
      permissions: accessData.permissions,
      expires_at: accessData.expires_at ? new Date(accessData.expires_at) : undefined,
      access_reason: accessData.access_reason
    });

    // Log audit event
    await logAuditEvent(
      'document_access_granted',
      user.uid,
      request,
      { 
        document_id: documentId,
        access_id: access.id,
        granted_to: accessData.user_id,
        access_level: accessData.access_level,
        expires_at: accessData.expires_at,
        access_reason: accessData.access_reason
      }
    );

    return addCORSHeaders(createSuccessResponse({
      access,
      message: 'Document access granted successfully'
    }));

  } catch (error: unknown) {
    console.error('Access grant error:', error);
    
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
      'Failed to grant document access',
      500
    ));
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    const { id: documentId } = await params;
    
    // Parse query parameters
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');

    // Get document access using our library
    const accessRecords = userId 
      ? [await accessService.getUserAccess(documentId, userId)].filter(Boolean)
      : await accessService.getDocumentAccess(documentId);

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'document_access',
        document_id: documentId,
        user_id: userId,
        result_count: accessRecords.length
      }
    );

    return addCORSHeaders(createSuccessResponse({
      access_records: accessRecords,
      document_id: documentId
    }));

  } catch (error: unknown) {
    console.error('Document access get error:', error);
    
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
      'Failed to retrieve document access',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}