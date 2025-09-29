/**
 * Offline Data Synchronization System
 * Handles offline data storage, conflict resolution, and background sync
 */

import React from 'react'

export interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: string
  data: Record<string, unknown>
  timestamp: string
  retries: number
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'conflict'
  conflict_resolution?: 'client' | 'server' | 'manual'
  original_data?: Record<string, unknown>
  server_data?: Record<string, unknown>
  user_id?: string
  priority: 'low' | 'normal' | 'high'
}

export interface SyncResult {
  success: boolean
  synced: number
  failed: number
  conflicts: number
  errors: Array<{
    action_id: string
    error: string
    details?: Record<string, unknown>
  }>
}

export interface ConflictResolution {
  action_id: string
  resolution: 'keep_client' | 'keep_server' | 'merge'
  merged_data?: Record<string, unknown>
}

class OfflineSyncManager {
  private dbName = 'jurisagentis-offline'
  private version = 1
  private db: IDBDatabase | null = null
  private isOnline = navigator.onLine
  private syncInProgress = false
  private syncQueue: OfflineAction[] = []
  private maxRetries = 3
  private retryDelay = 5000 // 5 seconds

  constructor() {
    this.initDB()
    this.setupEventListeners()
    this.loadSyncQueue()
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Actions store
        if (!db.objectStoreNames.contains('actions')) {
          const actionsStore = db.createObjectStore('actions', { keyPath: 'id' })
          actionsStore.createIndex('status', 'status', { unique: false })
          actionsStore.createIndex('timestamp', 'timestamp', { unique: false })
          actionsStore.createIndex('resource', 'resource', { unique: false })
          actionsStore.createIndex('priority', 'priority', { unique: false })
        }

        // Cache store for offline data
        if (!db.objectStoreNames.contains('cache')) {
          const cacheStore = db.createObjectStore('cache', { keyPath: 'key' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
          cacheStore.createIndex('resource', 'resource', { unique: false })
        }

        // Conflicts store
        if (!db.objectStoreNames.contains('conflicts')) {
          const conflictsStore = db.createObjectStore('conflicts', { keyPath: 'action_id' })
          conflictsStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.triggerSync()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Listen for background sync events from service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'background-sync') {
          this.handleBackgroundSync()
        }
      })
    }

    // Periodic sync when online
    setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.triggerSync()
      }
    }, 30000) // Every 30 seconds
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['actions'], 'readonly')
    const store = transaction.objectStore('actions')
    const request = store.index('status').getAll('pending')

    request.onsuccess = () => {
      this.syncQueue = request.result.sort((a, b) => {
        // Sort by priority and timestamp
        const priorityOrder = { high: 3, normal: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      })
    }
  }

  // Add action to offline queue
  async addAction(
    type: OfflineAction['type'],
    resource: string,
    data: Record<string, unknown>,
    priority: OfflineAction['priority'] = 'normal'
  ): Promise<string> {
    const action: OfflineAction = {
      id: this.generateId(),
      type,
      resource,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending',
      priority,
      user_id: this.getCurrentUserId()
    }

    await this.saveAction(action)
    this.syncQueue.push(action)

    // Try immediate sync if online
    if (this.isOnline) {
      this.triggerSync()
    }

    return action.id
  }

  private async saveAction(action: OfflineAction): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['actions'], 'readwrite')
    const store = transaction.objectStore('actions')
    store.put(action)
  }

  private async updateActionStatus(
    actionId: string, 
    status: OfflineAction['status'],
    additionalData?: Partial<OfflineAction>
  ): Promise<void> {
    if (!this.db) return

    const transaction = this.db.transaction(['actions'], 'readwrite')
    const store = transaction.objectStore('actions')
    const request = store.get(actionId)

    request.onsuccess = () => {
      const action = request.result
      if (action) {
        action.status = status
        if (additionalData) {
          Object.assign(action, additionalData)
        }
        store.put(action)
      }
    }

    // Update in memory queue
    const queueIndex = this.syncQueue.findIndex(a => a.id === actionId)
    if (queueIndex !== -1) {
      this.syncQueue[queueIndex].status = status
      if (additionalData) {
        Object.assign(this.syncQueue[queueIndex], additionalData)
      }
    }
  }

  // Trigger synchronization
  async triggerSync(): Promise<SyncResult> {
    if (!this.isOnline || this.syncInProgress) {
      return { success: false, synced: 0, failed: 0, conflicts: 0, errors: [] }
    }

    this.syncInProgress = true
    let synced = 0
    let failed = 0
    let conflicts = 0
    const errors: Array<{ action_id: string; error: string; details?: Record<string, unknown> }> = []

    try {
      // Get pending actions
      const pendingActions = this.syncQueue.filter(action => 
        action.status === 'pending' && action.retries < this.maxRetries
      )

      for (const action of pendingActions) {
        try {
          await this.updateActionStatus(action.id, 'syncing')
          
          const result = await this.syncAction(action)
          
          if (result.success) {
            await this.updateActionStatus(action.id, 'synced')
            synced++
            
            // Remove from queue
            this.syncQueue = this.syncQueue.filter(a => a.id !== action.id)
          } else if (result.conflict) {
            await this.handleConflict(action, result.serverData)
            conflicts++
          } else {
            // Retry logic
            const newRetries = action.retries + 1
            if (newRetries >= this.maxRetries) {
              await this.updateActionStatus(action.id, 'failed')
              failed++
            } else {
              await this.updateActionStatus(action.id, 'pending', { retries: newRetries })
              // Schedule retry
              setTimeout(() => this.triggerSync(), this.retryDelay * newRetries)
            }
            
            errors.push({
              action_id: action.id,
              error: result.error || 'Unknown error',
              details: result.details
            })
          }
        } catch (error) {
          console.error('Sync action failed:', error)
          
          const newRetries = action.retries + 1
          if (newRetries >= this.maxRetries) {
            await this.updateActionStatus(action.id, 'failed')
            failed++
          } else {
            await this.updateActionStatus(action.id, 'pending', { retries: newRetries })
          }
          
          errors.push({
            action_id: action.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Notify UI of sync completion
      this.notifyUI('sync-completed', { synced, failed, conflicts })

    } finally {
      this.syncInProgress = false
    }

    return { success: true, synced, failed, conflicts, errors }
  }

  private async syncAction(action: OfflineAction): Promise<{
    success: boolean
    conflict?: boolean
    serverData?: Record<string, unknown>
    error?: string
    details?: Record<string, unknown>
  }> {
    try {
      const authToken = localStorage.getItem('auth-token')
      if (!authToken) {
        throw new Error('No authentication token')
      }

      let url = `/api/v1/${action.resource}`
      let method = 'POST'

      if (action.type === 'update') {
        method = 'PUT'
        url += `/${action.data.id}`
      } else if (action.type === 'delete') {
        method = 'DELETE'
        url += `/${action.data.id}`
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: action.type !== 'delete' ? JSON.stringify(action.data) : undefined
      })

      if (response.status === 409) {
        // Conflict detected
        const serverData = await response.json()
        return { success: false, conflict: true, serverData }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { 
          success: false, 
          error: `HTTP ${response.status}`, 
          details: errorData 
        }
      }

      const result = await response.json()
      
      // Update local cache with server response
      if (result.data) {
        await this.updateCache(action.resource, result.data)
      }

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  private async handleConflict(action: OfflineAction, serverData: Record<string, unknown>): Promise<void> {
    // Store conflict for user resolution
    const conflict = {
      action_id: action.id,
      client_data: action.data,
      server_data: serverData,
      timestamp: new Date().toISOString(),
      resource: action.resource,
      type: action.type
    }

    if (this.db) {
      const transaction = this.db.transaction(['conflicts'], 'readwrite')
      const store = transaction.objectStore('conflicts')
      store.put(conflict)
    }

    await this.updateActionStatus(action.id, 'conflict', {
      server_data: serverData,
      original_data: action.data
    })

    // Notify UI about conflict
    this.notifyUI('conflict-detected', { action_id: action.id, conflict })
  }

  // Resolve conflicts
  async resolveConflict(resolution: ConflictResolution): Promise<void> {
    const action = this.syncQueue.find(a => a.id === resolution.action_id)
    if (!action) return

    switch (resolution.resolution) {
      case 'keep_client':
        // Keep client data, retry sync
        await this.updateActionStatus(action.id, 'pending', { retries: 0 })
        this.triggerSync()
        break

      case 'keep_server':
        // Accept server data, mark as synced
        if (action.server_data) {
          await this.updateCache(action.resource, action.server_data)
        }
        await this.updateActionStatus(action.id, 'synced')
        this.syncQueue = this.syncQueue.filter(a => a.id !== action.id)
        break

      case 'merge':
        // Use merged data, retry sync
        if (resolution.merged_data) {
          action.data = resolution.merged_data
          await this.saveAction(action)
          await this.updateActionStatus(action.id, 'pending', { retries: 0 })
          this.triggerSync()
        }
        break
    }

    // Remove conflict record
    if (this.db) {
      const transaction = this.db.transaction(['conflicts'], 'readwrite')
      const store = transaction.objectStore('conflicts')
      store.delete(resolution.action_id)
    }
  }

  // Cache management
  async updateCache(resource: string, data: Record<string, unknown>): Promise<void> {
    if (!this.db) return

    const cacheEntry = {
      key: `${resource}_${data.id}`,
      resource,
      data,
      timestamp: new Date().toISOString()
    }

    const transaction = this.db.transaction(['cache'], 'readwrite')
    const store = transaction.objectStore('cache')
    store.put(cacheEntry)
  }

  async getCachedData(resource: string, id?: string): Promise<Record<string, unknown> | null> {
    if (!this.db) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')

      if (id) {
        const request = store.get(`${resource}_${id}`)
        request.onsuccess = () => {
          resolve(request.result?.data || null)
        }
        request.onerror = () => resolve(null)
      } else {
        // Get all for resource
        const request = store.index('resource').getAll(resource)
        request.onsuccess = () => {
          resolve(request.result.map(entry => entry.data))
        }
        request.onerror = () => resolve([])
      }
    })
  }

  // Background sync handler
  private async handleBackgroundSync(): Promise<void> {
    if (this.isOnline) {
      await this.triggerSync()
    }
  }

  // Get sync status
  getSyncStatus(): {
    isOnline: boolean
    syncInProgress: boolean
    pendingActions: number
    failedActions: number
    conflictActions: number
  } {
    const pending = this.syncQueue.filter(a => a.status === 'pending').length
    const failed = this.syncQueue.filter(a => a.status === 'failed').length
    const conflicts = this.syncQueue.filter(a => a.status === 'conflict').length

    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingActions: pending,
      failedActions: failed,
      conflictActions: conflicts
    }
  }

  // Get conflicts for UI
  async getConflicts(): Promise<Array<{ action_id: string; client_data: Record<string, unknown>; server_data: Record<string, unknown>; timestamp: string }>> {
    if (!this.db) return []

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['conflicts'], 'readonly')
      const store = transaction.objectStore('conflicts')
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result)
      }
      request.onerror = () => resolve([])
    })
  }

  // Utility methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getCurrentUserId(): string {
    // Get from auth token or localStorage
    try {
      const token = localStorage.getItem('auth-token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        return payload.user_id || 'unknown'
      }
    } catch (error) {
      console.error('Failed to get user ID:', error)
    }
    return 'unknown'
  }

  private notifyUI(type: string, data: Record<string, unknown>): void {
    // Send message to UI components
    window.dispatchEvent(new CustomEvent('offline-sync', {
      detail: { type, data }
    }))

    // Send to service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          registration.active.postMessage({ type: 'sync-status', data: { type, data } })
        }
      })
    }
  }

  // Clear old cache entries
  async cleanupCache(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) return

    const cutoff = new Date(Date.now() - maxAge).toISOString()
    
    const transaction = this.db.transaction(['cache'], 'readwrite')
    const store = transaction.objectStore('cache')
    const index = store.index('timestamp')
    const request = index.openCursor(IDBKeyRange.upperBound(cutoff))

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }
  }
}

// Export singleton instance
export const offlineSync = new OfflineSyncManager()

// React hooks for components
export function useOfflineSync() {
  const [status, setStatus] = React.useState(offlineSync.getSyncStatus())
  const [conflicts, setConflicts] = React.useState<Array<{ action_id: string; client_data: Record<string, unknown>; server_data: Record<string, unknown>; timestamp: string }>>([])

  React.useEffect(() => {
    const updateStatus = () => setStatus(offlineSync.getSyncStatus())
    const loadConflicts = async () => setConflicts(await offlineSync.getConflicts())

    const handleSyncEvent = (event: CustomEvent) => {
      updateStatus()
      if (event.detail.type === 'conflict-detected') {
        loadConflicts()
      }
    }

    updateStatus()
    loadConflicts()

    window.addEventListener('offline-sync', handleSyncEvent as EventListener)
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)

    const interval = setInterval(updateStatus, 5000)

    return () => {
      window.removeEventListener('offline-sync', handleSyncEvent as EventListener)
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
      clearInterval(interval)
    }
  }, [])

  const addAction = (type: OfflineAction['type'], resource: string, data: Record<string, unknown>, priority?: OfflineAction['priority']) => {
    return offlineSync.addAction(type, resource, data, priority)
  }

  const resolveConflict = (resolution: ConflictResolution) => {
    return offlineSync.resolveConflict(resolution)
  }

  const triggerSync = () => {
    return offlineSync.triggerSync()
  }

  const getCachedData = (resource: string, id?: string) => {
    return offlineSync.getCachedData(resource, id)
  }

  return {
    status,
    conflicts,
    addAction,
    resolveConflict,
    triggerSync,
    getCachedData
  }
}