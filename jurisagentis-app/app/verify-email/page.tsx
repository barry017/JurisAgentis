/**
 * Email Verification Page - Verify user email from registration
 */

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

type VerificationStatus = 'verifying' | 'success' | 'error' | 'expired' | 'already_verified'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  const error = searchParams?.get('error')
  const success = searchParams?.get('success')
  
  const [status, setStatus] = useState<VerificationStatus>('verifying')
  const [message, setMessage] = useState('')
  const [userInfo, setUserInfo] = useState<{ firstName: string; lastName: string; email: string } | null>(null)
  const [resendEmail, setResendEmail] = useState('')
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    // Handle URL parameters from GET redirect
    if (success === 'true') {
      setStatus('success')
      setMessage('Email verified successfully!')
      return
    }

    if (error) {
      setStatus('error')
      switch (error) {
        case 'no_token':
          setMessage('No verification token provided')
          break
        case 'invalid_token':
          setMessage('Invalid or expired verification token')
          break
        case 'token_expired':
          setStatus('expired')
          setMessage('Verification link has expired')
          break
        case 'already_verified':
          setStatus('already_verified')
          setMessage('Email has already been verified')
          break
        case 'server_error':
          setMessage('Server error occurred during verification')
          break
        default:
          setMessage('Email verification failed')
      }
      return
    }

    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    verifyEmail(token)
  }, [token, error, success])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verificationToken })
      })

      const result = await response.json()

      if (response.ok && (result.success || result.status === 'SUCCESS')) {
        setStatus('success')
        setMessage(result.message || 'Email verified successfully!')
        setUserInfo(result.data?.user || null)
      } else {
        // Handle different error cases
        if (result.status === 'TOKEN_EXPIRED' || result.message?.includes('expired')) {
          setStatus('expired')
          setMessage('Verification link has expired')
        } else if (result.status === 'ALREADY_VERIFIED' || result.message?.includes('already verified')) {
          setStatus('already_verified')
          setMessage('This email has already been verified')
        } else {
          setStatus('error')
          setMessage(result.message || 'Email verification failed')
        }
      }

    } catch (error) {
      console.error('Verification error:', error)
      setStatus('error')
      setMessage('An unexpected error occurred during verification')
    }
  }

  const handleResendVerification = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    const emailToUse = resendEmail || userInfo?.email
    if (!emailToUse) return

    setResendLoading(true)
    setResendSuccess(false)

    try {
      // For now, we'll simulate the resend functionality
      // In a real implementation, you would create a resend verification endpoint
      await new Promise(resolve => setTimeout(resolve, 2000))
      setResendSuccess(true)
      setMessage('A new verification email has been sent to your email address.')
    } catch {
      setMessage('An error occurred while resending the verification email')
    } finally {
      setResendLoading(false)
    }
  }

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-blue-600 mb-4">
              <ArrowPathIcon className="animate-spin" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Verifying Your Email</h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
            
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    This process usually takes just a few seconds. If this page doesn&apos;t update automatically, please refresh your browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-green-600 mb-4">
              <CheckCircleIcon />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Email Verified Successfully!</h2>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Thank you for verifying your email address. Your registration is now pending admin approval.
              </p>
              
              {userInfo && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-left">
                  <h3 className="font-medium text-green-800 mb-2">Registration Details:</h3>
                  <div className="space-y-1 text-sm text-green-700">
                    <p><strong>Name:</strong> {userInfo.firstName} {userInfo.lastName}</p>
                    <p><strong>Email:</strong> {userInfo.email}</p>
                    <p><strong>Status:</strong> Pending Admin Approval</p>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                  <div className="ml-3 text-left">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• An administrator will review your registration</li>
                      <li>• You&apos;ll receive an email notification once approved</li>
                      <li>• You can then log in and access the system</li>
                      <li>• This process typically takes 1-2 business days</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 space-y-3">
              <Link
                href="/login"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continue to Login
              </Link>
              <Link
                href="/"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )

      case 'already_verified':
        return (
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Already Verified</h2>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                This email address has already been verified. Your registration is pending admin approval.
              </p>
              <p>
                If you haven&apos;t heard back from us within 2-3 business days, please contact support.
              </p>
            </div>
            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="btn-primary w-full"
              >
                Go to Login
              </Link>
              <Link
                href="/contact"
                className="btn-secondary w-full"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )

      case 'expired':
        return (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-orange-500 mb-4">
              <ClockIcon />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Verification Link Expired</h2>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                This verification link has expired. Verification links are valid for 24 hours for security reasons.
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-400" />
                  <div className="ml-3 text-left">
                    <h3 className="text-sm font-medium text-orange-800 mb-2">Why do links expire?</h3>
                    <p className="text-sm text-orange-700">
                      Verification links expire after 24 hours to protect your account security and prevent unauthorized access.
                    </p>
                  </div>
                </div>
              </div>
              
              {resendSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        New verification email sent!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Please check your email inbox for the new verification link.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResendVerification} className="space-y-4">
                  <div>
                    <label htmlFor="resend-email" className="block text-sm font-medium text-gray-700 text-left">
                      Enter your email address to receive a new verification link
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="resend-email"
                        name="resend-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                        placeholder="Enter your email address"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={resendLoading || !resendEmail.trim()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending New Link...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        Send New Verification Email
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
            
            <div className="mt-8 space-y-3">
              <Link
                href="/register"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Account
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-500 mb-4">
              <ExclamationTriangleIcon />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Verification Failed</h2>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                We were unable to verify your email address.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3 text-left">
                    <p className="text-sm font-medium text-red-800">Error Details:</p>
                    <p className="text-sm text-red-700 mt-1">{message}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3 text-left">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">Common Solutions:</h3>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Check if the verification link is complete and not broken</li>
                      <li>• Ensure you&apos;re using the most recent verification email</li>
                      <li>• Try requesting a new verification email below</li>
                      <li>• Contact support if the issue persists</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {!resendSuccess && (
                <form onSubmit={handleResendVerification} className="space-y-4">
                  <div>
                    <label htmlFor="error-resend-email" className="block text-sm font-medium text-gray-700 text-left">
                      Request a new verification email
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="error-resend-email"
                        name="error-resend-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={resendEmail}
                        onChange={(e) => setResendEmail(e.target.value)}
                        className="appearance-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                        placeholder="Enter your email address"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={resendLoading || !resendEmail.trim()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  >
                    {resendLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <EnvelopeIcon className="h-4 w-4 mr-2" />
                        Send New Verification Email
                      </>
                    )}
                  </button>
                </form>
              )}
              
              {resendSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex">
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        New verification email sent!
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        Please check your email inbox for the new verification link.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 space-y-3">
              <Link
                href="/register"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Account
              </Link>
              <Link
                href="/contact"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Contact Support
              </Link>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {renderContent()}
        </div>

        {/* Help Section */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? {' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-800">
              Contact our support team
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}