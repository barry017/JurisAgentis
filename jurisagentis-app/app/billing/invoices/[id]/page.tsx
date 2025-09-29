/**
 * Invoice Detail View Page
 * 
 * Comprehensive invoice viewing with payment recording and actions
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  PencilSquareIcon,
  PaperAirplaneIcon,
  PrinterIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  BanknotesIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

interface InvoiceDetail {
  id: string
  invoice_number: string
  client: {
    name: string
    email: string
    phone?: string
    address?: {
      street: string
      city: string
      state: string
      zip: string
    }
  }
  matter: {
    number: string
    title: string
    description?: string
  }
  billing_type: 'flat_fee' | 'hourly' | 'retainer'
  line_items: {
    id: string
    description: string
    quantity: number
    rate?: number
    amount: number
  }[]
  subtotal: number
  discount_percentage: number
  discount_amount: number
  total_amount: number
  amount_paid: number
  balance_due: number
  status: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue' | 'collection'
  invoice_date: string
  due_date: string
  payment_terms: string
  notes?: string
  payment_history: {
    id: string
    amount: number
    payment_method: string
    payment_date: string
    reference_number?: string
    notes?: string
  }[]
  created_at: string
  sent_date?: string
  last_viewed?: string
  days_overdue: number
}

interface PaymentModalProps {
  invoice: InvoiceDetail
  onClose: () => void
  onPaymentRecorded: (payment: { amount: number; method: string; date: string; reference?: string; notes?: string }) => void
}

function PaymentModal({ invoice, onClose, onPaymentRecorded }: PaymentModalProps) {
  const [amount, setAmount] = useState(invoice.balance_due.toString())
  const [paymentMethod, setPaymentMethod] = useState('check')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const paymentData = {
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        reference_number: referenceNumber,
        notes
      }

      // Mock payment recording - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onPaymentRecorded(paymentData)
      onClose()
    } catch (error) {
      console.error('Error recording payment:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h3>
        
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
            <p className="text-xs text-gray-500 mt-1">
              Balance due: ${invoice.balance_due.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
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
              Reference Number (Optional)
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="input-field"
              placeholder="Check number, transaction ID, etc."
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

export default function InvoiceViewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [params.id, loadInvoice])

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockInvoice: InvoiceDetail = {
        id: params.id,
        invoice_number: 'INV-20250113-001',
        client: {
          name: 'Johnson Family Trust',
          email: 'mary.johnson@email.com',
          phone: '(555) 123-4567',
          address: {
            street: '123 Main Street',
            city: 'Birmingham',
            state: 'AL',
            zip: '35201'
          }
        },
        matter: {
          number: '2025-001',
          title: 'Revocable Living Trust',
          description: 'Complete estate planning package including revocable living trust, pour-over will, and powers of attorney'
        },
        billing_type: 'flat_fee',
        line_items: [
          {
            id: '1',
            description: 'Revocable Living Trust',
            quantity: 1,
            amount: 1800.00
          },
          {
            id: '2',
            description: 'Pour-over Will',
            quantity: 1,
            amount: 400.00
          },
          {
            id: '3',
            description: 'Financial Power of Attorney',
            quantity: 1,
            amount: 150.00
          },
          {
            id: '4',
            description: 'Healthcare Power of Attorney',
            quantity: 1,
            amount: 150.00
          }
        ],
        subtotal: 2500.00,
        discount_percentage: 0,
        discount_amount: 0,
        total_amount: 2500.00,
        amount_paid: 1250.00,
        balance_due: 1250.00,
        status: 'sent',
        invoice_date: '2025-01-13',
        due_date: '2025-02-12',
        payment_terms: 'Net 30',
        notes: 'Thank you for choosing our estate planning services. Please remit payment within 30 days.',
        payment_history: [
          {
            id: '1',
            amount: 1250.00,
            payment_method: 'check',
            payment_date: '2025-01-15',
            reference_number: '1001',
            notes: 'Initial retainer payment'
          }
        ],
        created_at: '2025-01-13T10:00:00Z',
        sent_date: '2025-01-13T14:30:00Z',
        last_viewed: '2025-01-14T09:00:00Z',
        days_overdue: 0
      }
      
      setInvoice(mockInvoice)
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
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
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusStyles[status as keyof typeof statusStyles] || statusStyles.draft}`}>
        {status === 'overdue' && daysOverdue > 0 && (
          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
        )}
        {status === 'paid' && <CheckCircleIcon className="h-4 w-4 mr-1" />}
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </span>
    )
  }

  const handlePaymentRecorded = (paymentData: { amount: number; payment_method: string; payment_date: string; notes?: string }) => {
    if (invoice) {
      const newPayment = {
        ...paymentData,
        id: `payment-${Date.now()}`
      }
      
      const updatedInvoice = {
        ...invoice,
        amount_paid: invoice.amount_paid + paymentData.amount,
        balance_due: invoice.balance_due - paymentData.amount,
        payment_history: [...invoice.payment_history, newPayment],
        status: invoice.balance_due - paymentData.amount <= 0 ? 'paid' as const : 'partial_payment' as const
      }
      
      setInvoice(updatedInvoice)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-600 mb-4">The requested invoice could not be found.</p>
          <button
            onClick={() => router.push('/billing/invoices')}
            className="btn-primary"
          >
            Back to Invoices
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
                onClick={() => router.push('/billing/invoices')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-4"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                  {invoice.invoice_number}
                </h1>
                <div className="flex items-center space-x-4 mt-1">
                  {getStatusBadge(invoice.status, invoice.days_overdue)}
                  <span className="text-gray-600">Created {formatDate(invoice.created_at)}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {invoice.balance_due > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="btn-primary flex items-center"
                >
                  <BanknotesIcon className="h-5 w-5 mr-2" />
                  Record Payment
                </button>
              )}
              
              <button
                onClick={() => router.push(`/billing/invoices/${invoice.id}/edit`)}
                className="btn-secondary flex items-center"
              >
                <PencilSquareIcon className="h-5 w-5 mr-2" />
                Edit
              </button>
              
              {invoice.status === 'draft' && (
                <button
                  onClick={() => console.log('Send invoice')}
                  className="btn-secondary flex items-center"
                >
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                  Send
                </button>
              )}
              
              <button
                onClick={() => console.log('Print invoice')}
                className="btn-secondary flex items-center"
              >
                <PrinterIcon className="h-5 w-5 mr-2" />
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Invoice Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Bill To</h3>
                  <div className="text-sm text-gray-600">
                    <div className="font-medium text-gray-900 mb-2">{invoice.client.name}</div>
                    {invoice.client.address && (
                      <div className="space-y-1">
                        <div>{invoice.client.address.street}</div>
                        <div>{invoice.client.address.city}, {invoice.client.address.state} {invoice.client.address.zip}</div>
                      </div>
                    )}
                    <div className="mt-2">{invoice.client.email}</div>
                    {invoice.client.phone && <div>{invoice.client.phone}</div>}
                  </div>
                </div>

                {/* Invoice Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Date:</span>
                      <span className="font-medium">{formatDate(invoice.invoice_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{formatDate(invoice.due_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Terms:</span>
                      <span className="font-medium">{invoice.payment_terms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Matter:</span>
                      <span className="font-medium">{invoice.matter.number}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Matter Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Matter Information</h3>
              <div className="text-sm text-gray-600">
                <div className="font-medium text-gray-900 mb-2">{invoice.matter.title}</div>
                {invoice.matter.description && (
                  <p className="text-gray-600">{invoice.matter.description}</p>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Services & Fees</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  
                  <tbody className="bg-white divide-y divide-gray-200">
                    {invoice.line_items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.description}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-center">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan={2} className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                        Subtotal:
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(invoice.subtotal)}
                      </td>
                    </tr>
                    
                    {invoice.discount_amount > 0 && (
                      <tr>
                        <td colSpan={2} className="px-6 py-3 text-sm font-medium text-green-600 text-right">
                          Discount ({invoice.discount_percentage}%):
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-green-600 text-right">
                          -{formatCurrency(invoice.discount_amount)}
                        </td>
                      </tr>
                    )}
                    
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={2} className="px-6 py-4 text-lg font-bold text-gray-900 text-right">
                        Total:
                      </td>
                      <td className="px-6 py-4 text-lg font-bold text-gray-900 text-right">
                        {formatCurrency(invoice.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">{formatCurrency(invoice.amount_paid)}</span>
                </div>
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Balance Due:</span>
                  <span className={invoice.balance_due > 0 ? 'text-red-600' : 'text-green-600'}>
                    {formatCurrency(invoice.balance_due)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            {invoice.payment_history.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
                
                <div className="space-y-4">
                  {invoice.payment_history.map((payment) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        <div>Method: {payment.payment_method.replace('_', ' ')}</div>
                        {payment.reference_number && (
                          <div>Ref: {payment.reference_number}</div>
                        )}
                        {payment.notes && (
                          <div className="mt-1 text-xs">{payment.notes}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invoice Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Activity</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                  <div>
                    <span className="text-gray-600">Created:</span>
                    <span className="ml-1 font-medium">{formatDate(invoice.created_at)}</span>
                  </div>
                </div>
                
                {invoice.sent_date && (
                  <div className="flex items-center">
                    <PaperAirplaneIcon className="h-4 w-4 text-blue-600 mr-2" />
                    <div>
                      <span className="text-gray-600">Sent:</span>
                      <span className="ml-1 font-medium">{formatDate(invoice.sent_date)}</span>
                    </div>
                  </div>
                )}
                
                {invoice.last_viewed && (
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-yellow-600 mr-2" />
                    <div>
                      <span className="text-gray-600">Last Viewed:</span>
                      <span className="ml-1 font-medium">{formatDate(invoice.last_viewed)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
}