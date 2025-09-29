/**
 * Client Portal Landing Page
 * 
 * Secure portal for clients to access their legal information
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  ChatBubbleLeftEllipsisIcon,
  CalendarIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  BellIcon,
  ClockIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

// Mock client data - would come from API
const mockClient = {
  id: '1',
  name: 'John Smith',
  email: 'john.smith@example.com',
  matters: [
    {
      id: '1',
      title: 'Estate Planning - Smith Family Trust',
      status: 'active',
      attorney: 'Sarah Johnson',
      nextAction: 'Review trust documents',
      dueDate: '2025-01-20'
    }
  ],
  recentDocuments: [
    {
      id: '1',
      name: 'Trust Agreement Draft v2.1',
      type: 'Trust Document',
      uploadedAt: '2025-01-10',
      status: 'review',
      size: '2.4 MB'
    },
    {
      id: '2',
      name: 'Asset Inventory Worksheet',
      type: 'Worksheet',
      uploadedAt: '2025-01-08',
      status: 'completed',
      size: '156 KB'
    }
  ],
  upcomingEvents: [
    {
      id: '1',
      title: 'Trust Signing Appointment',
      date: '2025-01-22',
      time: '2:00 PM',
      location: 'Law Office',
      type: 'appointment'
    }
  ],
  messages: [
    {
      id: '1',
      from: 'Sarah Johnson',
      subject: 'Trust documents ready for review',
      preview: 'Please review the attached trust documents and let me know if you have any questions...',
      date: '2025-01-10',
      unread: true
    }
  ],
  billing: {
    totalFees: 5000,
    retainerPaid: 2500,
    balanceDue: 2500,
    nextPaymentDate: '2025-02-01'
  }
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [client] = useState(mockClient)

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800 border-green-200',
      review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      pending: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    return `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.pending}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShieldCheckIcon className="h-8 w-8 mr-3 text-blue-600" />
                Client Portal
              </h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {client.name}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
                <BellIcon className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserCircleIcon className="h-6 w-6" />
                <span>{client.name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/client-portal/documents')}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <DocumentTextIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Documents</span>
                </button>
                
                <button
                  onClick={() => router.push('/client-portal/messages')}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <ChatBubbleLeftEllipsisIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Messages</span>
                  {client.messages.filter(m => m.unread).length > 0 && (
                    <span className="mt-1 bg-red-500 text-white text-xs rounded-full px-2 py-1">
                      {client.messages.filter(m => m.unread).length}
                    </span>
                  )}
                </button>
                
                <button
                  onClick={() => router.push('/client-portal/calendar')}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <CalendarIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Calendar</span>
                </button>
                
                <button
                  onClick={() => router.push('/client-portal/billing')}
                  className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <CreditCardIcon className="h-8 w-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">Billing</span>
                </button>
              </div>
            </div>

            {/* Active Matters */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Matters</h2>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {client.matters.map((matter) => (
                  <div key={matter.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{matter.title}</h3>
                      <span className={getStatusBadge(matter.status)}>
                        {matter.status.charAt(0).toUpperCase() + matter.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Attorney:</strong> {matter.attorney}</p>
                      <p><strong>Next Action:</strong> {matter.nextAction}</p>
                      <p><strong>Due Date:</strong> {new Date(matter.dueDate).toLocaleDateString()}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button className="btn-primary text-sm">View Details</button>
                      <button className="btn-secondary text-sm">View Documents</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Documents */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Documents</h2>
                <button
                  onClick={() => router.push('/client-portal/documents')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All Documents
                </button>
              </div>
              <div className="space-y-3">
                {client.recentDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{doc.name}</h4>
                        <p className="text-xs text-gray-500">
                          {doc.type} • {doc.size} • {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={getStatusBadge(doc.status)}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
              <div className="space-y-3">
                {client.upcomingEvents.map((event) => (
                  <div key={event.id} className="border border-gray-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                    <div className="text-xs text-gray-500 mt-1">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-3 w-3" />
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <ClockIcon className="h-3 w-3" />
                        <span>{event.time} at {event.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push('/client-portal/calendar')}
                className="w-full mt-4 btn-secondary text-sm"
              >
                View Full Calendar
              </button>
            </div>

            {/* Messages */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
                <button
                  onClick={() => router.push('/client-portal/messages')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </button>
              </div>
              <div className="space-y-3">
                {client.messages.slice(0, 3).map((message) => (
                  <div key={message.id} className={`border rounded-lg p-3 ${message.unread ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{message.from}</h4>
                      <span className="text-xs text-gray-500">{new Date(message.date).toLocaleDateString()}</span>
                    </div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">{message.subject}</h5>
                    <p className="text-xs text-gray-600 line-clamp-2">{message.preview}</p>
                    {message.unread && (
                      <span className="inline-flex items-center mt-2 text-xs text-blue-600 font-medium">
                        • Unread
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Billing Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Fees:</span>
                  <span className="text-sm font-medium">${client.billing.totalFees.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Retainer Paid:</span>
                  <span className="text-sm font-medium text-green-600">${client.billing.retainerPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm font-medium text-gray-900">Balance Due:</span>
                  <span className="text-sm font-semibold text-red-600">${client.billing.balanceDue.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Next payment due: {new Date(client.billing.nextPaymentDate).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => router.push('/client-portal/billing')}
                className="w-full mt-4 btn-primary text-sm"
              >
                View Full Billing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}