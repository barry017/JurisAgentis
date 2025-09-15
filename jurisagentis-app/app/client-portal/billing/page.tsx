/**
 * Client Portal - Billing & Payments
 * 
 * Transparent billing information with secure payment processing
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCardIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  TruckIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'

interface Invoice {
  id: string
  invoiceNumber: string
  matterId: string
  matterTitle: string
  invoiceDate: string
  dueDate: string
  status: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue'
  type: 'retainer' | 'service_fee' | 'final_bill' | 'expense_reimbursement'
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  amountPaid: number
  balanceDue: number
  description: string
  lineItems: {
    id: string
    description: string
    quantity: number
    rate: number
    amount: number
    type: 'service_fee' | 'expense' | 'retainer' | 'discount'
    date?: string
  }[]
  paymentTerms: number
  lateFeeRate: number
  notes?: string
  downloadUrl?: string
}

interface Payment {
  id: string
  paymentNumber: string
  invoiceId?: string
  matterId: string
  matterTitle: string
  paymentDate: string
  amount: number
  paymentMethod: 'credit_card' | 'check' | 'wire_transfer' | 'trust_account'
  status: 'received' | 'deposited' | 'cleared' | 'bounced' | 'refunded'
  referenceNumber?: string
  checkNumber?: string
  lastFourDigits?: string
  description: string
  depositedToTrust: boolean
  netAmount: number
  processingFee: number
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2025-001',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    invoiceDate: '2025-01-01',
    dueDate: '2025-01-31',
    status: 'partial_payment',
    type: 'retainer',
    subtotal: 5000,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 5000,
    amountPaid: 2500,
    balanceDue: 2500,
    description: 'Estate planning retainer - comprehensive trust and will preparation',
    lineItems: [
      {
        id: '1',
        description: 'Estate Planning Retainer',
        quantity: 1,
        rate: 5000,
        amount: 5000,
        type: 'retainer'
      }
    ],
    paymentTerms: 30,
    lateFeeRate: 1.5,
    downloadUrl: '/api/invoices/1/download'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2025-002',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    invoiceDate: '2025-01-15',
    dueDate: '2025-02-15',
    status: 'sent',
    type: 'service_fee',
    subtotal: 1200,
    discountAmount: 0,
    taxAmount: 0,
    totalAmount: 1200,
    amountPaid: 0,
    balanceDue: 1200,
    description: 'Additional services - trust funding assistance',
    lineItems: [
      {
        id: '1',
        description: 'Trust Funding Consultation',
        quantity: 3,
        rate: 300,
        amount: 900,
        type: 'service_fee',
        date: '2025-01-10'
      },
      {
        id: '2',
        description: 'Document Preparation - Asset Transfers',
        quantity: 1,
        rate: 300,
        amount: 300,
        type: 'service_fee',
        date: '2025-01-12'
      }
    ],
    paymentTerms: 30,
    lateFeeRate: 1.5,
    downloadUrl: '/api/invoices/2/download'
  }
]

const mockPayments: Payment[] = [
  {
    id: '1',
    paymentNumber: 'PAY-2025-001',
    invoiceId: '1',
    matterId: '1',
    matterTitle: 'Smith Family Estate Planning',
    paymentDate: '2025-01-05',
    amount: 2500,
    paymentMethod: 'credit_card',
    status: 'cleared',
    lastFourDigits: '4532',
    description: 'Initial retainer payment',
    depositedToTrust: true,
    netAmount: 2475,
    processingFee: 25
  }
]

const mockBillingSummary = {
  totalFees: 6200,
  totalPaid: 2500,
  currentBalance: 3700,
  trustBalance: 2475,
  lastPaymentDate: '2025-01-05',
  nextPaymentDue: '2025-02-15',
  averageMonthlyFees: 1550
}

export default function ClientBillingPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices)
  const [payments, setPayments] = useState<Payment[]>(mockPayments)
  const [summary, setSummary] = useState(mockBillingSummary)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments'>('overview')
  const [loading, setLoading] = useState(false)

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

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
      viewed: 'bg-purple-100 text-purple-800 border-purple-200',
      partial_payment: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-green-100 text-green-800 border-green-200',
      overdue: 'bg-red-100 text-red-800 border-red-200',
      received: 'bg-blue-100 text-blue-800 border-blue-200',
      deposited: 'bg-green-100 text-green-800 border-green-200',
      cleared: 'bg-green-100 text-green-800 border-green-200',
      bounced: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    
    const icons = {
      draft: DocumentTextIcon,
      sent: ClockIcon,
      viewed: EyeIcon,
      partial_payment: ExclamationTriangleIcon,
      paid: CheckCircleIcon,
      overdue: ExclamationTriangleIcon,
      received: CheckCircleIcon,
      deposited: CheckCircleIcon,
      cleared: CheckCircleIcon,
      bounced: ExclamationTriangleIcon,
      refunded: ExclamationTriangleIcon
    }
    
    const StatusIcon = icons[status as keyof typeof icons] || ClockIcon
    const statusStyle = styles[status as keyof typeof styles] || styles.draft
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusStyle}`}>
        <StatusIcon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    )
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'credit_card':
        return CreditCardIcon
      case 'check':
        return DocumentTextIcon
      case 'wire_transfer':
        return BanknotesIcon
      case 'trust_account':
        return ShieldCheckIcon
      default:
        return CreditCardIcon
    }
  }

  const handleInvoiceView = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setShowInvoiceModal(true)
  }

  const handleInvoiceDownload = (invoice: Invoice) => {
    console.log('Download invoice:', invoice.id)
    // In real implementation, would trigger download
  }

  const handleMakePayment = (invoice: Invoice) => {
    console.log('Make payment for invoice:', invoice.id)
    // In real implementation, would open secure payment modal
  }

  const getOverdueInvoices = () => {
    const now = new Date()
    return invoices.filter(invoice => 
      new Date(invoice.dueDate) < now && 
      invoice.balanceDue > 0 &&
      invoice.status !== 'paid'
    )
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
                  Billing & Payments
                </h1>
                <p className="text-gray-600 mt-1">
                  Transparent billing with secure payment processing
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="btn-secondary flex items-center">
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Export Statement
              </button>
              <button className="btn-primary flex items-center">
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Make Payment
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'overview', label: 'Overview', icon: ChartBarIcon },
                { key: 'invoices', label: 'Invoices', icon: DocumentTextIcon },
                { key: 'payments', label: 'Payment History', icon: CreditCardIcon }
              ].map(tab => {
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <TabIcon className="h-5 w-5 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm">Total Fees</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalFees)}</p>
                      </div>
                      <CurrencyDollarIcon className="h-8 w-8 text-blue-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm">Amount Paid</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.totalPaid)}</p>
                      </div>
                      <CheckCircleIcon className="h-8 w-8 text-green-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm">Balance Due</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.currentBalance)}</p>
                      </div>
                      <ExclamationTriangleIcon className="h-8 w-8 text-orange-200" />
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm">Trust Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(summary.trustBalance)}</p>
                      </div>
                      <ShieldCheckIcon className="h-8 w-8 text-purple-200" />
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {getOverdueInvoices().length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                      <div>
                        <h3 className="text-sm font-medium text-red-800">
                          {getOverdueInvoices().length} Overdue Invoice{getOverdueInvoices().length !== 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm text-red-700 mt-1">
                          You have overdue invoices totaling {formatCurrency(getOverdueInvoices().reduce((sum, inv) => sum + inv.balanceDue, 0))}. 
                          Please make a payment to avoid late fees.
                        </p>
                        <button className="mt-2 btn-primary text-sm">
                          Pay Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Invoices */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
                      <button
                        onClick={() => setActiveTab('invoices')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {invoices.slice(0, 3).map(invoice => (
                        <div key={invoice.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                            <div className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{formatCurrency(invoice.totalAmount)}</div>
                            {getStatusBadge(invoice.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Payments */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                      <button
                        onClick={() => setActiveTab('payments')}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-3">
                      {payments.slice(0, 3).map(payment => {
                        const PaymentIcon = getPaymentMethodIcon(payment.paymentMethod)
                        return (
                          <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <PaymentIcon className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{payment.paymentNumber}</div>
                                <div className="text-xs text-gray-500">{formatDate(payment.paymentDate)}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">{formatCurrency(payment.amount)}</div>
                              {getStatusBadge(payment.status)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Payment Options */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Options</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <CreditCardIcon className="h-6 w-6 text-blue-600" />
                        <h4 className="font-medium">Credit/Debit Card</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Secure online payment with instant processing
                      </p>
                      <button className="btn-primary w-full text-sm">Pay with Card</button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <BanknotesIcon className="h-6 w-6 text-green-600" />
                        <h4 className="font-medium">ACH/Bank Transfer</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Direct bank transfer with lower fees
                      </p>
                      <button className="btn-secondary w-full text-sm">Setup ACH</button>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <TruckIcon className="h-6 w-6 text-purple-600" />
                        <h4 className="font-medium">Mail Payment</h4>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Send check or money order by mail
                      </p>
                      <button className="btn-secondary w-full text-sm">Get Address</button>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <PhoneIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">Need help with payments?</p>
                        <p className="text-blue-700">Contact our billing department at (555) 123-4567 or billing@lawfirm.com</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    All Invoices ({invoices.length})
                  </h3>
                  <div className="flex space-x-2">
                    <select className="input-field">
                      <option>All Statuses</option>
                      <option>Unpaid</option>
                      <option>Overdue</option>
                      <option>Paid</option>
                    </select>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Matter
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</div>
                              <div className="text-sm text-gray-500">{formatDate(invoice.invoiceDate)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{invoice.matterTitle}</div>
                            <div className="text-sm text-gray-500">{invoice.type.replace('_', ' ')}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</div>
                            {invoice.balanceDue > 0 && (
                              <div className="text-sm text-red-600">Balance: {formatCurrency(invoice.balanceDue)}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(invoice.status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</div>
                            {new Date(invoice.dueDate) < new Date() && invoice.balanceDue > 0 && (
                              <div className="text-xs text-red-600">Overdue</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleInvoiceView(invoice)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="View Invoice"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleInvoiceDownload(invoice)}
                                className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                                title="Download Invoice"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </button>
                              {invoice.balanceDue > 0 && (
                                <button
                                  onClick={() => handleMakePayment(invoice)}
                                  className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                                >
                                  Pay
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Payment History ({payments.length})
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trust Account
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map(payment => {
                        const PaymentIcon = getPaymentMethodIcon(payment.paymentMethod)
                        return (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{payment.paymentNumber}</div>
                                <div className="text-sm text-gray-500">{payment.description}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <PaymentIcon className="h-5 w-5 text-blue-600" />
                                <div>
                                  <div className="text-sm text-gray-900">
                                    {payment.paymentMethod.replace('_', ' ').toUpperCase()}
                                  </div>
                                  {payment.lastFourDigits && (
                                    <div className="text-xs text-gray-500">**** {payment.lastFourDigits}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                              {payment.processingFee > 0 && (
                                <div className="text-xs text-gray-500">
                                  Net: {formatCurrency(payment.netAmount)}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(payment.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatDate(payment.paymentDate)}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {payment.depositedToTrust ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                                  Yes
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">No</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}