/**
 * Real-time Notifications Center
 * 
 * Central hub for all notifications with real-time updates and smart categorization
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BellIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftIcon,
  BriefcaseIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  BoltIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline'

interface Notification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success' | 'deadline' | 'reminder' | 'message' | 'system'
  category: 'client' | 'matter' | 'document' | 'calendar' | 'billing' | 'workflow' | 'system'
  title: string
  message: string
  timestamp: string
  isRead: boolean
  isArchived: boolean
  priority: 'low' | 'normal' | 'high' | 'urgent'
  actionUrl?: string
  actionLabel?: string
  metadata: {
    clientId?: string
    clientName?: string
    matterId?: string
    matterTitle?: string
    documentId?: string
    documentTitle?: string
    invoiceId?: string
    eventId?: string
    workflowId?: string
    userId?: string
    userName?: string
    [key: string]: any
  }
  expiresAt?: string
  relatedNotifications?: string[]
  requiresAction: boolean
  canDismiss: boolean
  soundEnabled: boolean
}

// Mock notifications with rich data
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'deadline',
    category: 'matter',
    title: 'Document Review Deadline Tomorrow',
    message: 'Smith Family Trust Agreement (v3.2) requires client review by tomorrow at 5:00 PM.',
    timestamp: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
    isRead: false,
    isArchived: false,
    priority: 'urgent',
    actionUrl: '/documents/1',
    actionLabel: 'Review Document',
    metadata: {
      clientId: '1',
      clientName: 'John Smith',
      matterId: '1',
      matterTitle: 'Smith Family Estate Planning',
      documentId: '1',
      documentTitle: 'Smith Family Trust Agreement v3.2'
    },
    expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    requiresAction: true,
    canDismiss: false,
    soundEnabled: true
  },
  {
    id: '2',
    type: 'message',
    category: 'client',
    title: 'New Message from John Smith',
    message: 'Client has responded with questions about the trust funding process and asset transfers.',
    timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    isRead: false,
    isArchived: false,
    priority: 'high',
    actionUrl: '/client-portal/messages',
    actionLabel: 'View Message',
    metadata: {
      clientId: '1',
      clientName: 'John Smith',
      messageId: '123'
    },
    requiresAction: true,
    canDismiss: true,
    soundEnabled: true
  },
  {
    id: '3',
    type: 'success',
    category: 'workflow',
    title: 'Workflow Completed Successfully',
    message: 'New Client Onboarding workflow for Johnson Trust Services LLC has completed all steps.',
    timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    isRead: false,
    isArchived: false,
    priority: 'normal',
    actionUrl: '/workflows/executions/exec-1',
    actionLabel: 'View Results',
    metadata: {
      clientId: '2',
      clientName: 'Johnson Trust Services LLC',
      workflowId: '1',
      workflowName: 'New Client Onboarding'
    },
    requiresAction: false,
    canDismiss: true,
    soundEnabled: false
  },
  {
    id: '4',
    type: 'warning',
    category: 'billing',
    title: 'Payment Overdue',
    message: 'Invoice #INV-2025-001 for Smith Family Estate Planning is now 5 days overdue.',
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    isRead: true,
    isArchived: false,
    priority: 'high',
    actionUrl: '/billing/invoice-1',
    actionLabel: 'View Invoice',
    metadata: {
      invoiceId: '1',
      invoiceNumber: 'INV-2025-001',
      clientId: '1',
      clientName: 'John Smith',
      amount: 2500,
      daysOverdue: 5
    },
    requiresAction: true,
    canDismiss: true,
    soundEnabled: true
  },
  {
    id: '5',
    type: 'reminder',
    category: 'calendar',
    title: 'Appointment Reminder',
    message: 'Trust signing appointment with John Smith is scheduled for tomorrow at 2:00 PM.',
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    isRead: true,
    isArchived: false,
    priority: 'normal',
    actionUrl: '/calendar/event-1',
    actionLabel: 'View Event',
    metadata: {
      eventId: '1',
      clientId: '1',
      clientName: 'John Smith',
      eventDate: new Date(Date.now() + 86400000).toISOString(),
      location: 'Conference Room B'
    },
    requiresAction: false,
    canDismiss: true,
    soundEnabled: true
  },
  {
    id: '6',
    type: 'info',
    category: 'document',
    title: 'Document Version Updated',
    message: 'Smith Family Trust Agreement has been updated to version 3.2 with client feedback incorporated.',
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    isRead: true,
    isArchived: false,
    priority: 'normal',
    actionUrl: '/documents/1',
    actionLabel: 'View Changes',
    metadata: {
      documentId: '1',
      documentTitle: 'Smith Family Trust Agreement',
      version: '3.2',
      previousVersion: '3.1',
      clientId: '1',
      clientName: 'John Smith'
    },
    requiresAction: false,
    canDismiss: true,
    soundEnabled: false
  },
  {
    id: '7',
    type: 'system',
    category: 'system',
    title: 'System Maintenance Scheduled',
    message: 'Planned maintenance window on Sunday, January 21st from 2:00 AM - 4:00 AM EST.',
    timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
    isRead: false,
    isArchived: false,
    priority: 'low',
    metadata: {
      maintenanceStart: '2025-01-21T07:00:00Z',
      maintenanceEnd: '2025-01-21T09:00:00Z',
      affectedServices: ['Document Storage', 'Email Notifications']
    },
    requiresAction: false,
    canDismiss: true,
    soundEnabled: false
  },
  {
    id: '8',
    type: 'error',
    category: 'workflow',
    title: 'Workflow Step Failed',
    message: 'Document review automation failed due to missing client email address.',
    timestamp: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
    isRead: false,
    isArchived: false,
    priority: 'high',
    actionUrl: '/workflows/executions/exec-2',
    actionLabel: 'Fix Issue',
    metadata: {
      workflowId: '2',
      workflowName: 'Document Review Automation',
      errorCode: 'MISSING_EMAIL',
      clientId: '3',
      clientName: 'Williams Family'
    },
    requiresAction: true,
    canDismiss: false,
    soundEnabled: true
  }
]

const notificationSettings = {
  soundEnabled: true,
  desktopNotifications: true,
  emailDigest: true,
  categories: {
    client: { enabled: true, sound: true, desktop: true },
    matter: { enabled: true, sound: true, desktop: true },
    document: { enabled: true, sound: false, desktop: true },
    calendar: { enabled: true, sound: true, desktop: true },
    billing: { enabled: true, sound: true, desktop: true },
    workflow: { enabled: true, sound: false, desktop: false },
    system: { enabled: true, sound: false, desktop: false }
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>(mockNotifications)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState(notificationSettings)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Filter notifications
  useEffect(() => {
    let filtered = notifications

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory)
    }

    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority)
    }

    if (showUnreadOnly) {
      filtered = filtered.filter(n => !n.isRead)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(query) ||
        n.message.toLowerCase().includes(query) ||
        Object.values(n.metadata).some(value =>
          String(value).toLowerCase().includes(query)
        )
      )
    }

    filtered = filtered.filter(n => !n.isArchived)

    setFilteredNotifications(filtered)
  }, [notifications, selectedCategory, selectedPriority, showUnreadOnly, searchQuery])

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 10 seconds
        const newNotification: Notification = {
          id: `notification-${Date.now()}`,
          type: ['info', 'success', 'warning'][Math.floor(Math.random() * 3)] as any,
          category: ['client', 'matter', 'document', 'calendar'][Math.floor(Math.random() * 4)] as any,
          title: 'New Activity Detected',
          message: `Real-time update: ${Math.random() > 0.5 ? 'Document updated' : 'Client action required'}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          isArchived: false,
          priority: 'normal',
          metadata: {},
          requiresAction: Math.random() > 0.5,
          canDismiss: true,
          soundEnabled: true
        }
        
        setNotifications(prev => [newNotification, ...prev])
        
        // Play notification sound
        if (settings.soundEnabled && audioRef.current) {
          audioRef.current.play().catch(e => console.log('Audio play failed:', e))
        }

        // Show desktop notification
        if (settings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(newNotification.title, {
            body: newNotification.message,
            icon: '/favicon.ico'
          })
        }
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [settings])

  // Request notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const getTypeIcon = (type: string) => {
    const icons = {
      info: InformationCircleIcon,
      warning: ExclamationTriangleIcon,
      error: XMarkIcon,
      success: CheckCircleIcon,
      deadline: ClockIcon,
      reminder: BellIcon,
      message: ChatBubbleLeftIcon,
      system: Cog6ToothIcon
    }
    return icons[type as keyof typeof icons] || InformationCircleIcon
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      client: UserIcon,
      matter: BriefcaseIcon,
      document: DocumentTextIcon,
      calendar: CalendarIcon,
      billing: CurrencyDollarIcon,
      workflow: BoltIcon,
      system: Cog6ToothIcon
    }
    return icons[category as keyof typeof icons] || InformationCircleIcon
  }

  const getTypeColor = (type: string, priority: string) => {
    const colors = {
      info: 'text-blue-600 bg-blue-100 border-blue-200',
      warning: 'text-yellow-600 bg-yellow-100 border-yellow-200',
      error: 'text-red-600 bg-red-100 border-red-200',
      success: 'text-green-600 bg-green-100 border-green-200',
      deadline: 'text-orange-600 bg-orange-100 border-orange-200',
      reminder: 'text-purple-600 bg-purple-100 border-purple-200',
      message: 'text-indigo-600 bg-indigo-100 border-indigo-200',
      system: 'text-gray-600 bg-gray-100 border-gray-200'
    }

    let baseColor = colors[type as keyof typeof colors] || colors.info

    if (priority === 'urgent') {
      baseColor = 'text-red-700 bg-red-200 border-red-300 animate-pulse'
    } else if (priority === 'high') {
      baseColor = baseColor.replace('100', '200').replace('600', '700')
    }

    return baseColor
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, isRead: true }))
    )
  }

  const handleArchive = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isArchived: true } : n)
    )
  }

  const handleBulkAction = (action: 'read' | 'archive' | 'delete') => {
    if (selectedNotifications.length === 0) return

    setNotifications(prev =>
      prev.map(n => {
        if (selectedNotifications.includes(n.id)) {
          switch (action) {
            case 'read':
              return { ...n, isRead: true }
            case 'archive':
              return { ...n, isArchived: true }
            case 'delete':
              return n
            default:
              return n
          }
        }
        return n
      }).filter(n => action !== 'delete' || !selectedNotifications.includes(n.id))
    )

    setSelectedNotifications([])
  }

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.isRead && !n.isArchived).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Audio element for notification sounds */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification-sound.mp3" type="audio/mpeg" />
      </audio>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <div className="relative mr-3">
                  <BellIcon className="h-8 w-8 text-blue-600" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-bounce">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                Notifications Center
              </h1>
              <div className="flex items-center space-x-4 mt-2">
                <p className="text-gray-600">
                  Stay updated with real-time activity across your practice
                </p>
                {urgentCount > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 animate-pulse">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {urgentCount} Urgent
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Notification Settings"
              >
                <Cog6ToothIcon className="h-6 w-6" />
              </button>
              
              <button
                onClick={handleMarkAllAsRead}
                className="btn-secondary flex items-center"
              >
                <CheckIcon className="h-5 w-5 mr-2" />
                Mark All Read
              </button>

              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                  className={`p-2 rounded-md transition-colors ${
                    settings.soundEnabled 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title={`Sound ${settings.soundEnabled ? 'On' : 'Off'}`}
                >
                  {settings.soundEnabled ? (
                    <SpeakerWaveIcon className="h-4 w-4" />
                  ) : (
                    <SpeakerXMarkIcon className="h-4 w-4" />
                  )}
                </button>
                
                <button
                  className="p-2 text-gray-600 hover:text-gray-800 rounded-md transition-colors"
                  title="Refresh"
                  onClick={() => window.location.reload()}
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FunnelIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Filters
                </h3>
                <button
                  onClick={() => {
                    setSelectedCategory('all')
                    setSelectedPriority('all')
                    setShowUnreadOnly(false)
                    setSearchQuery('')
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search notifications..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Quick Filters */}
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={(e) => setShowUnreadOnly(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Show unread only ({notifications.filter(n => !n.isRead && !n.isArchived).length})
                  </span>
                </label>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Category</h4>
                <div className="space-y-2">
                  {[
                    { key: 'all', label: 'All Categories', count: notifications.length },
                    { key: 'client', label: 'Clients', count: notifications.filter(n => n.category === 'client').length },
                    { key: 'matter', label: 'Matters', count: notifications.filter(n => n.category === 'matter').length },
                    { key: 'document', label: 'Documents', count: notifications.filter(n => n.category === 'document').length },
                    { key: 'calendar', label: 'Calendar', count: notifications.filter(n => n.category === 'calendar').length },
                    { key: 'billing', label: 'Billing', count: notifications.filter(n => n.category === 'billing').length },
                    { key: 'workflow', label: 'Workflows', count: notifications.filter(n => n.category === 'workflow').length },
                    { key: 'system', label: 'System', count: notifications.filter(n => n.category === 'system').length }
                  ].map(category => (
                    <button
                      key={category.key}
                      onClick={() => setSelectedCategory(category.key)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === category.key
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category.label}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          selectedCategory === category.key
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-gray-200 text-gray-600'
                        }`}>
                          {category.count}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Priority</h4>
                <div className="space-y-2">
                  {[
                    { key: 'all', label: 'All Priorities' },
                    { key: 'urgent', label: 'Urgent' },
                    { key: 'high', label: 'High' },
                    { key: 'normal', label: 'Normal' },
                    { key: 'low', label: 'Low' }
                  ].map(priority => (
                    <button
                      key={priority.key}
                      onClick={() => setSelectedPriority(priority.key)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedPriority === priority.key
                          ? 'bg-blue-100 text-blue-800 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {priority.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="lg:w-3/4">
            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">
                    {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleBulkAction('read')}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Mark Read
                    </button>
                    <button
                      onClick={() => handleBulkAction('archive')}
                      className="text-sm bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleBulkAction('delete')}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setSelectedNotifications([])}
                      className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="space-y-4">
              {filteredNotifications.map(notification => {
                const TypeIcon = getTypeIcon(notification.type)
                const CategoryIcon = getCategoryIcon(notification.category)
                const typeColor = getTypeColor(notification.type, notification.priority)

                return (
                  <div
                    key={notification.id}
                    className={`bg-white rounded-lg shadow border-l-4 transition-all hover:shadow-lg ${
                      !notification.isRead ? 'border-l-blue-500' : 'border-l-gray-300'
                    } ${notification.priority === 'urgent' ? 'ring-2 ring-red-200' : ''}`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4 flex-1 min-w-0">
                          {/* Selection Checkbox */}
                          <input
                            type="checkbox"
                            checked={selectedNotifications.includes(notification.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedNotifications(prev => [...prev, notification.id])
                              } else {
                                setSelectedNotifications(prev => prev.filter(id => id !== notification.id))
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                          />

                          {/* Type Icon */}
                          <div className={`p-2 rounded-lg ${typeColor}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className={`text-lg font-semibold ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                {notification.title}
                              </h3>
                              {!notification.isRead && (
                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                              )}
                              <CategoryIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-xs text-gray-500 uppercase tracking-wider">
                                {notification.category}
                              </span>
                            </div>

                            <p className="text-gray-600 mb-3 line-clamp-2">
                              {notification.message}
                            </p>

                            {/* Metadata */}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
                              <span className="flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              
                              {notification.metadata.clientName && (
                                <span className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                  <UserIcon className="h-3 w-3 mr-1" />
                                  {notification.metadata.clientName}
                                </span>
                              )}
                              
                              {notification.metadata.matterTitle && (
                                <span className="flex items-center bg-gray-100 px-2 py-1 rounded">
                                  <BriefcaseIcon className="h-3 w-3 mr-1" />
                                  {notification.metadata.matterTitle}
                                </span>
                              )}
                              
                              {notification.priority !== 'normal' && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  notification.priority === 'urgent' 
                                    ? 'bg-red-100 text-red-800'
                                    : notification.priority === 'high'
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {notification.priority.toUpperCase()}
                                </span>
                              )}
                              
                              {notification.expiresAt && (
                                <span className="text-orange-600">
                                  Expires: {new Date(notification.expiresAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center space-x-2">
                              {notification.actionUrl && (
                                <button
                                  onClick={() => router.push(notification.actionUrl!)}
                                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  {notification.actionLabel || 'View'}
                                </button>
                              )}
                              
                              {!notification.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  Mark as Read
                                </button>
                              )}
                              
                              {notification.canDismiss && (
                                <button
                                  onClick={() => handleArchive(notification.id)}
                                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                  Archive
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead ? (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Mark as Read"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <EyeSlashIcon className="h-4 w-4 text-gray-300" title="Read" />
                          )}
                          
                          {notification.canDismiss && (
                            <button
                              onClick={() => handleArchive(notification.id)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Archive"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Empty State */}
              {filteredNotifications.length === 0 && (
                <div className="text-center py-12">
                  <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchQuery ? 'No matching notifications' : 'All caught up!'}
                  </h3>
                  <p className="text-gray-600">
                    {searchQuery 
                      ? 'Try adjusting your search or filters'
                      : 'You have no new notifications at the moment.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}