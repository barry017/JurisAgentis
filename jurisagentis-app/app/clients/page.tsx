/**
 * Clients Page - List and manage clients
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building,
  User
} from 'lucide-react'

interface Client {
  id: string
  first_name: string
  last_name: string
  preferred_name?: string
  email?: string
  phone_primary?: string
  client_status: 'prospect' | 'active' | 'inactive' | 'former' | 'do_not_contact'
  client_type: 'individual' | 'business' | 'estate' | 'trust' | 'non_profit' | 'government'
  business_name?: string
  practice_areas?: string[]
  tags?: string[]
  created_at: string
  updated_at: string
}

interface _ClientsResponse {
  clients: Client[]
  pagination: {
    limit: number
    offset: number
    total: number
    has_more: boolean
  }
}

export default function ClientsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // State management
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [error, setError] = useState('')

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(0)
  const [totalClients, setTotalClients] = useState(0)
  const pageSize = 20

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Check permissions
  useEffect(() => {
    if (user && !['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Fetch clients
  const fetchClients = useCallback(async () => {
    try {
      setLoadingClients(true)
      setError('')

      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      params.append('limit', pageSize.toString())
      params.append('offset', (currentPage * pageSize).toString())

      const response = await fetch(`/api/clients?${params}`)
      const data = await response.json()

      if (response.ok) {
        setClients(data.data?.clients || [])
        setTotalClients(data.data?.pagination?.total || 0)
      } else {
        setError(data.error?.message || 'Failed to load clients')
      }
    } catch (_error) {
      setError('Network error occurred')
    } finally {
      setLoadingClients(false)
    }
  }, [searchTerm, statusFilter, typeFilter, currentPage])

  // Load clients on mount and when filters change
  useEffect(() => {
    if (user) {
      fetchClients()
    }
  }, [user, searchTerm, statusFilter, typeFilter, currentPage, fetchClients])

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0)
  }, [searchTerm, statusFilter, typeFilter])

  const getClientDisplayName = (client: Client) => {
    if (client.client_type === 'business' && client.business_name) {
      return `${client.business_name} (${client.preferred_name || client.first_name} ${client.last_name})`
    }
    return `${client.preferred_name || client.first_name} ${client.last_name}`
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      prospect: 'bg-blue-100 text-blue-800 border-blue-200',
      active: 'bg-green-100 text-green-800 border-green-200',
      inactive: 'bg-gray-100 text-gray-800 border-gray-200',
      former: 'bg-purple-100 text-purple-800 border-purple-200',
      do_not_contact: 'bg-red-100 text-red-800 border-red-200'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const getTypeIcon = (type: string) => {
    return type === 'business' || type === 'non_profit' || type === 'government' ? 
      <Building className="h-4 w-4" /> : 
      <User className="h-4 w-4" />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const canCreateClients = ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canEditClients = ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canDeleteClients = ['admin', 'associate_attorney'].includes(user.role)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="h-8 w-8 mr-3 text-blue-600" />
                Clients
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your client relationships and information
              </p>
            </div>

            {canCreateClients && (
              <button
                onClick={() => router.push('/clients/new')}
                className="btn-primary flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                New Client
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search clients by name, email, or business..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Statuses</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="former">Former</option>
                <option value="do_not_contact">Do Not Contact</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="business">Business</option>
                <option value="estate">Estate</option>
                <option value="trust">Trust</option>
                <option value="non_profit">Non-Profit</option>
                <option value="government">Government</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow">
          {loadingClients ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading clients...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No clients found</p>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : canCreateClients 
                    ? 'Get started by creating your first client'
                    : 'No clients have been added yet'
                }
              </p>
              {canCreateClients && !searchTerm && statusFilter === 'all' && typeFilter === 'all' && (
                <button
                  onClick={() => router.push('/clients/new')}
                  className="btn-primary mt-4"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add First Client
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-4">Client</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {clients.map((client) => (
                  <div key={client.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Client Name */}
                      <div className="col-span-4">
                        <div className="flex items-center">
                          {getTypeIcon(client.client_type)}
                          <div className="ml-3">
                            <div className="font-medium text-gray-900">
                              {getClientDisplayName(client)}
                            </div>
                            {client.practice_areas && client.practice_areas.length > 0 && (
                              <div className="text-sm text-gray-500">
                                {client.practice_areas.slice(0, 2).join(', ')}
                                {client.practice_areas.length > 2 && ` +${client.practice_areas.length - 2} more`}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="col-span-2">
                        <div className="text-sm">
                          {client.email && (
                            <div className="flex items-center text-gray-600 mb-1">
                              <Mail className="h-4 w-4 mr-1" />
                              <span className="truncate">{client.email}</span>
                            </div>
                          )}
                          {client.phone_primary && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-1" />
                              <span>{client.phone_primary}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        {getStatusBadge(client.client_status)}
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <span className="text-sm text-gray-600 capitalize">
                          {client.client_type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => router.push(`/clients/${client.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Client"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          {canEditClients && (
                            <button
                              onClick={() => router.push(`/clients/${client.id}/edit`)}
                              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                              title="Edit Client"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}

                          {canDeleteClients && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${getClientDisplayName(client)}?`)) {
                                  // TODO: Implement delete functionality
                                  console.log('Delete client:', client.id)
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete Client"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalClients > pageSize && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalClients)} of {totalClients} clients
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                        disabled={currentPage === 0}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={(currentPage + 1) * pageSize >= totalClients}
                        className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}