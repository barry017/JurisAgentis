/**
 * Billing Dashboard - Optimized for flat fee practice
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  BanknotesIcon, 
  PlusIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ReceiptRefundIcon,
  DocumentTextIcon,
  EyeIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  PrinterIcon
} from '@heroicons/react/24/outline'

interface BillingStats {
  totalRevenue: number
  outstandingInvoices: number
  overdueAmount: number
  collectionsNeeded: number
  averagePaymentDays: number
  thisMonthInvoiced: number
  thisMonthCollected: number
  pendingRetainers: number
}

interface RecentInvoice {
  id: string
  invoice_number: string
  client_name: string
  matter_title: string
  total_amount: number
  balance_due: number
  status: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue' | 'collection'
  due_date: string
  days_overdue: number
  invoice_type: 'retainer' | 'service_fee' | 'final_bill' | 'installment'
}

interface RecentPayment {
  id: string
  client_name: string
  amount: number
  payment_method: string
  payment_date: string
  invoice_number: string
  payment_status: 'received' | 'deposited' | 'cleared'
}

export default function BillingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // State for billing data
  const [stats, setStats] = useState<BillingStats>({
    totalRevenue: 0,
    outstandingInvoices: 0,
    overdueAmount: 0,
    collectionsNeeded: 0,
    averagePaymentDays: 0,
    thisMonthInvoiced: 0,
    thisMonthCollected: 0,
    pendingRetainers: 0
  })

  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([])
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Check permissions - billing requires financial access
  useEffect(() => {
    if (user && !['admin', 'associate_attorney'].includes(user.role)) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Load billing data
  useEffect(() => {
    if (user) {
      loadBillingData()
    }
  }, [user])

  const loadBillingData = async () => {
    try {
      setLoadingData(true)
      
      // Mock data for demonstration - replace with actual API calls
      setStats({
        totalRevenue: 125000,
        outstandingInvoices: 18500,
        overdueAmount: 4500,
        collectionsNeeded: 3,
        averagePaymentDays: 12,
        thisMonthInvoiced: 22000,
        thisMonthCollected: 19500,
        pendingRetainers: 8
      })

      setRecentInvoices([
        {
          id: '1',
          invoice_number: '2025-INV-0023',
          client_name: 'Johnson Family Trust',
          matter_title: 'Revocable Living Trust',
          total_amount: 2500,
          balance_due: 1250,
          status: 'sent',
          due_date: '2025-02-15',
          days_overdue: 0,
          invoice_type: 'service_fee'
        },
        {
          id: '2',
          invoice_number: '2025-INV-0022',
          client_name: 'Smith LLC',
          matter_title: 'Business Formation',
          total_amount: 1200,
          balance_due: 1200,
          status: 'overdue',
          due_date: '2025-01-10',
          days_overdue: 3,
          invoice_type: 'service_fee'
        },
        {
          id: '3',
          invoice_number: '2025-RET-0015',
          client_name: 'Williams Estate',
          matter_title: 'Estate Administration',
          total_amount: 1500,
          balance_due: 0,
          status: 'paid',
          due_date: '2025-01-05',
          days_overdue: 0,
          invoice_type: 'retainer'
        }
      ])

      setRecentPayments([
        {
          id: '1',
          client_name: 'Davis Family',
          amount: 800,
          payment_method: 'check',
          payment_date: '2025-01-12',
          invoice_number: '2025-INV-0020',
          payment_status: 'cleared'
        },
        {
          id: '2',
          client_name: 'Anderson Trust',
          amount: 2500,
          payment_method: 'credit_card',
          payment_date: '2025-01-11',
          invoice_number: '2025-INV-0019',
          payment_status: 'cleared'
        }
      ])

    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setLoadingData(false)
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

  const getPaymentStatusBadge = (status: string) => {
    const statusStyles = {
      received: 'bg-blue-100 text-blue-800',
      deposited: 'bg-yellow-100 text-yellow-800',
      cleared: 'bg-green-100 text-green-800',
      bounced: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status as keyof typeof statusStyles] || statusStyles.received}`}>
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BanknotesIcon className="h-8 w-8 mr-3 text-green-600" />
                Billing & Payments
              </h1>
              <p className="text-gray-600 mt-1">
                Flat fee billing dashboard and payment tracking
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
                onClick={() => router.push('/billing/fee-schedules')}
                className="btn-secondary flex items-center"
              >
                <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                Fee Schedules
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loadingData ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading billing data...</p>
          </div>
        ) : (
          <>
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Revenue (YTD)</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Outstanding Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.outstandingInvoices)}</p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Overdue Amount</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.overdueAmount)}</p>
                    {stats.collectionsNeeded > 0 && (
                      <p className="text-xs text-red-600">{stats.collectionsNeeded} need collection</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Avg Collection Days</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.averagePaymentDays}</p>
                    <p className="text-xs text-gray-500">days to payment</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">This Month</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-sm text-gray-600">Invoiced</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(stats.thisMonthInvoiced)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ArrowTrendingDownIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-sm text-gray-600">Collected</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(stats.thisMonthCollected)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ReceiptRefundIcon className="h-5 w-5 text-orange-600 mr-2" />
                      <span className="text-sm text-gray-600">Pending Retainers</span>
                    </div>
                    <span className="font-semibold">{stats.pendingRetainers}</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/billing/invoices')}
                    className="w-full flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <DocumentTextIcon className="h-6 w-6 text-blue-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">All Invoices</div>
                      <div className="text-sm text-gray-500">View and manage invoices</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => router.push('/billing/payments')}
                    className="w-full flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <BanknotesIcon className="h-6 w-6 text-green-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Record Payment</div>
                      <div className="text-sm text-gray-500">Enter received payments</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => router.push('/billing/reports')}
                    className="w-full flex items-center p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <ChartBarIcon className="h-6 w-6 text-purple-600 mr-3" />
                    <div>
                      <div className="font-medium text-gray-900">Financial Reports</div>
                      <div className="text-sm text-gray-500">Revenue and collections</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Alerts</h3>
                <div className="space-y-3">
                  {stats.overdueAmount > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                        <span className="text-sm font-medium text-red-900">Overdue Invoices</span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        {formatCurrency(stats.overdueAmount)} in overdue payments need attention
                      </p>
                    </div>
                  )}
                  
                  {stats.pendingRetainers > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center">
                        <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
                        <span className="text-sm font-medium text-yellow-900">Pending Retainers</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        {stats.pendingRetainers} clients need to pay retainers before work begins
                      </p>
                    </div>
                  )}
                  
                  {stats.overdueAmount === 0 && stats.pendingRetainers === 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                        <span className="text-sm font-medium text-green-900">All Clear</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">
                        No overdue invoices or pending retainers
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Invoices */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                  <button
                    onClick={() => router.push('/billing/invoices')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentInvoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
                        <div className="text-sm text-gray-600">{invoice.client_name}</div>
                        <div className="text-xs text-gray-500">{invoice.matter_title}</div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(invoice.balance_due)}</div>
                          <div className="text-xs text-gray-500">Due {formatDate(invoice.due_date)}</div>
                        </div>
                        {getStatusBadge(invoice.status, invoice.days_overdue)}
                      </div>
                      
                      <div className="flex space-x-2 ml-4">
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
                            onClick={() => {
                              // TODO: Implement send invoice functionality
                              console.log('Send invoice:', invoice.id)
                            }}
                            className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                            title="Send Invoice"
                          >
                            <PaperAirplaneIcon className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => {
                            // TODO: Implement print functionality
                            console.log('Print invoice:', invoice.id)
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Print Invoice"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Payments */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                  <button
                    onClick={() => router.push('/billing/payments')}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    View All →
                  </button>
                </div>
                
                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{payment.client_name}</div>
                        <div className="text-sm text-gray-600">
                          {payment.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </div>
                        <div className="text-xs text-gray-500">
                          Invoice: {payment.invoice_number}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-right">
                          <div className="font-semibold text-green-600">{formatCurrency(payment.amount)}</div>
                          <div className="text-xs text-gray-500">{formatDate(payment.payment_date)}</div>
                        </div>
                        {getPaymentStatusBadge(payment.payment_status)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}