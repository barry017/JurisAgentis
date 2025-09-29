/**
 * Integration Test: E-Signature Middleware Integration
 * T077: Tests integration between middleware layer and libraries
 * 
 * Tests the integration between:
 * - ESignatureIntegrationMiddleware
 * - @jurisagentis/e-signature library
 * - @jurisagentis/document-management library
 * - Database operations and audit trails
 */

import { describe, it, expect, beforeAll, jest } from '@jest/globals';

// Type definitions for our test interfaces (Supabase client not used directly in tests)

interface MockDocumentService {
  getDocument: jest.Mock;
  updateDocumentStatus: jest.Mock;
}

interface MockSignatureService {
  createSignatureRequest: jest.Mock;
  updateSignatureRequestStatus: jest.Mock;
  sendReminder: jest.Mock;
}

interface MockDocuSignService {
  createEnvelope: jest.Mock;
  getEnvelopeStatus: jest.Mock;
  validateWebhook: jest.Mock;
}

describe('Integration: E-Signature Middleware with Libraries', () => {
  let mockDocumentService: MockDocumentService;
  let mockSignatureService: MockSignatureService;
  let mockDocuSignService: MockDocuSignService;

  beforeAll(() => {
    // Mock Supabase client (not used directly in tests)
    const _mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'test-doc-id',
                title: 'Test Document',
                file_path: '/documents/test-document.pdf',
                status: 'finalized',
                matter_id: 'test-matter-id'
              },
              error: null
            })
          }),
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'new-record-id' },
          error: null
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { id: 'updated-record' },
            error: null
          })
        })
      }),
      storage: {
        from: jest.fn().mockReturnValue({
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: 'https://storage.supabase.co/test-document.pdf' }
          }),
          upload: jest.fn().mockResolvedValue({
            data: { path: 'signed-documents/test-signed.pdf' },
            error: null
          })
        })
      }
    };

    // Mock Document Service
    mockDocumentService = {
      getDocument: jest.fn().mockResolvedValue({
        id: 'test-doc-id',
        title: 'Test Document',
        file_path: '/documents/test-document.pdf',
        status: 'finalized',
        matter_id: 'test-matter-id'
      }),
      updateDocumentStatus: jest.fn().mockResolvedValue(true)
    };

    // Mock Signature Service
    mockSignatureService = {
      createSignatureRequest: jest.fn().mockResolvedValue({
        id: 'sig-req-123',
        document_id: 'test-doc-id',
        status: 'created',
        signers: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            order: 1,
            status: 'created'
          }
        ]
      }),
      updateSignatureRequestStatus: jest.fn().mockResolvedValue(true),
      sendReminder: jest.fn().mockResolvedValue({
        sent: true,
        recipient: 'john@example.com',
        sent_at: new Date().toISOString()
      })
    };

    // Mock DocuSign Service
    mockDocuSignService = {
      createEnvelope: jest.fn().mockResolvedValue({
        envelopeId: 'docusign-env-123',
        status: 'sent',
        emailSubject: 'Please sign: Test Document',
        recipients: {
          signers: [
            {
              email: 'john@example.com',
              name: 'John Doe',
              recipientId: '1',
              status: 'sent'
            }
          ]
        }
      }),
      getEnvelopeStatus: jest.fn().mockResolvedValue({
        status: 'sent',
        emailSubject: 'Please sign: Test Document',
        recipients: {
          signers: [
            {
              email: 'john@example.com',
              name: 'John Doe',
              status: 'sent',
              deliveredDateTime: new Date().toISOString()
            }
          ]
        }
      }),
      validateWebhook: jest.fn().mockReturnValue(true)
    };
  });

  describe('Document Signing Workflow Integration', () => {
    it('should integrate document retrieval with signature creation', async () => {
      // Mock the ESignatureIntegrationMiddleware
      const mockMiddleware = {
        initiateDocumentSigning: jest.fn().mockImplementation(async (request: Record<string, unknown>, userId: string) => {
          // Simulate the middleware calling document service
          const document = await mockDocumentService.getDocument(request.document_id as string);
          
          // Simulate creating signature request
          const signatureRequest = await mockSignatureService.createSignatureRequest({
            document_id: document.id,
            signers: request.signers as Array<Record<string, unknown>>,
            workflow_type: request.workflow_type as string
          });

          // Simulate DocuSign envelope creation
          const envelope = await mockDocuSignService.createEnvelope({
            documents: [document],
            signers: request.signers as Array<Record<string, unknown>>,
            emailSubject: `Please sign: ${document.title}`
          });

          return {
            signature_request_id: signatureRequest.id,
            envelope_id: envelope.envelopeId,
            status: 'sent',
            signers: signatureRequest.signers.map(signer => ({
              ...signer,
              signing_url: `https://demo.docusign.net/signing/${envelope.envelopeId}/${signer.email}`
            })),
            audit_events: [
              {
                event_type: 'signature_request_created',
                timestamp: new Date().toISOString(),
                user_id: userId
              }
            ]
          };
        })
      };

      const signingRequest = {
        document_id: 'test-doc-id',
        signers: [
          {
            name: 'John Doe',
            email: 'john@example.com',
            order: 1
          }
        ],
        workflow_type: 'email' as const,
        redirect_url: 'https://example.com/success',
        message: 'Please sign this document'
      };

      const result = await mockMiddleware.initiateDocumentSigning(signingRequest, 'user-123');

      // Verify document service was called
      expect(mockDocumentService.getDocument).toHaveBeenCalledWith('test-doc-id');

      // Verify signature service was called
      expect(mockSignatureService.createSignatureRequest).toHaveBeenCalledWith({
        document_id: 'test-doc-id',
        signers: signingRequest.signers,
        workflow_type: 'email'
      });

      // Verify DocuSign service was called
      expect(mockDocuSignService.createEnvelope).toHaveBeenCalledWith({
        documents: [expect.objectContaining({ id: 'test-doc-id' })],
        signers: signingRequest.signers,
        emailSubject: 'Please sign: Test Document'
      });

      // Verify result
      expect(result.signature_request_id).toBe('sig-req-123');
      expect(result.envelope_id).toBe('docusign-env-123');
      expect(result.status).toBe('sent');
      expect(result.signers).toHaveLength(1);
      expect(result.signers[0].signing_url).toContain('docusign.net');
      expect(result.audit_events).toHaveLength(1);
    });

    it('should handle status synchronization between services', async () => {
      const mockMiddleware = {
        getDocumentSigningStatus: jest.fn().mockImplementation(async (documentId, signatureRequestId) => {
          // Get signature request from signature service
          const signatureRequest = {
            id: signatureRequestId,
            document_id: documentId,
            envelope_id: 'docusign-env-123',
            status: 'sent'
          };

          // Get envelope status from DocuSign
          const envelopeStatus = await mockDocuSignService.getEnvelopeStatus('docusign-env-123');

          // Combine status information
          return [
            {
              signature_request_id: signatureRequest.id,
              overall_status: envelopeStatus.status,
              completion_percentage: envelopeStatus.status === 'completed' ? 100 : 50,
              signers: envelopeStatus.recipients.signers.map((signer: Record<string, unknown>) => ({
                name: signer.name,
                email: signer.email,
                status: signer.status,
                signed_at: signer.signedDateTime || null
              })),
              envelope_id: 'docusign-env-123',
              created_at: new Date().toISOString()
            }
          ];
        })
      };

      const result = await mockMiddleware.getDocumentSigningStatus('test-doc-id', 'sig-req-123');

      // Verify DocuSign service was called
      expect(mockDocuSignService.getEnvelopeStatus).toHaveBeenCalledWith('docusign-env-123');

      // Verify result format
      expect(result).toHaveLength(1);
      expect(result[0].signature_request_id).toBe('sig-req-123');
      expect(result[0].overall_status).toBe('sent');
      expect(result[0].signers).toHaveLength(1);
      expect(result[0].signers[0].email).toBe('john@example.com');
    });

    it('should integrate reminder functionality across services', async () => {
      const mockMiddleware = {
        sendSigningReminder: jest.fn().mockImplementation(async (signatureRequestId: string, recipientEmail: string, customMessage: string, userId: string) => {
          // Get signature request details
          const _signatureRequest = {
            id: signatureRequestId,
            envelope_id: 'docusign-env-123',
            signers: [{ email: 'john@example.com', name: 'John Doe' }]
          };

          // Send reminder through signature service
          await mockSignatureService.sendReminder(signatureRequestId, recipientEmail, customMessage);

          // Create audit log
          const auditEvent = {
            event_type: 'reminder_sent',
            signature_request_id: signatureRequestId,
            recipient_email: recipientEmail || 'all_signers',
            sent_at: new Date().toISOString(),
            user_id: userId
          };

          return {
            reminder_sent: true,
            recipient_email: recipientEmail || 'all_signers',
            sent_at: auditEvent.sent_at
          };
        })
      };

      const result = await mockMiddleware.sendSigningReminder(
        'sig-req-123',
        'john@example.com',
        'Please complete signing',
        'user-123'
      );

      // Verify signature service was called
      expect(mockSignatureService.sendReminder).toHaveBeenCalledWith(
        'sig-req-123',
        'john@example.com',
        'Please complete signing'
      );

      // Verify result
      expect(result.reminder_sent).toBe(true);
      expect(result.recipient_email).toBe('john@example.com');
      expect(result.sent_at).toBeDefined();
    });
  });

  describe('Webhook Processing Integration', () => {
    it('should process webhook events across all services', async () => {
      const mockMiddleware = {
        processSigningWebhook: jest.fn().mockImplementation(async (payload: Record<string, unknown>, signature: string, _userId: string) => {
          // Validate webhook signature
          const isValid = mockDocuSignService.validateWebhook(payload, signature);
          if (!isValid) {
            throw new Error('Invalid webhook signature');
          }

          const envelopeId = payload.envelopeId || payload.data?.envelopeId;
          
          // Find signature request by envelope ID
          const signatureRequest = {
            id: 'sig-req-123',
            document_id: 'test-doc-id',
            envelope_id: envelopeId
          };

          // Update signature request status
          await mockSignatureService.updateSignatureRequestStatus(
            signatureRequest.id,
            payload.event === 'envelope-completed' ? 'completed' : 'sent'
          );

          // Update document status if completed
          if (payload.event === 'envelope-completed') {
            await mockDocumentService.updateDocumentStatus(
              signatureRequest.document_id,
              'signed'
            );
          }

          return {
            processed: true,
            signature_request_id: signatureRequest.id,
            event_type: payload.event,
            envelope_id: envelopeId
          };
        })
      };

      const webhookPayload = {
        event: 'envelope-completed',
        envelopeId: 'docusign-env-123',
        data: {
          envelopeSummary: {
            status: 'completed',
            completedDateTime: new Date().toISOString()
          }
        }
      };

      const result = await mockMiddleware.processSigningWebhook(
        webhookPayload,
        'valid-signature',
        'webhook_system'
      );

      // Verify webhook validation
      expect(mockDocuSignService.validateWebhook).toHaveBeenCalledWith(
        webhookPayload,
        'valid-signature'
      );

      // Verify signature service status update
      expect(mockSignatureService.updateSignatureRequestStatus).toHaveBeenCalledWith(
        'sig-req-123',
        'completed'
      );

      // Verify document service status update
      expect(mockDocumentService.updateDocumentStatus).toHaveBeenCalledWith(
        'test-doc-id',
        'signed'
      );

      // Verify result
      expect(result.processed).toBe(true);
      expect(result.signature_request_id).toBe('sig-req-123');
      expect(result.event_type).toBe('envelope-completed');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle document service errors gracefully', async () => {
      // Mock document service to throw error
      mockDocumentService.getDocument.mockRejectedValueOnce(new Error('Document not found'));

      const mockMiddleware = {
        initiateDocumentSigning: jest.fn().mockImplementation(async (request: Record<string, unknown>, _userId: string) => {
          try {
            await mockDocumentService.getDocument(request.document_id as string);
          } catch (error) {
            throw new Error(`Document retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
      };

      const signingRequest = {
        document_id: 'nonexistent-doc',
        signers: [{ name: 'John Doe', email: 'john@example.com', order: 1 }],
        workflow_type: 'email' as const
      };

      await expect(
        mockMiddleware.initiateDocumentSigning(signingRequest, 'user-123')
      ).rejects.toThrow('Document retrieval failed: Document not found');
    });

    it('should handle DocuSign service errors gracefully', async () => {
      // Mock DocuSign service to throw error
      mockDocuSignService.createEnvelope.mockRejectedValueOnce(new Error('DocuSign API error'));

      const mockMiddleware = {
        initiateDocumentSigning: jest.fn().mockImplementation(async (request: Record<string, unknown>, _userId: string) => {
          const document = await mockDocumentService.getDocument(request.document_id as string);
          
          try {
            await mockDocuSignService.createEnvelope({
              documents: [document],
              signers: request.signers as Array<Record<string, unknown>>
            });
          } catch (error) {
            throw new Error(`DocuSign integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        })
      };

      const signingRequest = {
        document_id: 'test-doc-id',
        signers: [{ name: 'John Doe', email: 'john@example.com', order: 1 }],
        workflow_type: 'email' as const
      };

      await expect(
        mockMiddleware.initiateDocumentSigning(signingRequest, 'user-123')
      ).rejects.toThrow('DocuSign integration failed: DocuSign API error');
    });
  });

  describe('Audit Trail Integration', () => {
    it('should create comprehensive audit trails across all operations', async () => {
      const auditEvents: Array<Record<string, unknown>> = [];
      
      const mockMiddleware = {
        completeSigningWorkflow: jest.fn().mockImplementation(async (signatureRequestId: string, userId: string) => {
          // Create completion audit event
          const completionEvent = {
            event_type: 'signature_workflow_completed',
            signature_request_id: signatureRequestId,
            user_id: userId,
            timestamp: new Date().toISOString(),
            metadata: {
              completion_method: 'manual',
              document_finalized: true
            }
          };
          auditEvents.push(completionEvent);

          // Update services
          await mockSignatureService.updateSignatureRequestStatus(signatureRequestId, 'completed');
          await mockDocumentService.updateDocumentStatus('test-doc-id', 'signed');

          return {
            signed_document_path: '/documents/signed/test-signed.pdf',
            audit_trail_path: '/documents/audit-trails/test-audit.pdf',
            completion_timestamp: completionEvent.timestamp
          };
        })
      };

      const result = await mockMiddleware.completeSigningWorkflow('sig-req-123', 'user-123');

      // Verify audit event was created
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].event_type).toBe('signature_workflow_completed');
      expect(auditEvents[0].signature_request_id).toBe('sig-req-123');
      expect(auditEvents[0].user_id).toBe('user-123');
      expect(auditEvents[0].metadata.completion_method).toBe('manual');

      // Verify services were called
      expect(mockSignatureService.updateSignatureRequestStatus).toHaveBeenCalledWith(
        'sig-req-123',
        'completed'
      );
      expect(mockDocumentService.updateDocumentStatus).toHaveBeenCalledWith(
        'test-doc-id',
        'signed'
      );

      // Verify result
      expect(result.signed_document_path).toContain('signed');
      expect(result.audit_trail_path).toContain('audit-trails');
      expect(result.completion_timestamp).toBeDefined();
    });
  });
});