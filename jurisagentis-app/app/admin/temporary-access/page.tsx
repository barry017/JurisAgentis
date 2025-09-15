'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ClockIcon, 
  UserIcon, 
  ShieldCheckIcon, 
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface TemporaryAccess {
  id: string
  user: {
    id: string
    email: string
    name: string
  }
  access_type: 'full' | 'read_only' | 'specific_feature'
  features: string[]
  reason: string
  duration_hours: number
  granted_at: string
  expires_at: string
  granted_by: string
  revoked: boolean
  revoked_at?: string
  revoked_reason?: string
  status: 'active' | 'expired' | 'revoked'
}

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  status: string
}

export default function TemporaryAccessPage() {
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccess[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'revoked'>('active')
  
  // Grant access modal state
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantForm, setGrantForm] = useState({
    user_id: '',
    access_type: 'read_only' as 'full' | 'read_only' | 'specific_feature',
    features: [] as string[],
    reason: '',
    duration_hours: 24
  })
  const [grantLoading, setGrantLoading] = useState(false)

  // Revoke access modal state
  const [showRevokeModal, setShowRevokeModal] = useState(false)
  const [revokeForm, setRevokeForm] = useState({
    access_id: '',
    reason: ''
  })
  const [revokeLoading, setRevokeLoading] = useState(false)

  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const availableFeatures = [
    'documents',
    'calendar',
    'clients',
    'matters',
    'tasks',
    'billing',
    'reports',
    'templates'
  ]

  useEffect(() => {
    loadTemporaryAccess()
    loadUsers()
  }, [statusFilter])

  const loadTemporaryAccess = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/auth/temporary-access?action=list&status=${statusFilter}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' })
      })

      if (response.ok) {
        const result = await response.json()
        setTemporaryAccess(result.data?.temporary_access || [])
      } else {
        setError('Failed to load temporary access records')
      }
    } catch (err) {
      setError('An error occurred while loading temporary access records')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const result = await response.json()
        setUsers(result.data?.users || [])
      }
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setGrantLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/temporary-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grant',
          ...grantForm
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessMessage('Temporary access granted successfully')
        setShowGrantModal(false)
        setGrantForm({
          user_id: '',
          access_type: 'read_only',
          features: [],
          reason: '',
          duration_hours: 24
        })
        loadTemporaryAccess()
      } else {
        setError(result.error?.message || 'Failed to grant temporary access')
      }
    } catch (err) {
      setError('An error occurred while granting temporary access')
    } finally {
      setGrantLoading(false)
    }
  }

  const handleRevokeAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setRevokeLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/temporary-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke',
          ...revokeForm
        })
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessMessage('Temporary access revoked successfully')
        setShowRevokeModal(false)
        setRevokeForm({ access_id: '', reason: '' })
        loadTemporaryAccess()
      } else {
        setError(result.error?.message || 'Failed to revoke temporary access')
      }
    } catch (err) {
      setError('An error occurred while revoking temporary access')
    } finally {
      setRevokeLoading(false)
    }
  }

  const openRevokeModal = (accessId: string) => {
    setRevokeForm({ access_id: accessId, reason: '' })
    setShowRevokeModal(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Expired</span>
      case 'revoked':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Revoked</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>
    }
  }

  const getAccessTypeIcon = (accessType: string) => {
    switch (accessType) {
      case 'full':
        return <ShieldCheckIcon className="h-5 w-5 text-red-500" />
      case 'read_only':
        return <EyeIcon className="h-5 w-5 text-blue-500" />
      case 'specific_feature':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <UserIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    const days = Math.round(hours / 24)
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Temporary Access Management</h1>
              <p className="mt-2 text-gray-600">Grant and manage temporary access to users</p>
            </div>
            <button
              onClick={() => setShowGrantModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Grant Access
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-6">
            <Link href="/admin" className="text-blue-600 hover:text-blue-500 text-sm font-medium">
              ← Back to Admin Dashboard
            </Link>
          </nav>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="ml-auto text-green-400 hover:text-green-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Status Filter */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'active', label: 'Active' },
                { key: 'expired', label: 'Expired' },
                { key: 'revoked', label: 'Revoked' },
                { key: 'all', label: 'All' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    statusFilter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Temporary Access List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading temporary access records...</p>
            </div>
          ) : temporaryAccess.length === 0 ? (
            <div className="p-8 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No temporary access records</h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter === 'active' 
                  ? 'No active temporary access grants found.'
                  : `No ${statusFilter} temporary access records found.`
                }
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {temporaryAccess.map((access) => (
                <li key={access.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getAccessTypeIcon(access.access_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {access.user.name}
                          </p>
                          {getStatusBadge(access.status)}
                        </div>
                        <p className="text-sm text-gray-500">{access.user.email}</p>
                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Access Type:</span> {access.access_type.replace('_', ' ')}
                          </div>
                          <div>
                            <span className="font-medium">Duration:</span> {formatDuration(access.duration_hours)}
                          </div>
                          <div>
                            <span className="font-medium">Expires:</span> {new Date(access.expires_at).toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Granted by:</span> {access.granted_by}
                          </div>
                        </div>
                        {access.features && access.features.length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-600">Features:</span>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {access.features.map((feature) => (
                                <span
                                  key={feature}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="mt-2">
                          <span className="text-sm font-medium text-gray-600">Reason:</span>
                          <p className="text-sm text-gray-500">{access.reason}</p>
                        </div>
                        {access.revoked && access.revoked_reason && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-red-600">Revocation Reason:</span>
                            <p className="text-sm text-red-500">{access.revoked_reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {access.status === 'active' && (
                        <button
                          onClick={() => openRevokeModal(access.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Revoke
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Grant Access Modal */}
        {showGrantModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Grant Temporary Access</h3>
                  <button
                    onClick={() => setShowGrantModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleGrantAccess} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <select
                      required
                      value={grantForm.user_id}
                      onChange={(e) => setGrantForm({ ...grantForm, user_id: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a user</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.first_name} {user.last_name} ({user.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Access Type</label>
                    <select
                      required
                      value={grantForm.access_type}
                      onChange={(e) => setGrantForm({ ...grantForm, access_type: e.target.value as any })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="read_only">Read Only</option>
                      <option value="specific_feature">Specific Features</option>
                      <option value="full">Full Access</option>
                    </select>
                  </div>

                  {grantForm.access_type === 'specific_feature' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Features</label>
                      <div className="mt-2 space-y-2">
                        {availableFeatures.map((feature) => (
                          <label key={feature} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={grantForm.features.includes(feature)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGrantForm({ ...grantForm, features: [...grantForm.features, feature] })
                                } else {
                                  setGrantForm({ ...grantForm, features: grantForm.features.filter(f => f !== feature) })
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">{feature}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration (hours)</label>
                    <select
                      required
                      value={grantForm.duration_hours}
                      onChange={(e) => setGrantForm({ ...grantForm, duration_hours: parseInt(e.target.value) })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>1 hour</option>
                      <option value={4}>4 hours</option>
                      <option value={8}>8 hours</option>
                      <option value={24}>1 day</option>
                      <option value={72}>3 days</option>
                      <option value={168}>7 days</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                    <textarea
                      required
                      rows={3}
                      value={grantForm.reason}
                      onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explain why temporary access is needed..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={grantLoading}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {grantLoading ? 'Granting...' : 'Grant Access'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGrantModal(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Access Modal */}
        {showRevokeModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Revoke Temporary Access</h3>
                  <button
                    onClick={() => setShowRevokeModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleRevokeAccess} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason for Revocation</label>
                    <textarea
                      required
                      rows={3}
                      value={revokeForm.reason}
                      onChange={(e) => setRevokeForm({ ...revokeForm, reason: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Explain why access is being revoked..."
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="submit"
                      disabled={revokeLoading}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:bg-red-300"
                    >
                      {revokeLoading ? 'Revoking...' : 'Revoke Access'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRevokeModal(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}