/**
 * Integration Test: Admin User Management
 * 
 * This test MUST FAIL initially (TDD requirement)
 * Tests the complete admin user management flow
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      admin: {
        updateUserById: jest.fn(),
      },
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({
            limit: jest.fn(),
            range: jest.fn(),
          })),
        })),
        order: jest.fn(() => ({
          limit: jest.fn(),
          range: jest.fn(),
        })),
        range: jest.fn(),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
  }))
}))

describe('Admin User Management - Integration Test', () => {
  let supabaseClient: ReturnType<typeof createClient>
  
  beforeEach(() => {
    supabaseClient = createClient('mock-url', 'mock-key')
    jest.clearAllMocks()
  })

  describe('User Listing and Filtering', () => {
    it('should fetch paginated users list with proper filtering', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      
      // Mock users data
      const mockUsers = [
        {
          uid: 'user-1',
          email: 'admin@jurisagentis.com',
          role: 'admin',
          first_name: 'John',
          last_name: 'Admin',
          status: 'active',
          mfa_enabled: true,
          last_login: '2025-01-12T10:00:00Z',
          created_at: '2025-01-01T10:00:00Z'
        },
        {
          uid: 'user-2',
          email: 'paralegal@jurisagentis.com',
          role: 'paralegal',
          first_name: 'Jane',
          last_name: 'Paralegal',
          status: 'active',
          mfa_enabled: false,
          last_login: '2025-01-11T15:30:00Z',
          created_at: '2025-01-02T10:00:00Z'
        }
      ]

      // Mock successful query with pagination
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: mockUsers,
              error: null,
              count: 25 // Total count
            })
          })
        })
      })

      const usersResult = await fetch('http://localhost:3000/api/admin/users?limit=10&offset=0', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(usersResult.status).toBe(200)
      
      const response = await usersResult.json()
      expect(response).toMatchObject({
        success: true,
        users: expect.arrayContaining([
          expect.objectContaining({
            uid: 'user-1',
            email: 'admin@jurisagentis.com',
            role: 'admin',
            profile: expect.objectContaining({
              firstName: 'John',
              lastName: 'Admin'
            }),
            mfaEnabled: true
          })
        ]),
        pagination: expect.objectContaining({
          total: 25,
          limit: 10,
          offset: 0,
          pages: 3
        })
      })

      // Verify database query was made correctly
      expect(supabaseClient.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should filter users by role', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      
      // Mock filtered users data (only clients)
      const mockClientUsers = [
        {
          uid: 'client-1',
          email: 'client1@example.com',
          role: 'client',
          first_name: 'Client',
          last_name: 'One',
          status: 'active'
        }
      ]

      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockClientUsers,
                error: null,
                count: 5
              })
            })
          })
        })
      })

      const usersResult = await fetch('http://localhost:3000/api/admin/users?role=client&limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(usersResult.status).toBe(200)
      
      const response = await usersResult.json()
      response.users.forEach((user: { role: string }) => {
        expect(user.role).toBe('client')
      })

      // Verify role filter was applied
      expect(supabaseClient.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should filter users by status', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      
      // Mock active users only
      const mockActiveUsers = [
        { uid: 'user-1', status: 'active', email: 'active@example.com', role: 'client' }
      ]

      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockActiveUsers,
                error: null,
                count: 1
              })
            })
          })
        })
      })

      const usersResult = await fetch('http://localhost:3000/api/admin/users?status=active', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(usersResult.status).toBe(200)
      
      const response = await usersResult.json()
      response.users.forEach((user: { status: string }) => {
        expect(user.status).toBe('active')
      })
    })
  })

  describe('User Role and Status Updates', () => {
    it('should successfully update user role and status', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'user-to-update'
      
      // Mock successful user lookup and update
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: targetUid,
                email: 'user@jurisagentis.com',
                role: 'assistant',
                status: 'active'
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{
              uid: targetUid,
              role: 'paralegal',
              status: 'active',
              updated_at: '2025-01-12T12:00:00Z'
            }],
            error: null
          })
        })
      })

      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          role: 'paralegal',
          status: 'active'
        })
      })

      expect(updateResult.status).toBe(200)
      
      const response = await updateResult.json()
      expect(response).toMatchObject({
        success: true,
        user: expect.objectContaining({
          uid: targetUid,
          role: 'paralegal',
          status: 'active'
        }),
        message: 'User updated successfully'
      })

      // Verify database update was called
      expect(supabaseClient.from).toHaveBeenCalledWith('user_profiles')
    })

    it('should prevent unauthorized role escalation', async () => {
      const paralegalToken = 'valid-jwt-token-paralegal-role'
      const targetUid = 'user-to-escalate'
      
      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paralegalToken}`
        },
        body: JSON.stringify({
          role: 'admin' // Trying to escalate to admin
        })
      })

      expect(updateResult.status).toBe(403)
      
      const response = await updateResult.json()
      expect(response.error.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should handle user not found scenario', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const nonExistentUid = 'non-existent-user'
      
      // Mock user not found
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // Not found
            })
          })
        })
      })

      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${nonExistentUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          role: 'client'
        })
      })

      expect(updateResult.status).toBe(404)
      
      const response = await updateResult.json()
      expect(response.error.code).toBe('USER_NOT_FOUND')
    })

    it('should validate role values', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'valid-user-id'
      
      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          role: 'invalid-role'
        })
      })

      expect(updateResult.status).toBe(400)
      
      const response = await updateResult.json()
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('should validate status values', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'valid-user-id'
      
      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          status: 'invalid-status'
        })
      })

      expect(updateResult.status).toBe(400)
      
      const response = await updateResult.json()
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Temporary Access Management', () => {
    it('should grant temporary access with proper justification', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      
      // Mock user lookup
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: targetUid,
                role: 'paralegal',
                status: 'active'
              },
              error: null
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: [{
            id: 'temp-access-id',
            uid: targetUid,
            scope: 'financial',
            granted_by: 'admin-user-id',
            granted_at: '2025-01-12T12:00:00Z',
            expires_at: '2025-01-13T12:00:00Z',
            justification: 'Emergency client financial review',
            active: true
          }],
          error: null
        })
      })

      const grantResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          scope: 'financial',
          expiresInHours: 24,
          justification: 'Emergency client financial review required'
        })
      })

      expect(grantResult.status).toBe(201)
      
      const response = await grantResult.json()
      expect(response).toMatchObject({
        success: true,
        temporaryAccess: expect.objectContaining({
          id: 'temp-access-id',
          uid: targetUid,
          scope: 'financial',
          active: true,
          justification: 'Emergency client financial review required'
        }),
        message: 'Temporary access granted successfully'
      })

      // Verify temporary access was recorded
      expect(supabaseClient.from).toHaveBeenCalledWith('temporary_access')
    })

    it('should require justification for temporary access', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      
      const grantResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          scope: 'financial',
          expiresInHours: 24
          // Missing justification
        })
      })

      expect(grantResult.status).toBe(400)
      
      const response = await grantResult.json()
      expect(response.error.code).toBe('VALIDATION_ERROR')
      expect(response.error.message).toContain('justification')
    })

    it('should validate temporary access duration limits', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      
      const grantResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          scope: 'financial',
          expiresInHours: 8760, // 1 year - too long
          justification: 'Long term access needed'
        })
      })

      expect(grantResult.status).toBe(400)
      
      const response = await grantResult.json()
      expect(response.error.code).toBe('VALIDATION_ERROR')
      expect(response.error.message).toContain('expiresInHours')
    })

    it('should validate access scope values', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      
      const grantResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          scope: 'invalid-scope',
          expiresInHours: 24,
          justification: 'Test access'
        })
      })

      expect(grantResult.status).toBe(400)
      
      const response = await grantResult.json()
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })

    it('should revoke temporary access successfully', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      const accessId = 'temp-access-to-revoke'
      
      // Mock temporary access lookup and revocation
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: accessId,
                uid: targetUid,
                active: true
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{
              id: accessId,
              active: false,
              revoked_at: '2025-01-12T12:30:00Z'
            }],
            error: null
          })
        })
      })

      const revokeResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access/${accessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(revokeResult.status).toBe(200)
      
      const response = await revokeResult.json()
      expect(response).toMatchObject({
        success: true,
        message: 'Temporary access revoked successfully',
        accessId: accessId
      })

      // Verify revocation was recorded
      expect(supabaseClient.from).toHaveBeenCalledWith('temporary_access')
    })

    it('should handle non-existent temporary access revocation', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      const nonExistentAccessId = 'non-existent-access'
      
      // Mock temporary access not found
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' } // Not found
            })
          })
        })
      })

      const revokeResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access/${nonExistentAccessId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(revokeResult.status).toBe(404)
      
      const response = await revokeResult.json()
      expect(response.error.code).toBe('TEMPORARY_ACCESS_NOT_FOUND')
    })
  })

  describe('Admin Audit Logging', () => {
    it('should log all admin actions for compliance', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'user-to-update'
      
      // Mock audit log insertion
      const auditInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      supabaseClient.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return { insert: auditInsert }
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { uid: targetUid, role: 'assistant' },
                  error: null
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ uid: targetUid, role: 'paralegal' }],
                error: null
              })
            })
          }
        }
        return { insert: jest.fn(), update: jest.fn() }
      })

      await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          role: 'paralegal'
        })
      })

      // Verify admin action was logged
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ADMIN_USER_UPDATE',
          user_id: expect.any(String) as string,
          target_user_id: targetUid,
          details: expect.objectContaining({
            changes: expect.any(Object) as Record<string, unknown>
          })
        })
      )
    })

    it('should log temporary access grants and revocations', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'paralegal-user-id'
      
      // Mock audit log insertion and temp access creation
      const auditInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      supabaseClient.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return { insert: auditInsert }
        }
        if (table === 'temporary_access') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: [{ id: 'temp-access-id', uid: targetUid }],
              error: null
            })
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { uid: targetUid, role: 'paralegal' },
                error: null
              })
            })
          })
        }
      })

      await fetch(`http://localhost:3000/api/admin/users/${targetUid}/temporary-access`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          scope: 'financial',
          expiresInHours: 24,
          justification: 'Emergency client review'
        })
      })

      // Verify temporary access grant was logged
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'ADMIN_TEMPORARY_ACCESS_GRANT',
          target_user_id: targetUid,
          details: expect.objectContaining({
            scope: 'financial',
            justification: 'Emergency client review'
          })
        })
      )
    })
  })

  describe('Admin Permission Enforcement', () => {
    it('should prevent non-admin users from accessing admin endpoints', async () => {
      const clientToken = 'valid-jwt-token-client-role'
      
      const usersResult = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${clientToken}`
        }
      })

      expect(usersResult.status).toBe(403)
      
      const response = await usersResult.json()
      expect(response.error.code).toBe('INSUFFICIENT_PERMISSIONS')
    })

    it('should allow associate attorneys limited admin functions', async () => {
      const attorneyToken = 'valid-jwt-token-associate-attorney-role'
      
      // Mock limited user data access
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockResolvedValue({
              data: [
                { uid: 'client-1', role: 'client', status: 'active' }
              ],
              error: null,
              count: 1
            })
          })
        })
      })

      const usersResult = await fetch('http://localhost:3000/api/admin/users?role=client', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${attorneyToken}`
        }
      })

      // Should allow viewing client users
      expect(usersResult.status).toBe(200)
    })

    it('should restrict admin functions based on role hierarchy', async () => {
      const paralegalToken = 'valid-jwt-token-paralegal-role'
      const targetUid = 'attorney-user-id'
      
      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${paralegalToken}`
        },
        body: JSON.stringify({
          role: 'client' // Trying to demote an attorney
        })
      })

      expect(updateResult.status).toBe(403)
      
      const response = await updateResult.json()
      expect(response.error.code).toBe('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      
      // Mock database error
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            range: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        })
      })

      const usersResult = await fetch('http://localhost:3000/api/admin/users', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(usersResult.status).toBe(500)
      
      const response = await usersResult.json()
      expect(response.error.code).toBe('DATABASE_ERROR')
    })

    it('should handle malformed request bodies', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      const targetUid = 'valid-user-id'
      
      const updateResult = await fetch(`http://localhost:3000/api/admin/users/${targetUid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: 'invalid-json'
      })

      expect(updateResult.status).toBe(400)
      
      const response = await updateResult.json()
      expect(response.error.code).toBe('INVALID_JSON')
    })

    it('should validate pagination parameters', async () => {
      const adminToken = 'valid-jwt-token-admin-role'
      
      const usersResult = await fetch('http://localhost:3000/api/admin/users?limit=1000&offset=-1', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })

      expect(usersResult.status).toBe(400)
      
      const response = await usersResult.json()
      expect(response.error.code).toBe('VALIDATION_ERROR')
    })
  })
})