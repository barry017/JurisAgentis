/**
 * Gmail OAuth2 Authentication API
 * Handles Gmail OAuth2 flow for email integration
 */

import { NextRequest } from 'next/server'
import { gmailService } from '@/lib/services/gmail'
import { createSuccessResponse, createErrorResponse, addCORSHeaders } from '@/lib/api/response'
import { authenticate } from '@/lib/auth/middleware'

// GET /api/auth/gmail - Get OAuth2 authorization URL
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)
    
    // Only allow admin and associate_attorney to configure Gmail
    if (!['admin', 'associate_attorney'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Only admins and attorneys can configure Gmail integration',
        403
      ))
    }

    // Get authorization URL
    const authUrl = gmailService.getAuthUrl()

    return addCORSHeaders(createSuccessResponse({
      authUrl,
      message: 'Visit this URL to authorize Gmail access'
    }))

  } catch (error) {
    console.error('Gmail auth URL error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to generate Gmail authorization URL',
      500
    ))
  }
}

// POST /api/auth/gmail - Handle OAuth2 callback
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)
    
    // Only allow admin and associate_attorney to configure Gmail
    if (!['admin', 'associate_attorney'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Only admins and attorneys can configure Gmail integration',
        403
      ))
    }

    const { code } = await request.json()

    if (!code) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_PARAMETER',
        'Authorization code is required',
        400
      ))
    }

    // Exchange code for tokens
    await gmailService.setCredentialsFromCode(code)

    // Get profile to verify authentication
    const profile = await gmailService.getProfile()

    if (!profile) {
      return addCORSHeaders(createErrorResponse(
        'AUTHENTICATION_FAILED',
        'Failed to authenticate with Gmail',
        401
      ))
    }

    return addCORSHeaders(createSuccessResponse({
      success: true,
      profile,
      message: 'Gmail integration configured successfully'
    }))

  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    return addCORSHeaders(createErrorResponse(
      'AUTHENTICATION_FAILED',
      'Failed to process Gmail authorization',
      401
    ))
  }
}

// GET /api/auth/gmail/status - Check Gmail authentication status
export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}