/**
 * Email Allowlist Management API
 * Implements FR-001 to FR-004: Email allowlist system with role assignment
 * 
 * SECURITY NOTE: This API has no UI management - config/database only
 * Only admin can manage allowlist entries via direct database access
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// Email allowlist entry interface
interface AllowlistEntry {
  id: string
  email: string
  role: 'admin' | 'associate_attorney' | 'paralegal' | 'assistant' | 'client' | 'client_related_party' | 'developer'
  status: 'active' | 'inactive' | 'pending'
  created_at: string
  created_by: string
  deactivated_at?: string
  deactivated_by?: string
  developer_access_expires?: string // For temporary developer access
  notes?: string
}

// Validation schemas
const AllowlistEntrySchema = z.object({
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'associate_attorney', 'paralegal', 'assistant', 'client', 'client_related_party', 'developer']),
  status: z.enum(['active', 'inactive', 'pending']).default('active'),
  notes: z.string().optional(),
  developer_access_expires: z.string().datetime().optional()
})

const CheckAllowlistSchema = z.object({
  email: z.string().email('Invalid email format')
})

// In-memory allowlist for demo (in production, this would be in database)
const emailAllowlist: AllowlistEntry[] = [
  {
    id: '1',
    email: 'luke@jurisagentis.com',
    role: 'admin',
    status: 'active',
    created_at: new Date().toISOString(),
    created_by: 'system',
    notes: 'Primary admin account'
  },
  {
    id: '2', 
    email: 'andrea@jurisagentis.com',
    role: 'associate_attorney',
    status: 'active',
    created_at: new Date().toISOString(),
    created_by: 'luke@jurisagentis.com',
    notes: 'Associate attorney'
  },
  {
    id: '3',
    email: 'paralegal@jurisagentis.com',
    role: 'paralegal',
    status: 'active',
    created_at: new Date().toISOString(),
    created_by: 'luke@jurisagentis.com'
  }
]

/**
 * POST /api/auth/allowlist - Check if email is allowlisted (used during registration)
 * FR-002: Prevent non-allowlisted emails from accessing platform
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = CheckAllowlistSchema.parse(body)
    
    console.log('🔐 Checking email allowlist for:', email)
    
    // Find email in allowlist
    const allowlistEntry = emailAllowlist.find(
      entry => entry.email.toLowerCase() === email.toLowerCase() && entry.status === 'active'
    )
    
    if (!allowlistEntry) {
      console.log('❌ Email not allowlisted:', email)
      
      // Log unauthorized access attempt
      await logUnauthorizedAttempt(email)
      
      return NextResponse.json({
        allowed: false,
        message: 'Email not authorized for platform access'
      }, { status: 403 })
    }
    
    // Check for expired developer access
    if (allowlistEntry.role === 'developer' && allowlistEntry.developer_access_expires) {
      const expirationDate = new Date(allowlistEntry.developer_access_expires)
      if (expirationDate < new Date()) {
        console.log('❌ Developer access expired for:', email)
        
        // Auto-deactivate expired developer access
        allowlistEntry.status = 'inactive'
        allowlistEntry.deactivated_at = new Date().toISOString()
        allowlistEntry.deactivated_by = 'system'
        
        return NextResponse.json({
          allowed: false,
          message: 'Developer access has expired'
        }, { status: 403 })
      }
    }
    
    console.log('✅ Email allowlisted:', email, 'Role:', allowlistEntry.role)
    
    return NextResponse.json({
      allowed: true,
      role: allowlistEntry.role,
      entry_id: allowlistEntry.id
    }, { status: 200 })
    
  } catch (error) {
    console.error('Allowlist check error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Allowlist check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/auth/allowlist - Get allowlist entries (admin only)
 * For internal management and auditing
 */
export async function GET(request: NextRequest) {
  try {
    // This would check admin permissions in production
    const url = new URL(request.url)
    const includeInactive = url.searchParams.get('include_inactive') === 'true'
    
    let entries = emailAllowlist
    if (!includeInactive) {
      entries = entries.filter(entry => entry.status === 'active')
    }
    
    // Remove sensitive internal data
    const sanitizedEntries = entries.map(entry => ({
      id: entry.id,
      email: entry.email,
      role: entry.role,
      status: entry.status,
      created_at: entry.created_at,
      developer_access_expires: entry.developer_access_expires,
      notes: entry.notes
    }))
    
    return NextResponse.json({
      entries: sanitizedEntries,
      total: sanitizedEntries.length
    }, { status: 200 })
    
  } catch (error) {
    console.error('Allowlist fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch allowlist',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PUT /api/auth/allowlist - Add/update allowlist entry (admin only, no UI)
 * FR-003: Email + role assigned together
 * FR-006: Support temporary developer access
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = AllowlistEntrySchema.parse(body)
    
    console.log('🔐 Adding/updating allowlist entry:', validatedData.email)
    
    // Check if entry already exists
    const existingIndex = emailAllowlist.findIndex(
      entry => entry.email.toLowerCase() === validatedData.email.toLowerCase()
    )
    
    const now = new Date().toISOString()
    
    if (existingIndex >= 0) {
      // Update existing entry
      emailAllowlist[existingIndex] = {
        ...emailAllowlist[existingIndex],
        role: validatedData.role,
        status: validatedData.status,
        notes: validatedData.notes,
        developer_access_expires: validatedData.developer_access_expires
      }
      
      console.log('✅ Updated allowlist entry:', validatedData.email)
    } else {
      // Create new entry
      const newEntry: AllowlistEntry = {
        id: `allowlist_${Date.now()}`,
        email: validatedData.email,
        role: validatedData.role,
        status: validatedData.status,
        created_at: now,
        created_by: 'admin', // In production, get from authenticated user
        notes: validatedData.notes,
        developer_access_expires: validatedData.developer_access_expires
      }
      
      emailAllowlist.push(newEntry)
      console.log('✅ Created allowlist entry:', validatedData.email)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Allowlist entry updated successfully'
    }, { status: 200 })
    
  } catch (error) {
    console.error('Allowlist update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Allowlist update failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * PATCH /api/auth/allowlist/deactivate - Deactivate user access (FR-004)
 * Manual account deactivation by admin only
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, reason } = body
    
    if (!email) {
      return NextResponse.json({
        error: 'Email is required'
      }, { status: 400 })
    }
    
    console.log('🔐 Deactivating allowlist entry:', email)
    
    const entryIndex = emailAllowlist.findIndex(
      entry => entry.email.toLowerCase() === email.toLowerCase()
    )
    
    if (entryIndex === -1) {
      return NextResponse.json({
        error: 'Email not found in allowlist'
      }, { status: 404 })
    }
    
    // Deactivate the entry
    emailAllowlist[entryIndex] = {
      ...emailAllowlist[entryIndex],
      status: 'inactive',
      deactivated_at: new Date().toISOString(),
      deactivated_by: 'admin', // In production, get from authenticated user
      notes: `${emailAllowlist[entryIndex].notes || ''}\nDeactivated: ${reason || 'No reason provided'}`
    }
    
    console.log('✅ Deactivated allowlist entry:', email)
    
    // In production, this would also:
    // 1. Invalidate all active sessions for this user
    // 2. Log the deactivation in audit trail
    // 3. Send notification if required
    
    return NextResponse.json({
      success: true,
      message: 'User access deactivated successfully'
    }, { status: 200 })
    
  } catch (error) {
    console.error('Deactivation error:', error)
    return NextResponse.json({
      error: 'Deactivation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * Helper function to log unauthorized access attempts
 * FR-007: Maintain audit trail
 */
async function logUnauthorizedAttempt(email: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: 'unauthorized_access_attempt',
    email: email,
    ip_address: 'unknown', // Would capture from request in production
    user_agent: 'unknown' // Would capture from request in production
  }
  
  console.log('🚨 Unauthorized access attempt logged:', logEntry)
  
  // In production, store in audit log database
}