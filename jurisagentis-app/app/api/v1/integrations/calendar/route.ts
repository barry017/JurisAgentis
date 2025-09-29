import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface CalendarProvider {
  id: string
  name: string
  type: 'google' | 'outlook' | 'exchange'
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  calendar_id?: string
  sync_enabled: boolean
  sync_direction: 'import' | 'export' | 'bidirectional'
  last_sync: string
  created_at: string
  updated_at: string
  settings: {
    default_calendar: string
    reminder_minutes: number[]
    event_prefix: string
    sync_completed_events: boolean
    sync_private_events: boolean
    sync_categories: string[]
  }
}

interface CalendarEvent {
  id: string
  provider_id: string
  external_id: string
  title: string
  description: string
  start_time: string
  end_time: string
  all_day: boolean
  location?: string
  attendees: Array<{
    email: string
    name?: string
    status: 'pending' | 'accepted' | 'declined' | 'tentative'
  }>
  reminders: Array<{
    method: 'email' | 'popup'
    minutes: number
  }>
  status: 'confirmed' | 'tentative' | 'cancelled'
  visibility: 'public' | 'private'
  case_id?: string
  client_id?: string
  created_at: string
  updated_at: string
  sync_status: 'synced' | 'pending' | 'failed'
  last_synced?: string
}

interface SyncResult {
  provider_id: string
  sync_started: string
  sync_completed: string
  events_imported: number
  events_exported: number
  events_updated: number
  events_deleted: number
  errors: Array<{
    event_id: string
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
  meta?: {
    version: string
    timestamp: string
    request_id: string
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Mock calendar providers
const mockProviders: CalendarProvider[] = [
  {
    id: '1',
    name: 'Google Calendar - Primary',
    type: 'google',
    user_id: '1',
    access_token: 'ya29.mock_access_token',
    refresh_token: 'mock_refresh_token',
    expires_at: '2024-12-31T23:59:59Z',
    calendar_id: 'primary',
    sync_enabled: true,
    sync_direction: 'bidirectional',
    last_sync: '2024-03-01T12:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-01T12:00:00Z',
    settings: {
      default_calendar: 'primary',
      reminder_minutes: [15, 60],
      event_prefix: '[JurisAgentis]',
      sync_completed_events: false,
      sync_private_events: true,
      sync_categories: ['legal', 'client', 'court']
    }
  },
  {
    id: '2',
    name: 'Outlook Calendar',
    type: 'outlook',
    user_id: '1',
    access_token: 'EwB4Mock_access_token',
    refresh_token: 'mock_refresh_token_outlook',
    expires_at: '2024-12-31T23:59:59Z',
    sync_enabled: true,
    sync_direction: 'import',
    last_sync: '2024-02-28T16:30:00Z',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-28T16:30:00Z',
    settings: {
      default_calendar: 'Calendar',
      reminder_minutes: [30],
      event_prefix: '',
      sync_completed_events: true,
      sync_private_events: false,
      sync_categories: ['legal']
    }
  }
]

// Mock calendar events
const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    provider_id: '1',
    external_id: 'google_event_123',
    title: 'Client Consultation - TechStartup Inc.',
    description: 'Initial consultation for corporate formation',
    start_time: '2024-03-05T14:00:00Z',
    end_time: '2024-03-05T15:00:00Z',
    all_day: false,
    location: 'Conference Room A',
    attendees: [
      {
        email: 'sarah@jurisagentis.com',
        name: 'Sarah Johnson',
        status: 'accepted'
      },
      {
        email: 'legal@techstartup.com',
        name: 'John Doe',
        status: 'pending'
      }
    ],
    reminders: [
      { method: 'email', minutes: 60 },
      { method: 'popup', minutes: 15 }
    ],
    status: 'confirmed',
    visibility: 'private',
    case_id: '1',
    client_id: '1',
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T12:00:00Z'
  },
  {
    id: '2',
    provider_id: '1',
    external_id: 'google_event_456',
    title: 'Court Hearing - Smith vs. Smith',
    description: 'Divorce proceedings hearing',
    start_time: '2024-03-10T09:00:00Z',
    end_time: '2024-03-10T11:00:00Z',
    all_day: false,
    location: 'Suffolk County Family Court, Room 302',
    attendees: [
      {
        email: 'michael@jurisagentis.com',
        name: 'Michael Chen',
        status: 'accepted'
      }
    ],
    reminders: [
      { method: 'email', minutes: 1440 }, // 24 hours
      { method: 'email', minutes: 60 }
    ],
    status: 'confirmed',
    visibility: 'private',
    case_id: '3',
    client_id: '2',
    created_at: '2024-02-25T14:00:00Z',
    updated_at: '2024-02-25T14:00:00Z',
    sync_status: 'synced',
    last_synced: '2024-03-01T12:00:00Z'
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

function createResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
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

// Simulate OAuth flow for calendar providers
async function exchangeCodeForTokens(provider: string, _code: string, _redirectUri: string) {
  // Mock token exchange
  const mockTokens = {
    access_token: `mock_access_token_${provider}_${Date.now()}`,
    refresh_token: `mock_refresh_token_${provider}_${Date.now()}`,
    expires_in: 3600,
    token_type: 'Bearer',
    scope: provider === 'google' ? 'https://www.googleapis.com/auth/calendar' : 'https://graph.microsoft.com/calendars.readwrite'
  }

  return mockTokens
}

// Simulate calendar API calls
async function syncCalendarEvents(provider: CalendarProvider): Promise<SyncResult> {
  const syncStart = new Date().toISOString()
  
  // Simulate API calls and processing time
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const syncResult: SyncResult = {
    provider_id: provider.id,
    sync_started: syncStart,
    sync_completed: new Date().toISOString(),
    events_imported: Math.floor(Math.random() * 10) + 1,
    events_exported: Math.floor(Math.random() * 5),
    events_updated: Math.floor(Math.random() * 3),
    events_deleted: Math.floor(Math.random() * 2),
    errors: [],
    status: 'success'
  }

  // Simulate occasional errors
  if (Math.random() < 0.1) {
    syncResult.errors.push({
      event_id: 'event_error_123',
      error: 'permission_denied',
      details: 'Insufficient permissions to access calendar'
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

  if (!checkPermission(user, 'read:calendar')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read calendar integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'providers') {
    // Return connected calendar providers
    const userProviders = mockProviders.filter(p => p.user_id === user.user_id)
    return NextResponse.json(createResponse(userProviders))
  }

  if (action === 'events') {
    // Return synchronized events
    const providerId = searchParams.get('provider_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const caseId = searchParams.get('case_id')
    const clientId = searchParams.get('client_id')

    let filteredEvents = [...mockEvents]

    if (providerId) {
      filteredEvents = filteredEvents.filter(e => e.provider_id === providerId)
    }

    if (startDate) {
      filteredEvents = filteredEvents.filter(e => e.start_time >= startDate)
    }

    if (endDate) {
      filteredEvents = filteredEvents.filter(e => e.start_time <= endDate)
    }

    if (caseId) {
      filteredEvents = filteredEvents.filter(e => e.case_id === caseId)
    }

    if (clientId) {
      filteredEvents = filteredEvents.filter(e => e.client_id === clientId)
    }

    return NextResponse.json(createResponse(filteredEvents))
  }

  if (action === 'auth_url') {
    // Generate OAuth authorization URL
    const provider = searchParams.get('provider')
    const redirectUri = searchParams.get('redirect_uri')

    if (!provider || !['google', 'outlook'].includes(provider)) {
      return createErrorResponse('validation_error', 'Valid provider (google, outlook) is required', 400)
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
    if (provider === 'google') {
      const params = new URLSearchParams({
        client_id: 'mock_google_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/calendar',
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
        scope: 'https://graph.microsoft.com/calendars.readwrite offline_access',
        state
      })
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
    }

    return NextResponse.json(createResponse({
      auth_url: authUrl,
      state,
      expires_in: 600 // 10 minutes
    }))
  }

  return createErrorResponse('invalid_action', 'Valid action parameter is required', 400)
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:calendar')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to manage calendar integrations', 403)
  }

  try {
    const { action, ...data } = await request.json()

    if (action === 'connect') {
      // Complete OAuth flow and connect calendar
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

      // Create new calendar provider
      const newProvider: CalendarProvider = {
        id: String(mockProviders.length + 1),
        name: `${provider === 'google' ? 'Google' : 'Outlook'} Calendar`,
        type: provider as 'google' | 'outlook',
        user_id: user.user_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        sync_enabled: true,
        sync_direction: 'bidirectional',
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          default_calendar: provider === 'google' ? 'primary' : 'Calendar',
          reminder_minutes: [15, 60],
          event_prefix: '[JurisAgentis]',
          sync_completed_events: false,
          sync_private_events: true,
          sync_categories: ['legal', 'client', 'court']
        }
      }

      mockProviders.push(newProvider)

      return NextResponse.json(createResponse(newProvider), { status: 201 })
    }

    if (action === 'sync') {
      // Trigger manual sync for a provider
      const { provider_id } = data

      if (!provider_id) {
        return createErrorResponse('validation_error', 'provider_id is required', 400)
      }

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Calendar provider not found', 404)
      }

      if (!provider.sync_enabled) {
        return createErrorResponse('sync_disabled', 'Sync is disabled for this provider', 400)
      }

      const syncResult = await syncCalendarEvents(provider)

      // Update last sync time
      provider.last_sync = syncResult.sync_completed

      return NextResponse.json(createResponse(syncResult))
    }

    if (action === 'create_event') {
      // Create event in external calendar
      const { provider_id, event_data } = data

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Calendar provider not found', 404)
      }

      if (provider.sync_direction === 'import') {
        return createErrorResponse('sync_direction_error', 'Provider is configured for import only', 400)
      }

      // Create new event
      const newEvent: CalendarEvent = {
        id: String(mockEvents.length + 1),
        provider_id: provider_id,
        external_id: `external_${Date.now()}`,
        title: provider.settings.event_prefix + ' ' + event_data.title,
        description: event_data.description || '',
        start_time: event_data.start_time,
        end_time: event_data.end_time,
        all_day: event_data.all_day || false,
        location: event_data.location,
        attendees: event_data.attendees || [],
        reminders: provider.settings.reminder_minutes.map(minutes => ({
          method: 'email' as const,
          minutes
        })),
        status: 'confirmed',
        visibility: 'private',
        case_id: event_data.case_id,
        client_id: event_data.client_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'synced',
        last_synced: new Date().toISOString()
      }

      mockEvents.push(newEvent)

      return NextResponse.json(createResponse(newEvent), { status: 201 })
    }

    return createErrorResponse('invalid_action', 'Valid action is required', 400)
  } catch (error) {
    console.error('Calendar integration error:', error)
    return createErrorResponse('internal_error', 'Failed to process calendar request', 500)
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:calendar')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update calendar integrations', 403)
  }

  try {
    const { provider_id, settings, sync_enabled } = await request.json()

    if (!provider_id) {
      return createErrorResponse('validation_error', 'provider_id is required', 400)
    }

    const providerIndex = mockProviders.findIndex(p => 
      p.id === provider_id && p.user_id === user.user_id
    )

    if (providerIndex === -1) {
      return createErrorResponse('not_found', 'Calendar provider not found', 404)
    }

    const provider = mockProviders[providerIndex]

    // Update provider settings
    if (settings) {
      provider.settings = { ...provider.settings, ...settings }
    }

    if (typeof sync_enabled === 'boolean') {
      provider.sync_enabled = sync_enabled
    }

    provider.updated_at = new Date().toISOString()

    return NextResponse.json(createResponse(provider))
  } catch (error) {
    console.error('Calendar provider update error:', error)
    return createErrorResponse('internal_error', 'Failed to update calendar provider', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:calendar')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete calendar integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')

  if (!providerId) {
    return createErrorResponse('validation_error', 'provider_id is required', 400)
  }

  const providerIndex = mockProviders.findIndex(p => 
    p.id === providerId && p.user_id === user.user_id
  )

  if (providerIndex === -1) {
    return createErrorResponse('not_found', 'Calendar provider not found', 404)
  }

  // Remove provider
  mockProviders.splice(providerIndex, 1)

  // Remove associated events
  const eventIndicesToRemove = mockEvents
    .map((event, index) => event.provider_id === providerId ? index : -1)
    .filter(index => index !== -1)
    .reverse()

  eventIndicesToRemove.forEach(index => mockEvents.splice(index, 1))

  return NextResponse.json(createResponse({
    deleted: true,
    provider_id: providerId,
    events_removed: eventIndicesToRemove.length
  }))
}