/**
 * Integration Test: E-Signature Workflow
 * T025: Scenario 4 - Complete DocuSign integration workflow
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: E-Signature Workflow', () => {
  let testDocumentId: string;
  let signatureRequestId: string;
  let docusignEnvelopeId: string;

  beforeAll(async () => {
    // Create test document ready for signing
    const createResponse = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        matter_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Smith Revocable Living Trust - Final',
        document_type: 'trust',
        status: 'ready_for_signature'
      })
    });

    const document = await createResponse.json();
    testDocumentId = document.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testDocumentId) {
      await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer test-token-attorney' }
      });
    }
  });

  it('should complete full e-signature workflow with multiple signers', async () => {
    // Step 1: Create signature request with multiple signers
    const signatureRequestResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/signature-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        signers: [
          {
            name: 'John Smith',
            email: 'john.smith@example.com',
            role: 'grantor',
            signing_order: 1,
            signature_fields: [
              { page: 1, x: 100, y: 200, type: 'signature' },
              { page: 1, x: 100, y: 250, type: 'date' }
            ]
          },
          {
            name: 'Jane Smith',
            email: 'jane.smith@example.com', 
            role: 'co-grantor',
            signing_order: 2,
            signature_fields: [
              { page: 1, x: 300, y: 200, type: 'signature' },
              { page: 1, x: 300, y: 250, type: 'date' }
            ]
          },
          {
            name: 'Mary Johnson',
            email: 'mary.johnson@example.com',
            role: 'successor_trustee',
            signing_order: 3,
            signature_fields: [
              { page: 2, x: 100, y: 300, type: 'signature' },
              { page: 2, x: 100, y: 350, type: 'date' }
            ]
          }
        ],
        message: 'Please review and sign your Revocable Living Trust documents.',
        signing_deadline: '2025-10-18',
        remind_after_days: 3,
        require_id_verification: true
      })
    });

    expect(signatureRequestResponse.status).toBe(201);
    const signatureRequest = await signatureRequestResponse.json();
    signatureRequestId = signatureRequest.id;
    docusignEnvelopeId = signatureRequest.docusign_envelope_id;

    expect(signatureRequest.document_id).toBe(testDocumentId);
    expect(signatureRequest.signers).toHaveLength(3);
    expect(signatureRequest.status).toBe('sent');
    expect(signatureRequest.docusign_envelope_id).toBeDefined();

    // Step 2: Verify DocuSign envelope creation
    const docusignStatusResponse = await fetch(`${API_BASE}/api/docusign/envelopes/${docusignEnvelopeId}/status`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(docusignStatusResponse.status).toBe(200);
    const envelopeStatus = await docusignStatusResponse.json();
    
    expect(envelopeStatus.status).toBe('sent');
    expect(envelopeStatus.recipients.signers).toHaveLength(3);
    expect(envelopeStatus.email_subject).toContain('Revocable Living Trust');

    // Step 3: Simulate first signer completion (John Smith)
    const johnSigningResponse = await fetch(`${API_BASE}/api/docusign/webhook/envelope-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'recipient-completed',
        envelope_id: docusignEnvelopeId,
        recipient_id: 'john-smith-recipient-id',
        recipient_email: 'john.smith@example.com',
        completed_date_time: new Date().toISOString(),
        decline_reason: null
      })
    });

    expect(johnSigningResponse.status).toBe(200);

    // Verify signature request updated
    const updatedRequestResponse = await fetch(`${API_BASE}/api/signature-requests/${signatureRequestId}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    const updatedRequest = await updatedRequestResponse.json();
    const johnSigner = updatedRequest.signers.find((s: unknown) => s.email === 'john.smith@example.com');
    
    expect(johnSigner.status).toBe('completed');
    expect(johnSigner.signed_at).toBeDefined();
    expect(updatedRequest.completion_percentage).toBeCloseTo(33.33, 1);

    // Step 4: Simulate second signer completion (Jane Smith)
    const janeSigningResponse = await fetch(`${API_BASE}/api/docusign/webhook/envelope-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'recipient-completed',
        envelope_id: docusignEnvelopeId,
        recipient_id: 'jane-smith-recipient-id',
        recipient_email: 'jane.smith@example.com',
        completed_date_time: new Date().toISOString()
      })
    });

    expect(janeSigningResponse.status).toBe(200);

    // Step 5: Simulate final signer completion (Mary Johnson)
    const marySigningResponse = await fetch(`${API_BASE}/api/docusign/webhook/envelope-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'recipient-completed',
        envelope_id: docusignEnvelopeId,
        recipient_id: 'mary-johnson-recipient-id',
        recipient_email: 'mary.johnson@example.com',
        completed_date_time: new Date().toISOString()
      })
    });

    expect(marySigningResponse.status).toBe(200);

    // Step 6: Simulate envelope completion
    const envelopeCompletedResponse = await fetch(`${API_BASE}/api/docusign/webhook/envelope-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'envelope-completed',
        envelope_id: docusignEnvelopeId,
        completed_date_time: new Date().toISOString(),
        documents: [
          {
            document_id: '1',
            name: 'Smith Revocable Living Trust - Final.pdf',
            uri: `/envelopes/${docusignEnvelopeId}/documents/1`
          }
        ]
      })
    });

    expect(envelopeCompletedResponse.status).toBe(200);

    // Step 7: Verify final signature request status
    const finalRequestResponse = await fetch(`${API_BASE}/api/signature-requests/${signatureRequestId}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    const finalRequest = await finalRequestResponse.json();
    
    expect(finalRequest.status).toBe('completed');
    expect(finalRequest.completion_percentage).toBe(100);
    expect(finalRequest.completed_at).toBeDefined();
    expect(finalRequest.signed_document_url).toBeDefined();

    // Step 8: Verify document status updated to signed
    const finalDocResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    const finalDocument = await finalDocResponse.json();
    
    expect(finalDocument.status).toBe('executed');
    expect(finalDocument.signed_at).toBeDefined();
    expect(finalDocument.signature_request_id).toBe(signatureRequestId);
  });

  it('should handle signature request cancellation', async () => {
    // Create another signature request to cancel
    const cancelTestResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/signature-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        signers: [
          {
            name: 'Test Signer',
            email: 'test@example.com',
            role: 'test',
            signing_order: 1
          }
        ]
      })
    });

    const cancelRequest = await cancelTestResponse.json();

    // Cancel the signature request
    const cancelResponse = await fetch(`${API_BASE}/api/signature-requests/${cancelRequest.id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        reason: 'Client requested document changes'
      })
    });

    expect(cancelResponse.status).toBe(200);
    const canceledRequest = await cancelResponse.json();
    
    expect(canceledRequest.status).toBe('cancelled');
    expect(canceledRequest.cancelled_at).toBeDefined();
    expect(canceledRequest.cancellation_reason).toBe('Client requested document changes');

    // Verify DocuSign envelope also cancelled
    const docusignCancelResponse = await fetch(`${API_BASE}/api/docusign/envelopes/${cancelRequest.docusign_envelope_id}/status`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    const canceledEnvelope = await docusignCancelResponse.json();
    expect(canceledEnvelope.status).toBe('voided');
  });

  it('should handle signer decline scenario', async () => {
    // Simulate signer declining to sign
    const declineResponse = await fetch(`${API_BASE}/api/docusign/webhook/envelope-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'recipient-declined',
        envelope_id: docusignEnvelopeId,
        recipient_id: 'declined-recipient-id',
        recipient_email: 'declined@example.com',
        decline_reason: 'I need to review the terms with my attorney first',
        declined_date_time: new Date().toISOString()
      })
    });

    expect(declineResponse.status).toBe(200);

    // Check that appropriate notifications are sent
    const notificationsResponse = await fetch(`${API_BASE}/api/notifications/realtime/user/attorney-user-id`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    const notifications = await notificationsResponse.json();
    const declineNotification = notifications.find((n: unknown) => 
      n.type === 'signature_declined'
    );

    expect(declineNotification).toBeDefined();
    expect(declineNotification.message).toContain('declined');
  });

  it('should track signature analytics and audit trail', async () => {
    const analyticsResponse = await fetch(`${API_BASE}/api/signature-requests/${signatureRequestId}/analytics`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(analyticsResponse.status).toBe(200);
    const analytics = await analyticsResponse.json();
    
    expect(analytics.total_signers).toBe(3);
    expect(analytics.completed_signers).toBe(3);
    expect(analytics.time_to_completion_hours).toBeGreaterThan(0);
    expect(analytics.reminder_count).toBeDefined();
    
    // Verify audit trail
    const auditResponse = await fetch(`${API_BASE}/api/audit/signature-requests/${signatureRequestId}`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    const auditLogs = await auditResponse.json();
    const eventTypes = auditLogs.map((log: unknown) => log.action_type);
    
    expect(eventTypes).toContain('signature_request_created');
    expect(eventTypes).toContain('envelope_sent');
    expect(eventTypes).toContain('recipient_signed');
    expect(eventTypes).toContain('envelope_completed');
  });

  it('should support signing reminders', async () => {
    // Test automatic reminder sending
    const reminderResponse = await fetch(`${API_BASE}/api/signature-requests/${signatureRequestId}/send-reminder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        recipient_email: 'john.smith@example.com',
        custom_message: 'Gentle reminder to please sign your trust documents.'
      })
    });

    expect(reminderResponse.status).toBe(200);
    const reminder = await reminderResponse.json();
    
    expect(reminder.reminder_sent).toBe(true);
    expect(reminder.recipient_email).toBe('john.smith@example.com');
    expect(reminder.sent_at).toBeDefined();
  });

  it('should download completed signed documents', async () => {
    const downloadResponse = await fetch(`${API_BASE}/api/signature-requests/${signatureRequestId}/download`, {
      headers: { 'Authorization': 'Bearer test-token-attorney' }
    });

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get('content-type')).toBe('application/pdf');
    expect(downloadResponse.headers.get('content-disposition')).toContain('attachment');
    
    const pdfBuffer = await downloadResponse.arrayBuffer();
    expect(pdfBuffer.byteLength).toBeGreaterThan(0);
  });

  it('should handle bulk signature operations', async () => {
    // Create multiple signature requests for bulk operations
    const bulkRequestsResponse = await fetch(`${API_BASE}/api/signature-requests/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token-attorney'
      },
      body: JSON.stringify({
        requests: [
          {
            document_id: testDocumentId,
            signers: [{ name: 'Bulk Signer 1', email: 'bulk1@example.com', role: 'signer', signing_order: 1 }]
          },
          {
            document_id: testDocumentId,
            signers: [{ name: 'Bulk Signer 2', email: 'bulk2@example.com', role: 'signer', signing_order: 1 }]
          }
        ]
      })
    });

    expect(bulkRequestsResponse.status).toBe(201);
    const bulkRequests = await bulkRequestsResponse.json();
    
    expect(bulkRequests.created_requests).toHaveLength(2);
    expect(bulkRequests.successful_count).toBe(2);
    expect(bulkRequests.failed_count).toBe(0);
  });
});

export {};