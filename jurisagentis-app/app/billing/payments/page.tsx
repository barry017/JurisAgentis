/**
 * Payment Management Page
 * 
 * Comprehensive payment recording, tracking, and reconciliation
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BanknotesIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChevronUpDownIcon,
  EyeIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

interface Payment {
  id: string
  client_name: string
  client_email: string
  matter_number: string
  matter_title: string
  invoice_number: string
  invoice_id: string
  amount: number
  payment_method: 'check' | 'credit_card' | 'bank_transfer' | 'cash' | 'wire_transfer'
  payment_date: string
  reference_number?: string
  deposit_date?: string
  cleared_date?: string
  payment_status: 'received' | 'deposited' | 'cleared' | 'bounced' | 'refunded'
  notes?: string
  created_at: string
  created_by: string
  reconciled: boolean
}

interface OutstandingInvoice {
  id: string
  invoice_number: string
  client_name: string
  matter_title: string
  total_amount: number
  amount_paid: number
  balance_due: number
  due_date: string
  days_overdue: number
  status: string
}

interface QuickPaymentModalProps {
  invoice: OutstandingInvoice | null
  onClose: () => void
  onPaymentRecorded: (payment: any) => void
}

function QuickPaymentModal({ invoice, onClose, onPaymentRecorded }: QuickPaymentModalProps) {
  const [amount, setAmount] = useState(invoice?.balance_due.toString() || '0')
  const [paymentMethod, setPaymentMethod] = useState<Payment['payment_method']>('check')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice) return

    setLoading(true)

    try {
      const paymentData = {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        client_name: invoice.client_name,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber,
        notes,
        payment_status: 'received' as const
      }

      // Mock payment recording
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onPaymentRecorded(paymentData)
      onClose()
    } catch (error) {
      console.error('Error recording payment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!invoice) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h3>
        
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
            <div>{invoice.client_name}</div>
            <div>{invoice.matter_title}</div>
            <div className="mt-2">
              <span className="font-medium">Balance Due: </span>
              <span className="text-green-600 font-bold">
                ${invoice.balance_due.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={invoice.balance_due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as Payment['payment_method'])}
              className="input-field"
              required
            >
              <option value="check">Check</option>
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="wire_transfer">Wire Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="input-field"
              placeholder="Check #, transaction ID, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={3}
              placeholder="Additional payment notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PaymentsPage() {
  const router = useRouter()
  
  // State
  const [payments, setPayments] = useState<Payment[]>([])
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [sortBy, setSortBy] = useState<'payment_date' | 'amount' | 'client_name'>('payment_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showQuickPayment, setShowQuickPayment] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<OutstandingInvoice | null>(null)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Mock payments data
      const mockPayments: Payment[] = [
        {
          id: '1',
          client_name: 'Johnson Family Trust',
          client_email: 'mary.johnson@email.com',
          matter_number: '2025-001',
          matter_title: 'Revocable Living Trust',
          invoice_number: 'INV-20250113-001',
          invoice_id: '1',
          amount: 1250.00,
          payment_method: 'check',
          payment_date: '2025-01-15',
          reference_number: '1001',
          deposit_date: '2025-01-16',
          cleared_date: '2025-01-17',
          payment_status: 'cleared',
          notes: 'Initial retainer payment',
          created_at: '2025-01-15T10:00:00Z',
          created_by: 'Admin User',
          reconciled: true
        },
        {
          id: '2',
          client_name: 'Anderson Family',
          client_email: 'john.anderson@email.com',
          matter_number: '2025-004',
          matter_title: 'Simple Will Package',
          invoice_number: 'INV-20250108-001',
          invoice_id: '4',
          amount: 800.00,
          payment_method: 'credit_card',
          payment_date: '2025-01-10',
          reference_number: 'CC-789456',
          cleared_date: '2025-01-10',
          payment_status: 'cleared',
          created_at: '2025-01-10T14:30:00Z',
          created_by: 'Admin User',
          reconciled: true
        },
        {
          id: '3',
          client_name: 'Williams Estate',
          client_email: 'executor@williamsestate.com',
          matter_number: '2025-003',
          matter_title: 'Estate Administration',
          invoice_number: 'RET-20250110-001',
          invoice_id: '3',
          amount: 1500.00,
          payment_method: 'bank_transfer',
          payment_date: '2025-01-11',
          reference_number: 'TXN-123789',
          deposit_date: '2025-01-11',
          payment_status: 'deposited',
          created_at: '2025-01-11T09:15:00Z',
          created_by: 'Admin User',
          reconciled: false
        }
      ]

      // Mock outstanding invoices
      const mockOutstandingInvoices: OutstandingInvoice[] = [
        {
          id: '1',
          invoice_number: 'INV-20250113-001',
          client_name: 'Johnson Family Trust',
          matter_title: 'Revocable Living Trust',
          total_amount: 2500.00,
          amount_paid: 1250.00,
          balance_due: 1250.00,
          due_date: '2025-02-12',
          days_overdue: 0,
          status: 'sent'
        },
        {
          id: '2',
          invoice_number: 'INV-20250112-002',
          client_name: 'TechStart Innovations LLC',
          matter_title: 'Business Formation',
          total_amount: 1200.00,
          amount_paid: 0,
          balance_due: 1200.00,
          due_date: '2025-01-10',
          days_overdue: 3,
          status: 'overdue'
        },
        {
          id: '5',
          invoice_number: 'DRAFT-20250113-001',
          client_name: 'Miller Corporation',
          matter_title: 'Contract Review',
          total_amount: 950.00,
          amount_paid: 0,
          balance_due: 950.00,
          due_date: '2025-02-12',
          days_overdue: 0,
          status: 'draft'
        }
      ]
      
      setPayments(mockPayments)
      setOutstandingInvoices(mockOutstandingInvoices)
    } catch (error) {
      console.error('Error loading data:', error)
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

  const getStatusBadge = (status: Payment['payment_status']) => {
    const statusStyles = {
      received: 'bg-blue-100 text-blue-800 border-blue-200',
      deposited: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cleared: 'bg-green-100 text-green-800 border-green-200',
      bounced: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyles[status]}`}>
        {status === 'cleared' && <CheckCircleIcon className="h-3 w-3 mr-1" />}
        {status === 'bounced' && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
        {status === 'deposited' && <ClockIcon className="h-3 w-3 mr-1" />}
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
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

  const handleQuickPayment = (invoice: OutstandingInvoice) => {
    setSelectedInvoice(invoice)
    setShowQuickPayment(true)
  }

  const handlePaymentRecorded = (paymentData: any) => {
    const newPayment: Payment = {
      id: `payment-${Date.now()}`,
      ...paymentData,
      created_at: new Date().toISOString(),
      created_by: 'Current User',
      reconciled: false
    }
    
    setPayments(prev => [newPayment, ...prev])
    
    // Update outstanding invoice
    setOutstandingInvoices(prev => 
      prev.map(inv => 
        inv.id === paymentData.invoice_id 
          ? { 
              ...inv, 
              amount_paid: inv.amount_paid + paymentData.amount,
              balance_due: inv.balance_due - paymentData.amount
            }
          : inv
      )
    )
  }

  // Filter and sort payments
  const filteredPayments = payments
    .filter(payment => {
      const matchesSearch = 
        payment.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.reference_number?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter
      const matchesMethod = methodFilter === 'all' || payment.payment_method === methodFilter
      
      return matchesSearch && matchesStatus && matchesMethod
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

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)
  const unclearedPayments = payments.filter(p => p.payment_status !== 'cleared')
  const totalUncleared = unclearedPayments.reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-green-600" />
                Payment Management
              </h1>
              <p className="text-gray-600 mt-1">
                Record and track client payments
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </button>
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
                <p className="text-sm font-medium text-gray-500">Total Payments</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPayments)}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Uncleared Payments</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalUncleared)}</p>
                <p className="text-xs text-gray-500">{unclearedPayments.length} payments</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Outstanding Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{outstandingInvoices.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Outstanding Invoices */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Outstanding Invoices</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {outstandingInvoices.map((invoice) => (
                    <div key={invoice.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                          <div className="text-sm text-gray-600">{invoice.client_name}</div>
                          <div className="text-xs text-gray-500">{invoice.matter_title}</div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-bold text-gray-900">
                            {formatCurrency(invoice.balance_due)}
                          </div>
                          <div className="text-xs text-gray-500">
                            Due: {formatDate(invoice.due_date)}
                          </div>
                          {invoice.days_overdue > 0 && (
                            <div className="text-xs text-red-600">
                              {invoice.days_overdue} days overdue
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleQuickPayment(invoice)}
                        className="w-full btn-primary text-sm py-2"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Record Payment
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search payments..."
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
                          <option value="received">Received</option>
                          <option value="deposited">Deposited</option>
                          <option value="cleared">Cleared</option>
                          <option value="bounced">Bounced</option>
                          <option value="refunded">Refunded</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Payment Method
                        </label>
                        <select
                          value={methodFilter}
                          onChange={(e) => setMethodFilter(e.target.value)}
                          className="input-field"
                        >
                          <option value="all">All Methods</option>
                          <option value="check">Check</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="wire_transfer">Wire Transfer</option>
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
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment List */}
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading payments...</p>
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-8 text-center">
                  <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg">No payments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('payment_date')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Date</span>
                            <ChevronUpDownIcon className="h-4 w-4" />
                          </button>
                        </th>
                        
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort('client_name')}
                            className="flex items-center space-x-1 hover:text-gray-700"
                          >
                            <span>Client & Invoice</span>
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
                          Method & Reference
                        </th>
                        
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDate(payment.payment_date)}</div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{payment.client_name}</div>
                              <div className="text-sm text-gray-500">{payment.invoice_number}</div>
                              <div className="text-xs text-gray-400">{payment.matter_title}</div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm text-gray-900">
                                {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                              {payment.reference_number && (
                                <div className="text-xs text-gray-500">Ref: {payment.reference_number}</div>
                              )}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            {getStatusBadge(payment.payment_status)}
                          </td>
                          
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => router.push(`/billing/invoices/${payment.invoice_id}`)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View Invoice"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              
                              <button
                                onClick={() => console.log('Edit payment:', payment.id)}
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Edit Payment"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
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
      </div>

      {/* Quick Payment Modal */}
      {showQuickPayment && (
        <QuickPaymentModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowQuickPayment(false)
            setSelectedInvoice(null)
          }}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
}