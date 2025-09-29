/**
 * Client Profile View - Display detailed client information
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  User,
  Edit,
  Phone,
  Mail,
  MapPin,
  Building,
  Calendar,
  FileText,
  ArrowLeft,
  AlertTriangle,
  Trash2,
  Clock
} from 'lucide-react'
// TODO: Re-implement ClientCommunicationHistory and ClientDocuments components for Phase 5
// import ClientCommunicationHistory from '@/app/components/ClientCommunicationHistory'
// import ClientDocuments from '@/app/components/ClientDocuments'

interface Client {
  id: string
  first_name: string
  last_name: string
  preferred_name?: string
  date_of_birth?: string
  email?: string
  phone_primary?: string
  phone_secondary?: string
  address_line1?: string
  address_line2?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  client_status: 'prospect' | 'active' | 'inactive' | 'former' | 'do_not_contact'
  client_type: 'individual' | 'business' | 'estate' | 'trust' | 'non_profit' | 'government'
  business_name?: string
  business_tax_id?: string
  business_type?: string
  referral_source?: string
  practice_areas?: string[]
  communication_preference?: string
  language_preference?: string
  billing_rate?: number
  payment_terms?: number
  credit_limit?: number
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  client_contacts?: ClientContact[]
}

interface ClientContact {
  id: string
  first_name: string
  last_name: string
  relationship: string
  title?: string
  email?: string
  phone?: string
  is_primary_contact: boolean
  is_authorized_contact: boolean
}

export default function ClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [clientId, setClientId] = useState<string>('')

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check permissions
  const canViewClients = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canEditClients = user && ['admin', 'associate_attorney', 'paralegal'].includes(user.role)
  const canDeleteClients = user && ['admin', 'associate_attorney'].includes(user.role)

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await params
      setClientId(resolvedParams.id)
    }
    resolveParams()
  }, [params])

  // Fetch client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(`/api/clients/${clientId}`)
        const data = await response.json()

        if (response.ok) {
          setClient(data.data?.client || data.client)
        } else {
          setError(data.error?.message || 'Failed to load client')
        }
      } catch (_error) {
        setError('Network error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (user && canViewClients && clientId) {
      fetchClient()
    }
  }, [clientId, user, canViewClients])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canViewClients) {
      router.push('/dashboard')
    }
  }, [user, canViewClients, router])

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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${styles[status as keyof typeof styles] || styles.inactive}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const handleDeleteClient = async () => {
    if (!client) return

    const confirmed = window.confirm(
      `Are you sure you want to delete ${getClientDisplayName(client)}? This action cannot be undone.`
    )

    if (confirmed) {
      try {
        const response = await fetch(`/api/clients/${clientId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          router.push('/clients')
        } else {
          const data = await response.json()
          alert(`Failed to delete client: ${data.error?.message || 'Unknown error'}`)
        }
      } catch (_error) {
        alert('Network error occurred while deleting client')
      }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canViewClients) {
    return null
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Client</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/clients')}
            className="btn-primary"
          >
            Return to Clients
          </button>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Client Not Found</h2>
          <p className="text-gray-600 mb-4">The requested client could not be found.</p>
          <button
            onClick={() => router.push('/clients')}
            className="btn-primary"
          >
            Return to Clients
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/clients')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  {client.client_type === 'business' ? (
                    <Building className="h-8 w-8 mr-3 text-blue-600" />
                  ) : (
                    <User className="h-8 w-8 mr-3 text-blue-600" />
                  )}
                  {getClientDisplayName(client)}
                </h1>
                <div className="flex items-center mt-1 space-x-4">
                  {getStatusBadge(client.client_status)}
                  <span className="text-sm text-gray-500 capitalize">
                    {client.client_type.replace('_', ' ')}
                  </span>
                  {client.practice_areas && client.practice_areas.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {client.practice_areas.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {canEditClients && (
                <button
                  onClick={() => router.push(`/clients/${clientId}/edit`)}
                  className="btn-secondary flex items-center"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </button>
              )}

              {canDeleteClients && (
                <button
                  onClick={handleDeleteClient}
                  className="btn-danger flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900">{client.first_name} {client.last_name}</p>
                </div>

                {client.preferred_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Name</label>
                    <p className="text-gray-900">{client.preferred_name}</p>
                  </div>
                )}

                {client.date_of_birth && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <p className="text-gray-900">{new Date(client.date_of_birth).toLocaleDateString()}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Type</label>
                  <p className="text-gray-900 capitalize">{client.client_type.replace('_', ' ')}</p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-green-600" />
                Contact Information
              </h3>
              
              <div className="space-y-4">
                {client.email && (
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{client.email}</p>
                      <p className="text-sm text-gray-500">Email</p>
                    </div>
                  </div>
                )}

                {client.phone_primary && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{client.phone_primary}</p>
                      <p className="text-sm text-gray-500">Primary Phone</p>
                    </div>
                  </div>
                )}

                {client.phone_secondary && (
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{client.phone_secondary}</p>
                      <p className="text-sm text-gray-500">Secondary Phone</p>
                    </div>
                  </div>
                )}

                {(client.address_line1 || client.city || client.state) && (
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                    <div>
                      {client.address_line1 && <p className="text-gray-900">{client.address_line1}</p>}
                      {client.address_line2 && <p className="text-gray-900">{client.address_line2}</p>}
                      {(client.city || client.state || client.zip_code) && (
                        <p className="text-gray-900">
                          {client.city}{client.city && client.state ? ', ' : ''}{client.state} {client.zip_code}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">Address</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Information */}
            {(client.business_name || client.business_type || client.business_tax_id) && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-orange-600" />
                  Business Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.business_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                      <p className="text-gray-900">{client.business_name}</p>
                    </div>
                  )}

                  {client.business_type && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                      <p className="text-gray-900 capitalize">{client.business_type.replace('_', ' ')}</p>
                    </div>
                  )}

                  {client.business_tax_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID</label>
                      <p className="text-gray-900">{client.business_tax_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-purple-600" />
                  Notes
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{client.notes}</p>
                </div>
              </div>
            )}

            {/* Communication History - TODO: Re-implement for Phase 5 */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Communication History</h3>
              <p className="text-gray-500">Communication history will be available in Phase 5.</p>
            </div>

            {/* Client Documents - TODO: Re-implement for Phase 5 */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Client Documents</h3>
              <p className="text-gray-500">Document management will be available in Phase 5.</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full btn-secondary text-left flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </button>
                <button className="w-full btn-secondary text-left flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Message
                </button>
                <button className="w-full btn-secondary text-left flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </button>
              </div>
            </div>

            {/* Client Details */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {getStatusBadge(client.client_status)}
                </div>

                {client.referral_source && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Referral Source</label>
                    <p className="text-gray-900">{client.referral_source}</p>
                  </div>
                )}

                {client.communication_preference && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact</label>
                    <p className="text-gray-900 capitalize">{client.communication_preference.replace('_', ' ')}</p>
                  </div>
                )}

                {client.billing_rate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Billing Rate</label>
                    <p className="text-gray-900">${client.billing_rate}/hour</p>
                  </div>
                )}

                {client.tags && client.tags.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(client.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {new Date(client.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Client Contacts */}
            {client.client_contacts && client.client_contacts.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Contacts</h3>
                <div className="space-y-3">
                  {client.client_contacts.map((contact) => (
                    <div key={contact.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                          <p className="text-sm text-gray-600">{contact.relationship}</p>
                          {contact.title && <p className="text-sm text-gray-500">{contact.title}</p>}
                        </div>
                        {contact.is_primary_contact && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Primary
                          </span>
                        )}
                      </div>
                      {contact.email && (
                        <p className="text-sm text-gray-600 mt-1">{contact.email}</p>
                      )}
                      {contact.phone && (
                        <p className="text-sm text-gray-600">{contact.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}