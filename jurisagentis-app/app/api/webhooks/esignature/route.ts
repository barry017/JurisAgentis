/**
 * E-Signature Webhook Handler - Real-time signature status monitoring
 * Integrates with DocuSign, HelloSign, and other e-signature providers
 * Triggers automated workflows based on signature events
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// E-signature event types
interface ESignatureEvent {
  event_type: 'envelope_sent' | 'envelope_delivered' | 'envelope_completed' | 'envelope_declined' | 'envelope_expired' | 'recipient_viewed' | 'recipient_signed'
  envelope_id: string
  document_id?: string
  timestamp: string
  recipient_info: {
    name: string
    email: string
    status: 'pending' | 'sent' | 'delivered' | 'signed' | 'declined' | 'expired'
  }
  workflow_id?: string
  client_id?: string
  matter_id?: string
  alabama_compliance_data?: {
    identity_verified: boolean
    signature_method: 'electronic' | 'wet_signature'
    witness_required: boolean
    notarization_required: boolean
  }
}

// Validation schema for webhook payloads
const DocuSignWebhookSchema = z.object({
  event: z.string(),
  data: z.object({
    envelopeId: z.string(),
    envelopeSummary: z.object({
      status: z.string(),
      documentsUri: z.string().optional(),
      recipients: z.object({
        signers: z.array(z.object({
          name: z.string(),
          email: z.string(),
          status: z.string(),
          signedDateTime: z.string().optional(),
          deliveredDateTime: z.string().optional()
        }))
      })
    })
  })
})

const HelloSignWebhookSchema = z.object({
  event: z.object({
    event_type: z.string(),
    event_time: z.string(),
    event_hash: z.string(),
    event_metadata: z.object({
      related_signature_id: z.string(),
      reported_for_account_id: z.string()
    })
  }),
  signature_request: z.object({
    signature_request_id: z.string(),
    subject: z.string().optional(),
    message: z.string().optional(),
    signatures: z.array(z.object({
      signature_id: z.string(),
      signer_email_address: z.string(),
      signer_name: z.string(),
      status_code: z.string(),
      signed_at: z.number().optional(),
      last_viewed_at: z.number().optional()
    }))
  })
})

/**
 * POST /api/webhooks/esignature - Handle e-signature webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-signature') || request.headers.get('x-hellosign-signature')
    const provider = determineProvider(request.headers)
    
    if (!signature) {
      return NextResponse.json({
        error: 'Missing webhook signature'
      }, { status: 401 })
    }

    const body = await request.json()
    
    // Verify webhook signature (implement actual verification)
    if (!verifyWebhookSignature(body, signature, provider)) {
      return NextResponse.json({
        error: 'Invalid webhook signature'
      }, { status: 401 })
    }

    // Parse webhook based on provider
    const event = await parseWebhookEvent(body, provider)
    
    console.log('🤖 Aida: Processing e-signature event:', event.event_type)

    // Process the signature event
    await handleSignatureEvent(event)

    return NextResponse.json({
      status: 'processed',
      event_type: event.event_type,
      envelope_id: event.envelope_id,
      timestamp: event.timestamp
    }, { status: 200 })

  } catch (error) {
    console.error('E-signature webhook error:', error)
    
    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Determine e-signature provider from headers
 */
function determineProvider(headers: Headers): 'docusign' | 'hellosign' | 'adobesign' | 'unknown' {
  const userAgent = headers.get('user-agent')?.toLowerCase() || ''
  
  if (userAgent.includes('docusign')) return 'docusign'
  if (userAgent.includes('hellosign') || userAgent.includes('dropbox')) return 'hellosign'
  if (userAgent.includes('adobe')) return 'adobesign'
  
  return 'unknown'
}

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(payload: Record<string, unknown>, signature: string, provider: string): boolean {
  // Implement actual signature verification based on provider
  // This is a simplified version - real implementation would use crypto verification
  
  switch (provider) {
    case 'docusign':
      // DocuSign uses HMAC-SHA256
      return true // TODO: Implement actual verification
    
    case 'hellosign':
      // HelloSign uses HMAC-SHA256
      return true // TODO: Implement actual verification
    
    default:
      return false
  }
}

/**
 * Parse webhook event from different providers into unified format
 */
async function parseWebhookEvent(payload: Record<string, unknown>, provider: string): Promise<ESignatureEvent> {
  switch (provider) {
    case 'docusign':
      return parseDocuSignEvent(payload)
    
    case 'hellosign':
      return parseHelloSignEvent(payload)
    
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Parse DocuSign webhook event
 */
function parseDocuSignEvent(payload: Record<string, unknown>): ESignatureEvent {
  const validatedPayload = DocuSignWebhookSchema.parse(payload)
  
  const eventTypeMap: Record<string, ESignatureEvent['event_type']> = {
    'envelope-sent': 'envelope_sent',
    'envelope-delivered': 'envelope_delivered',
    'envelope-completed': 'envelope_completed',
    'envelope-declined': 'envelope_declined',
    'envelope-voided': 'envelope_declined',
    'recipient-completed': 'recipient_signed'
  }

  const signer = validatedPayload.data.envelopeSummary.recipients.signers[0]
  
  return {
    event_type: eventTypeMap[validatedPayload.event] || 'envelope_sent',
    envelope_id: validatedPayload.data.envelopeId,
    timestamp: new Date().toISOString(),
    recipient_info: {
      name: signer.name,
      email: signer.email,
      status: mapDocuSignStatus(signer.status)
    }
  }
}

/**
 * Parse HelloSign webhook event
 */
function parseHelloSignEvent(payload: Record<string, unknown>): ESignatureEvent {
  const validatedPayload = HelloSignWebhookSchema.parse(payload)
  
  const eventTypeMap: Record<string, ESignatureEvent['event_type']> = {
    'signature_request_sent': 'envelope_sent',
    'signature_request_viewed': 'recipient_viewed',
    'signature_request_signed': 'recipient_signed',
    'signature_request_all_signed': 'envelope_completed',
    'signature_request_declined': 'envelope_declined'
  }

  const signature = validatedPayload.signature_request.signatures[0]
  
  return {
    event_type: eventTypeMap[validatedPayload.event.event_type] || 'envelope_sent',
    envelope_id: validatedPayload.signature_request.signature_request_id,
    timestamp: new Date(validatedPayload.event.event_time).toISOString(),
    recipient_info: {
      name: signature.signer_name,
      email: signature.signer_email_address,
      status: mapHelloSignStatus(signature.status_code)
    }
  }
}

/**
 * Map DocuSign status to unified status
 */
function mapDocuSignStatus(status: string): ESignatureEvent['recipient_info']['status'] {
  const statusMap: Record<string, ESignatureEvent['recipient_info']['status']> = {
    'created': 'pending',
    'sent': 'sent',
    'delivered': 'delivered',
    'signed': 'signed',
    'completed': 'signed',
    'declined': 'declined',
    'voided': 'declined'
  }
  
  return statusMap[status.toLowerCase()] || 'pending'
}

/**
 * Map HelloSign status to unified status
 */
function mapHelloSignStatus(statusCode: string): ESignatureEvent['recipient_info']['status'] {
  const statusMap: Record<string, ESignatureEvent['recipient_info']['status']> = {
    'awaiting_signature': 'sent',
    'signed': 'signed',
    'declined': 'declined',
    'error': 'declined'
  }
  
  return statusMap[statusCode] || 'pending'
}

/**
 * Handle signature event and trigger appropriate workflows
 */
async function handleSignatureEvent(event: ESignatureEvent) {
  console.log(`🤖 Aida: Processing ${event.event_type} for envelope ${event.envelope_id}`)

  // Look up associated workflow and client information
  const workflowContext = await getWorkflowContext(event.envelope_id)
  
  switch (event.event_type) {
    case 'envelope_sent':
      await handleEnvelopeSent(event, workflowContext)
      break
      
    case 'envelope_delivered':
      await handleEnvelopeDelivered(event, workflowContext)
      break
      
    case 'recipient_viewed':
      await handleRecipientViewed(event, workflowContext)
      break
      
    case 'recipient_signed':
      await handleRecipientSigned(event, workflowContext)
      break
      
    case 'envelope_completed':
      await handleEnvelopeCompleted(event, workflowContext)
      break
      
    case 'envelope_declined':
      await handleEnvelopeDeclined(event, workflowContext)
      break
      
    case 'envelope_expired':
      await handleEnvelopeExpired(event, workflowContext)
      break
  }
}

/**
 * Handle envelope sent event
 */
async function handleEnvelopeSent(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: Envelope sent to', event.recipient_info.email)
  
  // Update workflow status
  if (context?.workflow_id) {
    await updateWorkflowStep(context.workflow_id, 'awaiting_signature', 'in_progress')
  }
  
  // Schedule reminder for 3 days if not signed
  await scheduleSignatureReminder(event.envelope_id, 3)
}

/**
 * Handle envelope delivered event
 */
async function handleEnvelopeDelivered(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: Envelope delivered to', event.recipient_info.email)
  
  // Update client communication log
  if (context?.client_id) {
    await logClientInteraction(context.client_id, {
      type: 'esignature_delivered',
      description: `E-signature document delivered to ${event.recipient_info.email}`,
      timestamp: event.timestamp
    })
  }
}

/**
 * Handle recipient viewed event
 */
async function handleRecipientViewed(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: Document viewed by', event.recipient_info.email)
  
  // Cancel immediate reminder, schedule follow-up for 2 days
  await cancelScheduledReminder(event.envelope_id)
  await scheduleSignatureReminder(event.envelope_id, 2)
  
  // Notify attorney if high priority
  if (context?.priority === 'high') {
    await notifyAttorney(context.attorney_id, {
      type: 'document_viewed',
      message: `${event.recipient_info.name} viewed the document but hasn't signed yet`,
      envelope_id: event.envelope_id
    })
  }
}

/**
 * Handle recipient signed event
 */
async function handleRecipientSigned(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: Document signed by', event.recipient_info.email)
  
  // Cancel any pending reminders
  await cancelScheduledReminder(event.envelope_id)
  
  // Update workflow progress
  if (context?.workflow_id) {
    await updateWorkflowStep(context.workflow_id, 'awaiting_signature', 'completed')
  }
  
  // Log Alabama compliance if applicable
  if (context?.alabama_compliance_required) {
    await logAlabamaCompliance(event.envelope_id, {
      signature_method: 'electronic',
      signer_verified: true,
      compliance_date: event.timestamp
    })
  }
}

/**
 * Handle envelope completed event (all signatures collected)
 */
async function handleEnvelopeCompleted(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: All signatures completed for envelope', event.envelope_id)
  
  // Trigger post-signature workflow
  if (context?.workflow_id) {
    await triggerPostSignatureWorkflow(context.workflow_id, event)
  }
  
  // Send welcome email for new client engagements
  if (context?.document_type === 'engagement_agreement') {
    await sendClientWelcomeEmail(context.client_id, {
      client_name: event.recipient_info.name,
      attorney_name: context.attorney_name,
      practice_area: context.practice_area
    })
  }
  
  // Schedule next steps
  await scheduleNextSteps(context, event)
}

/**
 * Handle envelope declined event
 */
async function handleEnvelopeDeclined(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: Document declined by', event.recipient_info.email)
  
  // Update workflow to show declined status
  if (context?.workflow_id) {
    await updateWorkflowStep(context.workflow_id, 'awaiting_signature', 'failed')
  }
  
  // Notify attorney immediately
  await notifyAttorney(context.attorney_id, {
    type: 'signature_declined',
    message: `${event.recipient_info.name} declined to sign the document`,
    envelope_id: event.envelope_id,
    priority: 'high'
  })
  
  // Suggest follow-up actions
  await suggestFollowUpActions(context.workflow_id, [
    'Schedule call with client to discuss concerns',
    'Revise document terms if needed',
    'Send new version for signature'
  ])
}

/**
 * Handle envelope expired event
 */
async function handleEnvelopeExpired(event: ESignatureEvent, context: Record<string, unknown>) {
  console.log('🤖 Aida: Document expired for', event.recipient_info.email)
  
  // Similar handling to declined, but with different messaging
  await notifyAttorney(context.attorney_id, {
    type: 'signature_expired',
    message: `Signature deadline expired for ${event.recipient_info.name}`,
    envelope_id: event.envelope_id,
    priority: 'medium'
  })
}

/**
 * Helper functions (simplified implementations)
 */

async function getWorkflowContext(_envelopeId: string): Promise<Record<string, unknown>> {
  // In real implementation, query database for envelope context
  return {
    workflow_id: 'wf_123',
    client_id: 'client_456',
    attorney_id: 'atty_789',
    document_type: 'engagement_agreement',
    alabama_compliance_required: true,
    priority: 'high'
  }
}

async function updateWorkflowStep(workflowId: string, stepId: string, status: string) {
  console.log(`🤖 Aida: Updating workflow ${workflowId}, step ${stepId} to ${status}`)
  // Update workflow database
}

async function scheduleSignatureReminder(envelopeId: string, days: number) {
  console.log(`🤖 Aida: Scheduling reminder for envelope ${envelopeId} in ${days} days`)
  // Schedule reminder email/notification
}

async function cancelScheduledReminder(envelopeId: string) {
  console.log(`🤖 Aida: Cancelling scheduled reminders for envelope ${envelopeId}`)
  // Cancel pending reminders
}

async function logClientInteraction(clientId: string, interaction: Record<string, unknown>) {
  console.log(`🤖 Aida: Logging interaction for client ${clientId}:`, interaction.type)
  // Log to client communication history
}

async function notifyAttorney(attorneyId: string, notification: Record<string, unknown>) {
  console.log(`🤖 Aida: Notifying attorney ${attorneyId}:`, notification.type)
  // Send notification to attorney
}

async function logAlabamaCompliance(envelopeId: string, _complianceData: Record<string, unknown>) {
  console.log(`🤖 Aida: Logging Alabama compliance for envelope ${envelopeId}`)
  // Record compliance data for audit trail
}

async function triggerPostSignatureWorkflow(workflowId: string, event: ESignatureEvent) {
  console.log(`🤖 Aida: Triggering post-signature workflow for ${workflowId}`)
  
  // Call workflow trigger API
  const response = await fetch('/api/workflows/trigger', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'esignature_completion',
      source: 'webhook',
      metadata: {
        envelope_id: event.envelope_id,
        workflow_id: workflowId,
        completion_time: event.timestamp
      },
      priority: 'high'
    })
  })
  
  if (response.ok) {
    console.log('🤖 Aida: Post-signature workflow initiated successfully')
  }
}

async function sendClientWelcomeEmail(clientId: string, _emailData: Record<string, unknown>) {
  console.log(`🤖 Aida: Sending welcome email to client ${clientId}`)
  // Send personalized welcome email
}

async function scheduleNextSteps(context: Record<string, unknown>, _event: ESignatureEvent) {
  console.log('🤖 Aida: Scheduling next steps based on document type')
  
  // Schedule appropriate follow-up actions based on document type
  if (context.document_type === 'engagement_agreement') {
    // Schedule initial consultation
    // Setup client portal access
    // Begin matter setup
  }
}

async function suggestFollowUpActions(workflowId: string, actions: string[]) {
  console.log(`🤖 Aida: Suggesting follow-up actions for workflow ${workflowId}:`, actions)
  // Add suggested actions to workflow
}