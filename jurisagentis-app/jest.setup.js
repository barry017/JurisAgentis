require('@testing-library/jest-dom')

// Enable fetch for Node.js 18+ (already available globally)
// No polyfill needed for Node.js 18+

// Mock Supabase for testing
const mockSupabaseAdmin = {
  auth: {
    signInWithPassword: jest.fn(() => Promise.resolve({
      data: {
        user: { 
          id: 'test-user-id',
          email: 'admin@jurisagentis.com'
        },
        session: {
          access_token: 'mock-token',
          expires_at: Date.now() / 1000 + 3600
        }
      },
      error: null
    })),
    signOut: jest.fn(),
    getUser: jest.fn(),
  },
  from: jest.fn((table) => {
    if (table === 'email_allowlist') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: {
            email: 'admin@jurisagentis.com',
            role: 'admin',
            used: false
          },
          error: null
        }))
      }
    }
    if (table === 'user_profiles') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: {
            uid: 'test-user-id',
            email: 'admin@jurisagentis.com',
            role: 'admin',
            profile: { firstName: 'Test', lastName: 'User' },
            mfa_enabled: false,
            status: 'active'
          },
          error: null
        })),
        update: jest.fn().mockReturnThis()
      }
    }
    if (table === 'mfa_enrollments') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(() => Promise.resolve({
          data: null,
          error: { code: 'PGRST116' } // Not found
        }))
      }
    }
    if (table === 'user_sessions') {
      return {
        insert: jest.fn(() => Promise.resolve({
          data: {},
          error: null
        }))
      }
    }
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null }))
    }
  })
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseAdmin)
}))

// Mock the Supabase lib
jest.mock('@/lib/supabase', () => ({
  supabaseServer: mockSupabaseAdmin,
  supabaseAdmin: mockSupabaseAdmin
}))

// Mock auth middleware functions
jest.mock('@/lib/auth/middleware', () => ({
  getUserProfile: jest.fn(() => Promise.resolve({
    uid: 'test-user-id',
    email: 'admin@jurisagentis.com',
    role: 'admin',
    profile: { firstName: 'Test', lastName: 'User' },
    mfaEnabled: false,
    status: 'active',
    permissions: {
      financial: 'full',
      clients: 'full',
      documents: 'full',
      administrative: 'full'
    }
  })),
  logAuditEvent: jest.fn(() => Promise.resolve())
}))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'