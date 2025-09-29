/**
 * E-Signature Integration Middleware - Document to signature workflow integration
 * T076: Integrate with e-signature library for document signing
 */

import { createClient } from '@supabase/supabase-js';
import { 
  SignatureService, 
  DocuSignService, 
  SignatureRequestCreateInput, 
  SignatureRequest,
  SignatureRequestWithSigners,
  DocuSignConfig
} from '@jurisagentis/e-signature';
import { DocumentService } from '@jurisagentis/document-management';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize services
const documentService = new DocumentService(supabase);
const signatureService = new SignatureService();

// Initialize DocuSign service with configuration
const docuSignConfig: DocuSignConfig = {
  integration_key: process.env.DOCUSIGN_INTEGRATION_KEY || 'demo_key',
  user_id: process.env.DOCUSIGN_USER_ID || 'demo_user',
  account_id: process.env.DOCUSIGN_ACCOUNT_ID || 'demo_account',
  private_key: process.env.DOCUSIGN_PRIVATE_KEY || 'demo_private_key',
  base_path: process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi',
  oauth_base_path: process.env.DOCUSIGN_OAUTH_BASE_PATH || 'https://account-d.docusign.com'
};

const docuSignService = new DocuSignService(docuSignConfig);

export interface DocumentSigningRequest {
  document_id: string;
  signers: Array<{
    name: string;
    email: string;
    phone?: string;
    role?: string;
    signing_order: number;
    access_code?: string;
    id_verification_required?: boolean;
    signature_fields?: Array<{
      page_number: number;
      x_position: number;
      y_position: number;
      width?: number;
      height?: number;
      field_type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox';
      field_label?: string;
      is_required?: boolean;
      tab_order?: number;
    }>;
  }>;
  signing_options?: {
    subject?: string;
    message?: string;
    signing_deadline?: Date;
    require_id_verification?: boolean;
    sequential_signing?: boolean;
    remind_after_days?: number;
    reminder_frequency?: 'daily' | 'every_2_days' | 'weekly';
    max_reminders?: number;
    use_embedded_signing?: boolean;
    return_url?: string;
  };
  workflow_options?: {
    auto_start?: boolean;
    notify_on_completion?: boolean;
    create_audit_trail?: boolean;
    update_document_status?: boolean;
  };
}

export interface SigningWorkflowResult {
  signature_request_id: string;
  docusign_envelope_id?: string;
  status: string;
  signing_urls: Array<{
    signer_email: string;
    signing_url: string;
    embedded_url?: string;
  }>;
  sender_view_url?: string;
  workflow_id?: string;
  estimated_completion: Date;
}

export interface DocumentSigningStatus {
  document_id: string;
  signature_request_id: string;
  overall_status: 'draft' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided' | 'expired';
  completion_percentage: number;
  signers: Array<{
    name: string;
    email: string;
    status: string;
    signed_at?: Date;
    signing_url?: string;
    decline_reason?: string;
  }>;
  audit_events: Array<{
    timestamp: Date;
    event_type: string;
    user_email: string;
    ip_address?: string;
    details: string;
  }>;
  signed_document_url?: string;
  created_at: Date;
  completed_at?: Date;
}

export class ESignatureIntegrationMiddleware {
  /**
   * Initiate document signing workflow
   */
  async initiateDocumentSigning(
    request: DocumentSigningRequest,
    userId: string
  ): Promise<SigningWorkflowResult> {
    try {
      // Validate document exists and is ready for signing
      const document = await this.validateDocumentForSigning(request.document_id);
      
      // Prepare signature request input
      const signatureRequestInput: SignatureRequestCreateInput = {
        document_id: request.document_id,
        signers: request.signers.map(signer => ({
          ...signer,
          custom_fields: {
            document_title: document.title,
            matter_id: document.matter_id
          }
        })),
        subject: request.signing_options?.subject || `Please sign: ${document.title}`,
        message: request.signing_options?.message || 'Please review and sign the attached document.',
        signing_deadline: request.signing_options?.signing_deadline,
        require_id_verification: request.signing_options?.require_id_verification || false,
        sequential_signing: request.signing_options?.sequential_signing || false,
        remind_after_days: request.signing_options?.remind_after_days || 3,
        reminder_frequency: request.signing_options?.reminder_frequency || 'every_2_days',
        max_reminders: request.signing_options?.max_reminders || 3
      };
      
      // Create signature request
      const signatureRequest = await signatureService.createSignatureRequest(signatureRequestInput);
      
      // Get document file for DocuSign envelope
      const documentBuffer = await this.getDocumentBuffer(request.document_id);
      
      // Create DocuSign envelope
      let docuSignResult;
      let signingUrls: Array<{ signer_email: string; signing_url: string; embedded_url?: string }> = [];
      let senderViewUrl: string | undefined;
      
      try {
        docuSignResult = await docuSignService.createEnvelope(
          signatureRequest,
          documentBuffer,
          document.file_name || `${document.title}.pdf`
        );
        
        // Update signature request with DocuSign envelope ID
        await signatureService.updateSignatureRequestStatus(
          signatureRequest.id,
          'sent',
          docuSignResult.envelope_id
        );
        
        // Generate signing URLs
        if (request.signing_options?.use_embedded_signing) {
          signingUrls = await this.generateEmbeddedSigningUrls(
            docuSignResult.envelope_id,
            signatureRequest.signers,
            request.signing_options.return_url || `${process.env.NEXT_PUBLIC_APP_URL}/signatures/complete`
          );
        } else {
          // For email-based signing, DocuSign handles URLs automatically
          signingUrls = signatureRequest.signers.map(signer => ({
            signer_email: signer.email,
            signing_url: `https://demo.docusign.net/signing/${docuSignResult.envelope_id}` // Placeholder
          }));
        }
        
        // Generate sender view URL
        senderViewUrl = await docuSignService.getSenderViewUrl(
          docuSignResult.envelope_id,
          `${process.env.NEXT_PUBLIC_APP_URL}/signatures/manage/${signatureRequest.id}`
        );
        
      } catch (docuSignError) {
        console.error('DocuSign integration error:', docuSignError);
        // Continue with signature request even if DocuSign fails
        // This allows for fallback signing methods
      }
      
      // Update document status if requested
      if (request.workflow_options?.update_document_status) {
        await this.updateDocumentStatus(request.document_id, 'pending_signature');
      }
      
      // Create audit trail
      if (request.workflow_options?.create_audit_trail) {
        await this.createSigningAuditEvent(
          request.document_id,
          signatureRequest.id,
          'signature_request_created',
          userId,
          {
            signers_count: request.signers.length,
            docusign_envelope_id: docuSignResult?.envelope_id,
            embedded_signing: request.signing_options?.use_embedded_signing || false
          }
        );
      }
      
      // Calculate estimated completion
      const estimatedCompletion = this.calculateEstimatedCompletion(
        request.signers.length,
        request.signing_options?.sequential_signing || false,
        request.signing_options?.signing_deadline
      );
      
      // Create workflow record
      const workflowId = await this.createWorkflowRecord(
        request.document_id,
        signatureRequest.id,
        userId,
        request.workflow_options || {}
      );
      
      return {
        signature_request_id: signatureRequest.id,
        docusign_envelope_id: docuSignResult?.envelope_id,
        status: 'sent',
        signing_urls: signingUrls,
        sender_view_url: senderViewUrl,
        workflow_id: workflowId,
        estimated_completion: estimatedCompletion
      };
      
    } catch (error) {
      console.error('Document signing initiation error:', error);
      throw new Error(`Failed to initiate document signing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get document signing status with detailed information
   */
  async getDocumentSigningStatus(
    documentId: string,
    signatureRequestId?: string
  ): Promise<DocumentSigningStatus[]> {
    try {
      // Get signature requests for document
      const signatureRequests = signatureRequestId 
        ? [await signatureService.getSignatureRequest(signatureRequestId)]
        : await signatureService.getDocumentSignatureRequests(documentId);
      
      const statuses: DocumentSigningStatus[] = [];
      
      for (const request of signatureRequests) {
        // Get signer statuses
        const signerStatuses = await signatureService.getSigningStatus(request.id);
        
        // Get audit events from DocuSign if available
        let auditEvents: DocumentSigningStatus['audit_events'] = [];
        if (request.docusign_envelope_id) {
          try {
            const docuSignAuditEvents = await docuSignService.getEnvelopeAuditEvents(request.docusign_envelope_id);
            auditEvents = docuSignAuditEvents.map(event => ({
              timestamp: new Date(event.dateTime),
              event_type: event.eventType,
              user_email: event.userName,
              ip_address: event.ipAddress,
              details: `${event.eventType} from ${event.geoLocation}`
            }));
          } catch (error) {
            console.warn('Failed to get DocuSign audit events:', error);
          }
        }
        
        // Calculate completion percentage
        const completedSigners = signerStatuses.filter(s => s.status === 'completed').length;
        const completionPercentage = signerStatuses.length > 0 
          ? Math.round((completedSigners / signerStatuses.length) * 100) 
          : 0;
        
        statuses.push({
          document_id: documentId,
          signature_request_id: request.id,
          overall_status: request.status as any,
          completion_percentage: completionPercentage,
          signers: signerStatuses.map(signer => ({
            name: signer.signer_name,
            email: signer.signer_email,
            status: signer.status,
            signed_at: signer.signed_at,
            signing_url: undefined, // Would be populated from DocuSign if needed
            decline_reason: undefined // Would be populated if declined
          })),
          audit_events: auditEvents,
          signed_document_url: request.signed_document_url,
          created_at: request.created_at,
          completed_at: request.completed_at
        });
      }
      
      return statuses;
      
    } catch (error) {
      console.error('Get document signing status error:', error);
      throw new Error(`Failed to get signing status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Complete signing workflow and update document
   */
  async completeSigningWorkflow(
    signatureRequestId: string,
    userId: string
  ): Promise<{
    signed_document_path: string;
    audit_trail_path: string;
    completion_timestamp: Date;
  }> {
    try {
      const signatureRequest = await signatureService.getSignatureRequest(signatureRequestId);
      
      if (signatureRequest.status !== 'completed') {
        throw new Error('Signature request is not completed');
      }
      
      let signedDocumentPath: string;
      let auditTrailPath: string;
      
      // Download signed document from DocuSign
      if (signatureRequest.docusign_envelope_id) {
        const signedDocumentBuffer = await docuSignService.downloadEnvelopeDocuments(
          signatureRequest.docusign_envelope_id
        );
        
        // Upload signed document to storage
        signedDocumentPath = await this.uploadSignedDocument(
          signatureRequest.document_id,
          signedDocumentBuffer,
          'signed'
        );
        
        // Get and upload audit trail
        const auditEvents = await docuSignService.getEnvelopeAuditEvents(
          signatureRequest.docusign_envelope_id
        );
        const auditTrailBuffer = Buffer.from(JSON.stringify(auditEvents, null, 2));
        auditTrailPath = await this.uploadSignedDocument(
          signatureRequest.document_id,
          auditTrailBuffer,
          'audit_trail',
          'json'
        );
      } else {
        // Handle non-DocuSign signing completion
        signedDocumentPath = signatureRequest.signed_document_url || '';
        auditTrailPath = ''; // Would be generated from internal audit data
      }
      
      // Update document status
      await this.updateDocumentStatus(signatureRequest.document_id, 'signed');
      
      // Create completion audit event
      await this.createSigningAuditEvent(
        signatureRequest.document_id,
        signatureRequestId,
        'signature_workflow_completed',
        userId,
        {
          signed_document_path: signedDocumentPath,
          audit_trail_path: auditTrailPath,
          completion_percentage: 100
        }
      );
      
      return {
        signed_document_path: signedDocumentPath,
        audit_trail_path: auditTrailPath,
        completion_timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Complete signing workflow error:', error);
      throw new Error(`Failed to complete signing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Cancel signing workflow
   */
  async cancelSigningWorkflow(
    signatureRequestId: string,
    reason: string,
    userId: string
  ): Promise<void> {
    try {
      const signatureRequest = await signatureService.getSignatureRequest(signatureRequestId);
      
      // Cancel signature request
      await signatureService.cancelSignatureRequest(signatureRequestId, reason);
      
      // Void DocuSign envelope if exists
      if (signatureRequest.docusign_envelope_id) {
        try {
          await docuSignService.voidEnvelope(signatureRequest.docusign_envelope_id, reason);
        } catch (error) {
          console.warn('Failed to void DocuSign envelope:', error);
        }
      }
      
      // Update document status
      await this.updateDocumentStatus(signatureRequest.document_id, 'draft');
      
      // Create cancellation audit event
      await this.createSigningAuditEvent(
        signatureRequest.document_id,
        signatureRequestId,
        'signature_workflow_cancelled',
        userId,
        { reason }
      );
      
    } catch (error) {
      console.error('Cancel signing workflow error:', error);
      throw new Error(`Failed to cancel signing workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Send signing reminders
   */
  async sendSigningReminder(
    signatureRequestId: string,
    recipientEmail?: string,
    customMessage?: string,
    userId?: string
  ): Promise<{ reminder_sent: boolean; sent_at: Date }> {
    try {
      const signatureRequest = await signatureService.getSignatureRequest(signatureRequestId);
      
      // Send reminder through signature service
      const reminderResult = await signatureService.sendReminder(
        signatureRequestId,
        recipientEmail,
        customMessage
      );
      
      // Send DocuSign reminder if available
      if (signatureRequest.docusign_envelope_id) {
        try {
          await docuSignService.sendEnvelopeReminder(signatureRequest.docusign_envelope_id);
        } catch (error) {
          console.warn('Failed to send DocuSign reminder:', error);
        }
      }
      
      // Create reminder audit event
      if (userId) {
        await this.createSigningAuditEvent(
          signatureRequest.document_id,
          signatureRequestId,
          'signing_reminder_sent',
          userId,
          {
            recipient_email: recipientEmail,
            custom_message: customMessage
          }
        );
      }
      
      return reminderResult;
      
    } catch (error) {
      console.error('Send signing reminder error:', error);
      throw new Error(`Failed to send signing reminder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Process signing webhook from DocuSign
   */
  async processSigningWebhook(
    payload: any,
    signature: string,
    userId?: string
  ): Promise<{ processed: boolean; signature_request_id?: string }> {
    try {
      // Validate webhook signature
      const isValid = await docuSignService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature
      );
      
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }
      
      // Extract envelope information
      const envelopeId = payload.envelopeId || payload.data?.envelopeId;
      const eventType = payload.event || payload.eventType;
      
      if (!envelopeId) {
        throw new Error('No envelope ID in webhook payload');
      }
      
      // Find signature request by DocuSign envelope ID
      const { data: signatureRequests, error } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('docusign_envelope_id', envelopeId);
      
      if (error || !signatureRequests || signatureRequests.length === 0) {
        console.warn(`No signature request found for envelope ${envelopeId}`);
        return { processed: false };
      }
      
      const signatureRequest = signatureRequests[0];
      
      // Process different event types
      switch (eventType) {
        case 'envelope-sent':
          await signatureService.updateSignatureRequestStatus(
            signatureRequest.id,
            'sent'
          );
          break;
          
        case 'envelope-delivered':
          await signatureService.updateSignatureRequestStatus(
            signatureRequest.id,
            'delivered'
          );
          break;
          
        case 'envelope-completed':
          await signatureService.updateSignatureRequestStatus(
            signatureRequest.id,
            'completed'
          );
          
          // Trigger completion workflow
          if (userId) {
            await this.completeSigningWorkflow(signatureRequest.id, userId);
          }
          break;
          
        case 'envelope-declined':
          await signatureService.updateSignatureRequestStatus(
            signatureRequest.id,
            'declined'
          );
          break;
          
        case 'envelope-voided':
          await signatureService.updateSignatureRequestStatus(
            signatureRequest.id,
            'cancelled'
          );
          break;
          
        default:
          console.log(`Unhandled webhook event: ${eventType}`);
      }
      
      // Create webhook audit event
      await this.createSigningAuditEvent(
        signatureRequest.document_id,
        signatureRequest.id,
        'webhook_received',
        userId || 'system',
        {
          event_type: eventType,
          envelope_id: envelopeId,
          payload_size: JSON.stringify(payload).length
        }
      );
      
      return {
        processed: true,
        signature_request_id: signatureRequest.id
      };
      
    } catch (error) {
      console.error('Process signing webhook error:', error);
      throw new Error(`Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Private helper methods
   */
  private async validateDocumentForSigning(documentId: string) {
    const document = await documentService.getDocumentById(documentId);
    
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    if (!document.file_path) {
      throw new Error('Document has no file attached');
    }
    
    if (document.status === 'archived') {
      throw new Error('Cannot sign archived document');
    }
    
    return document;
  }
  
  private async getDocumentBuffer(documentId: string): Promise<Buffer> {
    const document = await documentService.getDocumentById(documentId);
    
    const { data: fileData, error } = await supabase.storage
      .from('documents')
      .download(document.file_path!);
    
    if (error || !fileData) {
      throw new Error(`Failed to download document: ${error?.message || 'File not found'}`);
    }
    
    return Buffer.from(await fileData.arrayBuffer());
  }
  
  private async generateEmbeddedSigningUrls(
    envelopeId: string,
    signers: SignatureRequestWithSigners['signers'],
    returnUrl: string
  ): Promise<Array<{ signer_email: string; signing_url: string; embedded_url: string }>> {
    const urls: Array<{ signer_email: string; signing_url: string; embedded_url: string }> = [];
    
    for (const signer of signers) {
      try {
        const embeddedUrl = await docuSignService.getEmbeddedSigningUrl(
          envelopeId,
          signer.docusign_recipient_id || (signers.indexOf(signer) + 1).toString(),
          returnUrl,
          signer.docusign_client_user_id || signer.id
        );
        
        urls.push({
          signer_email: signer.email,
          signing_url: `https://demo.docusign.net/signing/${envelopeId}`, // Fallback
          embedded_url: embeddedUrl
        });
      } catch (error) {
        console.error(`Failed to generate embedded URL for ${signer.email}:`, error);
        urls.push({
          signer_email: signer.email,
          signing_url: `https://demo.docusign.net/signing/${envelopeId}`,
          embedded_url: ''
        });
      }
    }
    
    return urls;
  }
  
  private async updateDocumentStatus(documentId: string, status: string): Promise<void> {
    await documentService.updateDocument(documentId, { status });
  }
  
  private async createSigningAuditEvent(
    documentId: string,
    signatureRequestId: string,
    eventType: string,
    userId: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('signing_audit_events')
        .insert({
          document_id: documentId,
          signature_request_id: signatureRequestId,
          event_type: eventType,
          user_id: userId,
          details: details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to create signing audit event:', error);
    }
  }
  
  private calculateEstimatedCompletion(
    signerCount: number,
    sequential: boolean,
    deadline?: Date
  ): Date {
    if (deadline) {
      return deadline;
    }
    
    // Estimate based on signer count and signing pattern
    const baseHours = 24; // 1 day for first signer
    const additionalHours = sequential ? signerCount * 12 : 12; // Sequential vs parallel
    
    return new Date(Date.now() + (baseHours + additionalHours) * 60 * 60 * 1000);
  }
  
  private async createWorkflowRecord(
    documentId: string,
    signatureRequestId: string,
    userId: string,
    options: any
  ): Promise<string> {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      await supabase
        .from('signing_workflows')
        .insert({
          workflow_id: workflowId,
          document_id: documentId,
          signature_request_id: signatureRequestId,
          created_by: userId,
          options: options,
          status: 'active',
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to create workflow record:', error);
    }
    
    return workflowId;
  }
  
  private async uploadSignedDocument(
    documentId: string,
    fileBuffer: Buffer,
    type: 'signed' | 'audit_trail',
    extension: string = 'pdf'
  ): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${documentId}_${type}_${timestamp}.${extension}`;
    const filePath = `signed-documents/${new Date().getFullYear()}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: extension === 'pdf' ? 'application/pdf' : 'application/json',
        metadata: {
          document_id: documentId,
          type: type
        }
      });
    
    if (error) {
      throw new Error(`Failed to upload ${type} document: ${error.message}`);
    }
    
    return filePath;
  }
}

// Export singleton instance
export const eSignatureIntegration = new ESignatureIntegrationMiddleware();