/**
 * Invoice List Page - Comprehensive invoice management
 * 
 * Features invoice listing, filtering, search, and bulk actions optimized for flat fee practice
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ChevronUpDownIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  matter_title: string
  matter_number: string
  billing_type: 'flat_fee' | 'hourly' | 'retainer'
  total_amount: number
  amount_paid: number
  balance_due: number
  status: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue' | 'collection'
  invoice_date: string
  due_date: string
  days_overdue: number
  payment_terms: string
  invoice_type: 'retainer' | 'service_fee' | 'final_bill' | 'installment'
  created_at: string
  sent_date?: string
  last_viewed?: string
}

export default function InvoicesPage() {
  const router = useRouter()
  
  // State
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [sortBy, setSortBy] = useState<'invoice_date' | 'due_date' | 'amount' | 'client_name'>('invoice_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([])

  // Load invoices
  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockInvoices: Invoice[] = [
        {
          id: '1',
          invoice_number: 'INV-20250113-001',
          client_name: 'Johnson Family Trust',
          client_email: 'mary.johnson@email.com',
          matter_title: 'Revocable Living Trust',
          matter_number: '2025-001',
          billing_type: 'flat_fee',
          total_amount: 2500.00,
          amount_paid: 1250.00,
          balance_due: 1250.00,
          status: 'sent',
          invoice_date: '2025-01-13',
          due_date: '2025-02-12',
          days_overdue: 0,
          payment_terms: 'Net 30',
          invoice_type: 'service_fee',
          created_at: '2025-01-13T10:00:00Z',
          sent_date: '2025-01-13T14:30:00Z'
        },
        {
          id: '2',
          invoice_number: 'INV-20250112-002',
          client_name: 'TechStart Innovations LLC',
          client_email: 'contact@techstart.com',
          matter_title: 'Business Formation',
          matter_number: '2025-002',
          billing_type: 'flat_fee',
          total_amount: 1200.00,
          amount_paid: 0,
          balance_due: 1200.00,
          status: 'overdue',
          invoice_date: '2025-01-12',
          due_date: '2025-01-10',
          days_overdue: 3,
          payment_terms: 'Due upon receipt',
          invoice_type: 'service_fee',
          created_at: '2025-01-12T09:00:00Z',
          sent_date: '2025-01-12T11:00:00Z',
          last_viewed: '2025-01-12T16:00:00Z'
        },
        {
          id: '3',
          invoice_number: 'RET-20250110-001',
          client_name: 'Williams Estate',
          client_email: 'executor@williamsestate.com',
          matter_title: 'Estate Administration',
          matter_number: '2025-003',
          billing_type: 'retainer',
          total_amount: 1500.00,
          amount_paid: 1500.00,
          balance_due: 0,
          status: 'paid',
          invoice_date: '2025-01-10',
          due_date: '2025-01-10',
          days_overdue: 0,
          payment_terms: 'Due upon receipt',
          invoice_type: 'retainer',
          created_at: '2025-01-10T08:00:00Z',
          sent_date: '2025-01-10T08:30:00Z'
        },
        {
          id: '4',
          invoice_number: 'INV-20250108-001',
          client_name: 'Anderson Family',
          client_email: 'john.anderson@email.com',
          matter_title: 'Simple Will Package',
          matter_number: '2025-004',
          billing_type: 'flat_fee',
          total_amount: 800.00,
          amount_paid: 800.00,
          balance_due: 0,
          status: 'paid',
          invoice_date: '2025-01-08',
          due_date: '2025-02-07',
          days_overdue: 0,
          payment_terms: 'Net 30',
          invoice_type: 'service_fee',
          created_at: '2025-01-08T15:00:00Z',
          sent_date: '2025-01-08T15:30:00Z'
        },
        {
          id: '5',
          invoice_number: 'DRAFT-20250113-001',
          client_name: 'Miller Corporation',
          client_email: 'legal@millercorp.com',
          matter_title: 'Contract Review',
          matter_number: '2025-005',
          billing_type: 'flat_fee',
          total_amount: 950.00,
          amount_paid: 0,
          balance_due: 950.00,
          status: 'draft',
          invoice_date: '2025-01-13',
          due_date: '2025-02-12',
          days_overdue: 0,
          payment_terms: 'Net 30',
          invoice_type: 'service_fee',
          created_at: '2025-01-13T16:00:00Z'
        }
      ]
      
      setInvoices(mockInvoices)
    } catch (error) {
      console.error('Error loading invoices:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string, daysOverdue: number = 0) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      viewed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      partial_payment: 'bg-orange-100 text-orange-800 border-orange-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      collection: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    
    return (
      <div className="flex items-center space-x-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
          {status === 'overdue' && daysOverdue > 0 && (
            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
          )}
          {status === 'paid' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </span>
        {status === 'overdue' && daysOverdue > 0 && (
          <span className="text-xs text-red-600 font-medium">
            {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
          </span>
        )}
      </div>
    )
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoices(prev => 
      prev.includes(invoiceId) 
        ? prev.filter(id => id !== invoiceId)
        : [...prev, invoiceId]
    )
  }

  const handleSelectAll = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([])
    } else {
      setSelectedInvoices(filteredInvoices.map(inv => inv.id))
    }
  }

  const handleBulkAction = (action: 'send' | 'print' | 'export' | 'delete') => {
    console.log(`Bulk action: ${action} for invoices:`, selectedInvoices)
    // TODO: Implement bulk actions
  }

  // Filter and sort invoices
  const filteredInvoices = invoices
    .filter(invoice => {
      const matchesSearch = 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.matter_title.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      const matchesType = typeFilter === 'all' || invoice.billing_type === typeFilter
      
      return matchesSearch && matchesStatus && matchesType
    })
    .sort((a, b) => {
      const aValue = a[sortBy]
      const bValue = b[sortBy]
      const modifier = sortOrder === 'asc' ? 1 : -1
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * modifier
      }
      
      return ((aValue as number) - (bValue as number)) * modifier
    })

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance_due, 0)
  const overdueAmount = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.balance_due, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                Invoices
              </h1>
              <p className="text-gray-600 mt-1">
                Manage and track all invoices and payments
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/billing/invoices/new')}
                className="btn-primary flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Invoice
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
              
              {selectedInvoices.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleBulkAction('send')}
                    className="btn-secondary flex items-center"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 mr-1" />
                    Send ({selectedInvoices.length})
                  </button>
                  
                  <button
                    onClick={() => handleBulkAction('export')}
                    className="btn-secondary flex items-center"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                    Export ({selectedInvoices.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overdueAmount)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="viewed">Viewed</option>
                    <option value="partial_payment">Partial Payment</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="collection">Collection</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Types</option>
                    <option value="flat_fee">Flat Fee</option>
                    <option value="hourly">Hourly</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="input-field"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="quarter">This Quarter</option>
                    <option value="year">This Year</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No invoices found</p>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first invoice'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedInvoices.length === filteredInvoices.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('invoice_date')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Invoice</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('client_name')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Client & Matter</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('amount')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Amount</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        onClick={() => handleSort('due_date')}
                        className="flex items-center space-x-1 hover:text-gray-700"
                      >
                        <span>Due Date</span>
                        <ChevronUpDownIcon className="h-4 w-4" />
                      </button>
                    </th>
                    
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-500">{formatDate(invoice.invoice_date)}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{invoice.client_name}</div>
                          <div className="text-sm text-gray-500">{invoice.matter_title}</div>
                          <div className="text-xs text-gray-400">{invoice.matter_number}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{formatCurrency(invoice.total_amount)}</div>
                          {invoice.amount_paid > 0 && (
                            <div className="text-sm text-green-600">
                              Paid: {formatCurrency(invoice.amount_paid)}
                            </div>
                          )}
                          {invoice.balance_due > 0 && (
                            <div className="text-sm text-gray-500">
                              Due: {formatCurrency(invoice.balance_due)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        {getStatusBadge(invoice.status, invoice.days_overdue)}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm text-gray-900">{formatDate(invoice.due_date)}</div>
                          <div className="text-xs text-gray-500">{invoice.payment_terms}</div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => router.push(`/billing/invoices/${invoice.id}`)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Invoice"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => router.push(`/billing/invoices/${invoice.id}/edit`)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Edit Invoice"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          
                          {invoice.status === 'draft' && (
                            <button
                              onClick={() => console.log('Send invoice:', invoice.id)}
                              className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                              title="Send Invoice"
                            >
                              <PaperAirplaneIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => console.log('Print invoice:', invoice.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Print Invoice"
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}