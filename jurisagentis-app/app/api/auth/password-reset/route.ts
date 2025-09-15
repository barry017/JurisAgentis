/**
 * Password Reset API - Handle password reset requests and confirmation
 */

import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'
import { logAuditEvent } from '@/lib/auth/middleware'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

interface PasswordResetRequest {
  email: string
}

interface PasswordResetConfirm {
  token: string
  new_password: string
  confirm_password: string
}

// POST /api/auth/password-reset - Request password reset
export async function POST(request: NextRequest) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    const { action } = await parseRequestBody<{ action: string }>(request)

    if (action === 'request') {
      return handlePasswordResetRequest(request)
    } else if (action === 'confirm') {
      return handlePasswordResetConfirm(request)
    } else {
      return addCORSHeaders(createErrorResponse(
        'INVALID_ACTION',
        'Action must be either "request" or "confirm"',
        400
      ))
    }

  } catch (error) {
    console.error('Password reset error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

async function handlePasswordResetRequest(request: NextRequest) {
  try {
    const { email } = await parseRequestBody<PasswordResetRequest>(request)

    if (!email) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_EMAIL',
        'Email address is required',
        400
      ))
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_EMAIL',
        'Invalid email format',
        400
      ))
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists in the system
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, first_name, last_name, status')
      .eq('email', normalizedEmail)
      .single()

    // For security, always return success even if user doesn't exist
    // This prevents email enumeration attacks
    if (userError || !user) {
      console.log(`Password reset requested for non-existent email: ${normalizedEmail}`)
      
      // Log the attempt for security monitoring
      await logAuditEvent(
        'password_reset_attempt_invalid_email',
        'anonymous',
        request,
        { email: normalizedEmail }
      )

      return addCORSHeaders(createSuccessResponse({
        message: 'If an account with that email exists, we have sent a password reset link.'
      }))
    }

    // Check if user account is active
    if (user.status !== 'active') {
      console.log(`Password reset requested for inactive user: ${normalizedEmail}`)
      
      await logAuditEvent(
        'password_reset_attempt_inactive_user',
        user.id,
        request,
        { email: normalizedEmail, status: user.status }
      )

      return addCORSHeaders(createSuccessResponse({
        message: 'If an account with that email exists, we have sent a password reset link.'
      }))
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Store the reset token
    const { error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token: resetToken,
        email: normalizedEmail,
        expires_at: tokenExpiry.toISOString(),
        created_at: new Date().toISOString(),
        used: false
      })

    if (tokenError) {
      console.error('Error storing password reset token:', tokenError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to process password reset request',
        500
      ))
    }

    // Send password reset email
    try {
      await sendPasswordResetEmail(
        normalizedEmail,
        user.first_name,
        resetToken
      )
    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      // Continue - we don't want to reveal email sending failures
    }

    // Log the successful password reset request
    await logAuditEvent(
      'password_reset_requested',
      user.id,
      request,
      { email: normalizedEmail }
    )

    return addCORSHeaders(createSuccessResponse({
      message: 'If an account with that email exists, we have sent a password reset link.'
    }))

  } catch (error) {
    console.error('Password reset request error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to process password reset request',
      500
    ))
  }
}

async function handlePasswordResetConfirm(request: NextRequest) {
  try {
    const { token, new_password, confirm_password } = await parseRequestBody<PasswordResetConfirm>(request)

    // Validate required fields
    if (!token || !new_password || !confirm_password) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_FIELDS',
        'Token, new password, and password confirmation are required',
        400
      ))
    }

    // Validate passwords match
    if (new_password !== confirm_password) {
      return addCORSHeaders(createErrorResponse(
        'PASSWORD_MISMATCH',
        'New password and confirmation do not match',
        400
      ))
    }

    // Validate password strength
    if (new_password.length < 8) {
      return addCORSHeaders(createErrorResponse(
        'WEAK_PASSWORD',
        'Password must be at least 8 characters long',
        400
      ))
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(new_password)) {
      return addCORSHeaders(createErrorResponse(
        'WEAK_PASSWORD',
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        400
      ))
    }

    // Find and validate the reset token
    const { data: resetTokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !resetTokenData) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_TOKEN',
        'Invalid or expired reset token',
        400
      ))
    }

    // Check if token has expired
    const now = new Date()
    const tokenExpiry = new Date(resetTokenData.expires_at)
    
    if (now > tokenExpiry) {
      // Mark token as expired
      await supabaseAdmin
        .from('password_reset_tokens')
        .update({ used: true, used_at: now.toISOString() })
        .eq('id', resetTokenData.id)

      return addCORSHeaders(createErrorResponse(
        'TOKEN_EXPIRED',
        'Reset token has expired. Please request a new password reset.',
        400
      ))
    }

    // Get user information
    const { data: user, error: userError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, first_name, status')
      .eq('id', resetTokenData.user_id)
      .single()

    if (userError || !user) {
      return addCORSHeaders(createErrorResponse(
        'USER_NOT_FOUND',
        'User account not found',
        400
      ))
    }

    // Check if user account is still active
    if (user.status !== 'active') {
      return addCORSHeaders(createErrorResponse(
        'ACCOUNT_INACTIVE',
        'User account is not active',
        400
      ))
    }

    // Update user password using Supabase Auth
    const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (passwordError) {
      console.error('Error updating user password:', passwordError)
      return addCORSHeaders(createErrorResponse(
        'PASSWORD_UPDATE_FAILED',
        'Failed to update password',
        500
      ))
    }

    // Mark the reset token as used
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ 
        used: true, 
        used_at: now.toISOString() 
      })
      .eq('id', resetTokenData.id)

    // Invalidate all existing sessions for security
    await supabaseAdmin
      .from('user_sessions')
      .update({ 
        revoked: true,
        revoked_at: now.toISOString(),
        revoked_reason: 'password_reset'
      })
      .eq('user_id', user.id)
      .eq('revoked', false)

    // Log the successful password reset
    await logAuditEvent(
      'password_reset_completed',
      user.id,
      request,
      { 
        email: user.email,
        token_id: resetTokenData.id
      }
    )

    // Send password change notification email
    try {
      await sendPasswordChangeNotification(user.email, user.first_name)
    } catch (emailError) {
      console.error('Error sending password change notification:', emailError)
      // Continue - this is not critical
    }

    return addCORSHeaders(createSuccessResponse({
      message: 'Password has been reset successfully. Please log in with your new password.'
    }))

  } catch (error) {
    console.error('Password reset confirm error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to reset password',
      500
    ))
  }
}

// Helper function to send password reset email
async function sendPasswordResetEmail(email: string, firstName: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  
  console.log(`Password reset email would be sent to ${email}:`)
  console.log(`Reset URL: ${resetUrl}`)
  
  const emailContent = {
    to: email,
    subject: 'Reset Your JurisAgentis Password',
    body: `
      Hi ${firstName},
      
      We received a request to reset your password for your JurisAgentis account.
      
      If you requested this password reset, please click the link below to set a new password:
      
      ${resetUrl}
      
      This link will expire in 1 hour for your security.
      
      If you did not request this password reset, please ignore this email and your password will remain unchanged.
      
      If you're having trouble with the link above, you can copy and paste the following URL into your browser:
      ${resetUrl}
      
      For security reasons, please do not share this link with anyone.
      
      Best regards,
      The JurisAgentis Team
    `
  }
  
  console.log('Password reset email content:', emailContent)
  
  // TODO: Implement actual email sending with your email service
  // Example implementations:
  // - await sendEmailWithSendGrid(emailContent)
  // - await sendEmailWithSES(emailContent)
  // - await sendEmailWithResend(emailContent)
}

// Helper function to send password change notification
async function sendPasswordChangeNotification(email: string, firstName: string) {
  console.log(`Password change notification would be sent to ${email}`)
  
  const emailContent = {
    to: email,
    subject: 'Your JurisAgentis Password Has Been Changed',
    body: `
      Hi ${firstName},
      
      This is to confirm that your password for your JurisAgentis account has been successfully changed.
      
      If you made this change, no further action is needed.
      
      If you did not change your password, please contact our support team immediately at support@jurisagentis.com or log in to your account to secure it.
      
      For your security, all existing sessions have been logged out and you will need to log in again with your new password.
      
      Best regards,
      The JurisAgentis Team
    `
  }
  
  console.log('Password change notification content:', emailContent)
  
  // TODO: Implement actual email sending
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

// Handle unsupported methods
export async function GET() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}

export async function PUT() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['POST', 'OPTIONS']))
}