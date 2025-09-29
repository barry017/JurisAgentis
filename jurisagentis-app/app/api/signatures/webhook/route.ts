/**
 * Signature Webhook API - Process DocuSign webhook events
 * T076: E-signature library integration
 */

import { NextRequest } from 'next/server';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders
} from '@/lib/api/response';
import { logAuditEvent } from '@/lib/auth/middleware';
import { eSignatureIntegration } from '@/lib/middleware/e-signature-integration';

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-docusign-signature-1') || 
                     request.headers.get('x-signature') || 
                     '';
    
    if (!signature) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_SIGNATURE',
        'Webhook signature is required',
        400
      ));
    }
    
    // Parse webhook payload
    const payload = await request.json();
    
    if (!payload) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_PAYLOAD',
        'Webhook payload is required',
        400
      ));
    }
    
    // Process webhook with integration middleware
    const result = await eSignatureIntegration.processSigningWebhook(
      payload,
      signature,
      'webhook_system' // System user for webhook processing
    );
    
    // Log webhook processing
    await logAuditEvent(
      'webhook_processed',
      'webhook_system',
      request,
      {
        envelope_id: payload.envelopeId || payload.data?.envelopeId,
        event_type: payload.event || payload.eventType,
        processed: result.processed,
        signature_request_id: result.signature_request_id
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      processed: result.processed,
      signature_request_id: result.signature_request_id,
      event_type: payload.event || payload.eventType,
      envelope_id: payload.envelopeId || payload.data?.envelopeId,
      message: 'Webhook processed successfully'
    }));
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // For webhook errors, we still want to return 200 to prevent retries
    // but log the error for investigation
    await logAuditEvent(
      'webhook_processing_error',
      'webhook_system',
      request,
      {
        error_message: error instanceof Error ? error.message : 'Unknown error',
        error_type: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    ).catch(auditError => {
      console.error('Failed to log webhook error:', auditError);
    });
    
    // Return success to prevent webhook retries, but include error details
    return addCORSHeaders(createSuccessResponse({
      processed: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Webhook received but processing failed'
    }));
  }
}

// Handle DocuSign webhook verification (GET request)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const challenge = url.searchParams.get('challenge');
    
    if (challenge) {
      // DocuSign webhook verification - echo back the challenge
      return new Response(challenge, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }
    
    return addCORSHeaders(createSuccessResponse({
      status: 'webhook_endpoint_active',
      message: 'Signature webhook endpoint is operational'
    }));
    
  } catch (error) {
    console.error('Webhook verification error:', error);
    
    return addCORSHeaders(createErrorResponse(
      'WEBHOOK_VERIFICATION_FAILED',
      error instanceof Error ? error.message : 'Verification failed',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}