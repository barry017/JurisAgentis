/**
 * Create New Invoice - Optimized for Flat Fee Billing
 * 
 * Streamlined invoice creation with flat fee templates and automated calculations
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  InformationCircleIcon
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

export default function NewInvoicePage() {
  // const { user } = useAuth() // Mock user for demo
  const _user = { role: 'admin' }
  const router = useRouter()

  // Form state
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
  const [loading, setLoading] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showMatterSelector, setShowMatterSelector] = useState(false)

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

  // Initialize form
  useEffect(() => {
    // Generate invoice number
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    setInvoiceNumber(`INV-${year}${month}${day}-001`)

    // Set default due date (30 days from today)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    setDueDate(dueDate.toISOString().split('T')[0])
  }, [])

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

    setLoading(true)
    try {
      // Mock API call - in production this would create the invoice
      const invoiceData = {
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

      console.log('Creating invoice:', invoiceData)
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Redirect to invoice list or view
      router.push('/billing')
      
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('Error creating invoice. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-600" />
                Create New Invoice
              </h1>
              <p className="text-gray-600 mt-1">
                Generate invoices optimized for flat fee billing
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/billing')}
                className="btn-secondary"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleSave('draft')}
                disabled={loading}
                className="btn-secondary"
              >
                Save as Draft
              </button>
              
              <button
                onClick={() => handleSave('sent')}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Save & Send'}
              </button>
            </div>
          </div>
        </div>
      </div>

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
                    className="input-field"
                    placeholder="INV-2025-001"
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
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Type
                  </label>
                  <select
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value as 'flat_fee' | 'hourly' | 'contingency')}
                    className="input-field"
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
                    className="input-field"
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
                    <button
                      onClick={() => setSelectedMatter(null)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            {/* Flat Fee Templates */}
            {billingType === 'flat_fee' && (
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
                <button
                  onClick={addLineItem}
                  className="btn-secondary flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Item
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No services added yet</p>
                  <p className="text-sm">Add services or select a flat fee template</p>
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
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          className="input-field"
                        />
                      </div>
                      
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder="Amount"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLineItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="input-field"
                        />
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <span className="font-medium">{formatCurrency(item.amount * item.quantity)}</span>
                      </div>
                      
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
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
                className="input-field"
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
              </div>

              {/* Discount */}
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
            </div>

            {/* Billing Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Flat Fee Best Practices</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Use templates for consistent pricing</li>
                    <li>• Clearly describe all included services</li>
                    <li>• Set appropriate payment terms</li>
                    <li>• Consider requiring retainers upfront</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Template Categories */}
            {billingType === 'flat_fee' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Popular Templates</h3>
                <div className="space-y-2">
                  {flatFeeTemplates.slice(0, 3).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-sm text-gray-900">{template.name}</div>
                      <div className="text-sm text-green-600 font-medium">
                        {formatCurrency(template.base_amount)}
                      </div>
                    </button>
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