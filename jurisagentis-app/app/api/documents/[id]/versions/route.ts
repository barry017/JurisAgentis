/**
 * Document Versions API - Version management for documents
 * T018: App integration layer for Document Management System
 */

import { NextRequest } from 'next/server';
import { VersionService } from '@jurisagentis/document-management';
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

// Initialize Supabase client for the version service
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize version service
const versionService = new VersionService(supabase);

interface CreateVersionRequest {
  file_path: string;
  file_name: string;
  file_size: number;
  file_hash: string;
  change_summary: string;
  change_type?: 'minor' | 'major' | 'patch';
  branch_name?: string;
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
    const versionData = await parseRequestBody<CreateVersionRequest>(request);

    // Validate required fields
    if (!versionData.file_path || !versionData.file_name || !versionData.file_size || 
        !versionData.file_hash || !versionData.change_summary) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'file_path, file_name, file_size, file_hash, and change_summary are required',
        400
      ));
    }

    // Create version using our library
    const version = await versionService.createVersion(documentId, {
      file_path: versionData.file_path,
      file_name: versionData.file_name,
      file_size: versionData.file_size,
      file_hash: versionData.file_hash,
      change_summary: versionData.change_summary,
      change_type: versionData.change_type,
      branch_name: versionData.branch_name
    });

    // Log audit event
    await logAuditEvent(
      'document_version_created',
      user.uid,
      request,
      { 
        document_id: documentId,
        version_id: version.id,
        version_number: version.version_number,
        change_type: version.change_type,
        change_summary: version.change_summary
      }
    );

    return addCORSHeaders(createSuccessResponse({
      version,
      message: 'Document version created successfully'
    }));

  } catch (error: unknown) {
    console.error('Version creation error:', error);
    
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
      'Failed to create document version',
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
    const branchName = url.searchParams.get('branch') || 'main';

    // Get document versions using our library
    const versions = await versionService.getDocumentVersions(documentId, branchName);

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'document_versions',
        document_id: documentId,
        branch_name: branchName,
        result_count: versions.length
      }
    );

    return addCORSHeaders(createSuccessResponse({
      versions,
      document_id: documentId,
      branch_name: branchName
    }));

  } catch (error: unknown) {
    console.error('Document versions get error:', error);
    
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
      'Failed to retrieve document versions',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}