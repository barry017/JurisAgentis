/**
 * POST /api/auth/mfa/verify
 * 
 * Verifies TOTP codes or backup codes for MFA authentication
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse,
  createMethodNotAllowedResponse,
  // createRateLimitResponse, // Unused for now but keeping import for future rate limiting
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'
import { 
  authenticate,
  AuthenticationError,
  AuthorizationError,
  logAuditEvent 
} from '@/lib/auth/middleware'
import { 
  verifyTOTPCode,
  verifyBackupCode,
  removeUsedBackupCode,
  shouldLockAccount,
  generateLockoutExpiry,
  isAccountLocked,
  getRemainingLockoutTime,
  isTOTPCodeExpired
} from '@/lib/auth/mfa'

interface MFAVerifyRequest {
  code: string
  isBackupCode: boolean
}

interface MFAVerifyResponse {
  success: true
  token: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (should have temp token from login)
    const user = await authenticate(request)

    // Validate content type
    if (!validateContentType(request)) {
      return createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      )
    }

    // Parse request body
    const body = await parseRequestBody<MFAVerifyRequest>(request)

    // Validate required fields
    if (!body.code) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'MFA code is required',
        400,
        { field: 'code' }
      )
    }

    // Validate code format based on type
    if (body.isBackupCode) {
      // Backup codes are 8-character hex
      if (!/^[0-9a-f]{8}$/i.test(body.code)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid backup code format',
          400,
          { field: 'code' }
        )
      }
    } else {
      // TOTP codes are 6 digits
      if (!/^\d{6}$/.test(body.code)) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid TOTP code format',
          400,
          { field: 'code' }
        )
      }
    }

    // Get MFA enrollment
    const { data: mfaEnrollment, error: mfaError } = await supabaseAdmin
      .from('mfa_enrollments')
      .select('*')
      .eq('uid', user.uid)
      .single()

    if (mfaError || !mfaEnrollment) {
      await logAuditEvent('MFA_VERIFY_NO_ENROLLMENT', user.uid, request, {
        code: body.code.slice(0, 2) + '****'
      })

      return createErrorResponse(
        'MFA_NOT_ENROLLED',
        'MFA is not set up for this account',
        404
      )
    }

    // Check if account is locked
    if (mfaEnrollment.locked_until && isAccountLocked(mfaEnrollment.locked_until)) {
      const remainingTime = getRemainingLockoutTime(mfaEnrollment.locked_until)
      
      await logAuditEvent('MFA_VERIFY_ACCOUNT_LOCKED', user.uid, request, {
        lockedUntil: mfaEnrollment.locked_until,
        remainingSeconds: remainingTime
      })

      return createErrorResponse(
        'ACCOUNT_LOCKED',
        'Account is temporarily locked due to multiple failed MFA attempts',
        429,
        { 
          lockedUntil: mfaEnrollment.locked_until,
          retryAfter: remainingTime
        }
      )
    }

    let isValidCode = false
    let newBackupCodes = mfaEnrollment.backup_codes

    if (body.isBackupCode) {
      // Verify backup code
      if (verifyBackupCode(body.code, mfaEnrollment.backup_codes || [])) {
        isValidCode = true
        // Remove used backup code
        newBackupCodes = removeUsedBackupCode(body.code, mfaEnrollment.backup_codes || [])
        
        await logAuditEvent('MFA_VERIFY_BACKUP_SUCCESS', user.uid, request, {
          backupCodesRemaining: newBackupCodes.length
        })
      } else {
        // Check if backup code was already used
        const allUsedCodes = mfaEnrollment.backup_codes || []
        if (!allUsedCodes.includes(body.code.toLowerCase())) {
          await logAuditEvent('MFA_VERIFY_BACKUP_INVALID', user.uid, request)
        } else {
          await logAuditEvent('MFA_VERIFY_BACKUP_REUSED', user.uid, request)
          return createErrorResponse(
            'BACKUP_CODE_ALREADY_USED',
            'This backup code has already been used',
            400
          )
        }
      }
    } else {
      // Verify TOTP code
      if (verifyTOTPCode(body.code, mfaEnrollment.mfa_secret)) {
        isValidCode = true
        await logAuditEvent('MFA_VERIFY_TOTP_SUCCESS', user.uid, request)
      } else {
        // Check if code is expired for better error message
        if (isTOTPCodeExpired(body.code, mfaEnrollment.mfa_secret)) {
          await logAuditEvent('MFA_VERIFY_TOTP_EXPIRED', user.uid, request)
          return createErrorResponse(
            'EXPIRED_MFA_CODE',
            'The MFA code has expired. Please generate a new one.',
            400
          )
        } else {
          await logAuditEvent('MFA_VERIFY_TOTP_INVALID', user.uid, request)
        }
      }
    }

    if (isValidCode) {
      // Reset failed attempts and update backup codes if needed
      await supabaseAdmin
        .from('mfa_enrollments')
        .update({
          failed_attempts: 0,
          locked_until: null,
          backup_codes: newBackupCodes,
          last_verified: new Date().toISOString()
        })
        .eq('uid', user.uid)

      // Update user profile to mark MFA as verified/enabled
      await supabaseAdmin
        .from('user_profiles')
        .update({ mfa_enabled: true })
        .eq('uid', user.uid)

      // Generate new session token (in real implementation, would use proper JWT)
      const newToken = `verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const verifyResponse: MFAVerifyResponse = {
        success: true,
        token: newToken
      }

      const response = createSuccessResponse(undefined, 'MFA verification successful', verifyResponse)
      return addCORSHeaders(response, request.headers.get('origin') || undefined)

    } else {
      // Increment failed attempts
      const newFailedAttempts = (mfaEnrollment.failed_attempts || 0) + 1
      const updateData: { failed_attempts: number; locked_until?: string } = {
        failed_attempts: newFailedAttempts
      }

      // Check if account should be locked
      if (shouldLockAccount(newFailedAttempts)) {
        const lockoutExpiry = generateLockoutExpiry(newFailedAttempts)
        updateData.locked_until = lockoutExpiry

        await supabaseAdmin
          .from('mfa_enrollments')
          .update(updateData)
          .eq('uid', user.uid)

        await logAuditEvent('MFA_VERIFY_ACCOUNT_LOCKED_NEW', user.uid, request, {
          failedAttempts: newFailedAttempts,
          lockedUntil: lockoutExpiry
        })

        const retryAfter = getRemainingLockoutTime(lockoutExpiry)
        return createErrorResponse(
          'ACCOUNT_LOCKED',
          'Account locked due to multiple failed MFA attempts',
          429,
          {
            lockedUntil: lockoutExpiry,
            retryAfter
          }
        )
      } else {
        await supabaseAdmin
          .from('mfa_enrollments')
          .update(updateData)
          .eq('uid', user.uid)

        await logAuditEvent('MFA_VERIFY_FAILED', user.uid, request, {
          failedAttempts: newFailedAttempts,
          isBackupCode: body.isBackupCode
        })

        return createErrorResponse(
          'INVALID_MFA_CODE',
          'Invalid MFA code provided',
          400,
          {
            attemptsRemaining: 5 - newFailedAttempts
          }
        )
      }
    }

  } catch (error) {
    if (error instanceof AuthenticationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof AuthorizationError) {
      return createErrorResponse(error.code, error.message, error.statusCode)
    }

    if (error instanceof Error && error.message.includes('Invalid JSON')) {
      return createErrorResponse('INVALID_JSON', 'Invalid JSON in request body', 400)
    }

    console.error('MFA verification error:', error)
    return createErrorResponse(
      'INTERNAL_ERROR',
      'An internal error occurred during MFA verification',
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