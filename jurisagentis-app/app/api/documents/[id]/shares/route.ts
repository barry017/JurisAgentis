/**
 * Document Sharing API - Share management for documents
 * T018: App integration layer for Document Management System
 */

import { NextRequest } from 'next/server';
import { SharingService } from '@jurisagentis/document-management';
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

// Initialize Supabase client for the sharing service
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize sharing service
const sharingService = new SharingService(supabase);

interface CreateShareRequest {
  recipient_email: string;
  share_type: 'client_portal' | 'external_link' | 'email_attachment' | 'secure_download';
  permissions: {
    can_view: boolean;
    can_download: boolean;
    can_comment: boolean;
    can_approve: boolean;
    can_print?: boolean;
  };
  expires_in_hours?: number;
  custom_message?: string;
  require_password?: boolean;
  password?: string;
  apply_watermark?: boolean;
  max_views?: number;
  max_downloads?: number;
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
    const shareData = await parseRequestBody<CreateShareRequest>(request);

    // Validate required fields
    if (!shareData.recipient_email || !shareData.share_type || !shareData.permissions) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'recipient_email, share_type, and permissions are required',
        400
      ));
    }

    // Create share using our library
    const share = await sharingService.createShare(documentId, {
      recipient_email: shareData.recipient_email,
      share_type: shareData.share_type,
      permissions: shareData.permissions,
      expires_in_hours: shareData.expires_in_hours,
      custom_message: shareData.custom_message,
      require_password: shareData.require_password,
      password: shareData.password,
      apply_watermark: shareData.apply_watermark,
      max_views: shareData.max_views,
      max_downloads: shareData.max_downloads
    });

    // Log audit event
    await logAuditEvent(
      'document_shared',
      user.uid,
      request,
      { 
        document_id: documentId,
        share_id: share.id,
        recipient_email: shareData.recipient_email,
        share_type: shareData.share_type,
        permissions: shareData.permissions,
        expires_in_hours: shareData.expires_in_hours
      }
    );

    return addCORSHeaders(createSuccessResponse({
      share,
      message: 'Document shared successfully'
    }));

  } catch (error: unknown) {
    console.error('Document share error:', error);
    
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
      'Failed to share document',
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

    // Get document shares using our library
    const shares = await sharingService.getDocumentShares(documentId);

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'document_shares',
        document_id: documentId,
        result_count: shares.length
      }
    );

    return addCORSHeaders(createSuccessResponse({
      shares,
      document_id: documentId
    }));

  } catch (error: unknown) {
    console.error('Document shares get error:', error);
    
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
      'Failed to retrieve document shares',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}