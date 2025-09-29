/**
 * Integration Test: MFA (Multi-Factor Authentication) Flow
 * 
 * This test MUST FAIL initially (TDD requirement)
 * Tests the complete MFA setup and verification flow
 */

import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    })),
  }))
}))

describe('MFA Flow - Integration Test', () => {
  let supabaseClient: ReturnType<typeof createClient>
  
  beforeEach(() => {
    supabaseClient = createClient('mock-url', 'mock-key')
    jest.clearAllMocks()
  })

  describe('MFA Setup Flow', () => {
    it('should complete MFA setup with QR code and backup codes generation', async () => {
      const userToken = 'valid-jwt-token-admin'
      
      // Mock user without MFA
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'admin-user-id',
                email: 'admin@jurisagentis.com',
                mfa_enabled: false
              },
              error: null
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: [{
            uid: 'admin-user-id',
            mfa_secret: 'JBSWY3DPEHPK3PXP',
            backup_codes: ['a1b2c3d4', 'e5f6g7h8', 'i9j0k1l2']
          }],
          error: null
        })
      })

      const setupResult = await fetch('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(setupResult.status).toBe(200)
      
      const response = await setupResult.json()
      expect(response).toMatchObject({
        success: true,
        qrCode: expect.stringMatching(/^data:image\/png;base64,/),
        manualEntryKey: expect.stringMatching(/^[A-Z2-7]{32}$/),
        backupCodes: expect.arrayContaining([
          expect.stringMatching(/^[0-9a-f]{8}$/)
        ])
      })

      // Verify backup codes array length
      expect(response.backupCodes).toHaveLength(10)

      // Verify MFA enrollment was recorded in database
      expect(supabaseClient.from).toHaveBeenCalledWith('mfa_enrollments')
    })

    it('should prevent MFA setup if already enabled', async () => {
      const userToken = 'valid-jwt-token-mfa-enabled'
      
      // Mock user with MFA already enabled
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_enabled: true
              },
              error: null
            })
          })
        })
      })

      const setupResult = await fetch('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(setupResult.status).toBe(400)
      
      const response = await setupResult.json()
      expect(response.error.code).toBe('MFA_ALREADY_ENABLED')
    })

    it('should restrict MFA setup to authorized roles only', async () => {
      const clientToken = 'valid-jwt-token-client-role'
      
      // Mock client user (unauthorized for MFA)
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'client-user-id',
                role: 'client',
                mfa_enabled: false
              },
              error: null
            })
          })
        })
      })

      const setupResult = await fetch('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clientToken}`
        }
      })

      expect(setupResult.status).toBe(403)
      
      const response = await setupResult.json()
      expect(response.error.code).toBe('INSUFFICIENT_PERMISSIONS')
    })
  })

  describe('MFA Verification Flow', () => {
    it('should successfully verify valid TOTP code', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const validTOTPCode = '123456'
      
      // Mock MFA enrollment data
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 0,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ uid: 'mfa-user-id' }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: validTOTPCode,
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(200)
      
      const response = await verifyResult.json()
      expect(response).toMatchObject({
        success: true,
        token: expect.stringMatching(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/)
      })

      // Verify failed attempts were reset
      expect(supabaseClient.from).toHaveBeenCalledWith('mfa_enrollments')
    })

    it('should successfully verify valid backup code and invalidate it', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const validBackupCode = 'a1b2c3d4'
      
      // Mock MFA enrollment with backup codes
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                backup_codes: ['a1b2c3d4', 'e5f6g7h8', 'i9j0k1l2'],
                failed_attempts: 0,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ uid: 'mfa-user-id' }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: validBackupCode,
          isBackupCode: true
        })
      })

      expect(verifyResult.status).toBe(200)
      
      const response = await verifyResult.json()
      expect(response).toMatchObject({
        success: true,
        token: expect.any(String) as string
      })

      // Verify backup code was removed from available codes
      expect(supabaseClient.from).toHaveBeenCalledWith('mfa_enrollments')
    })

    it('should reject invalid TOTP code and increment failed attempts', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const invalidTOTPCode = '000000'
      
      // Mock MFA enrollment
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 2,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ failed_attempts: 3 }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: invalidTOTPCode,
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(400)
      
      const response = await verifyResult.json()
      expect(response.error.code).toBe('INVALID_MFA_CODE')

      // Verify failed attempts were incremented
      expect(supabaseClient.from).toHaveBeenCalledWith('mfa_enrollments')
    })

    it('should lock account after too many failed attempts', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const invalidTOTPCode = '000000'
      
      // Mock MFA enrollment at failure threshold
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 4, // At threshold
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ 
            failed_attempts: 5,
            locked_until: new Date(Date.now() + 900000).toISOString() // 15 min lockout
          }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: invalidTOTPCode,
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(429) // Too Many Requests
      
      const response = await verifyResult.json()
      expect(response.error.code).toBe('ACCOUNT_LOCKED')
      expect(response.error.details).toHaveProperty('lockedUntil')
      
      // Should include Retry-After header
      expect(verifyResult.headers.get('Retry-After')).toBeTruthy()
    })

    it('should reject verification for locked account', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const validTOTPCode = '123456'
      
      // Mock locked MFA enrollment
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 5,
                locked_until: new Date(Date.now() + 600000).toISOString() // Still locked
              },
              error: null
            })
          })
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: validTOTPCode,
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(429)
      
      const response = await verifyResult.json()
      expect(response.error.code).toBe('ACCOUNT_LOCKED')
    })

    it('should reject verification for user without MFA enrollment', async () => {
      const userToken = 'valid-jwt-token-no-mfa'
      
      // Mock user without MFA enrollment
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

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: '123456',
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(404)
      
      const response = await verifyResult.json()
      expect(response.error.code).toBe('MFA_NOT_ENROLLED')
    })

    it('should prevent reuse of backup codes', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const usedBackupCode = 'a1b2c3d4'
      
      // Mock MFA enrollment with backup code already used (not in available codes)
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                backup_codes: ['e5f6g7h8', 'i9j0k1l2'], // usedBackupCode not present
                failed_attempts: 0,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ uid: 'mfa-user-id' }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: usedBackupCode,
          isBackupCode: true
        })
      })

      expect(verifyResult.status).toBe(400)
      
      const response = await verifyResult.json()
      expect(response.error.code).toBe('BACKUP_CODE_ALREADY_USED')
    })
  })

  describe('MFA Rate Limiting', () => {
    it('should implement per-user rate limiting for MFA attempts', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const requests = []

      // Mock MFA enrollment for rate limiting test
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 0,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ uid: 'mfa-user-id' }],
          error: null
        })
      })

      // Make rapid successive MFA attempts
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch('http://localhost:3000/api/auth/mfa/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userToken}`
            },
            body: JSON.stringify({
              code: '000000', // Invalid code
              isBackupCode: false
            })
          })
        )
      }

      const responses = await Promise.all(requests)
      const rateLimitedResponses = responses.filter(r => r.status === 429)
      
      // Should eventually hit rate limit
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('MFA Audit Logging', () => {
    it('should log all MFA verification attempts', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      
      // Mock audit log insertion
      const auditInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      supabaseClient.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return { insert: auditInsert }
        }
        if (table === 'mfa_enrollments') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    uid: 'mfa-user-id',
                    mfa_secret: 'JBSWY3DPEHPK3PXP',
                    failed_attempts: 0
                  },
                  error: null
                })
              })
            }),
            update: jest.fn().mockResolvedValue({
              data: [{ uid: 'mfa-user-id' }],
              error: null
            })
          }
        }
        return { insert: jest.fn(), update: jest.fn() }
      })

      await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: '123456',
          isBackupCode: false
        })
      })

      // Verify audit logging was triggered
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: expect.stringMatching(/MFA_VERIFY_(SUCCESS|FAILURE)/),
          user_id: 'mfa-user-id',
          details: expect.objectContaining({
            method: expect.stringMatching(/totp|backup_code/)
          })
        })
      )
    })

    it('should log MFA setup events', async () => {
      const userToken = 'valid-jwt-token-admin'
      
      // Mock audit log insertion and MFA setup
      const auditInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      supabaseClient.from.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return { insert: auditInsert }
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { uid: 'admin-user-id', mfa_enabled: false },
                error: null
              })
            })
          }),
          insert: jest.fn().mockResolvedValue({
            data: [{ uid: 'admin-user-id' }],
            error: null
          })
        }
      })

      await fetch('http://localhost:3000/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        }
      })

      // Verify MFA setup was logged
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_type: 'MFA_SETUP_SUCCESS',
          user_id: 'admin-user-id'
        })
      )
    })
  })

  describe('MFA Time-based Code Validation', () => {
    it('should reject expired TOTP codes', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const expiredTOTPCode = '987654' // Simulate expired code
      
      // Mock MFA enrollment
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 0,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ uid: 'mfa-user-id' }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: expiredTOTPCode,
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(400)
      
      const response = await verifyResult.json()
      expect(response.error.code).toBe('EXPIRED_MFA_CODE')
    })

    it('should allow valid TOTP codes within time window', async () => {
      const userToken = 'valid-jwt-token-temp-mfa'
      const currentTOTPCode = '123456'
      
      // Mock current valid TOTP verification
      supabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                uid: 'mfa-user-id',
                mfa_secret: 'JBSWY3DPEHPK3PXP',
                failed_attempts: 0,
                locked_until: null
              },
              error: null
            })
          })
        }),
        update: jest.fn().mockResolvedValue({
          data: [{ uid: 'mfa-user-id' }],
          error: null
        })
      })

      const verifyResult = await fetch('http://localhost:3000/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          code: currentTOTPCode,
          isBackupCode: false
        })
      })

      expect(verifyResult.status).toBe(200)
      
      const response = await verifyResult.json()
      expect(response.success).toBe(true)
    })
  })
})