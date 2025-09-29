/**
 * API Response Utilities
 * 
 * Standardized response formatting and error handling for API endpoints
 */

import { NextResponse } from 'next/server'

export interface APISuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
  [key: string]: unknown
}

export interface APIErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export type APIResponse<T = unknown> = APISuccessResponse<T> | APIErrorResponse

/**
 * Create standardized success response
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string,
  additionalFields?: Record<string, unknown>
): NextResponse {
  const response: APISuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...additionalFields
  }

  return NextResponse.json(response, {
    headers: getSecurityHeaders()
  })
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>
): NextResponse {
  const response: APIErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details })
    }
  }

  return NextResponse.json(response, {
    status: statusCode,
    headers: getSecurityHeaders()
  })
}

/**
 * Get standard security headers for all API responses
 */
function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
}

/**
 * Handle method not allowed responses
 */
export function createMethodNotAllowedResponse(allowedMethods: string[]): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method not allowed. Allowed methods: ${allowedMethods.join(', ')}`
      }
    },
    {
      status: 405,
      headers: {
        ...getSecurityHeaders(),
        'Allow': allowedMethods.join(', ')
      }
    }
  )
}

/**
 * Handle rate limit exceeded responses
 */
export function createRateLimitResponse(retryAfter: number = 60): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        details: {
          retryAfter
        }
      }
    },
    {
      status: 429,
      headers: {
        ...getSecurityHeaders(),
        'Retry-After': retryAfter.toString()
      }
    }
  )
}

/**
 * Handle validation errors
 */
export function createValidationErrorResponse(
  field: string,
  message: string
): NextResponse {
  return createErrorResponse(
    'VALIDATION_ERROR',
    `Validation failed: ${message}`,
    400,
    { field }
  )
}

/**
 * Handle CORS for allowed origins
 */
export function addCORSHeaders(response: NextResponse, origin?: string): NextResponse {
  const allowedOrigins = [
    'https://jurisagentis.com',
    'https://dogwoodestateplanning.com',
    'http://localhost:3000'
  ]

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )
  }

  return response
}

/**
 * Validate request content type for JSON endpoints
 */
export function validateContentType(request: Request): boolean {
  const contentType = request.headers.get('content-type')
  
  if (!contentType) return false
  
  return contentType.includes('application/json')
}

/**
 * Safely parse JSON from request body
 */
export async function parseRequestBody<T = unknown>(request: Request): Promise<T> {
  let text = ''
  try {
    text = await request.text()
    if (!text.trim()) {
      throw new Error('Empty request body')
    }
    return JSON.parse(text) as T
  } catch (error) {
    console.error('JSON parse error:', error)
    throw new Error('Invalid JSON in request body')
  }
}