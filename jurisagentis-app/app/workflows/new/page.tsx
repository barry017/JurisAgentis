/**
 * New Workflow Template Creation Page
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CogIcon, 
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

interface WorkflowStep {
  name: string
  type: string
  description: string
  config: Record<string, any>
}

export default function NewWorkflowPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    template_name: '',
    template_code: '',
    description: '',
    category: 'client_onboarding',
    practice_area: 'general',
    trigger_event: 'manual_trigger',
    auto_execute: false,
    is_active: true
  })
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      name: '',
      type: 'email',
      description: '',
      config: {}
    }
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const workflowDefinition = {
        steps: steps.filter(step => step.name.trim() !== '')
      }

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          workflow_definition: workflowDefinition
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Workflow template created:', data)
        router.push('/workflows')
      } else {
        const errorData = await response.json()
        console.error('Failed to create workflow template:', errorData)
        alert('Failed to create workflow template: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error creating workflow template:', error)
      alert('Error creating workflow template')
    } finally {
      setLoading(false)
    }
  }

  const addStep = () => {
    setSteps([...steps, {
      name: '',
      type: 'email',
      description: '',
      config: {}
    }])
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const updateStep = (index: number, field: string, value: any) => {
    const updatedSteps = [...steps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    setSteps(updatedSteps)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <CogIcon className="h-8 w-8 mr-3 text-blue-600" />
                Create New Workflow Template
              </h1>
              <p className="text-gray-600 mt-1">
                Define an automated workflow to streamline repetitive tasks
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.template_name}
                    onChange={(e) => setFormData({...formData, template_name: e.target.value})}
                    placeholder="e.g., New Client Onboarding"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Code *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.template_code}
                    onChange={(e) => setFormData({...formData, template_code: e.target.value})}
                    placeholder="e.g., CLIENT_ONBOARDING_001"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe what this workflow does..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    className="input-field"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="client_onboarding">Client Onboarding</option>
                    <option value="matter_lifecycle">Matter Lifecycle</option>
                    <option value="document_review">Document Review</option>
                    <option value="billing_collection">Billing & Collection</option>
                    <option value="compliance">Compliance</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Practice Area *
                  </label>
                  <select
                    required
                    className="input-field"
                    value={formData.practice_area}
                    onChange={(e) => setFormData({...formData, practice_area: e.target.value})}
                  >
                    <option value="general">General</option>
                    <option value="estate_planning">Estate Planning</option>
                    <option value="business_formation">Business Formation</option>
                    <option value="real_estate">Real Estate</option>
                    <option value="family_law">Family Law</option>
                    <option value="litigation">Litigation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trigger Event *
                  </label>
                  <select
                    required
                    className="input-field"
                    value={formData.trigger_event}
                    onChange={(e) => setFormData({...formData, trigger_event: e.target.value})}
                  >
                    <option value="manual_trigger">Manual Trigger</option>
                    <option value="client_created">Client Created</option>
                    <option value="matter_opened">Matter Opened</option>
                    <option value="document_uploaded">Document Uploaded</option>
                    <option value="payment_received">Payment Received</option>
                    <option value="deadline_approaching">Deadline Approaching</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center space-x-4 mt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.auto_execute}
                        onChange={(e) => setFormData({...formData, auto_execute: e.target.checked})}
                      />
                      <span className="ml-2 text-sm text-gray-700">Auto-execute when triggered</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Steps */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Workflow Steps</h2>
                <button
                  type="button"
                  onClick={addStep}
                  className="btn-primary"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Step
                </button>
              </div>

              <div className="space-y-4">
                {steps.map((step, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        Step {index + 1}
                      </h3>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Step Name *
                        </label>
                        <input
                          type="text"
                          required
                          className="input-field"
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          placeholder="e.g., Send Welcome Email"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Step Type *
                        </label>
                        <select
                          className="input-field"
                          value={step.type}
                          onChange={(e) => updateStep(index, 'type', e.target.value)}
                        >
                          <option value="email">Send Email</option>
                          <option value="task">Create Task</option>
                          <option value="document">Generate Document</option>
                          <option value="notification">Send Notification</option>
                          <option value="calendar">Schedule Event</option>
                          <option value="delay">Add Delay</option>
                          <option value="condition">Conditional Logic</option>
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          className="input-field"
                          rows={2}
                          value={step.description}
                          onChange={(e) => updateStep(index, 'description', e.target.value)}
                          placeholder="Describe this step..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Creating...' : 'Create Workflow Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}