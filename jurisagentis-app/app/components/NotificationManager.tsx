'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  BellIcon, 
  Cog6ToothIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  // ClockIcon
} from '@heroicons/react/24/outline'

interface NotificationPreferences {
  deadlines: boolean
  case_updates: boolean
  client_messages: boolean
  system_notifications: boolean
  marketing: boolean
  sound_enabled: boolean
  vibration_enabled: boolean
  quiet_hours: {
    enabled: boolean
    start: string
    end: string
  }
}

interface PushNotification {
  id: string
  title: string
  body: string
  type: 'deadline' | 'case_update' | 'client_message' | 'system' | 'marketing'
  timestamp: string
  read: boolean
  urgent: boolean
  data?: Record<string, string | number | boolean>
}

export function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    deadlines: true,
    case_updates: true,
    client_messages: true,
    system_notifications: true,
    marketing: false,
    sound_enabled: true,
    vibration_enabled: true,
    quiet_hours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  })
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window && 
                     'serviceWorker' in navigator && 
                     'PushManager' in window

    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      checkSubscriptionStatus()
      loadPreferences()
      loadNotifications()
    }

    // Listen for service worker messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage)
      }
    }
  }, [handleServiceWorkerMessage])

  const handleServiceWorkerMessage = useCallback((event: MessageEvent) => {
    if (event.data.type === 'notification-received') {
      addNotification(event.data.notification)
    }
  }, [addNotification])

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Failed to check subscription status:', error)
    }
  }

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/v1/push?action=preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          setPreferences(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
    }
  }

  const loadNotifications = () => {
    try {
      const stored = localStorage.getItem('push-notifications')
      if (stored) {
        setNotifications(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load notifications:', error)
    }
  }

  const saveNotifications = (newNotifications: PushNotification[]) => {
    try {
      localStorage.setItem('push-notifications', JSON.stringify(newNotifications))
      setNotifications(newNotifications)
    } catch (error) {
      console.error('Failed to save notifications:', error)
    }
  }

  const addNotification = useCallback((notification: PushNotification) => {
    const newNotifications = [notification, ...notifications].slice(0, 50) // Keep last 50
    saveNotifications(newNotifications)
  }, [notifications])

  const requestPermission = async () => {
    if (!isSupported) return false

    try {
      const permission = await Notification.requestPermission()
      setPermission(permission)
      
      if (permission === 'granted') {
        await subscribeToPush()
        return true
      }
      
      return false
    } catch (error) {
      console.error('Failed to request notification permission:', error)
      return false
    }
  }

  const subscribeToPush = async () => {
    if (!isSupported || permission !== 'granted') return

    setIsLoading(true)

    try {
      // Get VAPID public key
      const vapidResponse = await fetch('/api/v1/push?action=vapid-key')
      const vapidData = await vapidResponse.json()
      
      if (!vapidData.success) {
        throw new Error('Failed to get VAPID key')
      }

      // Subscribe to push notifications
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.data.public_key
      })

      // Send subscription to server
      const response = await fetch('/api/v1/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          action: 'subscribe',
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          }
        })
      })

      if (response.ok) {
        setIsSubscribed(true)
        console.log('Successfully subscribed to push notifications')
      } else {
        throw new Error('Failed to save subscription')
      }
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const _unsubscribe = async () => {
    if (!isSupported) return

    setIsLoading(true)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        
        // Remove subscription from server
        await fetch(`/api/v1/push?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        })
      }
      
      setIsSubscribed(false)
      console.log('Successfully unsubscribed from push notifications')
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const _updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)

    try {
      const response = await fetch('/api/v1/push', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          subscription_id: 'current', // Server will find current subscription
          preferences: updated
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
      // Revert on error
      loadPreferences()
    }
  }

  const sendTestNotification = async () => {
    if (!isSubscribed) return

    try {
      const response = await fetch('/api/v1/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          action: 'test'
        })
      })

      if (response.ok) {
        console.log('Test notification sent')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    )
    saveNotifications(updated)
  }

  const clearNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id)
    saveNotifications(updated)
  }

  const clearAllNotifications = () => {
    saveNotifications([])
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return window.btoa(binary)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline': return ExclamationTriangleIcon
      case 'case_update': return InformationCircleIcon
      case 'client_message': return BellIcon
      case 'system': return CheckCircleIcon
      default: return BellIcon
    }
  }

  const getNotificationColor = (type: string, urgent: boolean) => {
    if (urgent) return 'text-red-600 bg-red-50 border-red-200'
    
    switch (type) {
      case 'deadline': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'case_update': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'client_message': return 'text-green-600 bg-green-50 border-green-200'
      case 'system': return 'text-purple-600 bg-purple-50 border-purple-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
          <p className="text-yellow-800 text-sm">
            Push notifications are not supported in this browser.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Notification Bell */}
      <div className="relative">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <BellIcon className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {showSettings && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Permission Status */}
            <div className="p-4 border-b border-gray-200">
              {permission === 'granted' ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">
                    {isSubscribed ? 'Notifications enabled' : 'Setting up...'}
                  </span>
                </div>
              ) : permission === 'denied' ? (
                <div className="flex items-center space-x-2 text-red-600">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Notifications blocked</span>
                </div>
              ) : (
                <button
                  onClick={requestPermission}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                >
                  {isLoading ? 'Setting up...' : 'Enable Notifications'}
                </button>
              )}
            </div>

            {/* Quick Actions */}
            {isSubscribed && (
              <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={sendTestNotification}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                  >
                    Test
                  </button>
                  <button
                    onClick={clearAllNotifications}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Recent Notifications */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => {
                  const Icon = getNotificationIcon(notification.type)
                  const colorClass = getNotificationColor(notification.type, notification.urgent)
                  
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`rounded-full p-1 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 truncate">
                            {notification.body}
                          </p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-gray-500">
                              {new Date(notification.timestamp).toLocaleTimeString()}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                clearNotification(notification.id)
                              }}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <BellIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              )}
            </div>

            {/* Preferences Toggle */}
            {isSubscribed && (
              <div className="p-4">
                <button
                  onClick={() => {/* Open full preferences modal */}}
                  className="w-full flex items-center justify-center space-x-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  <span>Notification Settings</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// Hook for sending notifications from components
export function useNotifications() {
  const sendNotification = async (
    title: string,
    body: string,
    options: {
      type?: 'deadline' | 'case_update' | 'client_message' | 'system' | 'marketing'
      urgent?: boolean
      data?: Record<string, unknown>
      target_users?: string[]
    } = {}
  ) => {
    try {
      const response = await fetch('/api/v1/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          action: 'send',
          title,
          body,
          notification_type: options.type,
          urgent: options.urgent,
          data: options.data,
          target_users: options.target_users
        })
      })

      if (response.ok) {
        const result = await response.json()
        return result.data
      } else {
        throw new Error('Failed to send notification')
      }
    } catch (error) {
      console.error('Failed to send notification:', error)
      return null
    }
  }

  return { sendNotification }
}