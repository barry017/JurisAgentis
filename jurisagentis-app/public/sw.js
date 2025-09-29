// Service Worker for JurisAgentis PWA
const CACHE_NAME = 'jurisagentis-v1.0.0'
const RUNTIME_CACHE = 'jurisagentis-runtime'
const OFFLINE_CACHE = 'jurisagentis-offline'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/clients',
  '/cases',
  '/documents',
  '/calendar',
  '/offline',
  '/manifest.json',
  '/_next/static/css/app.css',
  '/_next/static/js/app.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/v1\/clients/,
  /^\/api\/v1\/cases/,
  /^\/api\/v1\/documents/,
  /^\/api\/v1\/calendar/
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      }),
      caches.open(OFFLINE_CACHE).then((cache) => {
        console.log('Setting up offline cache')
        return cache.put('/offline', new Response(OFFLINE_PAGE_HTML, {
          headers: { 'Content-Type': 'text/html' }
        }))
      })
    ])
  )
  
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== OFFLINE_CACHE) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      }),
      self.clients.claim()
    ])
  )
})

// Fetch event - handle requests with caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }

  // Handle different types of requests
  if (request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(request))
  } else if (request.destination === 'document') {
    event.respondWith(handleDocumentRequest(request))
  } else {
    event.respondWith(handleNavigationRequest(request))
  }
})

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful responses
      if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }
    
    throw new Error('Network response not ok')
  } catch (_error) {
    console.log('Network failed, trying cache:', request.url)
    
    // Fall back to cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/api/v1/auth') || 
        request.url.includes('/api/v1/user')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'offline',
        message: 'You are currently offline. Please check your connection.'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    throw error
  }
}

// Handle document requests with cache-first strategy
async function handleDocumentRequest(request) {
  const cache = await caches.open(RUNTIME_CACHE)
  
  // Try cache first for documents
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Fetch from network and cache
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (_error) {
    // Return offline document placeholder
    return new Response('Document unavailable offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}

// Handle navigation requests with cache-first strategy
async function handleNavigationRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      return networkResponse
    }
    throw new Error('Network response not ok')
  } catch (_error) {
    console.log('Network failed for navigation, trying cache:', request.url)
    
    // Try cache
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Try index.html for SPA routes
    const indexResponse = await cache.match('/')
    if (indexResponse) {
      return indexResponse
    }
    
    // Fall back to offline page
    const offlineCache = await caches.open(OFFLINE_CACHE)
    return offlineCache.match('/offline')
  }
}

// Background sync for offline data
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag)
  
  if (event.tag === 'background-sync-data') {
    event.waitUntil(syncOfflineData())
  } else if (event.tag === 'background-sync-time-entries') {
    event.waitUntil(syncTimeEntries())
  } else if (event.tag === 'background-sync-documents') {
    event.waitUntil(syncDocuments())
  }
})

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        // Remove successful action from offline storage
        await removeOfflineAction(action.id)
        
        // Notify clients of successful sync
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'sync-success',
              action: action.type,
              data: action.data
            })
          })
        })
      } catch (_error) {
        console.error('Failed to sync action:', action, error)
      }
    }
  } catch (_error) {
    console.error('Background sync failed:', error)
  }
}

// Sync time entries
async function syncTimeEntries() {
  try {
    const pendingEntries = await getPendingTimeEntries()
    
    for (const entry of pendingEntries) {
      try {
        const response = await fetch('/api/v1/time-entries', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': await getAuthToken()
          },
          body: JSON.stringify(entry)
        })
        
        if (response.ok) {
          await removePendingTimeEntry(entry.id)
        }
      } catch (_error) {
        console.error('Failed to sync time entry:', entry, error)
      }
    }
  } catch (_error) {
    console.error('Time entry sync failed:', error)
  }
}

// Sync documents
async function syncDocuments() {
  try {
    const pendingUploads = await getPendingDocumentUploads()
    
    for (const upload of pendingUploads) {
      try {
        const formData = new FormData()
        formData.append('file', upload.file)
        formData.append('metadata', JSON.stringify(upload.metadata))
        
        const response = await fetch('/api/v1/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': await getAuthToken()
          },
          body: formData
        })
        
        if (response.ok) {
          await removePendingDocumentUpload(upload.id)
        }
      } catch (_error) {
        console.error('Failed to sync document upload:', upload, error)
      }
    }
  } catch (_error) {
    console.error('Document sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.urgent || false,
    silent: false,
    vibrate: data.urgent ? [200, 100, 200] : [100],
    timestamp: Date.now()
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const { data } = event.notification
  let url = '/'
  
  // Route to appropriate page based on notification type
  if (data.type === 'case_update') {
    url = `/cases/${data.case_id}`
  } else if (data.type === 'deadline_reminder') {
    url = `/calendar?highlight=${data.deadline_id}`
  } else if (data.type === 'client_message') {
    url = `/clients/${data.client_id}/communications`
  } else if (data.type === 'document_shared') {
    url = `/documents/${data.document_id}`
  } else if (data.url) {
    url = data.url
  }
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    })
  )
})

// Helper functions for offline storage
async function getOfflineActions() {
  // In a real implementation, this would read from IndexedDB
  return []
}

async function removeOfflineAction(_id) {
  // Remove from IndexedDB
}

async function getPendingTimeEntries() {
  // Get from IndexedDB
  return []
}

async function removePendingTimeEntry(_id) {
  // Remove from IndexedDB
}

async function getPendingDocumentUploads() {
  // Get from IndexedDB
  return []
}

async function removePendingDocumentUpload(_id) {
  // Remove from IndexedDB
}

async function getAuthToken() {
  // Get auth token from storage
  return 'Bearer mock_token'
}

// Offline page HTML
const OFFLINE_PAGE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - JurisAgentis</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .container {
      max-width: 400px;
    }
    .icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 2rem;
      background: rgba(255,255,255,0.2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
    h1 { margin: 0 0 1rem; }
    p { opacity: 0.9; line-height: 1.6; }
    .retry-btn {
      background: rgba(255,255,255,0.2);
      color: white;
      border: 2px solid rgba(255,255,255,0.3);
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      margin-top: 2rem;
      font-size: 1rem;
    }
    .retry-btn:hover {
      background: rgba(255,255,255,0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📱</div>
    <h1>You're Offline</h1>
    <p>JurisAgentis is working in offline mode. Your data will sync when connection is restored.</p>
    <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>
`