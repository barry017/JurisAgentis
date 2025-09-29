/**
 * Signature Request Reminder API Route - Send reminders to signers
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
import { eSignatureIntegration } from '@/lib/middleware/e-signature-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    // Parse optional request body
    const requestData = await parseRequestBody<{
      recipient_email?: string;
      custom_message?: string;
    }>(request).catch(() => ({}));
    
    // Send reminder
    const result = await eSignatureIntegration.sendSigningReminder(
      params.id,
      requestData.recipient_email,
      requestData.custom_message,
      user.uid
    );
    
    // Log audit event
    await logAuditEvent(
      'signature_reminder_sent',
      user.uid,
      request,
      {
        signature_request_id: params.id,
        recipient_email: requestData.recipient_email,
        has_custom_message: !!requestData.custom_message
      }
    );
    
    return addCORSHeaders(createSuccessResponse({
      signature_request_id: params.id,
      reminder_sent: result.reminder_sent,
      recipient_email: result.recipient_email,
      sent_at: result.sent_at,
      message: 'Signing reminder sent successfully'
    }));
    
  } catch (error) {
    console.error('Send reminder error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to send reminder';
    return addCORSHeaders(createErrorResponse(
      'REMINDER_SEND_FAILED',
      errorMessage,
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}