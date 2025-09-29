/**
 * AI Email Integration - AI-powered email composition and management
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  EnvelopeIcon,
  ArrowLeftIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  EyeIcon,
  LightBulbIcon,
  BookOpenIcon,
  ArrowPathIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  content: string
  category: 'client_update' | 'appointment' | 'document_request' | 'follow_up' | 'settlement' | 'general'
  variables: string[]
}

interface EmailSuggestion {
  id: string
  type: 'reply' | 'follow_up' | 'template'
  subject: string
  content: string
  tone: 'professional' | 'friendly' | 'formal' | 'urgent'
  reasoning: string
}

interface EmailDraft {
  id: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  content: string
  client_id?: string
  case_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  send_at?: string
  ai_generated: boolean
  template_used?: string
}

interface IncomingEmail {
  id: string
  from: string
  subject: string
  content: string
  received_at: string
  client_id?: string
  case_id?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  is_read: boolean
  requires_response: boolean
  category: 'client_inquiry' | 'opposing_counsel' | 'court' | 'vendor' | 'internal' | 'other'
}

export default function EmailIntegrationPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // State
  const [activeTab, setActiveTab] = useState<'compose' | 'inbox' | 'drafts' | 'templates'>('compose')
  const [emailDraft, setEmailDraft] = useState<EmailDraft>({
    id: '',
    to: '',
    subject: '',
    content: '',
    priority: 'medium',
    ai_generated: false
  })
  
  const [aiSuggestions, setAiSuggestions] = useState<EmailSuggestion[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [incomingEmails, setIncomingEmails] = useState<IncomingEmail[]>([])
  const [drafts, setDrafts] = useState<EmailDraft[]>([])
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Form states
  const [aiPrompt, setAiPrompt] = useState('')
  const [showAiAssistant, setShowAiAssistant] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Check permissions
  const canUseEmail = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)
  const canManageTemplates = user && ['admin', 'associate_attorney'].includes(user.role)

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canUseEmail) {
      router.push('/dashboard')
    }
  }, [user, canUseEmail, router])

  // Load data
  useEffect(() => {
    if (user && canUseEmail) {
      loadTemplates()
      loadIncomingEmails()
      loadDrafts()
    }
  }, [user, canUseEmail])

  const loadTemplates = async () => {
    // Mock templates - in real implementation, fetch from API
    setTemplates([
      {
        id: '1',
        name: 'client_status_update',
        subject: 'Case Status Update - {{case_name}}',
        content: `Dear {{client_name}},

I hope this email finds you well. I wanted to provide you with an update on your case, {{case_name}}.

**Current Status:**
{{status_update}}

**Next Steps:**
{{next_steps}}

**Timeline:**
{{timeline_info}}

If you have any questions or concerns, please don't hesitate to reach out. I'm here to keep you informed every step of the way.

Best regards,
{{attorney_name}}
{{firm_name}}`,
        category: 'client_update',
        variables: ['client_name', 'case_name', 'status_update', 'next_steps', 'timeline_info', 'attorney_name', 'firm_name']
      },
      {
        id: '2',
        name: 'appointment_confirmation',
        subject: 'Appointment Confirmation - {{appointment_date}}',
        content: `Dear {{client_name}},

This email confirms your appointment on {{appointment_date}} at {{appointment_time}} at our office.

**Meeting Details:**
- Date: {{appointment_date}}
- Time: {{appointment_time}}
- Location: {{office_address}}
- Purpose: {{meeting_purpose}}

**What to Bring:**
{{documents_needed}}

**Preparation:**
{{preparation_notes}}

Please arrive 10 minutes early to complete any necessary paperwork. If you need to reschedule, please contact us at least 24 hours in advance.

Looking forward to meeting with you.

Best regards,
{{attorney_name}}`,
        category: 'appointment',
        variables: ['client_name', 'appointment_date', 'appointment_time', 'office_address', 'meeting_purpose', 'documents_needed', 'preparation_notes', 'attorney_name']
      },
      {
        id: '3',
        name: 'document_request',
        subject: 'Document Request - {{case_name}}',
        content: `Dear {{client_name}},

To move forward with your case, I need you to provide the following documents:

**Required Documents:**
{{document_list}}

**Deadline:**
Please provide these documents by {{deadline_date}} to avoid any delays in your case.

**Submission Options:**
- Upload to our secure client portal: {{portal_link}}
- Email to: {{secure_email}}
- Mail to our office (copies only, please retain originals)

**Questions:**
If you have difficulty obtaining any of these documents or have questions about what's needed, please contact me immediately.

Thank you for your prompt attention to this matter.

Best regards,
{{attorney_name}}`,
        category: 'document_request',
        variables: ['client_name', 'case_name', 'document_list', 'deadline_date', 'portal_link', 'secure_email', 'attorney_name']
      }
    ])
  }

  const loadIncomingEmails = async () => {
    // Mock incoming emails - in real implementation, fetch from email API
    setIncomingEmails([
      {
        id: '1',
        from: 'john.client@example.com',
        subject: 'Question about discovery deadline',
        content: 'Hi, I received the discovery documents and have a question about the deadline for responses. Can we schedule a call to discuss?',
        received_at: '2025-01-18T14:30:00Z',
        client_id: 'client_123',
        case_id: 'case_456',
        priority: 'medium',
        is_read: false,
        requires_response: true,
        category: 'client_inquiry'
      },
      {
        id: '2',
        from: 'opposing.counsel@lawfirm.com',
        subject: 'Re: Settlement Discussion - Johnson v. Smith',
        content: 'Thank you for your settlement proposal. After reviewing with my client, we would like to schedule a mediation session to discuss terms further.',
        received_at: '2025-01-18T11:15:00Z',
        case_id: 'case_789',
        priority: 'high',
        is_read: true,
        requires_response: true,
        category: 'opposing_counsel'
      },
      {
        id: '3',
        from: 'clerk@superiorcourt.ca.gov',
        subject: 'Hearing Notice - Case #CV-2024-12345',
        content: 'Notice of hearing scheduled for February 15, 2025 at 9:00 AM in Department 12. Please confirm attendance.',
        received_at: '2025-01-18T09:45:00Z',
        case_id: 'case_101',
        priority: 'urgent',
        is_read: true,
        requires_response: true,
        category: 'court'
      }
    ])
  }

  const loadDrafts = async () => {
    // Mock drafts - in real implementation, fetch from database
    setDrafts([
      {
        id: '1',
        to: 'sarah.client@example.com',
        subject: 'Estate Planning Documents Ready for Review',
        content: 'Dear Sarah,\n\nYour estate planning documents are ready for final review...',
        client_id: 'client_789',
        priority: 'medium',
        ai_generated: true,
        template_used: 'document_completion'
      }
    ])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    return colors[priority as keyof typeof colors] || colors.medium
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      client_inquiry: 'bg-blue-100 text-blue-800',
      opposing_counsel: 'bg-purple-100 text-purple-800',
      court: 'bg-red-100 text-red-800',
      vendor: 'bg-green-100 text-green-800',
      internal: 'bg-gray-100 text-gray-800',
      other: 'bg-yellow-100 text-yellow-800'
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  const generateAIEmail = async () => {
    if (!aiPrompt.trim()) {
      setError('Please provide a description of the email you want to generate')
      return
    }

    try {
      setIsGenerating(true)
      setError('')

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Mock AI response based on prompt
      const lowerPrompt = aiPrompt.toLowerCase()
      let generatedEmail: Partial<EmailDraft> = {}

      if (lowerPrompt.includes('settlement') || lowerPrompt.includes('offer')) {
        generatedEmail = {
          subject: 'Settlement Proposal Discussion',
          content: `Dear Counsel,

Thank you for your recent communication regarding settlement discussions in the matter of [CASE NAME].

After careful consideration and consultation with my client, we are prepared to engage in meaningful settlement negotiations. 

**Our Position:**
Based on the facts and circumstances of this case, including [KEY FACTORS], we believe a fair resolution would involve [SETTLEMENT TERMS].

**Proposed Next Steps:**
1. Exchange of settlement position statements
2. Scheduling of a mediation session with a neutral mediator
3. Good faith negotiations within the next 30 days

We believe that early resolution would benefit both parties by avoiding the costs and uncertainties of continued litigation.

Please let me know your client's interest in proceeding with settlement discussions at your earliest convenience.

Best regards,
[ATTORNEY NAME]`
        }
      } else if (lowerPrompt.includes('client') && lowerPrompt.includes('update')) {
        generatedEmail = {
          subject: 'Case Status Update',
          content: `Dear [CLIENT NAME],

I hope this email finds you well. I wanted to provide you with an important update on your case.

**Recent Developments:**
[DESCRIBE RECENT ACTIVITIES OR DEVELOPMENTS]

**Current Status:**
Your case is progressing as expected. We have [COMPLETED ACTIONS] and are currently focused on [CURRENT ACTIVITIES].

**Next Steps:**
In the coming weeks, we will be:
1. [NEXT ACTION ITEM 1]
2. [NEXT ACTION ITEM 2]
3. [NEXT ACTION ITEM 3]

**Timeline:**
We anticipate [TIMELINE EXPECTATIONS] based on current circumstances.

**What You Need to Do:**
[ANY REQUIRED CLIENT ACTIONS]

Please don't hesitate to reach out if you have any questions or concerns. I'm committed to keeping you informed throughout this process.

Best regards,
[ATTORNEY NAME]`
        }
      } else if (lowerPrompt.includes('appointment') || lowerPrompt.includes('meeting')) {
        generatedEmail = {
          subject: 'Meeting Request - [CASE/MATTER NAME]',
          content: `Dear [CLIENT NAME],

I hope you are doing well. I would like to schedule a meeting to discuss important matters related to your case.

**Purpose of Meeting:**
[MEETING PURPOSE AND AGENDA]

**Proposed Times:**
I have the following times available:
- [DATE] at [TIME]
- [DATE] at [TIME]
- [DATE] at [TIME]

**Meeting Format:**
We can meet either in person at our office or via video conference, whichever is more convenient for you.

**What to Bring/Prepare:**
[DOCUMENTS OR INFORMATION NEEDED]

**Duration:**
The meeting should take approximately [DURATION].

Please let me know which time works best for you, or if you need alternative options.

Thank you, and I look forward to our discussion.

Best regards,
[ATTORNEY NAME]`
        }
      } else {
        generatedEmail = {
          subject: 'Legal Matter Communication',
          content: `Dear [RECIPIENT],

Thank you for your recent correspondence.

[AI has generated this email based on your prompt: "${aiPrompt}"]

**Main Points:**
- [POINT 1]
- [POINT 2]
- [POINT 3]

**Next Steps:**
[PROPOSED ACTIONS OR NEXT STEPS]

Please let me know if you have any questions or need additional information.

Best regards,
[ATTORNEY NAME]
[FIRM NAME]`
        }
      }

      setEmailDraft(prev => ({
        ...prev,
        subject: generatedEmail.subject || prev.subject,
        content: generatedEmail.content || prev.content,
        ai_generated: true
      }))

      setSuccess('Email generated successfully using AI!')
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Failed to generate email')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateAISuggestions = async (email: IncomingEmail) => {
    try {
      setLoading(true)

      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500))

      const suggestions: EmailSuggestion[] = []

      if (email.category === 'client_inquiry') {
        suggestions.push({
          id: '1',
          type: 'reply',
          subject: `Re: ${email.subject}`,
          content: `Dear ${email.from.split('@')[0]},

Thank you for your email. I understand your concern about the discovery deadline.

The discovery responses are due within 30 days of service, which means your deadline is [DATE]. However, we can request an extension if needed.

I'd be happy to schedule a brief call to discuss this and answer any questions you may have. Please let me know your availability for a 15-minute call this week.

Best regards,
[ATTORNEY NAME]`,
          tone: 'professional',
          reasoning: 'Client needs reassurance and clear timeline information'
        })

        suggestions.push({
          id: '2',
          type: 'follow_up',
          subject: 'Discovery Process Overview and Next Steps',
          content: `Dear ${email.from.split('@')[0]},

Following up on your question about discovery, I wanted to provide you with a comprehensive overview of the process and what to expect.

**Discovery Timeline:**
- Responses due: [DATE]
- Review period: [DATES]
- Follow-up actions: [TIMELINE]

**Your Role:**
[SPECIFIC INSTRUCTIONS FOR CLIENT]

I'll send you a detailed checklist to help you prepare your responses effectively.

Best regards,
[ATTORNEY NAME]`,
          tone: 'helpful',
          reasoning: 'Proactive follow-up to provide comprehensive information'
        })
      }

      if (email.category === 'opposing_counsel') {
        suggestions.push({
          id: '3',
          type: 'reply',
          subject: `Re: ${email.subject}`,
          content: `Dear Counsel,

Thank you for your response regarding mediation. We appreciate your client's willingness to engage in settlement discussions.

We are available for mediation and would suggest using [MEDIATOR NAME] who has experience with similar cases.

Please let me know your preferred dates in the next 3-4 weeks, and I will coordinate with the mediator's schedule.

Best regards,
[ATTORNEY NAME]`,
          tone: 'formal',
          reasoning: 'Professional response to move settlement discussions forward'
        })
      }

      setAiSuggestions(suggestions)
      setSuccess('AI suggestions generated successfully!')
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Failed to generate suggestions')
    } finally {
      setLoading(false)
    }
  }

  const applyTemplate = (template: EmailTemplate) => {
    setEmailDraft(prev => ({
      ...prev,
      subject: template.subject,
      content: template.content,
      template_used: template.name
    }))
    setActiveTab('compose')
  }

  const applySuggestion = (suggestion: EmailSuggestion) => {
    setEmailDraft(prev => ({
      ...prev,
      subject: suggestion.subject,
      content: suggestion.content,
      ai_generated: true
    }))
    setActiveTab('compose')
  }

  const saveDraft = async () => {
    try {
      setLoading(true)
      
      // Mock save operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const newDraft: EmailDraft = {
        ...emailDraft,
        id: Date.now().toString()
      }
      
      setDrafts(prev => [...prev, newDraft])
      setSuccess('Draft saved successfully')
      setTimeout(() => setSuccess(''), 3000)
      
    } catch {
      setError('Failed to save draft')
    } finally {
      setLoading(false)
    }
  }

  const sendEmail = async () => {
    if (!emailDraft.to || !emailDraft.subject || !emailDraft.content) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      // Mock send operation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setSuccess('Email sent successfully!')
      setEmailDraft({
        id: '',
        to: '',
        subject: '',
        content: '',
        priority: 'medium',
        ai_generated: false
      })
      setTimeout(() => setSuccess(''), 3000)
      
    } catch {
      setError('Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canUseEmail) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/ai-assistant')}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors mr-3"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-2 mr-3">
                  <EnvelopeIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">AI Email Integration</h1>
                  <p className="text-gray-600 mt-1">
                    Intelligent email composition and management
                  </p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/ai-assistant')}
                className="btn-secondary"
              >
                Back to Assistant
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        {/* Status Messages */}
        {error && (
          <div className="alert-error mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="alert-success mb-6">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'compose', label: 'Compose', icon: PencilSquareIcon },
              { id: 'inbox', label: 'Inbox', icon: EnvelopeIcon },
              { id: 'drafts', label: 'Drafts', icon: DocumentTextIcon },
              { id: 'templates', label: 'Templates', icon: BookOpenIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'compose' | 'inbox' | 'drafts' | 'templates')}
                className={`group inline-flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Compose Tab */}
        {activeTab === 'compose' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Compose Email</h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                      <input
                        type="email"
                        value={emailDraft.to}
                        onChange={(e) => setEmailDraft(prev => ({ ...prev, to: e.target.value }))}
                        placeholder="recipient@example.com"
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={emailDraft.priority}
                        onChange={(e) => setEmailDraft(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' }))}
                        className="input-field"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={emailDraft.subject}
                      onChange={(e) => setEmailDraft(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Email subject"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea
                      value={emailDraft.content}
                      onChange={(e) => setEmailDraft(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Email content..."
                      rows={12}
                      className="input-field"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowAiAssistant(!showAiAssistant)}
                        className="btn-secondary text-sm flex items-center"
                      >
                        <SparklesIcon className="h-4 w-4 mr-2" />
                        AI Assistant
                      </button>
                      
                      <button
                        onClick={saveDraft}
                        disabled={loading}
                        className="btn-secondary text-sm"
                      >
                        Save Draft
                      </button>
                    </div>

                    <button
                      onClick={sendEmail}
                      disabled={loading || !emailDraft.to || !emailDraft.subject || !emailDraft.content}
                      className="btn-primary flex items-center"
                    >
                      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                      {loading ? 'Sending...' : 'Send Email'}
                    </button>
                  </div>
                </div>

                {/* AI Assistant Panel */}
                {showAiAssistant && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      AI Email Assistant
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <textarea
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Describe the email you want to write (e.g., 'Send a settlement offer to opposing counsel' or 'Update client on case progress')"
                          rows={3}
                          className="w-full p-3 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <button
                        onClick={generateAIEmail}
                        disabled={isGenerating || !aiPrompt.trim()}
                        className="btn-primary text-sm flex items-center"
                      >
                        {isGenerating ? (
                          <>
                            <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <SparklesIcon className="h-4 w-4 mr-2" />
                            Generate Email
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Templates */}
              <div className="card">
                <h4 className="font-medium text-gray-900 mb-3">Quick Templates</h4>
                <div className="space-y-2">
                  {templates.slice(0, 3).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template)}
                      className="w-full text-left p-2 text-sm border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                      <div className="text-xs text-gray-600">{template.subject}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div className="card">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <LightBulbIcon className="h-4 w-4 mr-2 text-yellow-500" />
                    AI Suggestions
                  </h4>
                  <div className="space-y-3">
                    {aiSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900">{suggestion.subject}</span>
                          <span className="text-xs text-gray-500">{suggestion.tone}</span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{suggestion.reasoning}</p>
                        <button
                          onClick={() => applySuggestion(suggestion)}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Use this suggestion
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Inbox</h3>
              <div className="flex space-x-3">
                <button className="btn-secondary text-sm flex items-center">
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Filter
                </button>
                <button className="btn-secondary text-sm flex items-center">
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  Search
                </button>
              </div>
            </div>

            <div className="card">
              <div className="space-y-3">
                {incomingEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`p-4 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                      !email.is_read ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`font-medium ${!email.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                            {email.from}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(email.priority)}`}>
                            {email.priority}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(email.category)}`}>
                            {email.category.replace('_', ' ')}
                          </span>
                          {email.requires_response && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Response Required
                            </span>
                          )}
                        </div>
                        <h4 className={`${!email.is_read ? 'font-semibold' : 'font-medium'} text-gray-900 mb-1`}>
                          {email.subject}
                        </h4>
                        <p className="text-sm text-gray-600 line-clamp-2">{email.content}</p>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        <span className="text-xs text-gray-500">{formatDate(email.received_at)}</span>
                        <button
                          onClick={() => generateAISuggestions(email)}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                          disabled={loading}
                        >
                          <SparklesIcon className="h-3 w-3 mr-1" />
                          AI Suggestions
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Drafts Tab */}
        {activeTab === 'drafts' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Email Drafts</h3>

            <div className="card">
              {drafts.length > 0 ? (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div key={draft.id} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <span className="font-medium text-gray-900">{draft.to}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(draft.priority)}`}>
                              {draft.priority}
                            </span>
                            {draft.ai_generated && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <SparklesIcon className="h-3 w-3 mr-1" />
                                AI Generated
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 mb-1">{draft.subject}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2">{draft.content}</p>
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => {
                              setEmailDraft(draft)
                              setActiveTab('compose')
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit Draft"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDrafts(prev => prev.filter(d => d.id !== draft.id))}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete Draft"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No drafts found</h3>
                  <p className="text-gray-600 mb-4">Start composing an email to create your first draft</p>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className="btn-primary"
                  >
                    Compose Email
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
              {canManageTemplates && (
                <button className="btn-primary text-sm">
                  Create Template
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {template.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h4>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                      {template.category.replace('_', ' ')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{template.subject}</p>
                  
                  <div className="text-xs text-gray-500 mb-4">
                    {template.variables.length} variables
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => applyTemplate(template)}
                      className="flex-1 btn-primary text-sm"
                    >
                      Use Template
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <EyeIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}