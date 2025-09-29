import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface EmailProvider {
  id: string
  name: string
  type: 'gmail' | 'outlook' | 'exchange'
  user_id: string
  email_address: string
  access_token: string
  refresh_token: string
  expires_at: string
  sync_enabled: boolean
  last_sync: string
  created_at: string
  updated_at: string
  settings: {
    auto_sync_emails: boolean
    sync_sent_items: boolean
    sync_drafts: boolean
    sync_frequency: 'real-time' | 'every-5-min' | 'every-15-min' | 'hourly'
    email_signature: string
    auto_categorize: boolean
    case_linking_enabled: boolean
    client_linking_enabled: boolean
    sync_labels: string[]
    sync_folders: string[]
    retention_days: number
  }
}

interface EmailMessage {
  id: string
  provider_id: string
  external_id: string
  thread_id: string
  subject: string
  from: {
    email: string
    name?: string
  }
  to: Array<{
    email: string
    name?: string
  }>
  cc?: Array<{
    email: string
    name?: string
  }>
  bcc?: Array<{
    email: string
    name?: string
  }>
  body_text?: string
  body_html?: string
  received_date: string
  sent_date?: string
  is_read: boolean
  is_important: boolean
  is_draft: boolean
  labels: string[]
  folders: string[]
  attachments: Array<{
    id: string
    filename: string
    size: number
    content_type: string
    attachment_id: string
  }>
  case_id?: string
  client_id?: string
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
  last_synced?: string
}

interface EmailTemplate {
  id: string
  user_id: string
  name: string
  subject: string
  body_html: string
  body_text: string
  category: string
  variables: Array<{
    name: string
    description: string
    default_value?: string
  }>
  is_active: boolean
  created_at: string
  updated_at: string
}

interface SyncResult {
  provider_id: string
  sync_started: string
  sync_completed: string
  emails_imported: number
  emails_updated: number
  emails_categorized: number
  attachments_synced: number
  errors: Array<{
    email_id: string
    error: string
    details: string
  }>
  status: 'success' | 'partial' | 'failed'
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
  meta?: {
    version: string
    timestamp: string
    request_id: string
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Mock email providers
const mockProviders: EmailProvider[] = [
  {
    id: '1',
    name: 'Gmail - sarah@jurisagentis.com',
    type: 'gmail',
    user_id: '1',
    email_address: 'sarah@jurisagentis.com',
    access_token: 'gmail_access_token_mock',
    refresh_token: 'gmail_refresh_token_mock',
    expires_at: '2024-12-31T23:59:59Z',
    sync_enabled: true,
    last_sync: '2024-03-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-01T12:00:00Z',
    settings: {
      auto_sync_emails: true,
      sync_sent_items: true,
      sync_drafts: false,
      sync_frequency: 'every-5-min',
      email_signature: 'Best regards,\nSarah Johnson\nJurisAgentis Legal\nsarah@jurisagentis.com',
      auto_categorize: true,
      case_linking_enabled: true,
      client_linking_enabled: true,
      sync_labels: ['legal', 'clients', 'court'],
      sync_folders: [],
      retention_days: 365
    }
  },
  {
    id: '2',
    name: 'Outlook - michael@jurisagentis.com',
    type: 'outlook',
    user_id: '2',
    email_address: 'michael@jurisagentis.com',
    access_token: 'outlook_access_token_mock',
    refresh_token: 'outlook_refresh_token_mock',
    expires_at: '2024-12-31T23:59:59Z',
    sync_enabled: true,
    last_sync: '2024-02-29T18:00:00Z',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-29T18:00:00Z',
    settings: {
      auto_sync_emails: true,
      sync_sent_items: true,
      sync_drafts: true,
      sync_frequency: 'every-15-min',
      email_signature: 'Michael Chen\nSenior Attorney\nJurisAgentis Legal\nmichael@jurisagentis.com\n(555) 123-4567',
      auto_categorize: false,
      case_linking_enabled: true,
      client_linking_enabled: true,
      sync_labels: [],
      sync_folders: ['Legal', 'Clients', 'Court Communications'],
      retention_days: 730
    }
  }
]

// Mock email messages
const mockEmails: EmailMessage[] = [
  {
    id: '1',
    provider_id: '1',
    external_id: 'gmail_msg_123456',
    thread_id: 'gmail_thread_789',
    subject: 'Corporate Formation Documents - TechStartup Inc.',
    from: {
      email: 'legal@techstartup.com',
      name: 'John Doe'
    },
    to: [
      {
        email: 'sarah@jurisagentis.com',
        name: 'Sarah Johnson'
      }
    ],
    body_text: 'Hi Sarah,\n\nThank you for the corporate formation documents. Everything looks good. When can we schedule the next meeting?\n\nBest regards,\nJohn',
    body_html: '<p>Hi Sarah,</p><p>Thank you for the corporate formation documents. Everything looks good. When can we schedule the next meeting?</p><p>Best regards,<br>John</p>',
    received_date: '2024-03-01T10:30:00Z',
    is_read: true,
    is_important: false,
    is_draft: false,
    labels: ['legal', 'clients'],
    folders: [],
    attachments: [],
    case_id: '1',
    client_id: '1',
    created_at: '2024-03-01T10:30:00Z',
    updated_at: '2024-03-01T10:30:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T12:00:00Z'
  },
  {
    id: '2',
    provider_id: '2',
    external_id: 'outlook_msg_456789',
    thread_id: 'outlook_thread_abc',
    subject: 'Court Hearing Reschedule - Smith vs. Smith',
    from: {
      email: 'clerk@suffolkcourt.gov',
      name: 'Court Clerk'
    },
    to: [
      {
        email: 'michael@jurisagentis.com',
        name: 'Michael Chen'
      }
    ],
    cc: [
      {
        email: 'opposing@wilsonlaw.com',
        name: 'Wilson & Associates'
      }
    ],
    body_text: 'Attorney Chen,\n\nThe hearing scheduled for March 10, 2024 at 9:00 AM has been rescheduled to March 15, 2024 at 2:00 PM.\n\nPlease confirm receipt.\n\nCourt Administration',
    body_html: '<p>Attorney Chen,</p><p>The hearing scheduled for March 10, 2024 at 9:00 AM has been rescheduled to March 15, 2024 at 2:00 PM.</p><p>Please confirm receipt.</p><p>Court Administration</p>',
    received_date: '2024-02-28T14:15:00Z',
    is_read: true,
    is_important: true,
    is_draft: false,
    labels: [],
    folders: ['Legal', 'Court Communications'],
    attachments: [
      {
        id: '1',
        filename: 'hearing_reschedule_notice.pdf',
        size: 156789,
        content_type: 'application/pdf',
        attachment_id: 'att_court_123'
      }
    ],
    case_id: '3',
    client_id: '2',
    created_at: '2024-02-28T14:15:00Z',
    updated_at: '2024-02-28T14:15:00Z',
    sync_status: 'synced',
    last_synced: '2024-02-29T18:00:00Z'
  }
]

// Mock email templates
const mockTemplates: EmailTemplate[] = [
  {
    id: '1',
    user_id: '1',
    name: 'Initial Client Consultation Follow-up',
    subject: 'Follow-up: Initial Consultation - {{client_name}}',
    body_html: '<p>Dear {{client_name}},</p><p>Thank you for taking the time to meet with us today. Based on our discussion, I wanted to follow up with next steps for your {{case_type}} matter.</p><p>Next Steps:</p><ul><li>{{next_step_1}}</li><li>{{next_step_2}}</li></ul><p>Please don\'t hesitate to reach out if you have any questions.</p><p>Best regards,<br>{{attorney_name}}</p>',
    body_text: 'Dear {{client_name}},\n\nThank you for taking the time to meet with us today. Based on our discussion, I wanted to follow up with next steps for your {{case_type}} matter.\n\nNext Steps:\n- {{next_step_1}}\n- {{next_step_2}}\n\nPlease don\'t hesitate to reach out if you have any questions.\n\nBest regards,\n{{attorney_name}}',
    category: 'Client Communication',
    variables: [
      { name: 'client_name', description: 'Client full name' },
      { name: 'case_type', description: 'Type of legal matter' },
      { name: 'next_step_1', description: 'First next step' },
      { name: 'next_step_2', description: 'Second next step' },
      { name: 'attorney_name', description: 'Attorney name' }
    ],
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    user_id: '1',
    name: 'Document Request',
    subject: 'Document Request - {{case_title}}',
    body_html: '<p>Dear {{client_name}},</p><p>To proceed with your {{case_type}}, we need the following documents:</p><p>{{document_list}}</p><p>Please provide these at your earliest convenience. You can upload them securely through our client portal or email them directly.</p><p>Thank you for your cooperation.</p><p>Best regards,<br>{{attorney_name}}</p>',
    body_text: 'Dear {{client_name}},\n\nTo proceed with your {{case_type}}, we need the following documents:\n\n{{document_list}}\n\nPlease provide these at your earliest convenience. You can upload them securely through our client portal or email them directly.\n\nThank you for your cooperation.\n\nBest regards,\n{{attorney_name}}',
    category: 'Document Management',
    variables: [
      { name: 'client_name', description: 'Client full name' },
      { name: 'case_type', description: 'Type of legal matter' },
      { name: 'case_title', description: 'Case title or reference' },
      { name: 'document_list', description: 'List of required documents' },
      { name: 'attorney_name', description: 'Attorney name' }
    ],
    is_active: true,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z'
  }
]

async function authenticateRequest(_request: NextRequest) {
  const headersList = headers()
  const authorization = headersList.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return null
  }

  const token = authorization.substring(7)

  try {
    const decoded = verify(token, JWT_SECRET) as { user_id: string; permissions: string[]; [key: string]: unknown }
    return decoded
  } catch (_error) {
    return null
  }
}

function checkPermission(user: { permissions: string[] }, permission: string): boolean {
  if (user.permissions.includes('*')) return true
  return user.permissions.includes(permission)
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

function createResponse<T>(data: T, pagination?: Record<string, unknown>): ApiResponse<T> {
  return {
    success: true,
    data,
    pagination,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      request_id: generateRequestId()
    }
  }
}

function createErrorResponse(error: string, message: string, status: number = 400): NextResponse {
  return NextResponse.json({
    success: false,
    error,
    message,
    meta: {
      version: 'v1',
      timestamp: new Date().toISOString(),
      request_id: generateRequestId()
    }
  }, { status })
}

// Simulate OAuth flow for email providers
async function exchangeCodeForTokens(provider: string, _code: string, _redirectUri: string) {
  const mockTokens = {
    access_token: `mock_access_token_${provider}_${Date.now()}`,
    refresh_token: `mock_refresh_token_${provider}_${Date.now()}`,
    expires_in: 3600,
    token_type: 'Bearer',
    email: `user@${provider === 'gmail' ? 'gmail.com' : 'outlook.com'}`,
    scope: provider === 'gmail' ? 
      'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send' : 
      'https://graph.microsoft.com/mail.read https://graph.microsoft.com/mail.send'
  }

  return mockTokens
}

// Simulate email sync
async function syncEmails(provider: EmailProvider): Promise<SyncResult> {
  const syncStart = new Date().toISOString()
  
  // Simulate API calls and processing time
  await new Promise(resolve => setTimeout(resolve, 2500))
  
  const syncResult: SyncResult = {
    provider_id: provider.id,
    sync_started: syncStart,
    sync_completed: new Date().toISOString(),
    emails_imported: Math.floor(Math.random() * 25) + 5,
    emails_updated: Math.floor(Math.random() * 10) + 2,
    emails_categorized: Math.floor(Math.random() * 15) + 3,
    attachments_synced: Math.floor(Math.random() * 8) + 1,
    errors: [],
    status: 'success'
  }

  // Simulate occasional errors
  if (Math.random() < 0.1) {
    syncResult.errors.push({
      email_id: 'email_error_123',
      error: 'attachment_too_large',
      details: 'Attachment exceeds size limit for sync'
    })
    syncResult.status = 'partial'
  }

  return syncResult
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:email')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read email integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'providers') {
    const userProviders = mockProviders.filter(p => p.user_id === user.user_id)
    return NextResponse.json(createResponse(userProviders))
  }

  if (action === 'emails') {
    const providerId = searchParams.get('provider_id')
    const caseId = searchParams.get('case_id')
    const clientId = searchParams.get('client_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const isRead = searchParams.get('is_read')
    const isImportant = searchParams.get('is_important')
    const hasAttachments = searchParams.get('has_attachments')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let filteredEmails = [...mockEmails]

    if (providerId) {
      filteredEmails = filteredEmails.filter(e => e.provider_id === providerId)
    }

    if (caseId) {
      filteredEmails = filteredEmails.filter(e => e.case_id === caseId)
    }

    if (clientId) {
      filteredEmails = filteredEmails.filter(e => e.client_id === clientId)
    }

    if (startDate) {
      filteredEmails = filteredEmails.filter(e => e.received_date >= startDate)
    }

    if (endDate) {
      filteredEmails = filteredEmails.filter(e => e.received_date <= endDate)
    }

    if (isRead !== null) {
      const readFilter = isRead === 'true'
      filteredEmails = filteredEmails.filter(e => e.is_read === readFilter)
    }

    if (isImportant !== null) {
      const importantFilter = isImportant === 'true'
      filteredEmails = filteredEmails.filter(e => e.is_important === importantFilter)
    }

    if (hasAttachments !== null) {
      const attachmentFilter = hasAttachments === 'true'
      filteredEmails = filteredEmails.filter(e => 
        attachmentFilter ? e.attachments.length > 0 : e.attachments.length === 0
      )
    }

    // Apply pagination
    const total = filteredEmails.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedEmails = filteredEmails.slice(startIndex, endIndex)

    const pagination = {
      page,
      limit,
      total,
      total_pages: totalPages
    }

    return NextResponse.json(createResponse(paginatedEmails, pagination))
  }

  if (action === 'templates') {
    const category = searchParams.get('category')
    const isActive = searchParams.get('is_active')
    
    let filteredTemplates = mockTemplates.filter(t => t.user_id === user.user_id)

    if (category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === category)
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true'
      filteredTemplates = filteredTemplates.filter(t => t.is_active === activeFilter)
    }

    return NextResponse.json(createResponse(filteredTemplates))
  }

  if (action === 'auth_url') {
    const provider = searchParams.get('provider')
    const redirectUri = searchParams.get('redirect_uri')

    if (!provider || !['gmail', 'outlook'].includes(provider)) {
      return createErrorResponse('validation_error', 'Valid provider (gmail, outlook) is required', 400)
    }

    if (!redirectUri) {
      return createErrorResponse('validation_error', 'redirect_uri is required', 400)
    }

    const state = Buffer.from(JSON.stringify({ 
      user_id: user.user_id, 
      provider, 
      timestamp: Date.now() 
    })).toString('base64')

    let authUrl: string
    if (provider === 'gmail') {
      const params = new URLSearchParams({
        client_id: 'mock_gmail_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        access_type: 'offline',
        prompt: 'consent',
        state
      })
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    } else {
      const params = new URLSearchParams({
        client_id: 'mock_outlook_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://graph.microsoft.com/mail.read https://graph.microsoft.com/mail.send offline_access',
        state
      })
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
    }

    return NextResponse.json(createResponse({
      auth_url: authUrl,
      state,
      expires_in: 600
    }))
  }

  return createErrorResponse('invalid_action', 'Valid action parameter is required', 400)
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:email')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to manage email integrations', 403)
  }

  try {
    const { action, ...data } = await request.json()

    if (action === 'connect') {
      const { provider, code, redirect_uri, state } = data

      if (!provider || !code || !redirect_uri) {
        return createErrorResponse('validation_error', 'provider, code, and redirect_uri are required', 400)
      }

      // Verify state parameter
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        if (stateData.user_id !== user.user_id) {
          return createErrorResponse('invalid_state', 'Invalid state parameter', 400)
        }
      } catch {
        return createErrorResponse('invalid_state', 'Invalid state parameter', 400)
      }

      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(provider, code, redirect_uri)

      // Create new email provider
      const newProvider: EmailProvider = {
        id: String(mockProviders.length + 1),
        name: `${provider === 'gmail' ? 'Gmail' : 'Outlook'} - ${tokens.email}`,
        type: provider as 'gmail' | 'outlook',
        user_id: user.user_id,
        email_address: tokens.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        sync_enabled: true,
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          auto_sync_emails: true,
          sync_sent_items: true,
          sync_drafts: false,
          sync_frequency: 'every-5-min',
          email_signature: `Best regards,\n${user.email || 'JurisAgentis User'}`,
          auto_categorize: true,
          case_linking_enabled: true,
          client_linking_enabled: true,
          sync_labels: provider === 'gmail' ? ['legal', 'clients'] : [],
          sync_folders: provider === 'outlook' ? ['Legal', 'Clients'] : [],
          retention_days: 365
        }
      }

      mockProviders.push(newProvider)

      return NextResponse.json(createResponse(newProvider), { status: 201 })
    }

    if (action === 'sync') {
      const { provider_id } = data

      if (!provider_id) {
        return createErrorResponse('validation_error', 'provider_id is required', 400)
      }

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Email provider not found', 404)
      }

      if (!provider.sync_enabled) {
        return createErrorResponse('sync_disabled', 'Sync is disabled for this provider', 400)
      }

      const syncResult = await syncEmails(provider)

      // Update last sync time
      provider.last_sync = syncResult.sync_completed

      return NextResponse.json(createResponse(syncResult))
    }

    if (action === 'send_email') {
      const { provider_id, email_data } = data

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Email provider not found', 404)
      }

      // Create and send email
      const newEmail: EmailMessage = {
        id: String(mockEmails.length + 1),
        provider_id: provider_id,
        external_id: `sent_${Date.now()}`,
        thread_id: email_data.thread_id || `thread_${Date.now()}`,
        subject: email_data.subject,
        from: {
          email: provider.email_address,
          name: user.name || 'JurisAgentis User'
        },
        to: email_data.to,
        cc: email_data.cc,
        bcc: email_data.bcc,
        body_text: email_data.body_text,
        body_html: email_data.body_html,
        received_date: new Date().toISOString(),
        sent_date: new Date().toISOString(),
        is_read: true,
        is_important: email_data.is_important || false,
        is_draft: false,
        labels: email_data.labels || [],
        folders: email_data.folders || [],
        attachments: email_data.attachments || [],
        case_id: email_data.case_id,
        client_id: email_data.client_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
        last_synced: new Date().toISOString()
      }

      mockEmails.push(newEmail)

      return NextResponse.json(createResponse(newEmail), { status: 201 })
    }

    if (action === 'create_template') {
      const { name, subject, body_html, body_text, category, variables } = data

      if (!name || !subject || !body_html) {
        return createErrorResponse('validation_error', 'name, subject, and body_html are required', 400)
      }

      const newTemplate: EmailTemplate = {
        id: String(mockTemplates.length + 1),
        user_id: user.user_id,
        name,
        subject,
        body_html,
        body_text: body_text || body_html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        category: category || 'General',
        variables: variables || [],
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      mockTemplates.push(newTemplate)

      return NextResponse.json(createResponse(newTemplate), { status: 201 })
    }

    return createErrorResponse('invalid_action', 'Valid action is required', 400)
  } catch (error) {
    console.error('Email integration error:', error)
    return createErrorResponse('internal_error', 'Failed to process email request', 500)
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:email')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update email integrations', 403)
  }

  try {
    const { provider_id, template_id, settings, sync_enabled, ...updateData } = await request.json()

    if (provider_id) {
      // Update email provider
      const providerIndex = mockProviders.findIndex(p => 
        p.id === provider_id && p.user_id === user.user_id
      )

      if (providerIndex === -1) {
        return createErrorResponse('not_found', 'Email provider not found', 404)
      }

      const provider = mockProviders[providerIndex]

      if (settings) {
        provider.settings = { ...provider.settings, ...settings }
      }

      if (typeof sync_enabled === 'boolean') {
        provider.sync_enabled = sync_enabled
      }

      provider.updated_at = new Date().toISOString()

      return NextResponse.json(createResponse(provider))
    }

    if (template_id) {
      // Update email template
      const templateIndex = mockTemplates.findIndex(t => 
        t.id === template_id && t.user_id === user.user_id
      )

      if (templateIndex === -1) {
        return createErrorResponse('not_found', 'Email template not found', 404)
      }

      const template = mockTemplates[templateIndex]
      
      Object.assign(template, updateData)
      template.updated_at = new Date().toISOString()

      return NextResponse.json(createResponse(template))
    }

    return createErrorResponse('validation_error', 'provider_id or template_id is required', 400)
  } catch (error) {
    console.error('Email update error:', error)
    return createErrorResponse('internal_error', 'Failed to update email integration', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:email')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete email integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')
  const templateId = searchParams.get('template_id')

  if (providerId) {
    const providerIndex = mockProviders.findIndex(p => 
      p.id === providerId && p.user_id === user.user_id
    )

    if (providerIndex === -1) {
      return createErrorResponse('not_found', 'Email provider not found', 404)
    }

    // Remove provider
    mockProviders.splice(providerIndex, 1)

    // Remove associated emails
    const emailIndicesToRemove = mockEmails
      .map((email, index) => email.provider_id === providerId ? index : -1)
      .filter(index => index !== -1)
      .reverse()

    emailIndicesToRemove.forEach(index => mockEmails.splice(index, 1))

    return NextResponse.json(createResponse({
      deleted: true,
      provider_id: providerId,
      emails_removed: emailIndicesToRemove.length
    }))
  }

  if (templateId) {
    const templateIndex = mockTemplates.findIndex(t => 
      t.id === templateId && t.user_id === user.user_id
    )

    if (templateIndex === -1) {
      return createErrorResponse('not_found', 'Email template not found', 404)
    }

    mockTemplates.splice(templateIndex, 1)

    return NextResponse.json(createResponse({
      deleted: true,
      template_id: templateId
    }))
  }

  return createErrorResponse('validation_error', 'provider_id or template_id is required', 400)
}