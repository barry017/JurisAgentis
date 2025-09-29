import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify } from 'jsonwebtoken'

interface StorageProvider {
  id: string
  name: string
  type: 'dropbox' | 'onedrive' | 'google_drive' | 's3'
  user_id: string
  account_id: string
  account_email?: string
  access_token: string
  refresh_token: string
  expires_at: string
  root_folder_id?: string
  sync_enabled: boolean
  last_sync: string
  created_at: string
  updated_at: string
  settings: {
    auto_sync_enabled: boolean
    sync_direction: 'upload' | 'download' | 'bidirectional'
    folder_structure: 'flat' | 'by_client' | 'by_case' | 'by_practice_area'
    file_naming_convention: string
    auto_organize: boolean
    sync_file_types: string[]
    max_file_size: number
    retention_policy: 'keep_all' | 'archive_old' | 'delete_old'
    retention_days: number
  }
  quota: {
    total: number
    used: number
    available: number
  }
}

interface StorageFile {
  id: string
  provider_id: string
  external_id: string
  name: string
  path: string
  size: number
  mime_type: string
  hash?: string
  parent_folder_id?: string
  is_folder: boolean
  created_at: string
  updated_at: string
  modified_at: string
  case_id?: string
  client_id?: string
  document_id?: string
  tags: string[]
  permissions: {
    can_read: boolean
    can_write: boolean
    can_delete: boolean
    can_share: boolean
  }
  shared_links: Array<{
    id: string
    url: string
    expires_at?: string
    permissions: string[]
    created_at: string
  }>
  sync_status: 'synced' | 'pending' | 'failed' | 'conflict'
  last_synced?: string
  version: number
}

interface SyncResult {
  provider_id: string
  sync_type: 'full' | 'incremental'
  sync_started: string
  sync_completed: string
  files_uploaded: number
  files_downloaded: number
  files_updated: number
  files_deleted: number
  folders_created: number
  conflicts_detected: number
  total_size_synced: number
  errors: Array<{
    file_id: string
    file_name: string
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

// Mock storage providers
const mockProviders: StorageProvider[] = [
  {
    id: '1',
    name: 'Dropbox Business - Legal Documents',
    type: 'dropbox',
    user_id: '1',
    account_id: 'dbid:dropbox_account_123',
    account_email: 'legal@jurisagentis.com',
    access_token: 'dropbox_access_token_mock',
    refresh_token: 'dropbox_refresh_token_mock',
    expires_at: '2024-12-31T23:59:59Z',
    root_folder_id: '/JurisAgentis',
    sync_enabled: true,
    last_sync: '2024-03-01T14:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-03-01T14:00:00Z',
    settings: {
      auto_sync_enabled: true,
      sync_direction: 'bidirectional',
      folder_structure: 'by_case',
      file_naming_convention: '{{case_number}}_{{document_type}}_{{date}}',
      auto_organize: true,
      sync_file_types: ['pdf', 'docx', 'doc', 'xlsx', 'pptx', 'txt'],
      max_file_size: 104857600, // 100MB
      retention_policy: 'keep_all',
      retention_days: 0
    },
    quota: {
      total: 5497558138880, // 5TB
      used: 1099511627776, // 1TB
      available: 4398046511104 // 4TB
    }
  },
  {
    id: '2',
    name: 'OneDrive for Business',
    type: 'onedrive',
    user_id: '1',
    account_id: 'onedrive_account_456',
    account_email: 'sarah@jurisagentis.com',
    access_token: 'onedrive_access_token_mock',
    refresh_token: 'onedrive_refresh_token_mock',
    expires_at: '2024-12-31T23:59:59Z',
    root_folder_id: 'root/Legal_Documents',
    sync_enabled: true,
    last_sync: '2024-02-29T16:30:00Z',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-29T16:30:00Z',
    settings: {
      auto_sync_enabled: false,
      sync_direction: 'upload',
      folder_structure: 'by_client',
      file_naming_convention: '{{client_name}}_{{document_type}}_{{timestamp}}',
      auto_organize: false,
      sync_file_types: ['pdf', 'docx', 'xlsx'],
      max_file_size: 52428800, // 50MB
      retention_policy: 'archive_old',
      retention_days: 2555 // 7 years
    },
    quota: {
      total: 1099511627776, // 1TB
      used: 274877906944, // 256GB
      available: 824633720832 // 768GB
    }
  }
]

// Mock storage files
const mockFiles: StorageFile[] = [
  {
    id: '1',
    provider_id: '1',
    external_id: 'dropbox_file_789',
    name: 'CORP-2024-001_Articles_of_Incorporation_2024-02-15.pdf',
    path: '/JurisAgentis/TechStartup_Inc/Corporate_Formation/CORP-2024-001_Articles_of_Incorporation_2024-02-15.pdf',
    size: 2457600, // 2.4MB
    mime_type: 'application/pdf',
    hash: 'sha256:abc123def456...',
    parent_folder_id: 'folder_corp_formation',
    is_folder: false,
    created_at: '2024-02-15T10:30:00Z',
    updated_at: '2024-02-15T10:30:00Z',
    modified_at: '2024-02-15T10:30:00Z',
    case_id: '1',
    client_id: '1',
    document_id: 'doc_123',
    tags: ['corporate', 'formation', 'articles'],
    permissions: {
      can_read: true,
      can_write: true,
      can_delete: true,
      can_share: true
    },
    shared_links: [
      {
        id: 'share_link_1',
        url: 'https://dropbox.com/s/abc123/file.pdf?dl=0',
        expires_at: '2024-12-31T23:59:59Z',
        permissions: ['read'],
        created_at: '2024-02-15T10:35:00Z'
      }
    ],
    sync_status: 'synced',
    last_synced: '2024-03-01T14:00:00Z',
    version: 1
  },
  {
    id: '2',
    provider_id: '1',
    external_id: 'dropbox_file_790',
    name: 'TM-2024-002_Trademark_Application_2024-02-20.pdf',
    path: '/JurisAgentis/TechStartup_Inc/IP_Law/TM-2024-002_Trademark_Application_2024-02-20.pdf',
    size: 1843200, // 1.8MB
    mime_type: 'application/pdf',
    hash: 'sha256:def456ghi789...',
    parent_folder_id: 'folder_ip_law',
    is_folder: false,
    created_at: '2024-02-20T14:15:00Z',
    updated_at: '2024-02-20T14:15:00Z',
    modified_at: '2024-02-20T14:15:00Z',
    case_id: '2',
    client_id: '1',
    document_id: 'doc_124',
    tags: ['trademark', 'ip', 'application'],
    permissions: {
      can_read: true,
      can_write: true,
      can_delete: false,
      can_share: true
    },
    shared_links: [],
    sync_status: 'synced',
    last_synced: '2024-03-01T14:00:00Z',
    version: 1
  },
  {
    id: '3',
    provider_id: '2',
    external_id: 'onedrive_file_456',
    name: 'John_Smith_Divorce_Settlement_Agreement_20240225_143000.docx',
    path: '/Legal_Documents/John_Smith/Family_Law/John_Smith_Divorce_Settlement_Agreement_20240225_143000.docx',
    size: 1024000, // 1MB
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    hash: 'sha256:ghi789jkl012...',
    parent_folder_id: 'folder_family_law',
    is_folder: false,
    created_at: '2024-02-25T14:30:00Z',
    updated_at: '2024-02-25T14:30:00Z',
    modified_at: '2024-02-25T14:30:00Z',
    case_id: '3',
    client_id: '2',
    document_id: 'doc_125',
    tags: ['divorce', 'settlement', 'family-law'],
    permissions: {
      can_read: true,
      can_write: true,
      can_delete: true,
      can_share: false
    },
    shared_links: [],
    sync_status: 'synced',
    last_synced: '2024-02-29T16:30:00Z',
    version: 2
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

// Simulate OAuth flow for storage providers
async function exchangeCodeForTokens(provider: string, _code: string, _redirectUri: string) {
  const mockTokens = {
    access_token: `mock_access_token_${provider}_${Date.now()}`,
    refresh_token: `mock_refresh_token_${provider}_${Date.now()}`,
    expires_in: 3600,
    token_type: 'Bearer',
    account_id: `${provider}_account_${Date.now()}`,
    account_email: `user@${provider}.com`
  }

  return mockTokens
}

// Simulate storage sync
async function syncStorage(provider: StorageProvider, syncType: 'full' | 'incremental' = 'incremental'): Promise<SyncResult> {
  const syncStart = new Date().toISOString()
  
  // Simulate API calls and processing time
  await new Promise(resolve => setTimeout(resolve, 4000))
  
  const syncResult: SyncResult = {
    provider_id: provider.id,
    sync_type: syncType,
    sync_started: syncStart,
    sync_completed: new Date().toISOString(),
    files_uploaded: Math.floor(Math.random() * 15) + 3,
    files_downloaded: Math.floor(Math.random() * 8) + 1,
    files_updated: Math.floor(Math.random() * 5) + 1,
    files_deleted: Math.floor(Math.random() * 3),
    folders_created: Math.floor(Math.random() * 4) + 1,
    conflicts_detected: Math.floor(Math.random() * 2),
    total_size_synced: Math.floor(Math.random() * 104857600) + 10485760, // 10MB-100MB
    errors: [],
    status: 'success'
  }

  // Simulate occasional errors
  if (Math.random() < 0.15) {
    syncResult.errors.push({
      file_id: 'file_error_123',
      file_name: 'large_document.pdf',
      error: 'file_too_large',
      details: 'File exceeds maximum size limit for sync'
    })
    syncResult.status = 'partial'
  }

  return syncResult
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'read:storage')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to read storage integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  if (action === 'providers') {
    const userProviders = mockProviders.filter(p => p.user_id === user.user_id)
    
    // Add formatted quota information
    const providersWithQuota = userProviders.map(provider => ({
      ...provider,
      quota_formatted: {
        total: formatFileSize(provider.quota.total),
        used: formatFileSize(provider.quota.used),
        available: formatFileSize(provider.quota.available),
        usage_percentage: Math.round((provider.quota.used / provider.quota.total) * 100)
      }
    }))

    return NextResponse.json(createResponse(providersWithQuota))
  }

  if (action === 'files') {
    const providerId = searchParams.get('provider_id')
    const caseId = searchParams.get('case_id')
    const clientId = searchParams.get('client_id')
    const folderPath = searchParams.get('folder_path')
    const fileType = searchParams.get('file_type')
    const isFolder = searchParams.get('is_folder')
    const syncStatus = searchParams.get('sync_status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    let filteredFiles = [...mockFiles]

    if (providerId) {
      filteredFiles = filteredFiles.filter(f => f.provider_id === providerId)
    }

    if (caseId) {
      filteredFiles = filteredFiles.filter(f => f.case_id === caseId)
    }

    if (clientId) {
      filteredFiles = filteredFiles.filter(f => f.client_id === clientId)
    }

    if (folderPath) {
      filteredFiles = filteredFiles.filter(f => f.path.startsWith(folderPath))
    }

    if (fileType) {
      filteredFiles = filteredFiles.filter(f => f.mime_type.includes(fileType))
    }

    if (isFolder !== null) {
      const folderFilter = isFolder === 'true'
      filteredFiles = filteredFiles.filter(f => f.is_folder === folderFilter)
    }

    if (syncStatus) {
      filteredFiles = filteredFiles.filter(f => f.sync_status === syncStatus)
    }

    if (search) {
      const searchTerm = search.toLowerCase()
      filteredFiles = filteredFiles.filter(f => 
        f.name.toLowerCase().includes(searchTerm) ||
        f.path.toLowerCase().includes(searchTerm) ||
        f.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
    }

    // Sort by modified date (newest first)
    filteredFiles.sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())

    // Apply pagination
    const total = filteredFiles.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFiles = filteredFiles.slice(startIndex, endIndex)

    // Add formatted file sizes
    const filesWithFormattedSize = paginatedFiles.map(file => ({
      ...file,
      size_formatted: formatFileSize(file.size)
    }))

    const pagination = {
      page,
      limit,
      total,
      total_pages: totalPages
    }

    return NextResponse.json(createResponse(filesWithFormattedSize, pagination))
  }

  if (action === 'auth_url') {
    const provider = searchParams.get('provider')
    const redirectUri = searchParams.get('redirect_uri')

    if (!provider || !['dropbox', 'onedrive', 'google_drive'].includes(provider)) {
      return createErrorResponse('validation_error', 'Valid provider (dropbox, onedrive, google_drive) is required', 400)
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
    if (provider === 'dropbox') {
      const params = new URLSearchParams({
        client_id: 'mock_dropbox_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        token_access_type: 'offline',
        state
      })
      authUrl = `https://www.dropbox.com/oauth2/authorize?${params}`
    } else if (provider === 'onedrive') {
      const params = new URLSearchParams({
        client_id: 'mock_onedrive_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'files.readwrite offline_access',
        state
      })
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`
    } else { // google_drive
      const params = new URLSearchParams({
        client_id: 'mock_google_client_id',
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'https://www.googleapis.com/auth/drive',
        access_type: 'offline',
        prompt: 'consent',
        state
      })
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    }

    return NextResponse.json(createResponse({
      auth_url: authUrl,
      state,
      expires_in: 600
    }))
  }

  if (action === 'usage_stats') {
    const providerId = searchParams.get('provider_id')
    
    if (!providerId) {
      return createErrorResponse('validation_error', 'provider_id is required', 400)
    }

    const provider = mockProviders.find(p => p.id === providerId && p.user_id === user.user_id)
    if (!provider) {
      return createErrorResponse('not_found', 'Storage provider not found', 404)
    }

    const providerFiles = mockFiles.filter(f => f.provider_id === providerId)
    
    const stats = {
      provider_id: providerId,
      total_files: providerFiles.filter(f => !f.is_folder).length,
      total_folders: providerFiles.filter(f => f.is_folder).length,
      total_size: providerFiles.reduce((sum, f) => sum + f.size, 0),
      total_size_formatted: formatFileSize(providerFiles.reduce((sum, f) => sum + f.size, 0)),
      files_by_type: {
        pdf: providerFiles.filter(f => f.mime_type === 'application/pdf').length,
        docx: providerFiles.filter(f => f.mime_type.includes('wordprocessingml')).length,
        xlsx: providerFiles.filter(f => f.mime_type.includes('spreadsheetml')).length,
        other: providerFiles.filter(f => !f.mime_type.includes('pdf') && !f.mime_type.includes('wordprocessingml') && !f.mime_type.includes('spreadsheetml')).length
      },
      sync_status: {
        synced: providerFiles.filter(f => f.sync_status === 'synced').length,
        pending: providerFiles.filter(f => f.sync_status === 'pending').length,
        failed: providerFiles.filter(f => f.sync_status === 'failed').length,
        conflict: providerFiles.filter(f => f.sync_status === 'conflict').length
      },
      recent_activity: {
        files_added_last_24h: providerFiles.filter(f => 
          new Date(f.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length,
        files_modified_last_24h: providerFiles.filter(f => 
          new Date(f.modified_at).getTime() > Date.now() - 24 * 60 * 60 * 1000
        ).length
      },
      quota: provider.quota,
      quota_formatted: {
        total: formatFileSize(provider.quota.total),
        used: formatFileSize(provider.quota.used),
        available: formatFileSize(provider.quota.available),
        usage_percentage: Math.round((provider.quota.used / provider.quota.total) * 100)
      }
    }

    return NextResponse.json(createResponse(stats))
  }

  return createErrorResponse('invalid_action', 'Valid action parameter is required', 400)
}

export async function POST(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:storage')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to manage storage integrations', 403)
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

      // Create new storage provider
      const newProvider: StorageProvider = {
        id: String(mockProviders.length + 1),
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} - ${tokens.account_email}`,
        type: provider as 'dropbox' | 'onedrive' | 'google_drive',
        user_id: user.user_id,
        account_id: tokens.account_id,
        account_email: tokens.account_email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        root_folder_id: provider === 'dropbox' ? '/JurisAgentis' : 
                       provider === 'onedrive' ? 'root/Legal_Documents' : 
                       'root',
        sync_enabled: true,
        last_sync: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {
          auto_sync_enabled: true,
          sync_direction: 'bidirectional',
          folder_structure: 'by_case',
          file_naming_convention: '{{case_number}}_{{document_type}}_{{date}}',
          auto_organize: true,
          sync_file_types: ['pdf', 'docx', 'xlsx'],
          max_file_size: 52428800, // 50MB
          retention_policy: 'keep_all',
          retention_days: 0
        },
        quota: {
          total: provider === 'dropbox' ? 1099511627776 : // 1TB
                 provider === 'onedrive' ? 1099511627776 : // 1TB
                 16106127360, // 15GB for Google Drive
          used: Math.floor(Math.random() * 107374182400), // Random usage up to 100GB
          available: 0 // Will be calculated
        }
      }

      newProvider.quota.available = newProvider.quota.total - newProvider.quota.used

      mockProviders.push(newProvider)

      return NextResponse.json(createResponse(newProvider), { status: 201 })
    }

    if (action === 'sync') {
      const { provider_id, sync_type } = data

      if (!provider_id) {
        return createErrorResponse('validation_error', 'provider_id is required', 400)
      }

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Storage provider not found', 404)
      }

      if (!provider.sync_enabled) {
        return createErrorResponse('sync_disabled', 'Sync is disabled for this provider', 400)
      }

      const syncResult = await syncStorage(provider, sync_type || 'incremental')

      // Update last sync time
      provider.last_sync = syncResult.sync_completed

      return NextResponse.json(createResponse(syncResult))
    }

    if (action === 'upload_file') {
      const { provider_id, file_data, folder_path, case_id, client_id } = data

      const provider = mockProviders.find(p => p.id === provider_id && p.user_id === user.user_id)
      if (!provider) {
        return createErrorResponse('not_found', 'Storage provider not found', 404)
      }

      if (provider.settings.sync_direction === 'download') {
        return createErrorResponse('sync_direction_error', 'Provider is configured for download only', 400)
      }

      // Create new file record
      const newFile: StorageFile = {
        id: String(mockFiles.length + 1),
        provider_id: provider_id,
        external_id: `uploaded_${Date.now()}`,
        name: file_data.name,
        path: `${folder_path || provider.root_folder_id}/${file_data.name}`,
        size: file_data.size,
        mime_type: file_data.mime_type,
        hash: `sha256:${Math.random().toString(36).substring(2)}`,
        parent_folder_id: folder_path,
        is_folder: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
        case_id: case_id,
        client_id: client_id,
        tags: file_data.tags || [],
        permissions: {
          can_read: true,
          can_write: true,
          can_delete: true,
          can_share: true
        },
        shared_links: [],
        sync_status: 'synced',
        last_synced: new Date().toISOString(),
        version: 1
      }

      mockFiles.push(newFile)

      return NextResponse.json(createResponse(newFile), { status: 201 })
    }

    if (action === 'create_shared_link') {
      const { file_id, permissions, expires_at } = data

      if (!file_id) {
        return createErrorResponse('validation_error', 'file_id is required', 400)
      }

      const fileIndex = mockFiles.findIndex(f => f.id === file_id)
      if (fileIndex === -1) {
        return createErrorResponse('not_found', 'File not found', 404)
      }

      const file = mockFiles[fileIndex]
      
      if (!file.permissions.can_share) {
        return createErrorResponse('permission_denied', 'File sharing is not allowed', 403)
      }

      const sharedLink = {
        id: `share_${Date.now()}`,
        url: `https://share.example.com/${file.external_id}?token=${Math.random().toString(36).substring(2)}`,
        expires_at: expires_at,
        permissions: permissions || ['read'],
        created_at: new Date().toISOString()
      }

      file.shared_links.push(sharedLink)
      file.updated_at = new Date().toISOString()

      return NextResponse.json(createResponse(sharedLink), { status: 201 })
    }

    return createErrorResponse('invalid_action', 'Valid action is required', 400)
  } catch (error) {
    console.error('Storage integration error:', error)
    return createErrorResponse('internal_error', 'Failed to process storage request', 500)
  }
}

export async function PUT(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'write:storage')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to update storage integrations', 403)
  }

  try {
    const { provider_id, file_id, settings, sync_enabled, ...updateData } = await request.json()

    if (provider_id) {
      // Update storage provider
      const providerIndex = mockProviders.findIndex(p => 
        p.id === provider_id && p.user_id === user.user_id
      )

      if (providerIndex === -1) {
        return createErrorResponse('not_found', 'Storage provider not found', 404)
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

    if (file_id) {
      // Update file metadata
      const fileIndex = mockFiles.findIndex(f => f.id === file_id)
      if (fileIndex === -1) {
        return createErrorResponse('not_found', 'File not found', 404)
      }

      const file = mockFiles[fileIndex]
      
      Object.assign(file, updateData)
      file.updated_at = new Date().toISOString()
      file.version += 1

      return NextResponse.json(createResponse(file))
    }

    return createErrorResponse('validation_error', 'provider_id or file_id is required', 400)
  } catch (error) {
    console.error('Storage update error:', error)
    return createErrorResponse('internal_error', 'Failed to update storage integration', 500)
  }
}

export async function DELETE(request: NextRequest) {
  const user = await authenticateRequest(request)
  if (!user) {
    return createErrorResponse('unauthorized', 'Valid authentication required', 401)
  }

  if (!checkPermission(user, 'delete:storage')) {
    return createErrorResponse('forbidden', 'Insufficient permissions to delete storage integrations', 403)
  }

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')
  const fileId = searchParams.get('file_id')
  const sharedLinkId = searchParams.get('shared_link_id')

  if (providerId) {
    const providerIndex = mockProviders.findIndex(p => 
      p.id === providerId && p.user_id === user.user_id
    )

    if (providerIndex === -1) {
      return createErrorResponse('not_found', 'Storage provider not found', 404)
    }

    // Remove provider
    mockProviders.splice(providerIndex, 1)

    // Remove associated files
    const fileIndicesToRemove = mockFiles
      .map((file, index) => file.provider_id === providerId ? index : -1)
      .filter(index => index !== -1)
      .reverse()

    fileIndicesToRemove.forEach(index => mockFiles.splice(index, 1))

    return NextResponse.json(createResponse({
      deleted: true,
      provider_id: providerId,
      files_removed: fileIndicesToRemove.length
    }))
  }

  if (fileId) {
    const fileIndex = mockFiles.findIndex(f => f.id === fileId)
    if (fileIndex === -1) {
      return createErrorResponse('not_found', 'File not found', 404)
    }

    const file = mockFiles[fileIndex]
    
    if (!file.permissions.can_delete) {
      return createErrorResponse('permission_denied', 'File deletion is not allowed', 403)
    }

    mockFiles.splice(fileIndex, 1)

    return NextResponse.json(createResponse({
      deleted: true,
      file_id: fileId
    }))
  }

  if (sharedLinkId && fileId) {
    const fileIndex = mockFiles.findIndex(f => f.id === fileId)
    if (fileIndex === -1) {
      return createErrorResponse('not_found', 'File not found', 404)
    }

    const file = mockFiles[fileIndex]
    const linkIndex = file.shared_links.findIndex(link => link.id === sharedLinkId)
    
    if (linkIndex === -1) {
      return createErrorResponse('not_found', 'Shared link not found', 404)
    }

    file.shared_links.splice(linkIndex, 1)
    file.updated_at = new Date().toISOString()

    return NextResponse.json(createResponse({
      deleted: true,
      shared_link_id: sharedLinkId
    }))
  }

  return createErrorResponse('validation_error', 'provider_id, file_id, or shared_link_id is required', 400)
}