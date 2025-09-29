/**
 * Client Portal - Calendar & Appointments
 * 
 * Client view of appointments, deadlines, and important dates
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  VideoCameraIcon,
  PhoneIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  // EyeIcon
} from '@heroicons/react/24/outline'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  type: 'appointment' | 'deadline' | 'court_date' | 'meeting' | 'reminder'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled'
  location?: string
  locationType: 'office' | 'courthouse' | 'virtual' | 'phone' | 'client_location'
  attendees: {
    id: string
    name: string
    role: 'attorney' | 'paralegal' | 'client' | 'assistant'
    status: 'invited' | 'accepted' | 'declined' | 'tentative'
  }[]
  matterId?: string
  matterTitle?: string
  isPrivileged: boolean
  requiresPreparation: boolean
  preparationNotes?: string
  virtualMeetingUrl?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  canReschedule: boolean
  confirmationRequired: boolean
  isRecurring: boolean
  category: 'legal' | 'administrative' | 'personal' | 'court' | 'deadline'
}

const mockEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Trust Signing Appointment',
    description: 'Final signing of trust documents and estate planning paperwork',
    date: '2025-01-22',
    startTime: '14:00',
    endTime: '15:30',
    type: 'appointment',
    status: 'scheduled',
    location: 'Law Office - Conference Room B',
    locationType: 'office',
    attendees: [
      { id: 'client-1', name: 'John Smith', role: 'client', status: 'accepted' },
      { id: 'attorney-1', name: 'Sarah Johnson', role: 'attorney', status: 'accepted' },
      { id: 'paralegal-1', name: 'Maria Rodriguez', role: 'paralegal', status: 'accepted' }
    ],
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    isPrivileged: true,
    requiresPreparation: true,
    preparationNotes: 'Please bring valid ID and review all documents beforehand',
    priority: 'high',
    canReschedule: true,
    confirmationRequired: true,
    isRecurring: false,
    category: 'legal'
  },
  {
    id: '2',
    title: 'Document Review Deadline',
    description: 'Final deadline to review and approve trust agreement draft',
    date: '2025-01-20',
    startTime: '17:00',
    endTime: '17:00',
    type: 'deadline',
    status: 'scheduled',
    locationType: 'virtual',
    attendees: [
      { id: 'client-1', name: 'John Smith', role: 'client', status: 'accepted' }
    ],
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    isPrivileged: true,
    requiresPreparation: false,
    priority: 'urgent',
    canReschedule: false,
    confirmationRequired: false,
    isRecurring: false,
    category: 'deadline'
  },
  {
    id: '3',
    title: 'Check-in Call with Attorney',
    description: 'Monthly check-in to discuss case progress and next steps',
    date: '2025-01-25',
    startTime: '10:00',
    endTime: '10:30',
    type: 'meeting',
    status: 'scheduled',
    locationType: 'phone',
    attendees: [
      { id: 'client-1', name: 'John Smith', role: 'client', status: 'accepted' },
      { id: 'attorney-1', name: 'Sarah Johnson', role: 'attorney', status: 'accepted' }
    ],
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    isPrivileged: true,
    requiresPreparation: false,
    priority: 'normal',
    canReschedule: true,
    confirmationRequired: false,
    isRecurring: true,
    category: 'administrative'
  },
  {
    id: '4',
    title: 'Virtual Consultation - Estate Planning Review',
    description: 'Review completed estate planning documents and answer questions',
    date: '2025-01-28',
    startTime: '15:00',
    endTime: '16:00',
    type: 'meeting',
    status: 'scheduled',
    locationType: 'virtual',
    virtualMeetingUrl: 'https://meet.example.com/abc123',
    attendees: [
      { id: 'client-1', name: 'John Smith', role: 'client', status: 'accepted' },
      { id: 'attorney-1', name: 'Sarah Johnson', role: 'attorney', status: 'accepted' }
    ],
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    isPrivileged: true,
    requiresPreparation: true,
    preparationNotes: 'Please prepare any questions about the completed documents',
    priority: 'normal',
    canReschedule: true,
    confirmationRequired: false,
    isRecurring: false,
    category: 'legal'
  }
]

export default function ClientCalendarPage() {
  const router = useRouter()
  const [events, _setEvents] = useState<CalendarEvent[]>(mockEvents)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month')
  const [_selectedEvent, _setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [_showEventModal, _setShowEventModal] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEventIcon = (type: string, locationType: string) => {
    if (locationType === 'virtual') return VideoCameraIcon
    if (locationType === 'phone') return PhoneIcon
    
    switch (type) {
      case 'appointment':
        return CalendarIcon
      case 'deadline':
        return ExclamationTriangleIcon
      case 'court_date':
        return CheckCircleIcon
      case 'meeting':
        return UserGroupIcon
      default:
        return CalendarIcon
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-gray-100 text-gray-800 border-gray-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      rescheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
    
    return `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.scheduled}`
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'border-l-gray-400',
      normal: 'border-l-blue-400',
      high: 'border-l-orange-400',
      urgent: 'border-l-red-400'
    }
    
    return colors[priority as keyof typeof colors] || colors.normal
  }

  const getUpcomingEvents = () => {
    const now = new Date()
    return events
      .filter(event => new Date(event.date + 'T' + event.startTime) >= now)
      .sort((a, b) => 
        new Date(a.date + 'T' + a.startTime).getTime() - 
        new Date(b.date + 'T' + b.startTime).getTime()
      )
      .slice(0, 5)
  }

  const getTodaysEvents = () => {
    const today = new Date().toISOString().split('T')[0]
    return events.filter(event => event.date === today)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowEventModal(true)
  }

  const handleRescheduleRequest = (eventId: string) => {
    console.log('Reschedule request for event:', eventId)
    // In real implementation, would open reschedule modal
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Calendar & Appointments
                </h1>
                <p className="text-gray-600 mt-1">
                  Your scheduled appointments, deadlines, and important dates
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-md">
                {['month', 'week', 'agenda'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as typeof viewMode)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
              <button className="btn-primary flex items-center">
                <PlusIcon className="h-5 w-5 mr-2" />
                Request Appointment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar/Agenda Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Today's Events */}
            {getTodaysEvents().length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-blue-600" />
                  Today&apos;s Schedule
                </h2>
                <div className="space-y-3">
                  {getTodaysEvents().map(event => {
                    const EventIcon = getEventIcon(event.type, event.locationType)
                    return (
                      <div
                        key={event.id}
                        onClick={() => handleEventClick(event)}
                        className={`border-l-4 ${getPriorityColor(event.priority)} bg-gray-50 p-4 rounded-r-lg cursor-pointer hover:bg-gray-100 transition-colors`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <EventIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatTime(event.startTime)} - {formatTime(event.endTime)}
                              </p>
                              {event.location && (
                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                  <MapPinIcon className="h-4 w-4 mr-1" />
                                  {event.location}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(event.status)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
              <div className="space-y-4">
                {getUpcomingEvents().map(event => {
                  const EventIcon = getEventIcon(event.type, event.locationType)
                  const _eventDate = new Date(event.date + 'T' + event.startTime)
                  const isToday = event.date === new Date().toISOString().split('T')[0]
                  const isTomorrow = event.date === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      className={`border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer ${
                        event.priority === 'urgent' ? 'border-red-300 bg-red-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <EventIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                              {event.isRecurring && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                  Recurring
                                </span>
                              )}
                              {event.requiresPreparation && (
                                <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" title="Preparation Required" />
                              )}
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center space-x-4">
                                <span className="flex items-center">
                                  <CalendarIcon className="h-4 w-4 mr-1" />
                                  {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(event.date)}
                                </span>
                                <span className="flex items-center">
                                  <ClockIcon className="h-4 w-4 mr-1" />
                                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                </span>
                              </div>
                              
                              {event.location && (
                                <div className="flex items-center">
                                  <MapPinIcon className="h-4 w-4 mr-1" />
                                  <span>{event.location}</span>
                                  {event.virtualMeetingUrl && (
                                    <VideoCameraIcon className="h-4 w-4 ml-2 text-green-600" />
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center space-x-2">
                                <UserGroupIcon className="h-4 w-4 mr-1" />
                                <span>{event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}</span>
                                {event.matterTitle && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {event.matterTitle}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-600 mt-2">{event.description}</p>
                            )}
                            
                            {event.preparationNotes && (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                                <strong>Preparation:</strong> {event.preparationNotes}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          {getStatusBadge(event.status)}
                          
                          {event.priority !== 'normal' && (
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              event.priority === 'urgent' 
                                ? 'bg-red-100 text-red-800'
                                : event.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {event.priority.toUpperCase()}
                            </span>
                          )}
                          
                          {event.canReschedule && event.status === 'scheduled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRescheduleRequest(event.id)
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 underline"
                            >
                              Request Reschedule
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Mini Calendar */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {new Date().getDate()}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">This Week</span>
                  <span className="text-sm font-medium">{events.length} events</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending Confirmation</span>
                  <span className="text-sm font-medium text-orange-600">
                    {events.filter(e => e.confirmationRequired && e.status === 'scheduled').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">High Priority</span>
                  <span className="text-sm font-medium text-red-600">
                    {events.filter(e => e.priority === 'urgent' || e.priority === 'high').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full btn-primary text-sm">
                  Request New Appointment
                </button>
                <button className="w-full btn-secondary text-sm">
                  View All Events
                </button>
                <button className="w-full btn-secondary text-sm">
                  Download Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}