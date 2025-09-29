/**
 * User Registration API Endpoint
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createDatabaseResponse } from '@/lib/utils/api-helpers'
import { v4 as uuidv4 } from 'uuid'

interface RegistrationData {
  firstName: string
  lastName: string
  email: string
  password: string
  jobTitle: string
  organization?: string
  barNumber?: string
  phoneNumber: string
  requestedRole: string
  requestReason: string
  acceptCommunications: boolean
}

// POST /api/auth/register - Register new user with allowlist enforcement (FR-001 to FR-004)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const registrationData: RegistrationData = await request.json()

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'password']
    for (const field of requiredFields) {
      if (!registrationData[field as keyof RegistrationData]) {
        return NextResponse.json(
          createDatabaseResponse(null, `Missing required field: ${field}`, 'VALIDATION_ERROR'),
          { status: 400 }
        )
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(registrationData.email)) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Invalid email format', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // CRITICAL: Check email allowlist first (FR-002: Prevent non-allowlisted emails)
    console.log('🔐 Checking email allowlist for registration:', registrationData.email)
    
    const allowlistResponse = await fetch(`${request.nextUrl.origin}/api/auth/allowlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: registrationData.email })
    })
    
    if (!allowlistResponse.ok) {
      const allowlistData = await allowlistResponse.json()
      console.log('❌ Registration blocked - email not allowlisted:', registrationData.email)
      console.log('Allowlist response:', allowlistData)
      
      // Log unauthorized registration attempt for security monitoring
      console.log('🚨 Unauthorized registration attempt:', {
        email: registrationData.email,
        name: `${registrationData.firstName} ${registrationData.lastName}`,
        timestamp: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      
      return NextResponse.json(
        createDatabaseResponse(null, 'This email is not authorized to register for the platform. Please contact your administrator.', 'UNAUTHORIZED_EMAIL'),
        { status: 403 }
      )
    }
    
    const allowlistData = await allowlistResponse.json()
    const assignedRole = allowlistData.role
    
    console.log('✅ Email allowlisted for registration:', registrationData.email, 'Assigned role:', assignedRole)

    // Validate password strength
    if (registrationData.password.length < 8) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Password must be at least 8 characters long', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(registrationData.password)) {
      return NextResponse.json(
        createDatabaseResponse(null, 'Password must contain at least one uppercase letter, one lowercase letter, and one number', 'VALIDATION_ERROR'),
        { status: 400 }
      )
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', registrationData.email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        createDatabaseResponse(null, 'An account with this email address already exists', 'DUPLICATE_EMAIL'),
        { status: 400 }
      )
    }

    // Generate verification token
    const verificationToken = uuidv4()
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Create user record with role from allowlist (FR-003: Email + role assigned together)
    const newUserData = {
      email: registrationData.email.toLowerCase().trim(),
      first_name: registrationData.firstName.trim(),
      last_name: registrationData.lastName.trim(),
      phone: registrationData.phoneNumber?.trim() || null,
      job_title: registrationData.jobTitle?.trim() || null,
      organization: registrationData.organization?.trim() || null,
      bar_number: registrationData.barNumber?.trim() || null,
      role: assignedRole, // Use role from allowlist instead of requested role
      allowlist_entry_id: allowlistData.entry_id,
      password_hash: registrationData.password, // Note: In production, this should be hashed
      verification_token: verificationToken,
      verification_token_expires: tokenExpiry.toISOString(),
      registration_status: 'pending_verification',
      created_at: new Date().toISOString(),
      permissions: getRolePermissions(assignedRole) // Assign permissions based on allowlist role
    }
    
    // Note: Registration is now immediate for allowlisted emails, not pending approval
    console.log('👤 Creating user with allowlist-assigned role:', assignedRole)

    // Insert into pending_registrations table (we'll create this)
    const { data: pendingUser, error: insertError } = await supabase
      .from('pending_registrations')
      .insert([newUserData])
      .select('id, email, first_name, last_name, verification_token')
      .single()

    if (insertError) {
      console.error('Database error creating pending registration:', insertError)
      return NextResponse.json(
        createDatabaseResponse(null, 'Failed to create registration request', 'DATABASE_ERROR'),
        { status: 500 }
      )
    }

    // Send verification email
    try {
      await sendVerificationEmail(
        registrationData.email,
        registrationData.firstName,
        verificationToken
      )
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Don't fail the registration if email fails, but log it
    }

    // Notify admins of new registration (optional)
    try {
      await notifyAdminsOfNewRegistration(registrationData)
    } catch (notificationError) {
      console.error('Error notifying admins:', notificationError)
      // Don't fail the registration if notification fails
    }

    return NextResponse.json(
      createDatabaseResponse(
        {
          id: pendingUser.id,
          email: pendingUser.email,
          name: `${pendingUser.first_name} ${pendingUser.last_name}`,
          status: 'pending_verification'
        },
        'Registration submitted successfully. Please check your email for verification instructions.',
        'SUCCESS'
      ),
      { status: 201 }
    )

  } catch (error) {
    console.error('Unexpected error in POST /api/auth/register:', error)
    return NextResponse.json(
      createDatabaseResponse(null, 'Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    )
  }
}

// Helper function to send verification email
async function sendVerificationEmail(email: string, firstName: string, token: string) {
  const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`
  
  // In production, you would use a proper email service like:
  // - SendGrid
  // - AWS SES  
  // - Supabase Auth emails
  // - Resend
  
  console.log(`Verification email would be sent to ${email}:`)
  console.log(`Verification URL: ${verificationUrl}`)
  
  // For now, just log the email content
  const emailContent = {
    to: email,
    subject: 'Verify Your JurisAgentis Registration',
    body: `
      Hi ${firstName},
      
      Thank you for registering with JurisAgentis. Please verify your email address by clicking the link below:
      
      ${verificationUrl}
      
      This link will expire in 24 hours. If you did not create this account, please ignore this email.
      
      Best regards,
      The JurisAgentis Team
    `
  }
  
  console.log('Email content:', emailContent)
  
  // TODO: Implement actual email sending
}

/**
 * Get role-based permissions according to FR-008 to FR-013
 * Implements the complete RBAC hierarchy with financial access controls
 */
function getRolePermissions(role: string) {
  const rolePermissions = {
    admin: {
      financial: 'full', // FR-008: All firm financial data, P&L, banking, billing rates, tax info
      clients: 'full',
      documents: 'full',
      administrative: 'full',
      users: 'full',
      system: 'full'
    },
    associate_attorney: {
      financial: 'client_billing', // FR-009: Client billing/invoices, own time tracking, NO firm overhead
      clients: 'full',
      documents: 'full',
      administrative: 'limited',
      cases: 'full'
    },
    paralegal: {
      financial: 'time_tracking', // FR-010: Own time tracking only, NO billing rates/financial info
      clients: 'assigned',
      documents: 'assigned',
      administrative: 'limited',
      cases: 'assigned'
    },
    assistant: {
      financial: 'none', // FR-011: NO financial access whatsoever
      clients: 'basic',
      documents: 'basic',
      administrative: 'basic',
      scheduling: 'full'
    },
    client: {
      financial: 'own_invoices', // FR-012: Only own invoices, payment history, outstanding balances
      clients: 'own_profile',
      documents: 'own_documents',
      administrative: 'none',
      cases: 'own_cases'
    },
    client_related_party: {
      financial: 'none', // FR-013: NO financial access unless specifically granted by primary client
      clients: 'granted_only',
      documents: 'granted_only',
      administrative: 'none',
      cases: 'granted_only'
    },
    developer: {
      financial: 'none', // FR-006: Temporary developer access with auto-revocation
      clients: 'readonly',
      documents: 'readonly',
      administrative: 'system_debug',
      system: 'debug'
    }
  }
  
  return rolePermissions[role as keyof typeof rolePermissions] || {
    financial: 'none',
    clients: 'none',
    documents: 'none',
    administrative: 'none'
  }
}

// Helper function to notify admins of new registration
async function notifyAdminsOfNewRegistration(userData: RegistrationData) {
  const supabase = createClient()
  
  // Get admin users
  const { data: admins } = await supabase
    .from('user_profiles')
    .select('email, first_name')
    .eq('role', 'admin')
    .eq('status', 'active')
  
  if (admins && admins.length > 0) {
    console.log(`New registration notification would be sent to ${admins.length} admin(s):`)
    
    for (const admin of admins) {
      const emailContent = {
        to: admin.email,
        subject: 'New User Registration - JurisAgentis',
        body: `
          Hi ${admin.first_name},
          
          A new user has registered for JurisAgentis and is pending approval:
          
          Name: ${userData.firstName} ${userData.lastName}
          Email: ${userData.email}
          Job Title: ${userData.jobTitle}
          Organization: ${userData.organization || 'Not specified'}
          Requested Role: ${userData.requestedRole}
          Phone: ${userData.phoneNumber}
          
          Reason for Access:
          ${userData.requestReason}
          
          Please review and approve this registration in the admin panel.
          
          Best regards,
          JurisAgentis System
        `
      }
      
      console.log(`Admin notification email for ${admin.email}:`, emailContent)
    }
  }
  
  // TODO: Implement actual email sending to admins
}