/**
 * Calendar Page - Calendar view with event management for legal practice
 * 
 * Provides month/week/day views with legal-specific event types and scheduling
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  ScaleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  BellIcon,
  VideoCameraIcon,
  PhoneIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  event_type: 'client_meeting' | 'court_date' | 'deadline' | 'consultation' | 'deposition' | 'hearing' | 'conference' | 'review' | 'task' | 'other'
  event_category: 'client' | 'court' | 'deadline' | 'internal' | 'external' | 'administrative'
  start_datetime: string
  end_datetime?: string
  all_day: boolean
  timezone: string
  location?: string
  location_type?: 'office' | 'courthouse' | 'client_location' | 'virtual' | 'other'
  virtual_meeting_url?: string
  room_or_courtroom?: string
  matter_id?: string
  client_id?: string
  case_number?: string
  judge_name?: string
  court_name?: string
  hearing_type?: string
  deadline_type?: string
  is_hard_deadline: boolean
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'postponed' | 'tentative'
  confirmation_required: boolean
  assigned_attorney?: string
  assigned_paralegal?: string
  preparation_time_minutes: number
  travel_time_minutes: number
  estimated_duration_minutes?: number
  billable: boolean
  billable_rate?: number
  estimated_hours?: number
  reminder_enabled: boolean
  reminder_minutes?: number[]
  tags?: string[]
  matter?: {
    id: string
    matter_number: string
    title: string
    status: string
  }
  client?: {
    id: string
    first_name?: string
    last_name?: string
    business_name?: string
    client_type: 'individual' | 'business'
  }
  created_at: string
  updated_at: string
}

interface EventFormData {
  title: string
  description: string
  event_type: string
  event_category: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  all_day: boolean
  location: string
  location_type: string
  virtual_meeting_url: string
  matter_id: string
  client_id: string
  case_number: string
  judge_name: string
  court_name: string
  hearing_type: string
  deadline_type: string
  is_hard_deadline: boolean
  preparation_time_minutes: number
  travel_time_minutes: number
  estimated_duration_minutes: number
  billable: boolean
  billable_rate: number
  estimated_hours: number
  reminder_enabled: boolean
  reminder_minutes: number[]
  tags: string[]
  confirmation_required: boolean
}

type ViewMode = 'month' | 'week' | 'day'

export default function CalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'client' | 'court' | 'deadline' | 'internal'>('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Form state for creating/editing events
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    event_type: 'client_meeting',
    event_category: 'client',
    start_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_date: new Date().toISOString().split('T')[0],
    end_time: '10:00',
    all_day: false,
    location: '',
    location_type: 'office',
    virtual_meeting_url: '',
    matter_id: '',
    client_id: '',
    case_number: '',
    judge_name: '',
    court_name: '',
    hearing_type: '',
    deadline_type: '',
    is_hard_deadline: false,
    preparation_time_minutes: 30,
    travel_time_minutes: 0,
    estimated_duration_minutes: 60,
    billable: true,
    billable_rate: 350,
    estimated_hours: 1,
    reminder_enabled: true,
    reminder_minutes: [60, 15],
    tags: [],
    confirmation_required: false
  })

  useEffect(() => {
    loadEvents()
  }, [currentDate, viewMode])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on view mode
      let startDate: string
      let endDate: string
      
      if (viewMode === 'month') {
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        startDate = startOfMonth.toISOString().split('T')[0]
        endDate = endOfMonth.toISOString().split('T')[0]
      } else if (viewMode === 'week') {
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        startDate = startOfWeek.toISOString().split('T')[0]
        endDate = endOfWeek.toISOString().split('T')[0]
      } else {
        startDate = currentDate.toISOString().split('T')[0]
        endDate = startDate
      }
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        limit: '100'
      })
      
      if (filterBy !== 'all') {
        params.append('event_category', filterBy)
      }
      
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      
      const response = await fetch(`/api/calendar?${params}`, {
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEvents(data.data.events || [])
        }
      }
      
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEvent = async () => {
    try {
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        event_type: formData.event_type,
        event_category: formData.event_category,
        start_datetime: `${formData.start_date}T${formData.start_time}:00`,
        end_datetime: formData.all_day ? null : `${formData.end_date}T${formData.end_time}:00`,
        all_day: formData.all_day,
        timezone: 'America/New_York',
        location: formData.location.trim() || null,
        location_type: formData.location_type,
        virtual_meeting_url: formData.virtual_meeting_url.trim() || null,
        room_or_courtroom: formData.location.trim() || null,
        matter_id: formData.matter_id.trim() || null,
        client_id: formData.client_id.trim() || null,
        case_number: formData.case_number.trim() || null,
        judge_name: formData.judge_name.trim() || null,
        court_name: formData.court_name.trim() || null,
        hearing_type: formData.hearing_type.trim() || null,
        deadline_type: formData.deadline_type.trim() || null,
        is_hard_deadline: formData.is_hard_deadline,
        confirmation_required: formData.confirmation_required,
        preparation_time_minutes: formData.preparation_time_minutes,
        travel_time_minutes: formData.travel_time_minutes,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        billable: formData.billable,
        billable_rate: formData.billable ? formData.billable_rate : null,
        estimated_hours: formData.billable ? formData.estimated_hours : null,
        reminder_enabled: formData.reminder_enabled,
        reminder_minutes: formData.reminder_enabled ? formData.reminder_minutes : null,
        tags: formData.tags
      }
      
      const response = await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer mock-token-development`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setShowCreateModal(false)
          resetForm()
          loadEvents()
        }
      } else {
        alert('Error creating event. Please try again.')
      }
      
    } catch (error) {
      console.error('Error creating event:', error)
      alert('Error creating event. Please try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'client_meeting',
      event_category: 'client',
      start_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_date: new Date().toISOString().split('T')[0],
      end_time: '10:00',
      all_day: false,
      location: '',
      location_type: 'office',
      virtual_meeting_url: '',
      matter_id: '',
      client_id: '',
      case_number: '',
      judge_name: '',
      court_name: '',
      hearing_type: '',
      deadline_type: '',
      is_hard_deadline: false,
      preparation_time_minutes: 30,
      travel_time_minutes: 0,
      estimated_duration_minutes: 60,
      billable: true,
      billable_rate: 350,
      estimated_hours: 1,
      reminder_enabled: true,
      reminder_minutes: [60, 15],
      tags: [],
      confirmation_required: false
    })
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    
    if (viewMode === 'month') {
      newDate.setMonth(direction === 'prev' ? newDate.getMonth() - 1 : newDate.getMonth() + 1)
    } else if (viewMode === 'week') {
      newDate.setDate(direction === 'prev' ? newDate.getDate() - 7 : newDate.getDate() + 7)
    } else {
      newDate.setDate(direction === 'prev' ? newDate.getDate() - 1 : newDate.getDate() + 1)
    }
    
    setCurrentDate(newDate)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'court_date': return <ScaleIcon className="h-4 w-4" />
      case 'client_meeting': return <UserGroupIcon className="h-4 w-4" />
      case 'deadline': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'consultation': return <DocumentTextIcon className="h-4 w-4" />
      default: return <CalendarDaysIcon className="h-4 w-4" />
    }
  }

  const getEventTypeColor = (eventType: string, eventCategory: string) => {
    switch (eventCategory) {
      case 'court': return 'bg-red-100 text-red-800 border-red-200'
      case 'client': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'deadline': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'internal': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getDateRangeText = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate)
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  const filteredEvents = events.filter(event => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return event.title.toLowerCase().includes(query) ||
             event.description?.toLowerCase().includes(query) ||
             event.location?.toLowerCase().includes(query) ||
             event.client?.first_name?.toLowerCase().includes(query) ||
             event.client?.last_name?.toLowerCase().includes(query) ||
             event.client?.business_name?.toLowerCase().includes(query) ||
             event.matter?.title.toLowerCase().includes(query)
    }
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="page-header">
        <div className="content-container">
          <div className="section-header">
            <div className="flex items-center">
              <div>
                <h1 className="page-title flex items-center">
                  <CalendarDaysIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Calendar
                </h1>
                <p className="page-subtitle">
                  Manage appointments, deadlines, and court dates
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none outline-none text-sm bg-transparent"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary flex items-center ${showFilters ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filter
              </button>
              
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Event
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="content-container">
        {/* Calendar Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 ml-2">
                {getDateRangeText()}
              </h2>
            </div>
            
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-secondary"
            >
              Today
            </button>
          </div>

          {/* View Mode Buttons */}
          <div className="flex rounded-lg border border-gray-200 bg-white">
            {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-medium first:rounded-l-lg last:rounded-r-lg ${
                  viewMode === mode
                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="card mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="form-label">Event Category</label>
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="input-field"
                >
                  <option value="all">All Categories</option>
                  <option value="client">Client Events</option>
                  <option value="court">Court Events</option>
                  <option value="deadline">Deadlines</option>
                  <option value="internal">Internal</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        <div className="card">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="loading-spinner h-8 w-8"></div>
            </div>
          ) : (
            <>
              {viewMode === 'month' && (
                <div className="grid grid-cols-7 gap-px bg-gray-200">
                  {/* Calendar header with day names */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {Array.from({ length: 42 }, (_, i) => {
                    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                    const startOfCalendar = new Date(startOfMonth)
                    startOfCalendar.setDate(startOfMonth.getDate() - startOfMonth.getDay())
                    
                    const cellDate = new Date(startOfCalendar)
                    cellDate.setDate(startOfCalendar.getDate() + i)
                    
                    const dayEvents = filteredEvents.filter(event => {
                      const eventDate = new Date(event.start_datetime).toDateString()
                      return eventDate === cellDate.toDateString()
                    })
                    
                    const isCurrentMonth = cellDate.getMonth() === currentDate.getMonth()
                    const isToday = cellDate.toDateString() === new Date().toDateString()
                    
                    return (
                      <div
                        key={i}
                        className={`bg-white p-2 min-h-24 border-r border-b border-gray-100 ${
                          !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                        }`}
                      >
                        <div className={`text-sm mb-1 ${
                          isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                        }`}>
                          {cellDate.getDate()}
                        </div>
                        
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event) => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={`block w-full text-left px-2 py-1 rounded text-xs truncate border ${getEventTypeColor(event.event_type, event.event_category)}`}
                            >
                              <div className="flex items-center space-x-1">
                                {getEventTypeIcon(event.event_type)}
                                <span>{event.title}</span>
                              </div>
                            </button>
                          ))}
                          
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 px-2">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {viewMode === 'week' && (
                <div>
                  <div className="grid grid-cols-8 gap-px bg-gray-200">
                    {/* Time column header */}
                    <div className="bg-gray-50 p-3"></div>
                    
                    {/* Day headers */}
                    {Array.from({ length: 7 }, (_, i) => {
                      const startOfWeek = new Date(currentDate)
                      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
                      const day = new Date(startOfWeek)
                      day.setDate(startOfWeek.getDate() + i)
                      
                      const isToday = day.toDateString() === new Date().toDateString()
                      
                      return (
                        <div key={i} className={`bg-white p-3 text-center border-b ${isToday ? 'bg-blue-50' : ''}`}>
                          <div className="text-sm font-medium text-gray-900">
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className={`text-lg font-bold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                            {day.getDate()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Week view content */}
                  <div className="h-96 overflow-y-auto">
                    <div className="grid grid-cols-8 gap-px bg-gray-200">
                      {/* Time slots */}
                      {Array.from({ length: 24 }, (_, hour) => (
                        <React.Fragment key={hour}>
                          <div className="bg-gray-50 p-2 text-xs text-gray-500 text-right">
                            {hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`}
                          </div>
                          
                          {/* Day columns */}
                          {Array.from({ length: 7 }, (_, day) => (
                            <div key={day} className="bg-white p-1 min-h-12 border-b border-gray-100">
                              {/* Events would be positioned here based on time */}
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {viewMode === 'day' && (
                <div>
                  {/* Day header */}
                  <div className="border-b border-gray-200 p-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                  </div>
                  
                  {/* Day events */}
                  <div className="p-4">
                    <div className="space-y-3">
                      {filteredEvents
                        .filter(event => {
                          const eventDate = new Date(event.start_datetime).toDateString()
                          return eventDate === currentDate.toDateString()
                        })
                        .sort((a, b) => new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime())
                        .map((event) => (
                          <button
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`block w-full text-left p-4 rounded-lg border ${getEventTypeColor(event.event_type, event.event_category)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                {getEventTypeIcon(event.event_type)}
                                <div>
                                  <h4 className="font-medium">{event.title}</h4>
                                  {event.description && (
                                    <p className="text-sm opacity-75 mt-1">{event.description}</p>
                                  )}
                                  <div className="flex items-center space-x-4 mt-2 text-sm opacity-75">
                                    <span className="flex items-center">
                                      <ClockIcon className="h-4 w-4 mr-1" />
                                      {event.all_day ? 'All day' : `${formatTime(event.start_datetime)}${event.end_datetime ? ` - ${formatTime(event.end_datetime)}` : ''}`}
                                    </span>
                                    {event.location && (
                                      <span className="flex items-center">
                                        <MapPinIcon className="h-4 w-4 mr-1" />
                                        {event.location}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="text-sm opacity-75">
                                {event.client && (
                                  <div>
                                    {event.client.business_name || `${event.client.first_name} ${event.client.last_name}`}
                                  </div>
                                )}
                                {event.matter && (
                                  <div className="text-xs mt-1">
                                    {event.matter.matter_number}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      
                      {filteredEvents.filter(event => {
                        const eventDate = new Date(event.start_datetime).toDateString()
                        return eventDate === currentDate.toDateString()
                      }).length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                          <p>No events scheduled for this day</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-backdrop">
          <div className="modal max-w-2xl">
            <div className="modal-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                {getEventTypeIcon(selectedEvent.event_type)}
                <span className="ml-2">{selectedEvent.title}</span>
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="modal-content">
              <div className="space-y-4">
                {selectedEvent.description && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{selectedEvent.description}</dd>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date & Time</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatDate(selectedEvent.start_datetime)}
                      <br />
                      {selectedEvent.all_day ? 'All day' : `${formatTime(selectedEvent.start_datetime)}${selectedEvent.end_datetime ? ` - ${formatTime(selectedEvent.end_datetime)}` : ''}`}
                    </dd>
                  </div>
                  
                  {selectedEvent.location && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedEvent.location}</dd>
                    </div>
                  )}
                </div>
                
                {selectedEvent.client && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Client</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedEvent.client.business_name || `${selectedEvent.client.first_name} ${selectedEvent.client.last_name}`}
                    </dd>
                  </div>
                )}
                
                {selectedEvent.matter && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Matter</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {selectedEvent.matter.matter_number}: {selectedEvent.matter.title}
                    </dd>
                  </div>
                )}
                
                {(selectedEvent.judge_name || selectedEvent.court_name) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEvent.judge_name && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Judge</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedEvent.judge_name}</dd>
                      </div>
                    )}
                    
                    {selectedEvent.court_name && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Court</dt>
                        <dd className="mt-1 text-sm text-gray-900">{selectedEvent.court_name}</dd>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setSelectedEvent(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button className="btn-primary">
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal max-w-4xl">
            <div className="modal-header">
              <h3 className="text-lg font-medium text-gray-900">Create New Event</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="modal-content max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Basic Information</h4>
                  
                  <div>
                    <label className="form-label">Title *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter event title"
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={3}
                      className="input-field"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Event Type</label>
                      <select
                        value={formData.event_type}
                        onChange={(e) => setFormData(prev => ({ ...prev, event_type: e.target.value }))}
                        className="input-field"
                      >
                        <option value="client_meeting">Client Meeting</option>
                        <option value="court_date">Court Date</option>
                        <option value="deadline">Deadline</option>
                        <option value="consultation">Consultation</option>
                        <option value="deposition">Deposition</option>
                        <option value="hearing">Hearing</option>
                        <option value="conference">Conference</option>
                        <option value="review">Review</option>
                        <option value="task">Task</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Category</label>
                      <select
                        value={formData.event_category}
                        onChange={(e) => setFormData(prev => ({ ...prev, event_category: e.target.value }))}
                        className="input-field"
                      >
                        <option value="client">Client</option>
                        <option value="court">Court</option>
                        <option value="deadline">Deadline</option>
                        <option value="internal">Internal</option>
                        <option value="external">External</option>
                        <option value="administrative">Administrative</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Date & Time</h4>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="all_day"
                      checked={formData.all_day}
                      onChange={(e) => setFormData(prev => ({ ...prev, all_day: e.target.checked }))}
                      className="mr-2"
                    />
                    <label htmlFor="all_day" className="text-sm text-gray-700">
                      All day event
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                        className="input-field"
                      />
                    </div>

                    {!formData.all_day && (
                      <div>
                        <label className="form-label">Start Time</label>
                        <input
                          type="time"
                          value={formData.start_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                          className="input-field"
                        />
                      </div>
                    )}
                  </div>

                  {!formData.all_day && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">End Date</label>
                        <input
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="form-label">End Time</label>
                        <input
                          type="time"
                          value={formData.end_time}
                          onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="Location or address"
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Additional Details</h4>
                  
                  <div>
                    <label className="form-label">Matter ID</label>
                    <input
                      type="text"
                      value={formData.matter_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, matter_id: e.target.value }))}
                      placeholder="Optional matter ID"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="form-label">Client ID</label>
                    <input
                      type="text"
                      value={formData.client_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                      placeholder="Optional client ID"
                      className="input-field"
                    />
                  </div>

                  {formData.event_category === 'court' && (
                    <>
                      <div>
                        <label className="form-label">Case Number</label>
                        <input
                          type="text"
                          value={formData.case_number}
                          onChange={(e) => setFormData(prev => ({ ...prev, case_number: e.target.value }))}
                          placeholder="Case number"
                          className="input-field"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Judge Name</label>
                          <input
                            type="text"
                            value={formData.judge_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, judge_name: e.target.value }))}
                            placeholder="Judge name"
                            className="input-field"
                          />
                        </div>

                        <div>
                          <label className="form-label">Court Name</label>
                          <input
                            type="text"
                            value={formData.court_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, court_name: e.target.value }))}
                            placeholder="Court name"
                            className="input-field"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Settings */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Settings</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="form-label">Prep Time (min)</label>
                      <input
                        type="number"
                        value={formData.preparation_time_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, preparation_time_minutes: parseInt(e.target.value) || 0 }))}
                        min="0"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="form-label">Travel Time (min)</label>
                      <input
                        type="number"
                        value={formData.travel_time_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, travel_time_minutes: parseInt(e.target.value) || 0 }))}
                        min="0"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="form-label">Duration (min)</label>
                      <input
                        type="number"
                        value={formData.estimated_duration_minutes}
                        onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_minutes: parseInt(e.target.value) || 0 }))}
                        min="1"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="billable"
                        checked={formData.billable}
                        onChange={(e) => setFormData(prev => ({ ...prev, billable: e.target.checked }))}
                        className="mr-2"
                      />
                      <label htmlFor="billable" className="text-sm text-gray-700">
                        Billable
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="reminder_enabled"
                        checked={formData.reminder_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, reminder_enabled: e.target.checked }))}
                        className="mr-2"
                      />
                      <label htmlFor="reminder_enabled" className="text-sm text-gray-700">
                        Enable reminders
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="confirmation_required"
                        checked={formData.confirmation_required}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmation_required: e.target.checked }))}
                        className="mr-2"
                      />
                      <label htmlFor="confirmation_required" className="text-sm text-gray-700">
                        Confirmation required
                      </label>
                    </div>
                  </div>

                  {formData.billable && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="form-label">Billable Rate ($)</label>
                        <input
                          type="number"
                          value={formData.billable_rate}
                          onChange={(e) => setFormData(prev => ({ ...prev, billable_rate: parseFloat(e.target.value) || 0 }))}
                          min="0"
                          step="0.01"
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label className="form-label">Estimated Hours</label>
                        <input
                          type="number"
                          value={formData.estimated_hours}
                          onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: parseFloat(e.target.value) || 0 }))}
                          min="0"
                          step="0.25"
                          className="input-field"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!formData.title.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}