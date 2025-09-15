/**
 * Authentication Hook
 * 
 * Provides authentication state and methods for the entire application
 */

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

interface AuthUser {
  uid: string
  email: string
  role: string
  profile: {
    firstName: string
    lastName: string
    title?: string
  }
  permissions: {
    financial: string
    clients: string
    documents: string
    administrative: string
  }
  mfaEnabled: boolean
  status: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresMFA?: boolean; tempToken?: string }>
  logout: () => Promise<void>
  verifyMFA: (code: string, isBackupCode: boolean, tempToken: string) => Promise<{ success: boolean; error?: string }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile from our API
  const fetchUserProfile = async (token: string): Promise<AuthUser | null> => {
    try {
      const response = await fetch('/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        // Merge permissions into user object if they exist
        return {
          ...data.user,
          permissions: data.permissions || data.user.permissions
        }
      }
      return null
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          const userProfile = await fetchUserProfile(session.access_token)
          setUser(userProfile)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        const userProfile = await fetchUserProfile(session.access_token)
        setUser(userProfile)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        if (data.requiresMFA) {
          return {
            success: true,
            requiresMFA: true,
            tempToken: data.tempToken
          }
        } else {
          // Set the session in Supabase
          await supabase.auth.setSession({
            access_token: data.token,
            refresh_token: data.token // Simplified for demo
          })
          // Merge permissions into user object
          setUser({
            ...data.user,
            permissions: data.permissions
          })
          return { success: true }
        }
      } else {
        return {
          success: false,
          error: data.error?.message || 'Login failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  const verifyMFA = async (code: string, isBackupCode: boolean, tempToken: string) => {
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({ code, isBackupCode })
      })

      const data = await response.json()

      if (data.success) {
        // Set the verified session
        await supabase.auth.setSession({
          access_token: data.token,
          refresh_token: data.token
        })
        
        // Fetch user profile
        const userProfile = await fetchUserProfile(data.token)
        setUser({
          ...userProfile,
          permissions: data.permissions || userProfile?.permissions
        })
        
        return { success: true }
      } else {
        return {
          success: false,
          error: data.error?.message || 'MFA verification failed'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred'
      }
    }
  }

  const logout = async () => {
    try {
      // Call our logout API
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })
      }

      // Sign out from Supabase
      await supabase.auth.signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
      // Force sign out even if API call fails
      await supabase.auth.signOut()
      setUser(null)
    }
  }

  const refreshUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      const userProfile = await fetchUserProfile(session.access_token)
      setUser(userProfile)
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      verifyMFA,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}