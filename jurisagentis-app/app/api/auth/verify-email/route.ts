/**
 * Email Verification API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDatabaseResponse } from '@/lib/utils/api-helpers'

// POST /api/auth/verify-email - Verify email from registration
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Verification token is required', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // Find the pending registration with this token
    const { data: pendingRegistration, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (fetchError || !pendingRegistration) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Invalid verification token', 'TOKEN_INVALID'),
        { status: 400 }
      )
    }

    // Check if token has expired
    const now = new Date()
    const tokenExpiry = new Date(pendingRegistration.verification_token_expires)
    
    if (now > tokenExpiry) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Verification token has expired', 'TOKEN_EXPIRED'),
        { status: 400 }
      )
    }

    // Check if already verified
    if (pendingRegistration.email_verified) {
      return NextResponse.json(
        createDatabaseResponse(
          {
            user: {
              firstName: pendingRegistration.first_name,
              lastName: pendingRegistration.last_name,
              email: pendingRegistration.email
            }
          },
          'Email has already been verified',
          'ALREADY_VERIFIED'
        ),
        { status: 200 }
      )
    }

    // Update the pending registration to mark email as verified
    const { data: updatedRegistration, error: updateError } = await supabase
      .from('pending_registrations')
      .update({
        email_verified: true,
        email_verified_at: now.toISOString(),
        registration_status: 'pending_approval',
        updated_at: now.toISOString()
      })
      .eq('id', pendingRegistration.id)
      .select('*')
      .single()

    if (updateError) {
      console.error('Database error updating registration:', updateError)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to verify email', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    // Create a verification token record for audit purposes
    await supabase
      .from('email_verification_tokens')
      .insert({
        token: token,
        token_type: 'registration',
        email: updatedRegistration.email,
        pending_registration_id: updatedRegistration.id,
        used: true,
        used_at: now.toISOString(),
        expires_at: tokenExpiry.toISOString()
      })

    // Update admin notifications to reflect email verification
    await supabase
      .from('admin_notifications')
      .update({
        title: 'User Email Verified - Pending Approval',
        message: `User ${updatedRegistration.first_name} ${updatedRegistration.last_name} (${updatedRegistration.email}) has verified their email and is now pending approval for ${updatedRegistration.requested_role} role.`,
        updated_at: now.toISOString()
      })
      .eq('pending_registration_id', updatedRegistration.id)
      .eq('notification_type', 'new_registration')

    return NextResponse.json(
      createDatabaseResponse(
        {
          user: {
            firstName: updatedRegistration.first_name,
            lastName: updatedRegistration.last_name,
            email: updatedRegistration.email
          },
          status: 'pending_approval'
        },
        'Email verified successfully. Your registration is now pending admin approval.',
        'SUCCESS'
      )
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/auth/verify-email:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

// GET /api/auth/verify-email?token=... - Alternative GET method for email links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect('/verify-email?error=no_token')
    }

    // Use the same logic as POST but redirect instead of returning JSON
    const verificationResult = await verifyEmailToken(token)

    if (verificationResult.success) {
      return NextResponse.redirect('/verify-email?success=true')
    } else {
      return NextResponse.redirect(`/verify-email?error=${verificationResult.error}`)
    }

  } catch (error) {
    console.error('Unexpected error in GET /api/auth/verify-email:', error)
    return NextResponse.redirect('/verify-email?error=server_error')
  }
}

// Helper function to verify email token (shared between GET and POST)
async function verifyEmailToken(token: string) {
  const supabase = createClient()

  try {
    // Find the pending registration with this token
    const { data: pendingRegistration, error: fetchError } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (fetchError || !pendingRegistration) {
      return { success: false, error: 'invalid_token' }
    }

    // Check if token has expired
    const now = new Date()
    const tokenExpiry = new Date(pendingRegistration.verification_token_expires)
    
    if (now > tokenExpiry) {
      return { success: false, error: 'token_expired' }
    }

    // Check if already verified
    if (pendingRegistration.email_verified) {
      return { success: true, error: 'already_verified' }
    }

    // Update the pending registration to mark email as verified
    const { error: updateError } = await supabase
      .from('pending_registrations')
      .update({
        email_verified: true,
        email_verified_at: now.toISOString(),
        registration_status: 'pending_approval',
        updated_at: now.toISOString()
      })
      .eq('id', pendingRegistration.id)

    if (updateError) {
      return { success: false, error: 'database_error' }
    }

    return { success: true, error: null }

  } catch (error) {
    console.error('Error in verifyEmailToken:', error)
    return { success: false, error: 'server_error' }
  }
}