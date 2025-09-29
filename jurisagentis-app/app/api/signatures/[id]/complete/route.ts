/**
 * Signature Completion API - Complete signing workflow and finalize documents
 * T076: E-signature library integration
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { eSignatureIntegration } from '@/lib/middleware/e-signature-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Complete signing workflow
    const result = await eSignatureIntegration.completeSigningWorkflow(
      params.id,
      user.uid
    );
    
    // Log audit event
    await logAuditEvent(
      'signature_workflow_completed_manually',
      user.uid,
      request,
      {
        signature_request_id: params.id,
        signed_document_path: result.signed_document_path,
        audit_trail_path: result.audit_trail_path,
        completion_timestamp: result.completion_timestamp
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      signature_request_id: params.id,
      status: 'completed',
      signed_document_path: result.signed_document_path,
      audit_trail_path: result.audit_trail_path,
      completion_timestamp: result.completion_timestamp,
      message: 'Signing workflow completed successfully'
    }));
    
  } catch (error) {
    console.error('Complete signing workflow error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete signing workflow';
    return addCORSHeaders(createErrorResponse(
      'COMPLETION_FAILED',
      errorMessage,
      500
    ));
  }
}

// Get completion status and details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Get signing status to check completion
    const statuses = await eSignatureIntegration.getDocumentSigningStatus(
      '',  // We don't have document_id, but we can get by signature_request_id
      params.id
    );
    
    if (statuses.length === 0) {
      return addCORSHeaders(createErrorResponse(
        'SIGNATURE_REQUEST_NOT_FOUND',
        'Signature request not found',
        404
      ));
    }
    
    const status = statuses[0];
    
    // Log audit event
    await logAuditEvent(
      'signature_completion_status_checked',
      user.uid,
      request,
      {
        signature_request_id: params.id,
        overall_status: status.overall_status,
        completion_percentage: status.completion_percentage
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      signature_request_id: params.id,
      overall_status: status.overall_status,
      completion_percentage: status.completion_percentage,
      is_completed: status.overall_status === 'completed',
      signed_document_url: status.signed_document_url,
      completed_at: status.completed_at,
      signers: status.signers,
      message: 'Completion status retrieved successfully'
    }));
    
  } catch (error) {
    console.error('Get completion status error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get completion status';
    return addCORSHeaders(createErrorResponse(
      'GET_COMPLETION_STATUS_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}