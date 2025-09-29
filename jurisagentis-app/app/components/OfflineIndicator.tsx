'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: Record<string, unknown>
  timestamp: string
  status: 'pending' | 'syncing' | 'synced' | 'failed'
}

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      setIsConnecting(true)
      
      // Simulate connection verification
      setTimeout(() => {
        setIsConnecting(false)
        triggerSync()
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsConnecting(false)
      setSyncStatus('idle')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'sync-success') {
        handleSyncSuccess(event.data)
      } else if (event.data.type === 'sync-error') {
        handleSyncError(event.data)
      } else if (event.data.type === 'offline-action-added') {
        addPendingAction(event.data.action)
      }
    }

    navigator.serviceWorker?.addEventListener('message', handleMessage)

    // Load pending actions from localStorage
    loadPendingActions()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      navigator.serviceWorker?.removeEventListener('message', handleMessage)
    }
  }, [addPendingAction, handleSyncSuccess, triggerSync, handleSyncError])

  const loadPendingActions = () => {
    try {
      const stored = localStorage.getItem('offline-actions')
      if (stored) {
        setPendingActions(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error)
    }
  }

  const savePendingActions = (actions: OfflineAction[]) => {
    try {
      localStorage.setItem('offline-actions', JSON.stringify(actions))
    } catch (error) {
      console.error('Failed to save pending actions:', error)
    }
  }

  const addPendingAction = useCallback((action: OfflineAction) => {
    setPendingActions(prev => {
      const updated = [...prev, action]
      savePendingActions(updated)
      return updated
    })
  }, [])

  const triggerSync = useCallback(async () => {
    if (!isOnline || pendingActions.length === 0) return

    setSyncStatus('syncing')

    try {
      // Trigger background sync via service worker
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready
        await registration.sync.register('background-sync-data')
      } else {
        // Fallback: sync directly
        await syncPendingActions()
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncStatus('error')
      setTimeout(() => setSyncStatus('idle'), 3000)
    }
  }, [isOnline, pendingActions, syncPendingActions])

  const syncPendingActions = useCallback(async () => {
    const actionsToSync = pendingActions.filter(action => action.status === 'pending')
    
    for (const action of actionsToSync) {
      try {
        // Update status to syncing
        updateActionStatus(action.id, 'syncing')

        // Simulate API call
        const response = await fetch(`/api/v1/${action.resource}`, {
          method: action.type === 'create' ? 'POST' : 
                  action.type === 'update' ? 'PUT' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          },
          body: action.type !== 'delete' ? JSON.stringify(action.data) : undefined
        })

        if (response.ok) {
          updateActionStatus(action.id, 'synced')
        } else {
          updateActionStatus(action.id, 'failed')
        }
      } catch (_error) {
        updateActionStatus(action.id, 'failed')
      }
    }

    // Remove synced actions
    setPendingActions(prev => {
      const updated = prev.filter(action => action.status !== 'synced')
      savePendingActions(updated)
      return updated
    })

    setSyncStatus('success')
    setTimeout(() => setSyncStatus('idle'), 2000)
  }, [pendingActions])

  const updateActionStatus = (id: string, status: OfflineAction['status']) => {
    setPendingActions(prev => 
      prev.map(action => 
        action.id === id ? { ...action, status } : action
      )
    )
  }

  const handleSyncSuccess = useCallback((data: Record<string, unknown>) => {
    // Remove synced action
    setPendingActions(prev => {
      const updated = prev.filter(action => action.id !== data.actionId)
      savePendingActions(updated)
      return updated
    })
    
    setSyncStatus('success')
    setTimeout(() => setSyncStatus('idle'), 2000)
  }, [])

  const handleSyncError = useCallback((_data: Record<string, unknown>) => {
    setSyncStatus('error')
    setTimeout(() => setSyncStatus('idle'), 3000)
  }, [])

  const retryFailedActions = () => {
    setPendingActions(prev => 
      prev.map(action => 
        action.status === 'failed' ? { ...action, status: 'pending' } : action
      )
    )
    
    if (isOnline) {
      triggerSync()
    }
  }

  const clearAllActions = () => {
    setPendingActions([])
    savePendingActions([])
  }

  // Don't show anything if online and no pending actions
  if (isOnline && pendingActions.length === 0 && syncStatus === 'idle') {
    return null
  }

  return (
    <>
      {/* Main Status Indicator */}
      <div 
        className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
          showDetails ? 'w-80' : 'w-auto'
        }`}
      >
        <div 
          className={`rounded-lg shadow-lg backdrop-blur-sm border cursor-pointer transition-all duration-200 ${
            !isOnline 
              ? 'bg-red-50/90 border-red-200 text-red-700' 
              : pendingActions.length > 0
                ? 'bg-yellow-50/90 border-yellow-200 text-yellow-700'
                : 'bg-green-50/90 border-green-200 text-green-700'
          }`}
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="p-3">
            <div className="flex items-center space-x-2">
              {/* Status Icon */}
              {isConnecting ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin" />
              ) : !isOnline ? (
                <ExclamationTriangleIcon className="h-5 w-5" />
              ) : syncStatus === 'syncing' ? (
                <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
              ) : syncStatus === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              ) : syncStatus === 'error' ? (
                <XCircleIcon className="h-5 w-5 text-red-600" />
              ) : pendingActions.length > 0 ? (
                <WifiIcon className="h-5 w-5" />
              ) : (
                <CheckCircleIcon className="h-5 w-5" />
              )}

              {/* Status Text */}
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {isConnecting 
                    ? 'Connecting...'
                    : !isOnline 
                      ? 'Offline'
                      : syncStatus === 'syncing'
                        ? 'Syncing...'
                        : syncStatus === 'success'
                          ? 'Synced'
                          : syncStatus === 'error'
                            ? 'Sync Failed'
                            : pendingActions.length > 0
                              ? `${pendingActions.length} pending`
                              : 'Online'
                }
                </div>
                
                {pendingActions.length > 0 && !showDetails && (
                  <div className="text-xs opacity-75">
                    Click to view details
                  </div>
                )}
              </div>

              {/* Pending Count Badge */}
              {pendingActions.length > 0 && (
                <div className="bg-current text-white text-xs rounded-full px-2 py-1 min-w-[1.5rem] text-center">
                  {pendingActions.length}
                </div>
              )}
            </div>

            {/* Expanded Details */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-current/20">
                {pendingActions.length > 0 ? (
                  <>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {pendingActions.map((action) => (
                        <div 
                          key={action.id}
                          className="flex items-center justify-between text-xs p-2 bg-white/50 rounded"
                        >
                          <div className="flex-1">
                            <div className="font-medium capitalize">
                              {action.type} {action.resource}
                            </div>
                            <div className="opacity-75">
                              {new Date(action.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded text-xs ${
                            action.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            action.status === 'syncing' ? 'bg-blue-100 text-blue-700' :
                            action.status === 'synced' ? 'bg-green-100 text-green-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {action.status}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-2 mt-3">
                      {isOnline && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            triggerSync()
                          }}
                          className="flex-1 bg-current/10 hover:bg-current/20 text-current text-xs py-2 px-3 rounded transition-colors"
                        >
                          Sync Now
                        </button>
                      )}
                      
                      {pendingActions.some(a => a.status === 'failed') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            retryFailedActions()
                          }}
                          className="flex-1 bg-current/10 hover:bg-current/20 text-current text-xs py-2 px-3 rounded transition-colors"
                        >
                          Retry Failed
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          clearAllActions()
                        }}
                        className="bg-current/10 hover:bg-current/20 text-current text-xs py-2 px-3 rounded transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-center py-2">
                    {!isOnline ? 'Working offline. Changes will sync when connected.' : 'All changes synced'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 px-4 z-40">
          <div className="flex items-center justify-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <span className="text-sm font-medium">
              You are offline. Changes will be saved locally and synced when connected.
            </span>
          </div>
        </div>
      )}
    </>
  )
}

// Hook for adding offline actions
export function useOfflineActions() {
  const addOfflineAction = (
    type: OfflineAction['type'],
    resource: string,
    data: Record<string, unknown>
  ) => {
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      resource,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending'
    }

    // Add to localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('offline-actions') || '[]')
      const updated = [...existing, action]
      localStorage.setItem('offline-actions', JSON.stringify(updated))

      // Notify components
      window.dispatchEvent(new CustomEvent('offline-action-added', { detail: action }))
    } catch (error) {
      console.error('Failed to save offline action:', error)
    }

    return action.id
  }

  return { addOfflineAction }
}