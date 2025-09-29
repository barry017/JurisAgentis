'use client'

import { useState, useEffect } from 'react'
import { 
  StopIcon,
  ClockIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { 
  PlayIcon as PlaySolidIcon,
  PauseIcon as PauseSolidIcon 
} from '@heroicons/react/24/solid'

interface TimeEntry {
  id: string
  case_id: string
  case_name: string
  client_id: string
  client_name: string
  description: string
  start_time: string
  end_time?: string
  duration?: number // in minutes
  hourly_rate: number
  billable: boolean
  status: 'running' | 'stopped' | 'invoiced'
  created_at: string
  updated_at: string
  tags: string[]
  location?: {
    latitude: number
    longitude: number
    address: string
  }
}

interface QuickTimer {
  id: string
  name: string
  case_name: string
  client_name: string
  case_id: string
  client_id: string
  description: string
  hourly_rate: number
  color: string
}

interface DayStats {
  date: string
  total_hours: number
  billable_hours: number
  revenue: number
  entries: number
}

export default function MobileTimeTracking() {
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [quickTimers, setQuickTimers] = useState<QuickTimer[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'entries'>('today')

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load data on mount
  useEffect(() => {
    loadTimeEntries()
    loadQuickTimers()
    loadActiveEntry()
  }, [])

  // Auto-save active entry
  useEffect(() => {
    if (activeEntry) {
      localStorage.setItem('active-time-entry', JSON.stringify(activeEntry))
    } else {
      localStorage.removeItem('active-time-entry')
    }
  }, [activeEntry])

  const loadTimeEntries = () => {
    const stored = localStorage.getItem('time-entries')
    if (stored) {
      try {
        setTimeEntries(JSON.parse(stored))
      } catch (error) {
        console.error('Failed to load time entries:', error)
      }
    }
  }

  const loadQuickTimers = () => {
    const defaultTimers: QuickTimer[] = [
      {
        id: '1',
        name: 'Research',
        case_name: 'General',
        client_name: 'Internal',
        case_id: 'general',
        client_id: 'internal',
        description: 'Legal research',
        hourly_rate: 350,
        color: 'bg-blue-500'
      },
      {
        id: '2',
        name: 'Client Call',
        case_name: 'Smith vs. Smith',
        client_name: 'John Smith',
        case_id: 'case1',
        client_id: 'client1',
        description: 'Client consultation',
        hourly_rate: 450,
        color: 'bg-green-500'
      },
      {
        id: '3',
        name: 'Document Review',
        case_name: 'TechStartup Inc.',
        client_name: 'TechStartup Inc.',
        case_id: 'case2',
        client_id: 'client2',
        description: 'Contract review',
        hourly_rate: 400,
        color: 'bg-purple-500'
      },
      {
        id: '4',
        name: 'Court Prep',
        case_name: 'Estate - Williams',
        client_name: 'Mary Williams',
        case_id: 'case3',
        client_id: 'client3',
        description: 'Court preparation',
        hourly_rate: 500,
        color: 'bg-orange-500'
      }
    ]

    const stored = localStorage.getItem('quick-timers')
    if (stored) {
      try {
        setQuickTimers(JSON.parse(stored))
      } catch {
        setQuickTimers(defaultTimers)
      }
    } else {
      setQuickTimers(defaultTimers)
    }
  }

  const loadActiveEntry = () => {
    const stored = localStorage.getItem('active-time-entry')
    if (stored) {
      try {
        const entry = JSON.parse(stored)
        if (entry.status === 'running') {
          setActiveEntry(entry)
        }
      } catch (error) {
        console.error('Failed to load active entry:', error)
      }
    }
  }

  const saveTimeEntries = (entries: TimeEntry[]) => {
    try {
      localStorage.setItem('time-entries', JSON.stringify(entries))
      setTimeEntries(entries)
    } catch (error) {
      console.error('Failed to save time entries:', error)
    }
  }

  const startTimer = (timer: QuickTimer) => {
    if (activeEntry) {
      stopTimer()
    }

    const entry: TimeEntry = {
      id: Date.now().toString(),
      case_id: timer.case_id,
      case_name: timer.case_name,
      client_id: timer.client_id,
      client_name: timer.client_name,
      description: timer.description,
      start_time: new Date().toISOString(),
      hourly_rate: timer.hourly_rate,
      billable: true,
      status: 'running',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tags: []
    }

    setActiveEntry(entry)

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }

    // Get location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const updatedEntry = {
          ...entry,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            address: 'Current location' // In reality, reverse geocode this
          }
        }
        setActiveEntry(updatedEntry)
      })
    }
  }

  const pauseTimer = () => {
    if (!activeEntry) return

    const updatedEntry = {
      ...activeEntry,
      status: 'paused' as const,
      updated_at: new Date().toISOString()
    }

    setActiveEntry(updatedEntry)

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50, 50])
    }
  }

  const resumeTimer = () => {
    if (!activeEntry) return

    const updatedEntry = {
      ...activeEntry,
      status: 'running' as const,
      updated_at: new Date().toISOString()
    }

    setActiveEntry(updatedEntry)

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }
  }

  const stopTimer = () => {
    if (!activeEntry) return

    const duration = calculateDuration(activeEntry.start_time, new Date().toISOString())
    const completedEntry: TimeEntry = {
      ...activeEntry,
      end_time: new Date().toISOString(),
      duration,
      status: 'stopped',
      updated_at: new Date().toISOString()
    }

    const updatedEntries = [completedEntry, ...timeEntries]
    saveTimeEntries(updatedEntries)
    setActiveEntry(null)

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100])
    }
  }

  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
  }

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getActiveEntryDuration = (): string => {
    if (!activeEntry) return '0m'
    
    const now = activeEntry.status === 'running' ? new Date() : new Date(activeEntry.updated_at)
    const duration = calculateDuration(activeEntry.start_time, now.toISOString())
    return formatDuration(duration)
  }

  const calculateRevenue = (duration: number, rate: number): number => {
    return (duration / 60) * rate
  }

  const getTodayStats = (): DayStats => {
    const today = new Date().toISOString().split('T')[0]
    const todayEntries = timeEntries.filter(entry => 
      entry.created_at.split('T')[0] === today
    )

    const totalMinutes = todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const billableMinutes = todayEntries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + (entry.duration || 0), 0)
    
    const revenue = todayEntries
      .filter(entry => entry.billable)
      .reduce((sum, entry) => sum + calculateRevenue(entry.duration || 0, entry.hourly_rate), 0)

    return {
      date: today,
      total_hours: totalMinutes / 60,
      billable_hours: billableMinutes / 60,
      revenue,
      entries: todayEntries.length
    }
  }

  const getWeekStats = (): DayStats[] => {
    const today = new Date()
    const weekStats: DayStats[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayEntries = timeEntries.filter(entry => 
        entry.created_at.split('T')[0] === dateStr
      )

      const totalMinutes = dayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
      const billableMinutes = dayEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + (entry.duration || 0), 0)
      
      const revenue = dayEntries
        .filter(entry => entry.billable)
        .reduce((sum, entry) => sum + calculateRevenue(entry.duration || 0, entry.hourly_rate), 0)

      weekStats.push({
        date: dateStr,
        total_hours: totalMinutes / 60,
        billable_hours: billableMinutes / 60,
        revenue,
        entries: dayEntries.length
      })
    }

    return weekStats
  }

  const deleteEntry = (entryId: string) => {
    const updatedEntries = timeEntries.filter(entry => entry.id !== entryId)
    saveTimeEntries(updatedEntries)
  }

  const todayStats = getTodayStats()
  const weekStats = getWeekStats()
  const weekTotal = weekStats.reduce((sum, day) => sum + day.billable_hours, 0)
  const weekRevenue = weekStats.reduce((sum, day) => sum + day.revenue, 0)

  const tabs = [
    { id: 'today', name: 'Today', icon: ClockIcon },
    { id: 'week', name: 'Week', icon: ChartBarIcon },
    { id: 'entries', name: 'Entries', icon: DocumentTextIcon }
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Time Tracking</h1>
              <p className="text-sm text-gray-500">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2 transition-colors">
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Active Timer */}
      {activeEntry && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white m-4 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                activeEntry.status === 'running' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
              }`}></div>
              <span className="font-medium">
                {activeEntry.status === 'running' ? 'Running' : 'Paused'}
              </span>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-mono font-bold">
                {getActiveEntryDuration()}
              </div>
              <div className="text-sm opacity-90">
                ${Math.round(calculateRevenue(
                  calculateDuration(activeEntry.start_time, new Date().toISOString()),
                  activeEntry.hourly_rate
                ))}
              </div>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">{activeEntry.case_name}</h3>
            <p className="text-sm opacity-90">{activeEntry.client_name}</p>
            <p className="text-sm opacity-75">{activeEntry.description}</p>
          </div>

          <div className="flex space-x-3">
            {activeEntry.status === 'running' ? (
              <button
                onClick={pauseTimer}
                className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg py-3 flex items-center justify-center space-x-2 transition-colors"
              >
                <PauseSolidIcon className="h-5 w-5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={resumeTimer}
                className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg py-3 flex items-center justify-center space-x-2 transition-colors"
              >
                <PlaySolidIcon className="h-5 w-5" />
                <span>Resume</span>
              </button>
            )}
            
            <button
              onClick={stopTimer}
              className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg py-3 flex items-center justify-center space-x-2 transition-colors"
            >
              <StopIcon className="h-5 w-5" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Timers */}
      {!activeEntry && (
        <div className="p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Start</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickTimers.map((timer) => (
              <button
                key={timer.id}
                onClick={() => startTimer(timer)}
                className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 text-left hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <div className={`${timer.color} rounded-lg p-2`}>
                    <PlaySolidIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{timer.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-gray-600 truncate">{timer.case_name}</p>
                <p className="text-xs text-gray-500 truncate">{timer.client_name}</p>
                <div className="mt-2 text-xs text-indigo-600 font-medium">
                  ${timer.hourly_rate}/hr
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'today' | 'week' | 'entries')}
                className={`flex-1 py-3 px-1 text-center border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-5 w-5 mx-auto mb-1" />
                {tab.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'today' && (
          <div className="space-y-4">
            {/* Today Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <ClockIcon className="h-6 w-6 text-blue-500" />
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {todayStats.billable_hours.toFixed(1)}h
                    </div>
                    <div className="text-sm text-gray-500">Billable</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-500" />
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      ${Math.round(todayStats.revenue)}
                    </div>
                    <div className="text-sm text-gray-500">Revenue</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Entries */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Today&apos;s Entries</h3>
              <div className="space-y-3">
                {timeEntries
                  .filter(entry => entry.created_at.split('T')[0] === new Date().toISOString().split('T')[0])
                  .map((entry) => (
                    <div key={entry.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{entry.case_name}</h4>
                          <p className="text-sm text-gray-600">{entry.client_name}</p>
                          <p className="text-sm text-gray-500">{entry.description}</p>
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>{new Date(entry.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {entry.end_time && (
                              <>
                                <span>-</span>
                                <span>{new Date(entry.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </>
                            )}
                            <span className={`px-2 py-1 rounded-full ${
                              entry.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {entry.billable ? 'Billable' : 'Non-billable'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right ml-4">
                          <div className="font-medium text-gray-900">
                            {entry.duration ? formatDuration(entry.duration) : 'Running...'}
                          </div>
                          {entry.duration && entry.billable && (
                            <div className="text-sm text-green-600">
                              ${Math.round(calculateRevenue(entry.duration, entry.hourly_rate))}
                            </div>
                          )}
                          <div className="flex space-x-1 mt-2">
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'week' && (
          <div className="space-y-4">
            {/* Week Summary */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">This Week</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{weekTotal.toFixed(1)}h</div>
                  <div className="text-sm text-gray-500">Total Billable</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">${Math.round(weekRevenue)}</div>
                  <div className="text-sm text-gray-500">Total Revenue</div>
                </div>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Daily Breakdown</h3>
              <div className="space-y-3">
                {weekStats.map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{day.billable_hours.toFixed(1)}h</div>
                      <div className="text-sm text-gray-500">${Math.round(day.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entries' && (
          <div className="space-y-3">
            {timeEntries.length > 0 ? (
              timeEntries.map((entry) => (
                <div key={entry.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{entry.case_name}</h4>
                      <p className="text-sm text-gray-600">{entry.client_name}</p>
                      <p className="text-sm text-gray-500">{entry.description}</p>
                      
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-full ${
                          entry.billable ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.billable ? 'Billable' : 'Non-billable'}
                        </span>
                        <span className={`px-2 py-1 rounded-full ${
                          entry.status === 'invoiced' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {entry.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="font-medium text-gray-900">
                        {entry.duration ? formatDuration(entry.duration) : 'Running...'}
                      </div>
                      {entry.duration && entry.billable && (
                        <div className="text-sm text-green-600">
                          ${Math.round(calculateRevenue(entry.duration, entry.hourly_rate))}
                        </div>
                      )}
                      <div className="flex space-x-1 mt-2">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No time entries yet</p>
                <p className="text-sm text-gray-400">Start tracking your time to see entries here</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}