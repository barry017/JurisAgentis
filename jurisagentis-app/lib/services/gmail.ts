/**
 * Gmail API Service - Real Gmail integration for email automation
 * Implements FR-035 to FR-040: Gmail API integration with OAuth2 authentication
 */

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export interface GmailMessage {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  isHtml?: boolean
  attachments?: GmailAttachment[]
}

export interface GmailAttachment {
  filename: string
  content: string | Buffer
  contentType: string
}

export interface GmailSendResult {
  success: boolean
  messageId?: string
  error?: string
  threadId?: string
}

export interface GmailDraft {
  draftId: string
  messageId: string
  message: GmailMessage
}

export class GmailService {
  private oauth2Client: OAuth2Client
  private gmail: ReturnType<typeof google.gmail>

  constructor() {
    // Initialize OAuth2 client with credentials
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    )

    // Set credentials if available
    if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
      this.oauth2Client.setCredentials({
        access_token: process.env.GOOGLE_ACCESS_TOKEN,
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        scope: 'https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.send',
        token_type: 'Bearer'
      })
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly'
    ]

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    })
  }

  /**
   * Set credentials from OAuth2 callback
   */
  async setCredentialsFromCode(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)
  }

  /**
   * Check if the service is authenticated
   */
  isAuthenticated(): boolean {
    const credentials = this.oauth2Client.credentials
    return !!(credentials && credentials.access_token)
  }

  /**
   * Send email via Gmail API (FR-035)
   */
  async sendEmail(message: GmailMessage): Promise<GmailSendResult> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'Gmail service not authenticated. Please complete OAuth2 flow.'
        }
      }

      // Create email in RFC 2822 format
      const emailContent = this.createEmailContent(message)

      // Send email
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }
      })

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      }

    } catch (error) {
      console.error('Gmail send error:', error)
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
          return {
            success: false,
            error: 'Gmail authentication expired. Please re-authenticate.'
          }
        }
        
        if (error.message.includes('quotaExceeded')) {
          return {
            success: false,
            error: 'Gmail API quota exceeded. Please try again later.'
          }
        }
      }

      return {
        success: false,
        error: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Create draft email (FR-036)
   */
  async createDraft(message: GmailMessage): Promise<GmailDraft | null> {
    try {
      if (!this.isAuthenticated()) {
        throw new Error('Gmail service not authenticated')
      }

      const emailContent = this.createEmailContent(message)

      const response = await this.gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: Buffer.from(emailContent).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          }
        }
      })

      return {
        draftId: response.data.id,
        messageId: response.data.message.id,
        message
      }

    } catch (error) {
      console.error('Gmail draft creation error:', error)
      return null
    }
  }

  /**
   * Send existing draft (FR-037)
   */
  async sendDraft(draftId: string): Promise<GmailSendResult> {
    try {
      if (!this.isAuthenticated()) {
        return {
          success: false,
          error: 'Gmail service not authenticated'
        }
      }

      const response = await this.gmail.users.drafts.send({
        userId: 'me',
        requestBody: {
          id: draftId
        }
      })

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      }

    } catch (error) {
      console.error('Gmail draft send error:', error)
      return {
        success: false,
        error: `Failed to send draft: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get user's Gmail profile
   */
  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number } | null> {
    try {
      if (!this.isAuthenticated()) {
        return null
      }

      const response = await this.gmail.users.getProfile({
        userId: 'me'
      })

      return {
        emailAddress: response.data.emailAddress,
        messagesTotal: response.data.messagesTotal
      }

    } catch (error) {
      console.error('Gmail profile error:', error)
      return null
    }
  }

  /**
   * Create RFC 2822 formatted email content
   */
  private createEmailContent(message: GmailMessage): string {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    let content = ''

    // Headers
    content += `To: ${message.to.join(', ')}\r\n`
    if (message.cc && message.cc.length > 0) {
      content += `Cc: ${message.cc.join(', ')}\r\n`
    }
    if (message.bcc && message.bcc.length > 0) {
      content += `Bcc: ${message.bcc.join(', ')}\r\n`
    }
    content += `Subject: ${message.subject}\r\n`
    content += `MIME-Version: 1.0\r\n`

    if (message.attachments && message.attachments.length > 0) {
      // Multipart message with attachments
      content += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`
      
      // Message body part
      content += `--${boundary}\r\n`
      content += `Content-Type: ${message.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8\r\n\r\n`
      content += `${message.body}\r\n\r\n`

      // Attachment parts
      for (const attachment of message.attachments) {
        content += `--${boundary}\r\n`
        content += `Content-Type: ${attachment.contentType}\r\n`
        content += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
        content += `Content-Transfer-Encoding: base64\r\n\r\n`
        
        const attachmentBase64 = Buffer.isBuffer(attachment.content) 
          ? attachment.content.toString('base64')
          : Buffer.from(attachment.content).toString('base64')
        
        content += `${attachmentBase64}\r\n\r\n`
      }

      content += `--${boundary}--`
    } else {
      // Simple message without attachments
      content += `Content-Type: ${message.isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8\r\n\r\n`
      content += message.body
    }

    return content
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const credentials = this.oauth2Client.credentials
      if (credentials && credentials.refresh_token) {
        const { credentials: newCredentials } = await this.oauth2Client.refreshAccessToken()
        this.oauth2Client.setCredentials(newCredentials)
        return true
      }
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  /**
   * Search for emails (for future template learning)
   */
  async searchEmails(query: string, maxResults: number = 10): Promise<unknown[]> {
    try {
      if (!this.isAuthenticated()) {
        return []
      }

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults
      })

      return response.data.messages || []
    } catch (error) {
      console.error('Gmail search error:', error)
      return []
    }
  }
}

// Singleton instance
export const gmailService = new GmailService()