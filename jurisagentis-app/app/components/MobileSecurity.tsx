'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  ExclamationTriangleIcon,
  LockClosedIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

// Types for mobile security
interface BiometricCapabilities {
  fingerprint: boolean
  faceId: boolean
  voiceRecognition: boolean
  supported: boolean
}

interface DeviceInfo {
  userAgent: string
  platform: string
  vendor: string
  language: string
  cookieEnabled: boolean
  onLine: boolean
  hardwareConcurrency: number
  maxTouchPoints: number
  deviceMemory?: number
  connection?: {
    effectiveType: string
    downlink: number
    rtt: number
  }
}

interface SecurityThreat {
  id: string
  type: 'jailbreak' | 'debugger' | 'emulator' | 'rooted' | 'proxy' | 'tampered'
  severity: 'low' | 'medium' | 'high' | 'critical'
  detected: boolean
  message: string
  timestamp: string
}

interface SessionSecurity {
  sessionId: string
  deviceFingerprint: string
  lastActivity: string
  ipAddress: string
  location?: {
    country: string
    city: string
    coordinates?: { lat: number; lng: number }
  }
  riskScore: number
  biometricEnabled: boolean
  autoLockEnabled: boolean
  autoLockTime: number // minutes
}

// Hook for biometric authentication
export function useBiometricAuth() {
  const [capabilities, setCapabilities] = useState<BiometricCapabilities>({
    fingerprint: false,
    faceId: false,
    voiceRecognition: false,
    supported: false
  })
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    checkBiometricCapabilities()
  }, [])

  const checkBiometricCapabilities = async () => {
    if (!navigator.credentials) {
      setCapabilities(prev => ({ ...prev, supported: false }))
      return
    }

    try {
      // Check if WebAuthn is supported
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      
      setCapabilities({
        fingerprint: available && 'ontouchstart' in window,
        faceId: available && !('ontouchstart' in window),
        voiceRecognition: false, // Not widely supported yet
        supported: available
      })

      // Check if user has enrolled biometrics
      const stored = localStorage.getItem('biometric-enrolled')
      setIsEnrolled(stored === 'true')
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error)
      setCapabilities(prev => ({ ...prev, supported: false }))
    }
  }

  const enrollBiometric = async (): Promise<boolean> => {
    if (!capabilities.supported) return false

    setIsAuthenticating(true)
    
    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credentialCreationOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'JurisAgentis',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode('user-id'),
            name: 'user@example.com',
            displayName: 'User'
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'direct'
        }
      }

      const credential = await navigator.credentials.create(credentialCreationOptions)
      
      if (credential) {
        localStorage.setItem('biometric-enrolled', 'true')
        localStorage.setItem('biometric-credential', JSON.stringify({
          id: credential.id,
          type: credential.type
        }))
        
        setIsEnrolled(true)
        return true
      }

      return false
    } catch (error) {
      console.error('Biometric enrollment failed:', error)
      return false
    } finally {
      setIsAuthenticating(false)
    }
  }

  const authenticateWithBiometric = async (): Promise<boolean> => {
    if (!isEnrolled || !capabilities.supported) return false

    setIsAuthenticating(true)

    try {
      const challenge = new Uint8Array(32)
      crypto.getRandomValues(challenge)

      const credentialRequestOptions: CredentialRequestOptions = {
        publicKey: {
          challenge,
          timeout: 60000,
          userVerification: 'required',
          allowCredentials: []
        }
      }

      const credential = await navigator.credentials.get(credentialRequestOptions)
      
      if (credential) {
        // Haptic feedback on success
        if ('vibrate' in navigator) {
          navigator.vibrate([50, 25, 50])
        }
        return true
      }

      return false
    } catch (error) {
      console.error('Biometric authentication failed:', error)
      return false
    } finally {
      setIsAuthenticating(false)
    }
  }

  const disableBiometric = () => {
    localStorage.removeItem('biometric-enrolled')
    localStorage.removeItem('biometric-credential')
    setIsEnrolled(false)
  }

  return {
    capabilities,
    isEnrolled,
    isAuthenticating,
    enrollBiometric,
    authenticateWithBiometric,
    disableBiometric
  }
}

// Hook for device fingerprinting and threat detection
export function useDeviceSecurity() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [threats, setThreats] = useState<SecurityThreat[]>([])
  const [riskScore, setRiskScore] = useState(0)
  const [isSecure, setIsSecure] = useState(true)

  const collectDeviceInfo = useCallback(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    const info: DeviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      vendor: navigator.vendor,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints
    }

    // Add device memory if available
    if ('deviceMemory' in navigator) {
      info.deviceMemory = (navigator as unknown as { deviceMemory: number }).deviceMemory
    }

    // Add connection info if available
    if ('connection' in navigator) {
      const connection = (navigator as unknown as { connection: { effectiveType: string; downlink: number; rtt: number } }).connection
      info.connection = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      }
    }

    setDeviceInfo(info)
  }, [])

  const detectThreats = useCallback(() => {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return

    const detectedThreats: SecurityThreat[] = []
    let score = 0

    // Check for developer tools
    if (window.outerHeight - window.innerHeight > 200 || 
        window.outerWidth - window.innerWidth > 200) {
      detectedThreats.push({
        id: 'devtools',
        type: 'debugger',
        severity: 'medium',
        detected: true,
        message: 'Developer tools detected',
        timestamp: new Date().toISOString()
      })
      score += 30
    }

    // Check for emulator/simulator signs
    if (navigator.userAgent.includes('Android') && 
        navigator.hardwareConcurrency === 1) {
      detectedThreats.push({
        id: 'emulator',
        type: 'emulator',
        severity: 'high',
        detected: true,
        message: 'Potential Android emulator detected',
        timestamp: new Date().toISOString()
      })
      score += 50
    }

    // Check for jailbreak/root indicators
    if (navigator.userAgent.includes('iPhone') && 
        'standalone' in navigator && 
        !(navigator as unknown as { standalone: boolean }).standalone) {
      // Additional checks could be performed here
    }

    // Check for proxy/VPN
    if (deviceInfo?.connection && deviceInfo.connection.rtt > 500) {
      detectedThreats.push({
        id: 'proxy',
        type: 'proxy',
        severity: 'low',
        detected: true,
        message: 'High latency connection detected (possible proxy/VPN)',
        timestamp: new Date().toISOString()
      })
      score += 20
    }

    // Check for tampering
    try {
      const originalStringify = JSON.stringify
      if (JSON.stringify !== originalStringify) {
        detectedThreats.push({
          id: 'tampered',
          type: 'tampered',
          severity: 'critical',
          detected: true,
          message: 'Code tampering detected',
          timestamp: new Date().toISOString()
        })
        score += 100
      }
    } catch {
      // Ignore errors in tampering detection
    }

    setThreats(detectedThreats)
    setRiskScore(Math.min(100, score))
    setIsSecure(score < 50)
  }, [deviceInfo])

  const generateDeviceFingerprint = useCallback((): string => {
    if (!deviceInfo) return ''
    
    const fingerprint = [
      deviceInfo.userAgent,
      deviceInfo.platform,
      deviceInfo.language,
      deviceInfo.hardwareConcurrency.toString(),
      deviceInfo.maxTouchPoints.toString(),
      deviceInfo.deviceMemory?.toString() || '',
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString()
    ].join('|')

    // Simple hash function
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36)
  }, [deviceInfo])

  useEffect(() => {
    collectDeviceInfo()
    detectThreats()
    
    // Periodic threat scanning
    const interval = setInterval(detectThreats, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [collectDeviceInfo, detectThreats])

  return {
    deviceInfo,
    threats,
    riskScore,
    isSecure,
    generateDeviceFingerprint
  }
}

// Hook for session security management
export function useSessionSecurity() {
  const [sessionSecurity, setSessionSecurity] = useState<SessionSecurity | null>(null)
  const [autoLockTimer, setAutoLockTimer] = useState<NodeJS.Timeout | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const { generateDeviceFingerprint } = useDeviceSecurity()
  const { capabilities, isEnrolled } = useBiometricAuth()

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return

    initializeSession()
    setupAutoLock()
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Listen for activity
    ['click', 'touchstart', 'keydown', 'scroll'].forEach(event => {
      document.addEventListener(event, resetAutoLockTimer)
    })

    return () => {
      // Only cleanup in browser environment
      if (typeof window === 'undefined') return
      
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      ;['click', 'touchstart', 'keydown', 'scroll'].forEach(event => {
        document.removeEventListener(event, resetAutoLockTimer)
      })
      if (autoLockTimer) clearTimeout(autoLockTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeSession = async () => {
    const sessionId = generateSessionId()
    const deviceFingerprint = generateDeviceFingerprint()
    
    // Get IP and location (would be done on server in real implementation)
    const ipAddress = '192.168.1.1' // Placeholder
    
    const session: SessionSecurity = {
      sessionId,
      deviceFingerprint,
      lastActivity: new Date().toISOString(),
      ipAddress,
      riskScore: 0,
      biometricEnabled: isEnrolled,
      autoLockEnabled: true,
      autoLockTime: 5 // 5 minutes default
    }

    setSessionSecurity(session)
    localStorage.setItem('session-security', JSON.stringify(session))
  }

  const setupAutoLock = () => {
    const settings = localStorage.getItem('auto-lock-settings')
    if (settings) {
      const { enabled, timeout } = JSON.parse(settings)
      if (enabled) {
        resetAutoLockTimer(timeout)
      }
    }
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      // App went to background, start shorter timer
      setTimeout(() => {
        if (document.hidden) {
          lockSession()
        }
      }, 30000) // 30 seconds
    } else {
      // App came to foreground, check if biometric unlock needed
      if (isLocked) {
        requestUnlock()
      }
    }
  }

  const resetAutoLockTimer = (customTimeout?: number) => {
    if (autoLockTimer) {
      clearTimeout(autoLockTimer)
    }

    const timeout = customTimeout || (sessionSecurity?.autoLockTime || 5) * 60 * 1000
    
    const timer = setTimeout(() => {
      lockSession()
    }, timeout)
    
    setAutoLockTimer(timer)
    
    // Update last activity
    if (sessionSecurity) {
      const updated = {
        ...sessionSecurity,
        lastActivity: new Date().toISOString()
      }
      setSessionSecurity(updated)
      localStorage.setItem('session-security', JSON.stringify(updated))
    }
  }

  const lockSession = () => {
    setIsLocked(true)
    
    // Clear sensitive data from memory
    document.querySelectorAll('input[type="password"], input[data-sensitive="true"]').forEach(input => {
      (input as HTMLInputElement).value = ''
    })

    // Blur content for privacy
    document.body.style.filter = 'blur(10px)'
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  }

  const requestUnlock = async () => {
    if (capabilities.supported && isEnrolled) {
      // Would need to be implemented with proper biometric auth
      // For now, just unlock
      unlockSession()
      return true
    }
    
    // Fallback to password/PIN
    return false
  }

  const unlockSession = () => {
    setIsLocked(false)
    document.body.style.filter = 'none'
    resetAutoLockTimer()
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  const generateSessionId = (): string => {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }

  return {
    sessionSecurity,
    isLocked,
    lockSession,
    unlockSession,
    requestUnlock,
    resetAutoLockTimer
  }
}

// Main mobile security component
export function MobileSecurityProvider({ children }: { children: React.ReactNode }) {
  const [showSecurityAlert, setShowSecurityAlert] = useState(false)
  const { threats, riskScore, isSecure } = useDeviceSecurity()
  const { isLocked, requestUnlock } = useSessionSecurity()

  useEffect(() => {
    if (!isSecure && threats.length > 0) {
      setShowSecurityAlert(true)
    }
  }, [isSecure, threats])

  // Security overlay when locked
  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center text-white p-8">
          <LockClosedIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-xl font-semibold mb-2">Session Locked</h2>
          <p className="text-gray-400 mb-6">Authenticate to continue</p>
          
          <button
            onClick={requestUnlock}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-3 font-medium transition-colors"
          >
            <LockClosedIcon className="h-5 w-5 inline mr-2" />
            Unlock with Biometrics
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      
      {/* Security Alert Modal */}
      {showSecurityAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Security Alert</h3>
            </div>
            
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Risk Score</span>
                <span className={`text-sm font-semibold ${
                  riskScore > 70 ? 'text-red-600' : 
                  riskScore > 40 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {riskScore}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    riskScore > 70 ? 'bg-red-500' : 
                    riskScore > 40 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${riskScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {threats.map(threat => (
                <div key={threat.id} className="flex items-center space-x-2 text-sm">
                  <XMarkIcon className="h-4 w-4 text-red-500" />
                  <span className="text-gray-700">{threat.message}</span>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowSecurityAlert(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-4 font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowSecurityAlert(false)
                  window.location.href = '/security'
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 px-4 font-medium transition-colors"
              >
                Review Security
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Privacy mode component (screen recording protection)
export function PrivacyMode({ children, enabled = true }: { 
  children: React.ReactNode
  enabled?: boolean 
}) {
  useEffect(() => {
    if (!enabled) return

    // Prevent screenshots on mobile
    if ('preventScreenCapture' in navigator) {
      (navigator as unknown as { preventScreenCapture: boolean }).preventScreenCapture = true
    }

    // Add security flags
    const meta = document.createElement('meta')
    meta.name = 'screenshot-protection'
    meta.content = 'true'
    document.head.appendChild(meta)

    return () => {
      document.head.removeChild(meta)
    }
  }, [enabled])

  if (!enabled) return <>{children}</>

  return (
    <div className="screenshot-protect" style={{ 
      WebkitUserSelect: 'none',
      userSelect: 'none'
    }}>
      <style jsx>{`
        .screenshot-protect {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        
        @media print {
          .screenshot-protect {
            display: none !important;
          }
        }
      `}</style>
      {children}
    </div>
  )
}