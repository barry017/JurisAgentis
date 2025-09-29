'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator as Window['navigator'] & { standalone?: boolean }).standalone ||
                            document.referrer.includes('android-app://')
    
    setIsStandalone(isStandaloneMode)

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show install prompt after a delay (don't be too aggressive)
      setTimeout(() => {
        if (!isStandaloneMode && !localStorage.getItem('pwa-install-dismissed')) {
          setShowInstallPrompt(true)
        }
      }, 10000) // Show after 10 seconds
    }

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      
      // Track installation
      if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as Window & { gtag?: (...args: unknown[]) => void }).gtag('event', 'pwa_install', {
          method: 'browser_prompt'
        })
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt')
      } else {
        console.log('User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    localStorage.setItem('pwa-install-dismissed', 'true')
    
    // Show again after 30 days
    setTimeout(() => {
      localStorage.removeItem('pwa-install-dismissed')
    }, 30 * 24 * 60 * 60 * 1000)
  }

  // Don't show if already installed or in standalone mode
  if (isStandalone || isInstalled) {
    return null
  }

  // iOS install instructions
  if (isIOS && showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <DevicePhoneMobileIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Install JurisAgentis</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          Install this app on your iPhone: tap the Share button and then &quot;Add to Home Screen&quot;
        </p>
        
        <div className="flex items-center text-xs text-gray-500">
          <span className="mr-2">📱</span>
          <span className="mr-2">→</span>
          <span className="mr-2">Share</span>
          <span className="mr-2">→</span>
          <span>&quot;Add to Home Screen&quot;</span>
        </div>
      </div>
    )
  }

  // Android/Chrome install prompt
  if (showInstallPrompt && deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 max-w-sm mx-auto">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center">
            <ArrowDownTrayIcon className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-sm font-semibold text-gray-900">Install JurisAgentis</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-xs text-gray-600 mb-4">
          Install this app for a better experience with offline access, push notifications, and faster loading.
        </p>
        
        <div className="flex space-x-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-indigo-600 text-white text-xs font-medium py-2 px-3 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-gray-100 text-gray-700 text-xs font-medium py-2 px-3 rounded-md hover:bg-gray-200 transition-colors"
          >
            Not Now
          </button>
        </div>
      </div>
    )
  }

  return null
}

// Export hook for programmatic installation
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }

    const handleAppInstalled = () => {
      setCanInstall(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferredPrompt) return false

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      return choiceResult.outcome === 'accepted'
    } catch (error) {
      console.error('Installation failed:', error)
      return false
    }
  }

  return { canInstall, install }
}