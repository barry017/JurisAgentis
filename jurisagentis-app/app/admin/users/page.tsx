/**
 * Admin User Management Page
 * 
 * Allows administrators to view and manage system users
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  UsersIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface User {
  uid: string
  email: string
  role: string
  profile: {
    firstName: string
    lastName: string
    title?: string
  }
  mfaEnabled: boolean
  status: 'active' | 'inactive' | 'pending'
  lastLogin: string | null
  createdAt: string
  permissions: {
    financial: string
    clients: string
    documents: string
    administrative: string
  }
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [error, setError] = useState('')

  // Redirect non-admin users
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!user) return
      
      try {
        const response = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${await getToken()}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
          setFilteredUsers(data.users || [])
        } else {
          setError('Failed to load users')
        }
      } catch (err) {
        setError('Network error occurred')
      } finally {
        setLoadingUsers(false)
      }
    }

    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user])

  // Get auth token
  const getToken = async () => {
    // In production, get from Supabase session
    return 'mock-token'
  }

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = [...users]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(u => 
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${u.profile.firstName} ${u.profile.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Role filter
    if (selectedRole) {
      filtered = filtered.filter(u => u.role === selectedRole)
    }

    // Status filter
    if (selectedStatus) {
      filtered = filtered.filter(u => u.status === selectedStatus)
    }

    setFilteredUsers(filtered)
  }, [users, searchQuery, selectedRole, selectedStatus])

  const handleUpdateUserRole = async (uid: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify({ role: newRole })
      })

      if (response.ok) {
        // Refresh users list
        setUsers(users.map(u => 
          u.uid === uid 
            ? { ...u, role: newRole }
            : u
        ))
      } else {
        setError('Failed to update user role')
      }
    } catch (err) {
      setError('Network error occurred')
    }
  }

  const handleUpdateUserStatus = async (uid: string, newStatus: 'active' | 'inactive') => {
    try {
      const response = await fetch(`/api/admin/users/${uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setUsers(users.map(u => 
          u.uid === uid 
            ? { ...u, status: newStatus }
            : u
        ))
      } else {
        setError('Failed to update user status')
      }
    } catch (err) {
      setError('Network error occurred')
    }
  }

  if (loading || loadingUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return null // Will redirect via useEffect
  }

  const roleOptions = [
    { value: 'admin', label: 'Administrator', color: 'bg-red-100 text-red-800' },
    { value: 'associate_attorney', label: 'Associate Attorney', color: 'bg-blue-100 text-blue-800' },
    { value: 'paralegal', label: 'Paralegal', color: 'bg-green-100 text-green-800' },
    { value: 'assistant', label: 'Assistant', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'client', label: 'Client', color: 'bg-gray-100 text-gray-800' },
    { value: 'client_related_party', label: 'Client Related Party', color: 'bg-purple-100 text-purple-800' }
  ]

  const getRoleDisplay = (role: string) => {
    const option = roleOptions.find(opt => opt.value === role)
    return option ? option.label : role.replace('_', ' ')
  }

  const getRoleColor = (role: string) => {
    const option = roleOptions.find(opt => opt.value === role)
    return option ? option.color : 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="page-header">
        <div className="content-container">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="page-title">User Management</h1>
                <p className="page-subtitle">Manage system users and permissions</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/admin/users/invite')}
              className="btn-primary"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Invite User
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="content-container">
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            
            <div className="flex space-x-4">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="input-field"
              >
                <option value="">All Roles</option>
                {roleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input-field"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">User</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">MFA</th>
                  <th className="table-header-cell">Last Login</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {user.profile.firstName?.[0]}{user.profile.lastName?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.profile.firstName} {user.profile.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getRoleColor(user.role)}`}>
                        {getRoleDisplay(user.role)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${getStatusColor(user.status)}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </td>
                    <td className="table-cell">
                      {user.mfaEnabled ? (
                        <ShieldCheckIcon className="h-5 w-5 text-green-600" title="MFA Enabled" />
                      ) : (
                        <ShieldExclamationIcon className="h-5 w-5 text-yellow-600" title="MFA Disabled" />
                      )}
                    </td>
                    <td className="table-cell">
                      {user.lastLogin ? (
                        <span className="text-sm text-gray-600">
                          {new Date(user.lastLogin).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">Never</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => router.push(`/admin/users/${user.uid}`)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        {user.uid !== user.uid && ( // Prevent admin from modifying themselves
                          <>
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateUserRole(user.uid, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1"
                              title="Change Role"
                            >
                              {roleOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleUpdateUserStatus(
                                user.uid, 
                                user.status === 'active' ? 'inactive' : 'active'
                              )}
                              className={`p-1 ${
                                user.status === 'active' 
                                  ? 'text-red-400 hover:text-red-600' 
                                  : 'text-green-400 hover:text-green-600'
                              }`}
                              title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                            >
                              {user.status === 'active' ? (
                                <TrashIcon className="h-4 w-4" />
                              ) : (
                                <PencilIcon className="h-4 w-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery || selectedRole || selectedStatus 
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Get started by inviting your first user.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="card text-center">
            <div className="text-2xl font-bold text-blue-600">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {users.filter(u => u.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending Invites</div>
          </div>
          <div className="card text-center">
            <div className="text-2xl font-bold text-red-600">
              {users.filter(u => !u.mfaEnabled).length}
            </div>
            <div className="text-sm text-gray-600">MFA Disabled</div>
          </div>
        </div>
      </main>
    </div>
  )
}