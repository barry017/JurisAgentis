'use client'

import { useState, useEffect } from 'react'
import { SwipeableCard, PullToRefresh, TouchButton, TouchOptimizedStyles } from '@/app/components/TouchGestures'
import { 
  BellIcon,
  ClockIcon,
  DocumentTextIcon,
  UserGroupIcon,
  CalendarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  BarsArrowUpIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import { 
  BellIcon as BellSolidIcon,
  ClockIcon as ClockSolidIcon 
} from '@heroicons/react/24/solid'

interface QuickStat {
  label: string
  value: string | number
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
}

interface QuickAction {
  id: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
  href: string
}

interface RecentActivity {
  id: string
  type: 'case' | 'client' | 'document' | 'deadline'
  title: string
  subtitle: string
  time: string
  urgent?: boolean
}

interface TimeEntry {
  id: string
  case: string
  client: string
  description: string
  startTime: string
  duration?: number
  isRunning: boolean
}

export default function MobileDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null)
  const [notifications] = useState(3)
  const [_isRefreshing] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Load active time entry from localStorage
    const saved = localStorage.getItem('active-time-entry')
    if (saved) {
      try {
        setActiveTimeEntry(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load active time entry:', error)
      }
    }
  }, [])

  // Refresh dashboard data
  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update last refreshed time
    setCurrentTime(new Date())
    
    setIsRefreshing(false)
  }

  const quickStats: QuickStat[] = [
    {
      label: 'Active Cases',
      value: 12,
      change: '+2 this week',
      trend: 'up',
      icon: DocumentTextIcon,
      color: 'bg-blue-500'
    },
    {
      label: 'Due Today',
      value: 5,
      change: '3 completed',
      trend: 'neutral',
      icon: ClockIcon,
      color: 'bg-orange-500'
    },
    {
      label: 'New Clients',
      value: 3,
      change: '+1 this week',
      trend: 'up',
      icon: UserGroupIcon,
      color: 'bg-green-500'
    },
    {
      label: 'Hours Today',
      value: '6.5h',
      change: 'Target: 8h',
      trend: 'neutral',
      icon: ClockSolidIcon,
      color: 'bg-purple-500'
    }
  ]

  const quickActions: QuickAction[] = [
    {
      id: 'new-case',
      label: 'New Case',
      icon: PlusIcon,
      color: 'bg-blue-500',
      href: '/cases/new'
    },
    {
      id: 'scan-doc',
      label: 'Scan Doc',
      icon: DocumentTextIcon,
      color: 'bg-green-500',
      href: '/documents/scan'
    },
    {
      id: 'call-client',
      label: 'Call Client',
      icon: PhoneIcon,
      color: 'bg-orange-500',
      href: '/clients'
    },
    {
      id: 'quick-note',
      label: 'Quick Note',
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-purple-500',
      href: '/notes/new'
    }
  ]

  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'deadline',
      title: 'Motion Filing Due',
      subtitle: 'Smith vs. Smith',
      time: '2 hours',
      urgent: true
    },
    {
      id: '2',
      type: 'client',
      title: 'New client inquiry',
      subtitle: 'John Anderson - Corporate Law',
      time: '1 hour'
    },
    {
      id: '3',
      type: 'document',
      title: 'Contract review completed',
      subtitle: 'TechStartup Inc.',
      time: '3 hours'
    },
    {
      id: '4',
      type: 'case',
      title: 'Case status updated',
      subtitle: 'Estate Planning - Williams',
      time: '5 hours'
    }
  ]

  const startTimer = (caseInfo?: { case: string; client: string; description: string }) => {
    const entry: TimeEntry = {
      id: Date.now().toString(),
      case: caseInfo?.case || 'General',
      client: caseInfo?.client || 'Internal',
      description: caseInfo?.description || 'Time tracking',
      startTime: new Date().toISOString(),
      isRunning: true
    }
    
    setActiveTimeEntry(entry)
    localStorage.setItem('active-time-entry', JSON.stringify(entry))
  }

  const stopTimer = () => {
    if (activeTimeEntry) {
      const duration = (new Date().getTime() - new Date(activeTimeEntry.startTime).getTime()) / (1000 * 60) // minutes
      const completedEntry = {
        ...activeTimeEntry,
        duration,
        isRunning: false
      }
      
      // Save to completed entries
      const completedEntries = JSON.parse(localStorage.getItem('completed-time-entries') || '[]')
      completedEntries.unshift(completedEntry)
      localStorage.setItem('completed-time-entries', JSON.stringify(completedEntries))
      
      // Clear active entry
      setActiveTimeEntry(null)
      localStorage.removeItem('active-time-entry')
    }
  }

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime)
    const now = new Date()
    const diff = now.getTime() - start.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`
    }
    return `${minutes}m`
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deadline': return ExclamationTriangleIcon
      case 'client': return UserGroupIcon
      case 'document': return DocumentTextIcon
      case 'case': return CheckCircleIcon
      default: return BellIcon
    }
  }

  const getActivityColor = (type: string, urgent?: boolean) => {
    if (urgent) return 'text-red-600 bg-red-50'
    
    switch (type) {
      case 'deadline': return 'text-orange-600 bg-orange-50'
      case 'client': return 'text-blue-600 bg-blue-50'
      case 'document': return 'text-green-600 bg-green-50'
      case 'case': return 'text-purple-600 bg-purple-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <>
      <TouchOptimizedStyles />
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="min-h-screen bg-gray-50 pb-20 no-select">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="relative p-2">
                <MagnifyingGlassIcon className="h-6 w-6 text-gray-600" />
              </button>
              
              <button className="relative p-2">
                {notifications > 0 ? (
                  <>
                    <BellSolidIcon className="h-6 w-6 text-indigo-600" />
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {notifications}
                    </span>
                  </>
                ) : (
                  <BellIcon className="h-6 w-6 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Active Timer */}
        {activeTimeEntry && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Timer Running</span>
                </div>
                <p className="font-semibold">{activeTimeEntry.case}</p>
                <p className="text-sm opacity-90">{activeTimeEntry.client}</p>
                <p className="text-lg font-mono mt-1">
                  {formatDuration(activeTimeEntry.startTime)}
                </p>
              </div>
              
              <button
                onClick={stopTimer}
                className="bg-white/20 hover:bg-white/30 rounded-full p-3 transition-colors"
              >
                <PauseIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <div className={`${stat.color} rounded-lg p-2`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs font-medium text-gray-600">{stat.label}</p>
                  <p className="text-xs text-gray-500">{stat.change}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            <button className="text-indigo-600 text-sm font-medium">
              Customize
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <TouchButton
                  key={action.id}
                  variant="secondary"
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 w-full text-left"
                  onClick={() => {
                    if (action.id === 'new-case') {
                      // Special handling for quick timer start
                      startTimer()
                    } else {
                      window.location.href = action.href
                    }
                  }}
                >
                  <div className={`${action.color} rounded-lg p-3 mb-2 mx-auto w-fit`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-900 text-center">
                    {action.label}
                  </p>
                </TouchButton>
              )
            })}
          </div>
        </div>

        {/* Time Tracking Section */}
        {!activeTimeEntry && (
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Time Tracking</h3>
              <ClockIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            <button
              onClick={() => startTimer()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 px-4 font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <PlayIcon className="h-5 w-5" />
              <span>Start Timer</span>
            </button>
            
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button
                onClick={() => startTimer({ 
                  case: 'Research', 
                  client: 'General', 
                  description: 'Legal research' 
                })}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
              >
                Research
              </button>
              <button
                onClick={() => startTimer({ 
                  case: 'Admin', 
                  client: 'Internal', 
                  description: 'Administrative work' 
                })}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 px-3 text-sm font-medium transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button className="text-indigo-600 text-sm font-medium flex items-center space-x-1">
              <span>View All</span>
              <BarsArrowUpIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const colorClass = getActivityColor(activity.type, activity.urgent)
              
              return (
                <SwipeableCard
                  key={activity.id}
                  leftAction={{
                    icon: CheckCircleIcon,
                    color: 'bg-green-500',
                    label: 'Complete'
                  }}
                  rightAction={{
                    icon: ExclamationTriangleIcon,
                    color: 'bg-red-500',
                    label: 'Urgent'
                  }}
                  onSwipeLeft={() => {
                    console.log('Mark as complete:', activity.id)
                    // Handle completion
                  }}
                  onSwipeRight={() => {
                    console.log('Mark as urgent:', activity.id)
                    // Handle urgent marking
                  }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <div className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className={`rounded-full p-2 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">{activity.time} ago</p>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.subtitle}
                      </p>
                    </div>
                  </div>
                  </div>
                </SwipeableCard>
              )
            })}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
            <button className="text-indigo-600 text-sm font-medium">
              View Calendar
            </button>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">Motion Filing Due</p>
                  <p className="text-sm text-red-700">Smith vs. Smith - 2:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-blue-900">Client Meeting</p>
                  <p className="text-sm text-blue-700">TechStartup Inc. - 4:00 PM</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <DocumentTextIcon className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Document Review</p>
                  <p className="text-sm text-green-700">Contract Analysis - 5:30 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

          {/* Bottom spacing for mobile navigation */}
          <div className="h-20"></div>
        </div>
      </PullToRefresh>
    </>
  )
}