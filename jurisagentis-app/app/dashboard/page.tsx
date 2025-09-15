/**
 * Dashboard Page - Main authenticated user interface
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  UserCircleIcon, 
  DocumentTextIcon, 
  UsersIcon, 
  ChartBarIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  PlusIcon,
  EnvelopeIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface DashboardStats {
  totalClients: number
  activeMatters: number
  pendingTasks: number
  documentsReview: number
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeMatters: 0,
    pendingTasks: 0,
    documentsReview: 0
  })

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Mock stats loading - in production this would fetch from API
  useEffect(() => {
    if (user) {
      // Simulate API call with role-based data
      const mockStats = {
        admin: { totalClients: 247, activeMatters: 89, pendingTasks: 23, documentsReview: 12 },
        associate_attorney: { totalClients: 156, activeMatters: 45, pendingTasks: 18, documentsReview: 8 },
        paralegal: { totalClients: 89, activeMatters: 34, pendingTasks: 15, documentsReview: 6 },
        assistant: { totalClients: 67, activeMatters: 23, pendingTasks: 12, documentsReview: 4 },
        client: { totalClients: 1, activeMatters: 3, pendingTasks: 2, documentsReview: 1 }
      }

      const userStats = mockStats[user.role as keyof typeof mockStats] || mockStats.client
      setStats(userStats)
    }
  }, [user])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect via useEffect
  }

  const quickActions = [
    {
      name: 'View Clients',
      icon: UsersIcon,
      href: '/clients',
      description: 'Manage client information',
      available: ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
    },
    {
      name: 'View Matters',
      icon: DocumentTextIcon,
      href: '/matters',
      description: 'Manage legal matters and cases',
      available: ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
    },
    {
      name: 'New Client',
      icon: UsersIcon,
      href: '/clients/new',
      description: 'Add a new client to the system',
      available: ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
    },
    {
      name: 'New Matter',
      icon: DocumentTextIcon,
      href: '/matters/new',
      description: 'Create a new legal matter',
      available: ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
    },
    {
      name: 'View Reports',
      icon: ChartBarIcon,
      href: '/reports',
      description: 'Access practice analytics',
      available: ['admin', 'associate_attorney'].includes(user.role)
    },
    {
      name: 'View Documents',
      icon: DocumentTextIcon,
      href: '/documents',
      description: 'Manage legal documents and files',
      available: ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
    },
    {
      name: 'Upload Document',
      icon: DocumentTextIcon,
      href: '/documents/new',
      description: 'Upload a new document to the system',
      available: ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
    },
    {
      name: 'Billing Dashboard',
      icon: BanknotesIcon,
      href: '/billing',
      description: 'Manage invoices and payments',
      available: ['admin', 'associate_attorney'].includes(user.role)
    },
    {
      name: 'New Invoice',
      icon: PlusIcon,
      href: '/billing/invoices/new',
      description: 'Create a new client invoice',
      available: ['admin', 'associate_attorney'].includes(user.role)
    },
    {
      name: 'Record Payment',
      icon: BanknotesIcon,
      href: '/billing/payments/new',
      description: 'Record received payment',
      available: ['admin', 'associate_attorney'].includes(user.role)
    },
    {
      name: 'Email Communications',
      icon: EnvelopeIcon,
      href: '/communications/email',
      description: 'Send and manage email communications',
      available: ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
    },
    {
      name: 'Email Templates',
      icon: DocumentTextIcon,
      href: '/communications/email/templates',
      description: 'Manage email templates',
      available: ['admin', 'associate_attorney'].includes(user.role)
    },
    {
      name: 'Calendar & Events',
      icon: CalendarIcon,
      href: '/calendar',
      description: 'Manage appointments and deadlines',
      available: ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
    },
    {
      name: 'Document Templates',
      icon: DocumentTextIcon,
      href: '/templates',
      description: 'Manage legal document templates',
      available: ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
    },
    {
      name: 'User Management',
      icon: CogIcon,
      href: '/admin/users',
      description: 'Manage system users',
      available: user.role === 'admin'
    }
  ].filter(action => action.available)

  const recentActivity = [
    {
      id: 1,
      type: 'document',
      message: 'Trust agreement reviewed for Johnson Family Trust',
      time: '2 hours ago',
      urgent: false
    },
    {
      id: 2,
      type: 'task',
      message: 'Client meeting scheduled - Smith Estate Planning',
      time: '4 hours ago',
      urgent: true
    },
    {
      id: 3,
      type: 'client',
      message: 'New client inquiry: Williams Last Will & Testament',
      time: '1 day ago',
      urgent: false
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">JurisAgentis</h1>
              <div className="ml-6 flex items-center text-sm text-gray-500">
                <ShieldCheckIcon className="h-4 w-4 mr-1" />
                {user.mfaEnabled ? 'MFA Enabled' : 'MFA Disabled'}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserCircleIcon className="h-8 w-8 text-gray-400" />
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {user.profile.firstName} {user.profile.lastName}
                  </div>
                  <div className="text-gray-500 capitalize">
                    {user.role.replace('_', ' ')}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Sign Out"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.profile.firstName}
          </h2>
          <p className="text-gray-600">
            Here's what's happening with your legal practice today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Matters</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeMatters}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Documents to Review</p>
                <p className="text-2xl font-bold text-gray-900">{stats.documentsReview}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => router.push(action.href)}
                  className="w-full flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                >
                  <action.icon className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">{action.name}</div>
                    <div className="text-sm text-gray-500">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    activity.urgent ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Display (Debug/Info) */}
        {user.role === 'admin' && (
          <div className="mt-8 card bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">System Permissions</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-800">Financial:</span>
                <span className="ml-2 text-blue-700">{user.permissions?.financial || 'Not set'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Clients:</span>
                <span className="ml-2 text-blue-700">{user.permissions?.clients || 'Not set'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Documents:</span>
                <span className="ml-2 text-blue-700">{user.permissions?.documents || 'Not set'}</span>
              </div>
              <div>
                <span className="font-medium text-blue-800">Administrative:</span>
                <span className="ml-2 text-blue-700">{user.permissions?.administrative || 'Not set'}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}