/**
 * POST /api/auth/mfa/setup
 * 
 * Sets up MFA for authenticated users with TOTP generation and backup codes
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  addCORSHeaders
} from '@/lib/api/response'
import { 
  authenticate,
  AuthenticationError,
  AuthorizationError,
  logAuditEvent,
  requireRole
} from '@/lib/auth/middleware'
import { generateTOTPSecret, generateQRCode, generateBackupCodes } from '@/lib/auth/mfa'

interface MFASetupResponse {
  success: true
  qrCode: string
  manualEntryKey: string
  backupCodes: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await authenticate(request)

    // Check if user has permission to set up MFA (not clients or client-related parties)
    const allowedRoles = ['admin', 'associate_attorney', 'paralegal', 'assistant']
    try {
      requireRole(user, allowedRoles)
    } catch (error) {
      console.error('MFA setup role check failed:', error)
      await logAuditEvent('MFA_SETUP_DENIED', user.uid, request, {
        reason: 'Insufficient role permissions',
        userRole: user.role
      })
      return createErrorResponse(
        'INSUFFICIENT_PERMISSIONS',
        'MFA setup is not available for your user role',
        403
      )
    }

    // Check if MFA is already enabled
    const { data: existingMFA, error: mfaCheckError } = await supabaseAdmin
      .from('mfa_enrollments')
      .select('uid, mfa_enabled')
      .eq('uid', user.uid)
      .single()

    if (mfaCheckError && mfaCheckError.code !== 'PGRST116') {
      console.error('MFA check error:', mfaCheckError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to check MFA status',
        500
      )
    }

    if (existingMFA?.mfa_enabled) {
      await logAuditEvent('MFA_SETUP_ALREADY_ENABLED', user.uid, request)
      return createErrorResponse(
        'MFA_ALREADY_ENABLED',
        'MFA is already enabled for this account',
        400,
        { currentStatus: 'enabled' }
      )
    }

    // Generate TOTP secret and QR code
    const secret = generateTOTPSecret()
    const qrCode = await generateQRCode(user.email, secret, 'JurisAgentis')
    const backupCodes = generateBackupCodes(10)

    // Store MFA enrollment
    const { error: insertError } = await supabaseAdmin
      .from('mfa_enrollments')
      .upsert({
        uid: user.uid,
        mfa_secret: secret,
        backup_codes: backupCodes,
        mfa_enabled: false, // Will be enabled after verification
        enrolled_at: new Date().toISOString(),
        failed_attempts: 0,
        locked_until: null
      })

    if (insertError) {
      console.error('MFA enrollment error:', insertError)
      return createErrorResponse(
        'DATABASE_ERROR',
        'Failed to set up MFA',
        500
      )
    }

    // Log successful MFA setup
    await logAuditEvent('MFA_SETUP_SUCCESS', user.uid, request, {
      method: 'TOTP',
      backupCodesGenerated: backupCodes.length
    })

    const setupResponse: MFASetupResponse = {
      success: true,
      qrCode,
      manualEntryKey: secret,
      backupCodes
    }

    const response = createSuccessResponse(undefined, 'MFA setup completed successfully', setupResponse)
    return addCORSHeaders(response, request.headers.get('origin') || undefined)

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    console.error('MFA setup error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred during MFA setup',
      500
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function PUT() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function DELETE() {
  return createMethodNotAllowedResponse(['POST'])
}

export async function OPTIONS(request: NextRequest) {
  const response = new Response(null, { status: 200 })
  return addCORSHeaders(response, request.headers.get('origin') || undefined)
}