/**
 * Integration Test: Document Signing Integration
 * T077: Comprehensive integration tests for e-signature workflow
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

describe('Integration: Document Signing with E-Signature Library', () => {
  let testDocumentId: string;
  let signatureRequestId: string;
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for tests
    const authResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@jurisagentis.com',
        password: 'test-password'
      })
    });
    
    if (authResponse.ok) {
      const authData = await authResponse.json();
      authToken = authData.access_token;
    }

    // Create test document for signing
    const documentResponse = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        matter_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Integration Test Document - Signing',
        document_type: 'contract',
        status: 'draft'
      })
    });

    if (documentResponse.ok) {
      const document = await documentResponse.json();
      testDocumentId = document.id;
    }
  });

  afterAll(async () => {
    // Cleanup test documents
    if (testDocumentId && authToken) {
      await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
    }
  });

  describe('Document Signing Workflow', () => {
    it('should initiate document signing with multiple signers', async () => {
      const signingResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: [
            {
              name: 'John Doe',
              email: 'john.doe@example.com',
              signing_order: 1,
              role: 'client',
              signature_fields: [
                {
                  page_number: 1,
                  x_position: 100,
                  y_position: 200,
                  field_type: 'signature',
                  is_required: true
                }
              ]
            },
            {
              name: 'Jane Smith',
              email: 'jane.smith@example.com',
              signing_order: 2,
              role: 'witness'
            }
          ],
          signing_options: {
            subject: 'Please sign the contract',
            message: 'Your signature is required on this important document.',
            sequential_signing: true,
            remind_after_days: 2
          },
          workflow_options: {
            auto_start: true,
            notify_on_completion: true,
            create_audit_trail: true
          }
        })
      });

      expect(signingResponse.status).toBe(200);
      const signingResult = await signingResponse.json();
      
      expect(signingResult.signature_request_id).toBeDefined();
      expect(signingResult.status).toBe('sent');
      expect(signingResult.signers_count).toBe(2);
      expect(signingResult.signing_urls).toBeDefined();
      
      signatureRequestId = signingResult.signature_request_id;
    });

    it('should get document signing status', async () => {
      const statusResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(statusResponse.status).toBe(200);
      const statusData = await statusResponse.json();
      
      expect(statusData.document_id).toBe(testDocumentId);
      expect(statusData.signing_requests).toBeDefined();
      expect(statusData.summary.total_requests).toBeGreaterThan(0);
    });

    it('should send signing reminders', async () => {
      const reminderResponse = await fetch(`${API_BASE}/api/signatures/${signatureRequestId}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          recipient_email: 'john.doe@example.com',
          custom_message: 'Gentle reminder to sign the document'
        })
      });

      expect(reminderResponse.status).toBe(200);
      const reminderResult = await reminderResponse.json();
      
      expect(reminderResult.reminder_sent).toBe(true);
      expect(reminderResult.recipient_email).toBe('john.doe@example.com');
      expect(reminderResult.sent_at).toBeDefined();
    });

    it('should cancel signing workflow', async () => {
      const cancelResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign?signature_request_id=${signatureRequestId}&reason=Document needs revision`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(cancelResponse.status).toBe(200);
      const cancelResult = await cancelResponse.json();
      
      expect(cancelResult.status).toBe('cancelled');
      expect(cancelResult.reason).toBe('Document needs revision');
    });
  });

  describe('Webhook Processing', () => {
    it('should process DocuSign webhook events', async () => {
      const webhookPayload = {
        event: 'envelope-completed',
        envelopeId: 'test-envelope-123',
        data: {
          envelopeId: 'test-envelope-123',
          status: 'completed'
        }
      };

      const webhookResponse = await fetch(`${API_BASE}/api/signatures/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-docusign-signature-1': 'test-signature'
        },
        body: JSON.stringify(webhookPayload)
      });

      expect(webhookResponse.status).toBe(200);
      const webhookResult = await webhookResponse.json();
      
      expect(webhookResult.processed).toBeDefined();
      expect(webhookResult.event_type).toBe('envelope-completed');
    });

    it('should handle webhook verification', async () => {
      const verificationResponse = await fetch(`${API_BASE}/api/signatures/webhook?challenge=test-challenge-123`);

      expect(verificationResponse.status).toBe(200);
      const challengeText = await verificationResponse.text();
      expect(challengeText).toBe('test-challenge-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid document ID', async () => {
      const invalidResponse = await fetch(`${API_BASE}/api/documents/invalid-id/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: [{ name: 'Test', email: 'test@example.com', signing_order: 1 }]
        })
      });

      expect(invalidResponse.status).toBe(404);
    });

    it('should handle missing signers validation', async () => {
      const validationResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: []
        })
      });

      expect(validationResponse.status).toBe(400);
      const error = await validationResponse.json();
      expect(error.error_code).toBe('MISSING_SIGNERS');
    });

    it('should handle unauthorized access', async () => {
      const unauthorizedResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signers: [{ name: 'Test', email: 'test@example.com', signing_order: 1 }]
        })
      });

      expect(unauthorizedResponse.status).toBe(401);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent signing requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            signers: [{
              name: `Concurrent Signer ${i}`,
              email: `concurrent${i}@example.com`,
              signing_order: 1
            }]
          })
        })
      );

      const responses = await Promise.all(concurrentRequests);
      const successfulResponses = responses.filter(r => r.status === 200);
      
      expect(successfulResponses.length).toBeGreaterThan(0);
    });

    it('should timeout gracefully for slow requests', async () => {
      const startTime = Date.now();
      
      try {
        const timeoutResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            signers: [{ name: 'Timeout Test', email: 'timeout@example.com', signing_order: 1 }]
          }),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        const duration = Date.now() - startTime;
        expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      } catch (error) {
        const duration = Date.now() - startTime;
        if (error.name === 'TimeoutError') {
          expect(duration).toBeGreaterThan(4900); // Should timeout around 5 seconds
        }
      }
    });
  });

  describe('Data Integrity', () => {
    it('should maintain audit trail consistency', async () => {
      // Create a new signing request for audit testing
      const auditTestResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: [{
            name: 'Audit Test Signer',
            email: 'audit@example.com',
            signing_order: 1
          }],
          workflow_options: {
            create_audit_trail: true
          }
        })
      });

      expect(auditTestResponse.status).toBe(200);
      const auditRequest = await auditTestResponse.json();

      // Send a reminder to create audit event
      await fetch(`${API_BASE}/api/signatures/${auditRequest.signature_request_id}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Check status includes audit events
      const statusWithAuditResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign?include_audit_events=true`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(statusWithAuditResponse.status).toBe(200);
      const statusWithAudit = await statusWithAuditResponse.json();
      
      const auditEvents = statusWithAudit.signing_requests[0]?.audit_events || [];
      expect(auditEvents.length).toBeGreaterThan(0);
      expect(auditEvents.some(event => event.event_type === 'signature_request_created')).toBe(true);
    });

    it('should validate signature field positioning', async () => {
      const invalidFieldResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: [{
            name: 'Field Test Signer',
            email: 'fieldtest@example.com',
            signing_order: 1,
            signature_fields: [{
              page_number: -1, // Invalid page number
              x_position: -100, // Invalid position
              y_position: -200,
              field_type: 'signature'
            }]
          }]
        })
      });

      expect(invalidFieldResponse.status).toBe(400);
    });
  });

  describe('Integration with Document Management', () => {
    it('should update document status after signing completion', async () => {
      // Create a signing request
      const signingResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          signers: [{
            name: 'Status Test Signer',
            email: 'statustest@example.com',
            signing_order: 1
          }],
          workflow_options: {
            update_document_status: true
          }
        })
      });

      const signingResult = await signingResponse.json();

      // Simulate completion
      await fetch(`${API_BASE}/api/signatures/${signingResult.signature_request_id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Check document status was updated
      const documentResponse = await fetch(`${API_BASE}/api/documents/${testDocumentId}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const document = await documentResponse.json();
      expect(['signed', 'executed']).toContain(document.status);
    });
  });
});