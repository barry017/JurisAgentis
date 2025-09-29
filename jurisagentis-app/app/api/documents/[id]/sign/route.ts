/**
 * Document Signing API - Initiate and manage document signing
 * T076: E-signature library integration
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { eSignatureIntegration, DocumentSigningRequest } from '@/lib/middleware/e-signature-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse request body
    const requestData = await parseRequestBody<Omit<DocumentSigningRequest, 'document_id'>>(request);
    
    // Validate required fields
    if (!requestData.signers || requestData.signers.length === 0) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_SIGNERS',
        'At least one signer is required',
        400
      ));
    }
    
    // Validate signers
    const validationErrors: string[] = [];
    requestData.signers.forEach((signer, index) => {
      if (!signer.name || !signer.email) {
        validationErrors.push(`Signer ${index + 1}: name and email are required`);
      }
      if (!signer.signing_order || signer.signing_order < 1) {
        validationErrors.push(`Signer ${index + 1}: valid signing_order is required`);
      }
    });
    
    if (validationErrors.length > 0) {
      return addCORSHeaders(createErrorResponse(
        'VALIDATION_ERRORS',
        validationErrors.join('; '),
        400
      ));
    }
    
    // Prepare signing request
    const signingRequest: DocumentSigningRequest = {
      document_id: params.id,
      signers: requestData.signers,
      signing_options: {
        subject: requestData.signing_options?.subject,
        message: requestData.signing_options?.message,
        signing_deadline: requestData.signing_options?.signing_deadline 
          ? new Date(requestData.signing_options.signing_deadline) 
          : undefined,
        require_id_verification: requestData.signing_options?.require_id_verification || false,
        sequential_signing: requestData.signing_options?.sequential_signing || false,
        remind_after_days: requestData.signing_options?.remind_after_days || 3,
        reminder_frequency: requestData.signing_options?.reminder_frequency || 'every_2_days',
        max_reminders: requestData.signing_options?.max_reminders || 3,
        use_embedded_signing: requestData.signing_options?.use_embedded_signing || false,
        return_url: requestData.signing_options?.return_url
      },
      workflow_options: {
        auto_start: requestData.workflow_options?.auto_start !== false,
        notify_on_completion: requestData.workflow_options?.notify_on_completion !== false,
        create_audit_trail: requestData.workflow_options?.create_audit_trail !== false,
        update_document_status: requestData.workflow_options?.update_document_status !== false
      }
    };
    
    // Initiate signing workflow
    const result = await eSignatureIntegration.initiateDocumentSigning(
      signingRequest,
      user.uid
    );
    
    // Log audit event
    await logAuditEvent(
      'document_signing_initiated',
      user.uid,
      request,
      {
        document_id: params.id,
        signature_request_id: result.signature_request_id,
        docusign_envelope_id: result.docusign_envelope_id,
        signers_count: requestData.signers.length,
        sequential_signing: signingRequest.signing_options?.sequential_signing,
        embedded_signing: signingRequest.signing_options?.use_embedded_signing
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      signature_request_id: result.signature_request_id,
      docusign_envelope_id: result.docusign_envelope_id,
      status: result.status,
      signing_urls: result.signing_urls,
      sender_view_url: result.sender_view_url,
      workflow_id: result.workflow_id,
      estimated_completion: result.estimated_completion,
      signers_count: requestData.signers.length,
      next_steps: result.signing_urls.length > 0 
        ? 'Share signing URLs with signers or embed signing experience'
        : 'Signers will receive email notifications to sign',
      message: 'Document signing workflow initiated successfully'
    }));
    
  } catch (error) {
    console.error('Document signing initiation error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to initiate document signing';
    return addCORSHeaders(createErrorResponse(
      'SIGNING_INITIATION_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const signatureRequestId = url.searchParams.get('signature_request_id');
    const includeAuditEvents = url.searchParams.get('include_audit_events') === 'true';
    
    // Get signing status
    const statuses = await eSignatureIntegration.getDocumentSigningStatus(
      params.id,
      signatureRequestId || undefined
    );
    
    if (statuses.length === 0) {
      return addCORSHeaders(createErrorResponse(
        'NO_SIGNING_REQUESTS',
        'No signing requests found for this document',
        404
      ));
    }
    
    // Filter audit events if not requested
    const filteredStatuses = statuses.map(status => ({
      ...status,
      audit_events: includeAuditEvents ? status.audit_events : []
    }));
    
    // Log audit event
    await logAuditEvent(
      'document_signing_status_accessed',
      user.uid,
      request,
      {
        document_id: params.id,
        signature_request_id: signatureRequestId,
        statuses_count: statuses.length,
        include_audit_events: includeAuditEvents
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      document_id: params.id,
      signing_requests: filteredStatuses,
      summary: {
        total_requests: statuses.length,
        completed_requests: statuses.filter(s => s.overall_status === 'completed').length,
        pending_requests: statuses.filter(s => 
          ['sent', 'delivered', 'signed'].includes(s.overall_status)
        ).length,
        cancelled_requests: statuses.filter(s => 
          ['voided', 'expired', 'declined'].includes(s.overall_status)
        ).length
      },
      message: 'Document signing status retrieved successfully'
    }));
    
  } catch (error) {
    console.error('Get document signing status error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to get signing status';
    return addCORSHeaders(createErrorResponse(
      'GET_SIGNING_STATUS_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse query parameters
    const url = new URL(request.url);
    const signatureRequestId = url.searchParams.get('signature_request_id');
    const reason = url.searchParams.get('reason') || 'Cancelled by user';
    
    if (!signatureRequestId) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_SIGNATURE_REQUEST_ID',
        'signature_request_id parameter is required',
        400
      ));
    }
    
    // Cancel signing workflow
    await eSignatureIntegration.cancelSigningWorkflow(
      signatureRequestId,
      reason,
      user.uid
    );
    
    // Log audit event
    await logAuditEvent(
      'document_signing_cancelled',
      user.uid,
      request,
      {
        document_id: params.id,
        signature_request_id: signatureRequestId,
        reason: reason
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      document_id: params.id,
      signature_request_id: signatureRequestId,
      status: 'cancelled',
      reason: reason,
      message: 'Document signing workflow cancelled successfully'
    }));
    
  } catch (error) {
    console.error('Cancel document signing error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel document signing';
    return addCORSHeaders(createErrorResponse(
      'CANCEL_SIGNING_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}