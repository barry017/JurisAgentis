import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { verify, sign } from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

interface ApiKey {
  id: string
  name: string
  key_hash: string
  permissions: string[]
  user_id: string
  created_at: string
  last_used: string
  expires_at: string | null
  is_active: boolean
  rate_limit: number
  usage_count: number
}

interface AuthResponse {
  success: boolean
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: {
    id: string
    email: string
    role: string
    permissions: string[]
  }
  error?: string
  rate_limit?: {
    limit: number
    remaining: number
    reset: number
  }
}

// Mock API keys database
const mockApiKeys: ApiKey[] = [
  {
    id: '1',
    name: 'Production Integration',
    key_hash: '$2a$12$LQv3c1yqBWVHxkd0LQ4YCOWWdq8sRQKqF1h2xqxqxqxqxqxqxqxqx',
    permissions: ['read:clients', 'write:clients', 'read:cases', 'write:cases'],
    user_id: '1',
    created_at: '2024-01-01T00:00:00Z',
    last_used: '2024-03-01T12:00:00Z',
    expires_at: '2024-12-31T23:59:59Z',
    is_active: true,
    rate_limit: 1000,
    usage_count: 15487
  }
]

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const _API_VERSION = 'v1'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { grant_type, api_key, email, password, refresh_token } = body

    // Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const _rateLimitKey = `auth_${clientIp}`
    
    switch (grant_type) {
      case 'api_key':
        return await handleApiKeyAuth(api_key)
      
      case 'password':
        return await handlePasswordAuth(email, password)
      
      case 'refresh_token':
        return await handleRefreshToken(refresh_token)
      
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'invalid_grant_type',
            message: 'Supported grant types: api_key, password, refresh_token'
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'internal_server_error',
        message: 'Authentication service temporarily unavailable'
      },
      { status: 500 }
    )
  }
}

async function handleApiKeyAuth(apiKey: string): Promise<NextResponse> {
  if (!apiKey) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'missing_api_key',
        message: 'API key is required'
      },
      { status: 400 }
    )
  }

  // Find API key
  const keyRecord = mockApiKeys.find(k => k.is_active)
  if (!keyRecord) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'invalid_api_key',
        message: 'Invalid or inactive API key'
      },
      { status: 401 }
    )
  }

  // Verify API key hash
  const isValidKey = await bcrypt.compare(apiKey, keyRecord.key_hash)
  if (!isValidKey) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'invalid_api_key',
        message: 'Invalid API key'
      },
      { status: 401 }
    )
  }

  // Check expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'expired_api_key',
        message: 'API key has expired'
      },
      { status: 401 }
    )
  }

  // Check rate limit
  if (keyRecord.usage_count >= keyRecord.rate_limit) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'rate_limit_exceeded',
        message: 'API key rate limit exceeded'
      },
      { status: 429 }
    )
  }

  // Generate JWT access token
  const accessToken = sign(
    {
      user_id: keyRecord.user_id,
      api_key_id: keyRecord.id,
      permissions: keyRecord.permissions,
      type: 'api_key'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  const response: AuthResponse = {
    success: true,
    access_token: accessToken,
    expires_in: 3600,
    user: {
      id: keyRecord.user_id,
      email: 'api@jurisagentis.com',
      role: 'api_user',
      permissions: keyRecord.permissions
    },
    rate_limit: {
      limit: keyRecord.rate_limit,
      remaining: keyRecord.rate_limit - keyRecord.usage_count,
      reset: Math.floor(Date.now() / 1000) + 3600
    }
  }

  return NextResponse.json(response)
}

async function handlePasswordAuth(email: string, password: string): Promise<NextResponse> {
  if (!email || !password) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'missing_credentials',
        message: 'Email and password are required'
      },
      { status: 400 }
    )
  }

  // Mock user authentication
  const mockUser = {
    id: '1',
    email: 'admin@jurisagentis.com',
    password_hash: '$2a$12$LQv3c1yqBWVHxkd0LQ4YCOWWdq8sRQKqF1h2xqxqxqxqxqxqxqxqx',
    role: 'admin',
    permissions: ['*'] // Full access
  }

  if (email !== mockUser.email) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      },
      { status: 401 }
    )
  }

  const isValidPassword = await bcrypt.compare(password, mockUser.password_hash)
  if (!isValidPassword) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'invalid_credentials',
        message: 'Invalid email or password'
      },
      { status: 401 }
    )
  }

  // Generate tokens
  const accessToken = sign(
    {
      user_id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      permissions: mockUser.permissions,
      type: 'user'
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  const refreshToken = sign(
    {
      user_id: mockUser.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  )

  const response: AuthResponse = {
    success: true,
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      permissions: mockUser.permissions
    }
  }

  return NextResponse.json(response)
}

async function handleRefreshToken(refreshToken: string): Promise<NextResponse> {
  if (!refreshToken) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'missing_refresh_token',
        message: 'Refresh token is required'
      },
      { status: 400 }
    )
  }

  try {
    const decoded = verify(refreshToken, JWT_SECRET) as { user_id: string; type: string; [key: string]: unknown }
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type')
    }

    // Generate new access token
    const accessToken = sign(
      {
        user_id: decoded.user_id,
        email: 'admin@jurisagentis.com',
        role: 'admin',
        permissions: ['*'],
        type: 'user'
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    const response: AuthResponse = {
      success: true,
      access_token: accessToken,
      expires_in: 3600
    }

    return NextResponse.json(response)
  } catch (_error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'invalid_refresh_token',
        message: 'Invalid or expired refresh token'
      },
      { status: 401 }
    )
  }
}

export async function GET(_request: NextRequest) {
  const headersList = headers()
  const authorization = headersList.get('authorization')

  if (!authorization?.startsWith('Bearer ')) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'missing_authorization',
        message: 'Bearer token required'
      },
      { status: 401 }
    )
  }

  const token = authorization.substring(7)

  try {
    const decoded = verify(token, JWT_SECRET) as { user_id: string; email: string; role: string; permissions: string[]; type: string; iat: number; exp: number; [key: string]: unknown }
    
    return NextResponse.json({
      success: true,
      user: {
        id: decoded.user_id,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions,
        type: decoded.type
      },
      token_info: {
        issued_at: decoded.iat,
        expires_at: decoded.exp,
        remaining: decoded.exp - Math.floor(Date.now() / 1000)
      }
    })
  } catch (_error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'invalid_token',
        message: 'Invalid or expired token'
      },
      { status: 401 }
    )
  }
}