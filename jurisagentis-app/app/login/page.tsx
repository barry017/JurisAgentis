/**
 * Login Page - Handles user authentication and MFA verification
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/useAuth'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function LoginPage() {
  const { user, login, verifyMFA } = useAuth()
  const router = useRouter()

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // MFA states
  const [requiresMFA, setRequiresMFA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [isBackupCode, setIsBackupCode] = useState(false)

  // Redirect authenticated users
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(email, password)
      
      if (result.success) {
        if (result.requiresMFA) {
          setRequiresMFA(true)
          setTempToken(result.tempToken || '')
        } else {
          router.push('/dashboard')
        }
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (_error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await verifyMFA(mfaCode, isBackupCode, tempToken)
      
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'MFA verification failed')
        setMfaCode('')
      }
    } catch (_error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (requiresMFA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
              JurisAgentis
            </h1>
            <h2 className="text-xl font-semibold text-center text-gray-700 mb-6">
              Multi-Factor Authentication
            </h2>
            <p className="text-sm text-gray-600 text-center">
              Enter your authentication code to complete login
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleMFAVerification}>
            {error && (
              <div className="alert-error">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="mfa-code" className="block text-sm font-medium text-gray-700">
                  {isBackupCode ? 'Backup Code' : 'Authentication Code'}
                </label>
                <input
                  id="mfa-code"
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder={isBackupCode ? 'Enter 8-character backup code' : 'Enter 6-digit code'}
                  maxLength={isBackupCode ? 8 : 6}
                  className="input-field"
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  id="backup-code"
                  type="checkbox"
                  checked={isBackupCode}
                  onChange={(e) => {
                    setIsBackupCode(e.target.checked)
                    setMfaCode('')
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="backup-code" className="ml-2 block text-sm text-gray-700">
                  Use backup code instead
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || !mfaCode}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setRequiresMFA(false)
                  setTempToken('')
                  setMfaCode('')
                  setIsBackupCode(false)
                  setError('')
                }}
                className="btn-secondary"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-center text-gray-900 mb-2">
            JurisAgentis
          </h1>
          <h2 className="text-xl font-semibold text-center text-gray-700 mb-6">
            Legal Practice Management
          </h2>
          <p className="text-sm text-gray-600 text-center">
            Sign in to access your secure legal workspace
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="input-field"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Secure authentication with enterprise-grade security
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}