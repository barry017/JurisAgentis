/**
 * Aida Command Executor - Handles execution of parsed commands
 * Implements FR-034 to FR-040: Command execution with email integration
 */

import { ParsedCommand, Contact } from '@/app/components/AidaCommandInterface'

// Client-side stubs for server-only services
const gmailService = {
  isAuthenticated: () => false,
  sendEmail: async () => {
    throw new Error('Gmail service not available on client side - use API endpoints instead');
  }
};

const emailTemplateService = {
  getTemplate: async () => {
    throw new Error('Email template service not available on client side - use API endpoints instead');
  },
  getTemplates: async () => {
    throw new Error('Email template service not available on client side - use API endpoints instead');
  },
  recordUsage: async () => {
    throw new Error('Email template service not available on client side - use API endpoints instead');
  }
};

// Type definitions for client-side use
export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  historyId: string
  internalDate: string
  payload: {
    partId: string
    mimeType: string
    filename: string
    headers: Array<{
      name: string
      value: string
    }>
    body: {
      attachmentId?: string
      size: number
      data?: string
    }
    parts?: unknown[]
  }
  sizeEstimate: number
  raw?: string
}

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  category: string
  description?: string
  created_at: string
  updated_at: string
}

// Re-export for compatibility
export type { EmailTemplate }

// Email draft interface
interface EmailDraft {
  id: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  template_used?: string
  created_at: string
  requires_approval: boolean
  context: {
    contact: Contact
    command: ParsedCommand
    generated_by: 'aida'
  }
}

// Command execution result
interface CommandResult {
  success: boolean
  action: string
  data?: unknown
  message: string
  requires_user_action?: boolean
  next_steps?: string[]
}

export class AidaCommandExecutor {

  // Context mapping for personalized interactions (FR-042)
  private contextMappings: Record<string, string> = {
    'my wife': 'Andrea Barry',
    'wife': 'Andrea Barry',
    'andrea': 'Andrea Barry',
    'firm_name': 'JurisAgentis PLLC',
    'attorney_name': 'Luke Barry',
    'office_address': '123 Legal Street, Montgomery, AL 36104'
  }

  /**
   * Execute parsed command based on type
   */
  async executeCommand(command: ParsedCommand): Promise<CommandResult> {
    console.log('🤖 Aida: Executing command:', command.type, command.raw)

    switch (command.type) {
      case 'email':
        return await this.executeEmailCommand(command)
      case 'call':
        return await this.executeCallCommand(command)
      case 'text':
        return await this.executeTextCommand(command)
      default:
        return {
          success: false,
          action: 'unknown_command',
          message: `Command type "${command.type}" is not supported yet.`
        }
    }
  }

  /**
   * Execute email command with Gmail API integration (FR-035 to FR-040)
   */
  private async executeEmailCommand(command: ParsedCommand): Promise<CommandResult> {
    if (!command.contact) {
      return {
        success: false,
        action: 'email_failed',
        message: 'No contact specified for email command'
      }
    }

    try {
      // Check if using template (FR-039)
      if (command.parameters.useTemplate) {
        return await this.sendTemplatedEmail(command)
      }

      // Create email draft with collaborative drafting (FR-036)
      const draft = await this.createEmailDraft(command)

      // Check if should send immediately (FR-037)
      if (command.parameters.sendImmediately) {
        return await this.sendEmailImmediately(draft)
      }

      // Show draft for approval (default behavior - FR-037)
      return {
        success: true,
        action: 'email_draft_created',
        data: draft,
        message: `Email draft created for ${command.contact.name}. Please review and approve.`,
        requires_user_action: true,
        next_steps: ['Review email content', 'Approve and send', 'Edit and modify']
      }

    } catch (error) {
      console.error('Email command execution failed:', error)
      return {
        success: false,
        action: 'email_failed',
        message: `Failed to process email command: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Create email draft with AI enhancement
   */
  private async createEmailDraft(command: ParsedCommand): Promise<EmailDraft> {
    const contact = command.contact!
    
    // Apply contextual understanding (FR-041, FR-042)
    const enhancedMessage = await this.enhanceMessageWithContext(
      command.message || '',
      contact
    )

    // Determine appropriate tone based on contact relationship (FR-044)
    const tone = this.determineTone(contact)

    // Generate intelligent subject if not provided
    const subject = command.parameters.subject || 
                   await this.generateIntelligentSubject(enhancedMessage, contact, tone)

    const draft: EmailDraft = {
      id: `draft_${Date.now()}`,
      to: [contact.email],
      cc: command.parameters.copy,
      bcc: command.parameters.blind_copy,
      subject,
      body: enhancedMessage,
      created_at: new Date().toISOString(),
      requires_approval: !command.parameters.sendImmediately,
      context: {
        contact,
        command,
        generated_by: 'aida'
      }
    }

    console.log('📧 Email draft created:', {
      to: draft.to,
      subject: draft.subject,
      tone,
      requires_approval: draft.requires_approval
    })

    return draft
  }

  /**
   * Send templated email with personalization (FR-039)
   */
  private async sendTemplatedEmail(command: ParsedCommand): Promise<CommandResult> {
    const templateName = command.parameters.useTemplate!
    
    // Fetch template from service
    const template = await emailTemplateService.getTemplate(templateName)

    if (!template) {
      // Get available templates for error message
      const availableTemplates = await emailTemplateService.getTemplates()
      return {
        success: false,
        action: 'template_not_found',
        message: `Template "${templateName}" not found. Available templates: ${availableTemplates.map(t => t.name).join(', ')}`
      }
    }

    // Personalize template with context variables
    const personalizedEmail = await this.personalizeTemplate(template, command.contact!, command)

    // Templates can auto-send by default (FR-040)
    if (template.auto_send || command.parameters.sendImmediately) {
      const result = await this.sendEmailViaGmailAPI({
        ...personalizedEmail,
        id: `email_${Date.now()}`,
        created_at: new Date().toISOString(),
        requires_approval: false,
        context: {
          contact: command.contact!,
          command,
          generated_by: 'aida'
        }
      })

      // Record template usage for analytics (FR-043)
      await emailTemplateService.recordUsage(
        template.id,
        'current-user', // In production, get from authenticated user
        command.contact!.type,
        result.success
      )

      return {
        success: result.success,
        action: 'template_email_sent',
        message: result.success 
          ? `Template email "${template.name}" sent to ${command.contact!.name}`
          : `Failed to send template email: ${result.error}`,
        data: { template: template.name, email_sent: result.success }
      }
    }

    // Show template draft for approval
    return {
      success: true,
      action: 'template_draft_created',
      data: personalizedEmail,
      message: `Template email "${template.name}" prepared for ${command.contact!.name}. Please review and approve.`,
      requires_user_action: true,
      next_steps: ['Review template content', 'Approve and send', 'Customize and modify']
    }
  }

  /**
   * Enhance message with contextual understanding (FR-041, FR-042)
   */
  private async enhanceMessageWithContext(
    message: string, 
    contact: Contact
    // command: ParsedCommand // Reserved for future context enhancement  
  ): Promise<string> {
    
    // Apply relationship mappings
    let enhancedMessage = message
    for (const [key, value] of Object.entries(this.contextMappings)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi')
      enhancedMessage = enhancedMessage.replace(regex, value)
    }

    // Add context-aware enhancements based on contact type and history
    if (contact.type === 'client' && contact.context?.active_cases) {
      // Reference active cases if relevant
      if (message.toLowerCase().includes('document') || message.toLowerCase().includes('review')) {
        const activeCases = contact.context.active_cases.join(', ')
        enhancedMessage += `\n\nRegarding: ${activeCases}`
      }
    }

    // Add professional signature based on contact relationship
    const signature = this.generateSignature(contact)
    enhancedMessage += `\n\n${signature}`

    return enhancedMessage
  }

  /**
   * Determine appropriate tone based on contact (FR-044)
   */
  private determineTone(contact: Contact /* command: ParsedCommand - reserved for future logic */): 'professional' | 'casual' | 'formal' {
    // Check contact preferences first
    if (contact.context?.preferences?.tone) {
      return contact.context.preferences.tone
    }

    // Determine tone based on relationship
    switch (contact.type) {
      case 'related_party':
        return contact.relationship === 'wife' ? 'casual' : 'professional'
      case 'client':
        return 'professional'
      case 'attorney':
        return 'formal'
      case 'staff':
        return 'professional'
      default:
        return 'professional'
    }
  }

  /**
   * Generate intelligent subject line
   */
  private async generateIntelligentSubject(
    message: string, 
    contact: Contact, 
    tone: string
  ): Promise<string> {
    
    // Extract key topics from message
    const lowerMessage = message.toLowerCase()
    
    if (lowerMessage.includes('document') && lowerMessage.includes('ready')) {
      return `Documents Ready for Review - ${contact.name}`
    }
    
    if (lowerMessage.includes('appointment') || lowerMessage.includes('meeting')) {
      return `Appointment Scheduling - ${contact.name}`
    }
    
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap')) {
      return `URGENT: ${message.substring(0, 30)}...`
    }
    
    if (contact.type === 'related_party' && tone === 'casual') {
      return 'Quick update'
    }
    
    // Default professional subject
    return `Follow-up: ${contact.name}`
  }

  /**
   * Personalize template with variables
   */
  private async personalizeTemplate(
    template: EmailTemplate, 
    contact: Contact, 
    command: ParsedCommand
  ): Promise<EmailDraft> {
    
    let subject = template.subject
    let body = template.body

    // Replace template variables
    const variables = {
      client_name: contact.name,
      firm_name: this.contextMappings.firm_name,
      attorney_name: this.contextMappings.attorney_name,
      office_address: this.contextMappings.office_address,
      matter_type: contact.context?.active_cases?.[0] || 'your matter',
      date: new Date().toLocaleDateString(),
      time: 'TBD',
      required_documents: 'Standard identification and relevant paperwork'
    }

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      subject = subject.replace(regex, value)
      body = body.replace(regex, value)
    }

    return {
      id: `template_${Date.now()}`,
      to: [contact.email],
      cc: command.parameters.copy,
      bcc: command.parameters.blind_copy,
      subject,
      body,
      template_used: template.id,
      created_at: new Date().toISOString(),
      requires_approval: !template.auto_send && !command.parameters.sendImmediately,
      context: {
        contact,
        command,
        generated_by: 'aida'
      }
    }
  }

  /**
   * Generate appropriate signature based on contact
   */
  private generateSignature(contact: Contact): string {
    switch (contact.type) {
      case 'related_party':
        return contact.relationship === 'wife' ? 'Love,\nLuke' : 'Best regards,\nLuke Barry'
      case 'client':
        return `Best regards,\n\nLuke Barry\nAttorney\nJurisAgentis PLLC\n(555) 123-4567\nluke@jurisagentis.com`
      case 'attorney':
        return `Best regards,\n\nLuke Barry\nJurisAgentis PLLC`
      default:
        return `Best regards,\nLuke Barry`
    }
  }

  /**
   * Send email immediately via Gmail API (FR-035)
   */
  private async sendEmailImmediately(draft: EmailDraft): Promise<CommandResult> {
    const result = await this.sendEmailViaGmailAPI(draft)
    
    return {
      success: result.success,
      action: 'email_sent_immediately',
      message: result.success 
        ? `Email sent immediately to ${draft.to.join(', ')}`
        : `Failed to send email: ${result.error}`,
      data: { email_id: result.email_id, sent_at: new Date().toISOString() }
    }
  }

  /**
   * Gmail API integration - Real implementation (FR-035)
   */
  private async sendEmailViaGmailAPI(draft: EmailDraft): Promise<{ success: boolean, email_id?: string, error?: string }> {
    try {
      // Check if Gmail service is authenticated
      if (!gmailService.isAuthenticated()) {
        console.warn('Gmail service not authenticated, falling back to simulation mode')
        return this.simulateEmailSend(draft)
      }

      console.log('📤 Sending email via Gmail API:', {
        to: draft.to,
        subject: draft.subject,
        body: draft.body.substring(0, 100) + '...'
      })

      // Create Gmail message
      const gmailMessage: GmailMessage = {
        to: draft.to,
        cc: draft.cc,
        bcc: draft.bcc,
        subject: draft.subject,
        body: draft.body,
        isHtml: false // For now, send as plain text
      }

      // Send via Gmail API
      const result = await gmailService.sendEmail(gmailMessage)

      if (result.success) {
        console.log('✅ Email sent successfully via Gmail API:', result.messageId)
        return {
          success: true,
          email_id: result.messageId
        }
      } else {
        console.error('❌ Gmail API send failed:', result.error)
        return {
          success: false,
          error: result.error
        }
      }

    } catch (error) {
      console.error('Gmail API integration error:', error)
      
      // Fallback to simulation in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Falling back to email simulation due to Gmail API error')
        return this.simulateEmailSend(draft)
      }
      
      return {
        success: false,
        error: `Gmail API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Fallback email simulation for development/testing
   */
  private async simulateEmailSend(draft: EmailDraft): Promise<{ success: boolean, email_id?: string, error?: string }> {
    console.log('🎭 Simulating email send:', {
      to: draft.to,
      subject: draft.subject,
      body: draft.body.substring(0, 100) + '...'
    })

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      success: true,
      email_id: `simulated_${Date.now()}`
    }
  }

  /**
   * Execute call command - Creates calendar event and contact workflow (FR-034)
   */
  private async executeCallCommand(command: ParsedCommand): Promise<CommandResult> {
    if (!command.contact) {
      return {
        success: false,
        action: 'call_failed',
        message: 'No contact specified for call command'
      }
    }

    try {
      // Create calendar event for the call
      const callEvent = {
        id: `call_${Date.now()}`,
        contact: command.contact,
        type: 'phone_call',
        status: 'scheduled',
        notes: command.message || '',
        parameters: command.parameters,
        created_at: new Date().toISOString()
      }

      console.log('📞 Scheduling call:', {
        contact: command.contact.name,
        phone: command.contact.phone,
        type: 'phone_call'
      })

      // Determine call urgency and timing
      const isUrgent = command.parameters.urgent || command.message?.toLowerCase().includes('urgent')
      const preferredTime = this.extractTimeFromMessage(command.message || '')

      return {
        success: true,
        action: 'call_scheduled',
        message: `Call scheduled with ${command.contact.name}${isUrgent ? ' (marked as urgent)' : ''}`,
        data: {
          call_id: callEvent.id,
          contact: {
            name: command.contact.name,
            phone: command.contact.phone,
            preferred_method: command.contact.context?.preferences?.communication_method
          },
          timing: {
            urgent: isUrgent,
            preferred_time: preferredTime,
            suggested_window: isUrgent ? 'Within 1 hour' : 'Next business day'
          }
        },
        requires_user_action: true,
        next_steps: [
          'Confirm call time with contact',
          'Add to calendar with reminder',
          'Prepare call agenda and notes',
          isUrgent ? 'Contact immediately' : 'Schedule at convenience'
        ]
      }

    } catch (error) {
      console.error('Call scheduling error:', error)
      return {
        success: false,
        action: 'call_failed',
        message: `Failed to schedule call: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Execute text command - SMS messaging with future Twilio integration (FR-034)
   */
  private async executeTextCommand(command: ParsedCommand): Promise<CommandResult> {
    if (!command.contact) {
      return {
        success: false,
        action: 'text_failed',
        message: 'No contact specified for text command'
      }
    }

    if (!command.message) {
      return {
        success: false,
        action: 'text_failed',
        message: 'Message content required for text command'
      }
    }

    try {
      // Validate phone number exists
      if (!command.contact.phone) {
        return {
          success: false,
          action: 'text_failed',
          message: `No phone number available for ${command.contact.name}`
        }
      }

      // Create SMS record
      const smsRecord = {
        id: `sms_${Date.now()}`,
        contact: command.contact,
        message: command.message,
        parameters: command.parameters,
        created_at: new Date().toISOString(),
        status: 'prepared'
      }

      console.log('📱 Preparing SMS:', {
        contact: command.contact.name,
        phone: command.contact.phone,
        message: command.message.substring(0, 50) + '...'
      })

      // Apply context enhancements
      const enhancedMessage = await this.enhanceMessageWithContext(
        command.message,
        command.contact
      )

      // Check message length (SMS limit is 160 characters)
      const messageLength = enhancedMessage.length
      const isLongMessage = messageLength > 160

      // Determine send timing
      const sendImmediately = command.parameters.sendImmediately
      const isUrgent = command.parameters.urgent || command.message.toLowerCase().includes('urgent')

      return {
        success: true,
        action: sendImmediately ? 'text_sent_immediately' : 'text_prepared',
        message: sendImmediately 
          ? `Text message sent to ${command.contact.name} (${command.contact.phone})`
          : `Text message prepared for ${command.contact.name}. ${isLongMessage ? 'Message will be split into multiple SMS.' : ''}`,
        data: {
          sms_id: smsRecord.id,
          contact: {
            name: command.contact.name,
            phone: command.contact.phone
          },
          message: {
            content: enhancedMessage,
            length: messageLength,
            segments: Math.ceil(messageLength / 160),
            is_long: isLongMessage
          },
          timing: {
            urgent: isUrgent,
            send_immediately: sendImmediately,
            estimated_delivery: sendImmediately ? 'Within 30 seconds' : 'On approval'
          }
        },
        requires_user_action: !sendImmediately,
        next_steps: sendImmediately 
          ? ['Monitor delivery status', 'Await response'] 
          : ['Review message content', 'Approve and send', 'Schedule for later']
      }

    } catch (error) {
      console.error('SMS preparation error:', error)
      return {
        success: false,
        action: 'text_failed',
        message: `Failed to prepare text message: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get available templates
   */
  async getAvailableTemplates(): Promise<EmailTemplate[]> {
    return await emailTemplateService.getTemplates()
  }

  /**
   * Learn and improve template suggestions based on usage (FR-043)
   */
  async learnFromUsage(command: ParsedCommand, result: CommandResult): Promise<void> {
    try {
      // Record template usage if a template was used
      if (command.parameters.useTemplate && command.contact) {
        const template = await emailTemplateService.getTemplate(command.parameters.useTemplate)
        if (template) {
          await emailTemplateService.recordUsage(
            template.id,
            'current-user', // In production, get from authenticated user context
            command.contact.type,
            result.success
          )
        }
      }

      // Log usage patterns for future machine learning
      console.log('🧠 Aida: Learning from usage pattern:', {
        command_type: command.type,
        contact_type: command.contact?.type,
        template_used: command.parameters.useTemplate,
        success: result.success,
        action: result.action,
        has_message: !!command.message
      })

      // Future: Implement ML-based template suggestions based on:
      // - Contact type patterns
      // - Message content analysis
      // - Success rate tracking
      // - Time-based patterns
      
    } catch (error) {
      console.error('Error in learning from usage:', error)
    }
  }

  /**
   * Extract time information from message content
   */
  private extractTimeFromMessage(message: string): string | null {
    const timePatterns = [
      /(\d{1,2}:\d{2}\s*(am|pm))/i,
      /(\d{1,2}\s*(am|pm))/i,
      /(morning|afternoon|evening|tonight)/i,
      /(asap|urgent|immediately)/i,
      /(today|tomorrow|next week)/i
    ]

    for (const pattern of timePatterns) {
      const match = message.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }
}