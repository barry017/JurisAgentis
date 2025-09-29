'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheckIcon,
  FingerPrintIcon as FingerprintIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { useBiometricAuth, useDeviceSecurity, useSessionSecurity } from '@/app/components/MobileSecurity'
import { TouchButton } from '@/app/components/TouchGestures'

interface SecuritySetting {
  id: string
  title: string
  description: string
  enabled: boolean
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  type: 'toggle' | 'select' | 'action'
  options?: { value: string; label: string }[]
  action?: () => void
}

export default function MobileSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySetting[]>([])
  const [activeSection, setActiveSection] = useState<'overview' | 'biometric' | 'session' | 'privacy'>('overview')
  
  const { 
    capabilities, 
    isEnrolled, 
    isAuthenticating, 
    enrollBiometric, 
    disableBiometric 
  } = useBiometricAuth()
  
  const { 
    deviceInfo, 
    threats, 
    riskScore
  } = useDeviceSecurity()
  
  const { 
    sessionSecurity, 
    lockSession 
  } = useSessionSecurity()

  useEffect(() => {
    loadSecuritySettings()
  }, [capabilities, isEnrolled, sessionSecurity, loadSecuritySettings])

  const loadSecuritySettings = useCallback(() => {
    const securitySettings: SecuritySetting[] = [
      {
        id: 'biometric-auth',
        title: 'Biometric Authentication',
        description: isEnrolled ? 'Enabled - Use fingerprint/face for login' : 'Enable biometric login',
        enabled: isEnrolled,
        icon: FingerprintIcon,
        type: 'action',
        action: isEnrolled ? disableBiometric : handleEnrollBiometric
      },
      {
        id: 'auto-lock',
        title: 'Auto Lock',
        description: `Lock app after ${sessionSecurity?.autoLockTime || 5} minutes of inactivity`,
        enabled: sessionSecurity?.autoLockEnabled || false,
        icon: LockClosedIcon,
        type: 'select',
        options: [
          { value: '1', label: '1 minute' },
          { value: '5', label: '5 minutes' },
          { value: '15', label: '15 minutes' },
          { value: '30', label: '30 minutes' },
          { value: '0', label: 'Never' }
        ]
      },
      {
        id: 'privacy-mode',
        title: 'Privacy Mode',
        description: 'Prevent screenshots and screen recording',
        enabled: localStorage.getItem('privacy-mode') === 'true',
        icon: EyeSlashIcon,
        type: 'toggle'
      },
      {
        id: 'secure-keyboard',
        title: 'Secure Keyboard',
        description: 'Use secure input for sensitive fields',
        enabled: localStorage.getItem('secure-keyboard') === 'true',
        icon: ShieldCheckIcon,
        type: 'toggle'
      }
    ]

    setSettings(securitySettings)
  }, [isEnrolled, sessionSecurity, disableBiometric, handleEnrollBiometric])

  const handleEnrollBiometric = useCallback(async () => {
    const success = await enrollBiometric()
    if (success) {
      loadSecuritySettings()
    } else {
      alert('Failed to enroll biometric authentication')
    }
  }, [enrollBiometric, loadSecuritySettings])

  const handleSettingChange = (settingId: string, value: boolean | string) => {
    const updatedSettings = settings.map(setting => {
      if (setting.id === settingId) {
        return { ...setting, enabled: typeof value === 'boolean' ? value : true }
      }
      return setting
    })
    
    setSettings(updatedSettings)

    // Save to localStorage
    localStorage.setItem(`security-${settingId}`, value.toString())

    // Handle specific settings
    switch (settingId) {
      case 'auto-lock':
        const timeout = parseInt(value as string)
        localStorage.setItem('auto-lock-settings', JSON.stringify({
          enabled: timeout > 0,
          timeout: timeout
        }))
        break
      case 'privacy-mode':
        localStorage.setItem('privacy-mode', value.toString())
        break
      case 'secure-keyboard':
        localStorage.setItem('secure-keyboard', value.toString())
        break
    }
  }

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-yellow-600 bg-yellow-50'
    if (score >= 40) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getSecurityScoreText = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Poor'
  }

  const securityScore = Math.max(0, 100 - riskScore)

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Security Score</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSecurityScoreColor(securityScore)}`}>
            {getSecurityScoreText(securityScore)}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl font-bold text-gray-900">{securityScore}/100</span>
              <ShieldCheckIcon className={`h-8 w-8 ${securityScore >= 80 ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${
                  securityScore >= 80 ? 'bg-green-500' : 
                  securityScore >= 60 ? 'bg-yellow-500' : 
                  securityScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${securityScore}%` }}
              />
            </div>
          </div>
        </div>

        {threats.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Security Issues Detected</span>
            </div>
            {threats.map(threat => (
              <p key={threat.id} className="text-sm text-red-700">
                • {threat.message}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <TouchButton
          variant="secondary"
          className="p-4 bg-white border border-gray-200 rounded-lg"
          onClick={() => setActiveSection('biometric')}
        >
          <div className="text-center">
            <FingerprintIcon className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
            <span className="text-sm font-medium text-gray-900">Biometric</span>
            <p className="text-xs text-gray-500 mt-1">
              {isEnrolled ? 'Enabled' : 'Setup'}
            </p>
          </div>
        </TouchButton>

        <TouchButton
          variant="secondary"
          className="p-4 bg-white border border-gray-200 rounded-lg"
          onClick={() => setActiveSection('session')}
        >
          <div className="text-center">
            <ClockIcon className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
            <span className="text-sm font-medium text-gray-900">Auto Lock</span>
            <p className="text-xs text-gray-500 mt-1">
              {sessionSecurity?.autoLockTime || 5}min
            </p>
          </div>
        </TouchButton>
      </div>

      {/* Device Info */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
          <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
          Device Information
        </h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Platform:</span>
            <span className="text-gray-900">{deviceInfo?.platform}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Language:</span>
            <span className="text-gray-900">{deviceInfo?.language}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Touch Points:</span>
            <span className="text-gray-900">{deviceInfo?.maxTouchPoints}</span>
          </div>
          {deviceInfo?.connection && (
            <div className="flex justify-between">
              <span className="text-gray-600">Connection:</span>
              <span className="text-gray-900">{deviceInfo.connection.effectiveType}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderBiometricSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Biometric Authentication</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <FingerprintIcon className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Fingerprint</p>
                <p className="text-sm text-gray-600">
                  {capabilities.fingerprint ? 'Available' : 'Not available'}
                </p>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              capabilities.fingerprint ? 'bg-green-500' : 'bg-gray-300'
            }`} />
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-6 w-6 text-gray-600" />
              <div>
                <p className="font-medium text-gray-900">Face ID</p>
                <p className="text-sm text-gray-600">
                  {capabilities.faceId ? 'Available' : 'Not available'}
                </p>
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              capabilities.faceId ? 'bg-green-500' : 'bg-gray-300'
            }`} />
          </div>
        </div>

        <div className="mt-6">
          {!isEnrolled ? (
            <TouchButton
              variant="primary"
              className="w-full"
              onClick={handleEnrollBiometric}
              disabled={!capabilities.supported || isAuthenticating}
            >
              {isAuthenticating ? 'Setting up...' : 'Enable Biometric Login'}
            </TouchButton>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircleIcon className="h-5 w-5" />
                <span className="font-medium">Biometric authentication is enabled</span>
              </div>
              <TouchButton
                variant="danger"
                className="w-full"
                onClick={disableBiometric}
              >
                Disable Biometric Login
              </TouchButton>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900">About Biometric Security</h4>
            <p className="text-sm text-blue-700 mt-1">
              Your biometric data is stored securely on your device and never leaves it. 
              We use WebAuthn standards for maximum security.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSessionSettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>
        
        <div className="space-y-4">
          {settings.filter(s => s.id === 'auto-lock').map(setting => (
            <div key={setting.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <setting.icon className="h-6 w-6 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{setting.title}</p>
                    <p className="text-sm text-gray-600">{setting.description}</p>
                  </div>
                </div>
              </div>
              
              {setting.options && (
                <select
                  value={sessionSecurity?.autoLockTime?.toString() || '5'}
                  onChange={(e) => handleSettingChange(setting.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {setting.options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6">
          <TouchButton
            variant="secondary"
            className="w-full"
            onClick={lockSession}
          >
            <LockClosedIcon className="h-5 w-5 inline mr-2" />
            Lock Session Now
          </TouchButton>
        </div>
      </div>

      {sessionSecurity && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Current Session</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Session ID:</span>
              <span className="text-gray-900 font-mono text-xs">
                {sessionSecurity.sessionId.substring(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Activity:</span>
              <span className="text-gray-900">
                {new Date(sessionSecurity.lastActivity).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IP Address:</span>
              <span className="text-gray-900">{sessionSecurity.ipAddress}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderPrivacySettings = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Privacy Protection</h3>
        
        <div className="space-y-4">
          {settings.filter(s => s.id.includes('privacy') || s.id.includes('secure')).map(setting => (
            <div key={setting.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <setting.icon className="h-6 w-6 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">{setting.title}</p>
                  <p className="text-sm text-gray-600">{setting.description}</p>
                </div>
              </div>
              
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={setting.enabled}
                  onChange={(e) => handleSettingChange(setting.id, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-yellow-900">Privacy Notice</h4>
            <p className="text-sm text-yellow-700 mt-1">
              Privacy mode may affect app functionality on some devices. 
              You can disable it anytime if you experience issues.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            {activeSection !== 'overview' && (
              <button
                onClick={() => setActiveSection('overview')}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {activeSection === 'overview' && 'Security Settings'}
                {activeSection === 'biometric' && 'Biometric Authentication'}
                {activeSection === 'session' && 'Session Management'}
                {activeSection === 'privacy' && 'Privacy Protection'}
              </h1>
              <p className="text-sm text-gray-500">
                Manage your mobile security preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeSection === 'overview' && renderOverview()}
        {activeSection === 'biometric' && renderBiometricSettings()}
        {activeSection === 'session' && renderSessionSettings()}
        {activeSection === 'privacy' && renderPrivacySettings()}
      </div>

      {/* Section Navigation */}
      {activeSection === 'overview' && (
        <div className="fixed bottom-20 left-4 right-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-2">
            <div className="grid grid-cols-3 gap-2">
              <TouchButton
                size="sm"
                variant="secondary"
                onClick={() => setActiveSection('biometric')}
                className="text-center"
              >
                <FingerprintIcon className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Biometric</span>
              </TouchButton>
              
              <TouchButton
                size="sm"
                variant="secondary"
                onClick={() => setActiveSection('session')}
                className="text-center"
              >
                <ClockIcon className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Session</span>
              </TouchButton>
              
              <TouchButton
                size="sm"
                variant="secondary"
                onClick={() => setActiveSection('privacy')}
                className="text-center"
              >
                <EyeSlashIcon className="h-5 w-5 mx-auto mb-1" />
                <span className="text-xs">Privacy</span>
              </TouchButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}