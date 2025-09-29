/**
 * Edit Invoice Page - Comprehensive invoice editing
 * 
 * Allows editing of existing invoices with validation and flat fee optimization
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface FlatFeeTemplate {
  id: string
  name: string
  category: string
  base_amount: number
  description: string
  line_items: {
    description: string
    amount: number
  }[]
}

interface Matter {
  id: string
  matter_number: string
  title: string
  client: {
    id: string
    name: string
    email: string
  }
}

interface LineItem {
  id: string
  description: string
  amount: number
  quantity: number
  rate?: number
}

interface InvoiceEditData {
  id: string
  invoice_number: string
  matter_id: string
  billing_type: 'flat_fee' | 'hourly' | 'retainer'
  line_items: LineItem[]
  due_date: string
  payment_terms: string
  notes: string
  discount: number
  status: 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue' | 'collection'
  total_amount: number
  amount_paid: number
}

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  const router = useRouter()

  // Form state
  const [invoice, setInvoice] = useState<InvoiceEditData | null>(null)
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null)
  const [billingType, setBillingType] = useState<'flat_fee' | 'hourly' | 'retainer'>('flat_fee')
  const [selectedTemplate, setSelectedTemplate] = useState<FlatFeeTemplate | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Net 30')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState(0)
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showMatterSelector, setShowMatterSelector] = useState(false)
  const [canEdit, setCanEdit] = useState(true)

  // Mock data
  const [flatFeeTemplates] = useState<FlatFeeTemplate[]>([
    {
      id: '1',
      name: 'Basic Estate Planning Package',
      category: 'Estate Planning',
      base_amount: 2500.00,
      description: 'Complete estate planning package including will, trust, and powers of attorney',
      line_items: [
        { description: 'Revocable Living Trust', amount: 1800.00 },
        { description: 'Pour-over Will', amount: 400.00 },
        { description: 'Financial Power of Attorney', amount: 150.00 },
        { description: 'Healthcare Power of Attorney', amount: 150.00 }
      ]
    },
    {
      id: '2',
      name: 'LLC Formation Standard',
      category: 'Business Formation',
      base_amount: 1200.00,
      description: 'Standard LLC formation with basic operating agreement',
      line_items: [
        { description: 'LLC Formation & State Filing', amount: 800.00 },
        { description: 'Basic Operating Agreement', amount: 400.00 }
      ]
    },
    {
      id: '3',
      name: 'Simple Will Package',
      category: 'Estate Planning',
      base_amount: 800.00,
      description: 'Simple will with basic estate planning documents',
      line_items: [
        { description: 'Last Will and Testament', amount: 500.00 },
        { description: 'Financial Power of Attorney', amount: 150.00 },
        { description: 'Healthcare Power of Attorney', amount: 150.00 }
      ]
    }
  ])

  const [availableMatters] = useState<Matter[]>([
    {
      id: '1',
      matter_number: '2025-001',
      title: 'Estate Planning Package',
      client: { id: '1', name: 'John & Mary Smith', email: 'john.smith@email.com' }
    },
    {
      id: '2',
      matter_number: '2025-002',
      title: 'Business Formation LLC',
      client: { id: '2', name: 'TechStart Innovations', email: 'contact@techstart.com' }
    },
    {
      id: '3',
      matter_number: '2025-003',
      title: 'Estate Administration',
      client: { id: '3', name: 'Estate of Robert Johnson', email: 'linda.johnson@email.com' }
    }
  ])

  // Load existing invoice data
  useEffect(() => {
    loadInvoice()
  }, [params.id, loadInvoice])

  const loadInvoice = useCallback(async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API call
      const mockInvoice: InvoiceEditData = {
        id: params.id,
        invoice_number: 'INV-20250113-001',
        matter_id: '1',
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
        due_date: '2025-02-12',
        payment_terms: 'Net 30',
        notes: 'Thank you for choosing our estate planning services. Please remit payment within 30 days.',
        discount: 0,
        status: 'sent',
        total_amount: 2500.00,
        amount_paid: 1250.00
      }
      
      setInvoice(mockInvoice)
      setInvoiceNumber(mockInvoice.invoice_number)
      setBillingType(mockInvoice.billing_type)
      setLineItems(mockInvoice.line_items)
      setDueDate(mockInvoice.due_date)
      setPaymentTerms(mockInvoice.payment_terms)
      setNotes(mockInvoice.notes)
      setDiscount(mockInvoice.discount)
      
      // Set selected matter
      const matter = availableMatters.find(m => m.id === mockInvoice.matter_id)
      if (matter) {
        setSelectedMatter(matter)
      }

      // Check if invoice can be edited
      const canEditInvoice = ['draft', 'sent'].includes(mockInvoice.status) && mockInvoice.amount_paid === 0
      setCanEdit(canEditInvoice)
      
    } catch (error) {
      console.error('Error loading invoice:', error)
    } finally {
      setLoading(false)
    }
  }, [params.id, availableMatters])

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0)
  const discountAmount = subtotal * (discount / 100)
  const total = subtotal - discountAmount

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleTemplateSelect = (template: FlatFeeTemplate) => {
    setSelectedTemplate(template)
    setLineItems(template.line_items.map((item, index) => ({
      id: `item-${index}`,
      description: item.description,
      amount: item.amount,
      quantity: 1
    })))
    setShowTemplates(false)
  }

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}`,
      description: '',
      amount: 0,
      quantity: 1
    }
    setLineItems([...lineItems, newItem])
  }

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id))
  }

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!selectedMatter) {
      alert('Please select a matter')
      return
    }

    if (lineItems.length === 0) {
      alert('Please add at least one line item')
      return
    }

    setSaving(true)
    try {
      // Mock API call - in production this would update the invoice
      const invoiceData = {
        id: params.id,
        invoice_number: invoiceNumber,
        matter_id: selectedMatter.id,
        billing_type: billingType,
        line_items: lineItems,
        subtotal,
        discount: discountAmount,
        total,
        due_date: dueDate,
        payment_terms: paymentTerms,
        notes,
        status
      }

      console.log('Updating invoice:', invoiceData)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect to invoice view
      router.push(`/billing/invoices/${params.id}`)
      
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert('Error updating invoice. Please try again.')
    } finally {
      setSaving(false)
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
                onClick={() => router.push(`/billing/invoices/${params.id}`)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-4"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                  Edit Invoice: {invoiceNumber}
                </h1>
                <p className="text-gray-600 mt-1">
                  {canEdit ? 'Make changes to this invoice' : 'This invoice cannot be edited due to payments received'}
                </p>
              </div>
            </div>

            {canEdit && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => router.push(`/billing/invoices/${params.id}`)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                
                <button
                  onClick={() => handleSave('draft')}
                  disabled={saving}
                  className="btn-secondary"
                >
                  Save as Draft
                </button>
                
                <button
                  onClick={() => handleSave('sent')}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {!canEdit && (
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900 mb-1">Invoice Cannot Be Edited</h4>
                <p className="text-sm text-yellow-700">
                  This invoice has received payments and cannot be modified. Create a new invoice or credit memo if adjustments are needed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="INV-2025-001"
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={!canEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type
                  </label>
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value as 'flat_fee' | 'hourly' | 'retainer')}
                    className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={!canEdit}
                  >
                    <option value="flat_fee">Flat Fee</option>
                    <option value="hourly">Hourly</option>
                    <option value="retainer">Retainer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    disabled={!canEdit}
                  >
                    <option value="Due upon receipt">Due upon receipt</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 45">Net 45</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Matter Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Matter & Client</h3>
              
              {selectedMatter ? (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{selectedMatter.matter_number}</h4>
                      <p className="text-sm text-gray-600">{selectedMatter.title}</p>
                      <p className="text-sm text-gray-500">{selectedMatter.client.name}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setSelectedMatter(null)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : canEdit ? (
                <div>
                  <button
                    onClick={() => setShowMatterSelector(!showMatterSelector)}
                    className="btn-secondary w-full flex items-center justify-center"
                  >
                    <UserGroupIcon className="h-5 w-5 mr-2" />
                    Select Matter
                  </button>
                  
                  {showMatterSelector && (
                    <div className="mt-4 border border-gray-200 rounded-lg">
                      {availableMatters.map((matter) => (
                        <button
                          key={matter.id}
                          onClick={() => {
                            setSelectedMatter(matter)
                            setShowMatterSelector(false)
                          }}
                          className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{matter.matter_number}</div>
                          <div className="text-sm text-gray-600">{matter.title}</div>
                          <div className="text-sm text-gray-500">{matter.client.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Flat Fee Templates */}
            {canEdit && billingType === 'flat_fee' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Flat Fee Templates</h3>
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="btn-secondary flex items-center"
                  >
                    <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
                    Browse Templates
                  </button>
                </div>

                {selectedTemplate && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="font-medium text-blue-900">
                        Template Applied: {selectedTemplate.name}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">{selectedTemplate.description}</p>
                  </div>
                )}

                {showTemplates && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {flatFeeTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{template.name}</div>
                        <div className="text-sm text-gray-600 mb-2">{template.description}</div>
                        <div className="text-lg font-bold text-green-600">
                          {formatCurrency(template.base_amount)}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {template.line_items.length} services included
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Services & Fees</h3>
                {canEdit && (
                  <button
                    onClick={addLineItem}
                    className="btn-secondary flex items-center"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add Item
                  </button>
                )}
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No services added yet</p>
                  {canEdit && <p className="text-sm">Add services or select a flat fee template</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-center p-4 border border-gray-200 rounded-lg">
                      <div className="col-span-5">
                        <input
                          type="text"
                          placeholder="Service description"
                          value={item.description}
                          onChange={(e) => canEdit && updateLineItem(item.id, 'description', e.target.value)}
                          className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => canEdit && updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Amount"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => canEdit && updateLineItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <span className="font-medium">{formatCurrency(item.amount * item.quantity)}</span>
                      </div>
                      
                      <div className="col-span-1 text-right">
                        {canEdit && (
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes or payment instructions..."
                rows={4}
                className={`input-field ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Invoice Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Summary</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%):</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                
                <hr className="border-gray-200" />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>

                {invoice.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-green-600">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(invoice.amount_paid)}</span>
                    </div>
                    
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(total - invoice.amount_paid)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Discount */}
              {canEdit && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="input-field"
                    placeholder="0"
                  />
                </div>
              )}
            </div>

            {/* Edit Limitations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Edit Guidelines</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Only draft and sent invoices can be edited</li>
                    <li>• Invoices with payments cannot be modified</li>
                    <li>• Create credit memos for paid invoice adjustments</li>
                    <li>• Changes are tracked for audit purposes</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}