/**
 * API Route Middleware for RBAC Enforcement
 * Implements FR-005 to FR-007 and FR-008 to FR-013
 * 
 * Provides route-level access control based on user roles and permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticate, AuthenticatedUser, AuthenticationError, AuthorizationError, logAuditEvent } from './middleware'

export interface RoutePermissions {
  roles?: string[]
  permissions?: {
    [key: string]: string[]
  }
  financial_access?: string[]
  audit_event?: string
  requires_mfa?: boolean
}

// Route permission configurations implementing FR-008 to FR-013
export const ROUTE_PERMISSIONS: Record<string, RoutePermissions> = {
  // Financial routes - Strict hierarchy enforcement
  '/api/financial/firm-data': {
    roles: ['admin'], // FR-008: Only admin access to firm financial data
    financial_access: ['full'],
    audit_event: 'firm_financial_access',
    requires_mfa: true
  },
  
  '/api/financial/p-l': {
    roles: ['admin'], // FR-008: Only admin access to P&L
    financial_access: ['full'],
    audit_event: 'p_l_access',
    requires_mfa: true
  },
  
  '/api/financial/banking': {
    roles: ['admin'], // FR-008: Only admin access to banking
    financial_access: ['full'],
    audit_event: 'banking_access',
    requires_mfa: true
  },
  
  '/api/financial/billing-rates': {
    roles: ['admin'], // FR-008: Only admin access to billing rates
    financial_access: ['full'],
    audit_event: 'billing_rates_access',
    requires_mfa: true
  },
  
  '/api/financial/client-billing': {
    roles: ['admin', 'associate_attorney'], // FR-009: Admin and attorneys can access client billing
    financial_access: ['full', 'client_billing'],
    audit_event: 'client_billing_access'
  },
  
  '/api/financial/time-tracking': {
    roles: ['admin', 'associate_attorney', 'paralegal'], // FR-010: Paralegal can track own time
    financial_access: ['full', 'client_billing', 'time_tracking'],
    audit_event: 'time_tracking_access'
  },
  
  '/api/financial/invoices': {
    roles: ['admin', 'associate_attorney', 'client'], // FR-012: Clients can view own invoices
    financial_access: ['full', 'client_billing', 'own_invoices'],
    audit_event: 'invoice_access'
  },
  
  // Client management routes
  '/api/clients': {
    roles: ['admin', 'associate_attorney', 'paralegal', 'assistant'],
    permissions: {
      clients: ['full', 'assigned', 'basic']
    },
    audit_event: 'client_list_access'
  },
  
  '/api/clients/[id]': {
    roles: ['admin', 'associate_attorney', 'paralegal', 'assistant', 'client', 'client_related_party'],
    permissions: {
      clients: ['full', 'assigned', 'basic', 'own_profile', 'granted_only']
    },
    audit_event: 'client_profile_access'
  },
  
  // Document management routes
  '/api/documents': {
    roles: ['admin', 'associate_attorney', 'paralegal', 'assistant'],
    permissions: {
      documents: ['full', 'assigned', 'basic']
    },
    audit_event: 'document_list_access'
  },
  
  '/api/documents/[id]': {
    roles: ['admin', 'associate_attorney', 'paralegal', 'assistant', 'client', 'client_related_party'],
    permissions: {
      documents: ['full', 'assigned', 'basic', 'own_documents', 'granted_only']
    },
    audit_event: 'document_access'
  },
  
  // Administrative routes
  '/api/admin/users': {
    roles: ['admin'], // FR-007: User management requires admin
    permissions: {
      users: ['full']
    },
    audit_event: 'user_management_access',
    requires_mfa: true
  },
  
  '/api/admin/roles': {
    roles: ['admin'], // FR-005: Role management requires admin
    permissions: {
      administrative: ['full']
    },
    audit_event: 'role_management_access',
    requires_mfa: true
  },
  
  // System routes
  '/api/system/debug': {
    roles: ['admin', 'developer'], // FR-006: Temporary developer access
    permissions: {
      system: ['full', 'debug']
    },
    audit_event: 'system_debug_access'
  },
  
  // AI Assistant routes
  '/api/ai-assistant': {
    roles: ['admin', 'associate_attorney', 'paralegal', 'assistant'],
    audit_event: 'ai_assistant_access'
  },
  
  // Workflow routes
  '/api/workflows': {
    roles: ['admin', 'associate_attorney', 'paralegal'],
    audit_event: 'workflow_access'
  }
}

/**
 * API Route Protection Middleware
 * Enforces RBAC and logs access attempts
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser, params?: unknown) => Promise<NextResponse>,
  routePermissions?: RoutePermissions
) {
  return async (request: NextRequest, params?: unknown): Promise<NextResponse> => {
    try {
      // Step 1: Authenticate user
      const user = await authenticate(request)
      
      // Step 2: Check route permissions
      if (routePermissions) {
        await enforceRoutePermissions(user, routePermissions, request)
      }
      
      // Step 3: Log access attempt
      if (routePermissions?.audit_event) {
        await logAuditEvent(
          routePermissions.audit_event,
          user.uid,
          request,
          {
            route: request.url,
            method: request.method,
            role: user.role,
            permissions: user.permissions
          }
        )
      }
      
      // Step 4: Execute handler
      return await handler(request, user, params)
      
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json({
          error: 'Authentication failed',
          code: error.code,
          message: error.message
        }, { status: error.statusCode })
      }
      
      if (error instanceof AuthorizationError) {
        return NextResponse.json({
          error: 'Access denied',
          code: error.code,
          message: error.message
        }, { status: error.statusCode })
      }
      
      console.error('API middleware error:', error)
      return NextResponse.json({
        error: 'Internal server error'
      }, { status: 500 })
    }
  }
}

/**
 * Enforce route-specific permissions
 */
async function enforceRoutePermissions(
  user: AuthenticatedUser,
  routePermissions: RoutePermissions,
  request: NextRequest
) {
  // Check required roles
  if (routePermissions.roles && !routePermissions.roles.includes(user.role)) {
    throw new AuthorizationError(
      `Access denied. Required roles: ${routePermissions.roles.join(', ')}`,
      'INSUFFICIENT_ROLE',
      403
    )
  }
  
  // Check specific permissions
  if (routePermissions.permissions) {
    for (const [permission, allowedLevels] of Object.entries(routePermissions.permissions)) {
      const userLevel = user.permissions[permission as keyof typeof user.permissions]
      if (!userLevel || !allowedLevels.includes(userLevel)) {
        throw new AuthorizationError(
          `Insufficient ${permission} permissions`,
          'INSUFFICIENT_PERMISSIONS',
          403
        )
      }
    }
  }
  
  // Check financial access (FR-008 to FR-013 enforcement)
  if (routePermissions.financial_access) {
    const userFinancialAccess = user.permissions.financial
    if (!routePermissions.financial_access.includes(userFinancialAccess)) {
      // Log financial access denial for security monitoring
      await logAuditEvent(
        'financial_access_denied',
        user.uid,
        request,
        {
          required_access: routePermissions.financial_access,
          user_access: userFinancialAccess,
          route: request.url
        }
      )
      
      throw new AuthorizationError(
        'Insufficient financial access permissions',
        'FINANCIAL_ACCESS_DENIED',
        403
      )
    }
  }
  
  // Check MFA requirement
  if (routePermissions.requires_mfa && !user.mfaEnabled) {
    throw new AuthorizationError(
      'Multi-factor authentication required for this operation',
      'MFA_REQUIRED',
      403
    )
  }
  
  // Check temporary access expiration (FR-006)
  if (user.role === 'developer' && user.temporaryAccess) {
    const expirationDate = new Date(user.temporaryAccess.expiresAt)
    if (expirationDate < new Date()) {
      throw new AuthorizationError(
        'Temporary developer access has expired',
        'TEMPORARY_ACCESS_EXPIRED',
        403
      )
    }
  }
}

/**
 * Route-specific permission checker
 * Dynamically determines permissions based on route pattern
 */
export function getRoutePermissions(pathname: string): RoutePermissions | undefined {
  // Check exact matches first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname]
  }
  
  // Check pattern matches
  for (const [route, permissions] of Object.entries(ROUTE_PERMISSIONS)) {
    if (route.includes('[id]')) {
      const pattern = route.replace('[id]', '[^/]+')
      const regex = new RegExp(`^${pattern}$`)
      if (regex.test(pathname)) {
        return permissions
      }
    }
  }
  
  return undefined
}

/**
 * Helper function to create protected API routes
 */
export function createProtectedRoute(
  handler: (request: NextRequest, user: AuthenticatedUser, params?: unknown) => Promise<NextResponse>,
  routePath?: string
) {
  return withAuth(handler, routePath ? getRoutePermissions(routePath) : undefined)
}

/**
 * Financial access validation helper
 * Specific validation for financial routes according to FR-008 to FR-013
 */
export function validateFinancialAccess(
  user: AuthenticatedUser,
  requiredLevel: 'full' | 'client_billing' | 'time_tracking' | 'own_invoices',
  resourceOwnerId?: string
): boolean {
  const userLevel = user.permissions.financial
  
  switch (requiredLevel) {
    case 'full':
      return userLevel === 'full' // Only admin (FR-008)
      
    case 'client_billing':
      return ['full', 'client_billing'].includes(userLevel) // Admin and associate attorneys (FR-009)
      
    case 'time_tracking':
      return ['full', 'client_billing', 'time_tracking'].includes(userLevel) // Admin, attorneys, paralegals (FR-010)
      
    case 'own_invoices':
      // Clients can only access their own invoices (FR-012)
      if (userLevel === 'own_invoices') {
        return resourceOwnerId ? resourceOwnerId === user.uid : true
      }
      return ['full', 'client_billing'].includes(userLevel)
      
    default:
      return false
  }
}