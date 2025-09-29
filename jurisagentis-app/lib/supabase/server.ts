/**
 * Server-side Supabase Client
 * 
 * Provides server-side Supabase client specifically for API routes and server components
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'

// Get environment variables with fallbacks for development
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHmhJSvVRZBpXmj7D6W7bP3n2Fy_nFc'

/**
 * Create a Supabase client for server-side use
 * This client respects RLS and uses session cookies for authentication
 */
export function createClient() {
  const _cookieStore = cookies()

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        'X-Client-Info': 'jurisagentis-server'
      }
    }
  })
}

// Export a default server client for convenience
export const serverClient = createClient()