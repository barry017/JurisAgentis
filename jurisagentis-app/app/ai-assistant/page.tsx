/**
 * AI Assistant (Aida) - Main interface for AI-powered legal assistance
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { 
  PaperAirplaneIcon,
  MicrophoneIcon,
  DocumentTextIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  BookOpenIcon,
  ScaleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  EnvelopeIcon,
  CpuChipIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { AidaDocumentUpload } from '@/app/components/AidaDocumentIntelligence'
import { AidaCommandInterface, ParsedCommand } from '@/app/components/AidaCommandInterface'
import { AidaCommandExecutor } from '@/lib/aida/command-executor'

interface Message {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  context?: {
    case_id?: string
    client_id?: string
    document_id?: string
    action?: string
  }
  suggestions?: string[]
  attachments?: Array<{
    type: 'document' | 'case' | 'client'
    id: string
    title: string
  }>
}

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  command: string
  category: 'document' | 'case' | 'client' | 'research' | 'analysis' | 'email' | 'legal_research'
}

export default function AIAssistantPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [showDocumentUpload, setShowDocumentUpload] = useState(false)
  const [showCommandInterface, setShowCommandInterface] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Command executor instance
  const commandExecutor = new AidaCommandExecutor()

  // Check permissions
  const canUseAI = user && ['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)

  // Quick actions for common AI tasks
  const quickActions: QuickAction[] = [
    {
      id: 'draft-contract',
      title: 'Draft Contract',
      description: 'Generate a contract using AI',
      icon: DocumentTextIcon,
      command: 'Help me draft a contract for',
      category: 'document'
    },
    {
      id: 'research-case',
      title: 'Legal Research',
      description: 'Research legal precedents',
      icon: BookOpenIcon,
      command: 'Research legal precedents for',
      category: 'research'
    },
    {
      id: 'analyze-case',
      title: 'Analyze Case',
      description: 'Get AI insights on case strategy',
      icon: ScaleIcon,
      command: 'Analyze the case strategy for',
      category: 'analysis'
    },
    {
      id: 'client-summary',
      title: 'Client Summary',
      description: 'Summarize client information',
      icon: UserIcon,
      command: 'Provide a summary of client',
      category: 'client'
    },
    {
      id: 'document-review',
      title: 'Document Review',
      description: 'Review documents for issues',
      icon: MagnifyingGlassIcon,
      command: 'Review this document for potential issues:',
      category: 'document'
    },
    {
      id: 'case-deadlines',
      title: 'Check Deadlines',
      description: 'Review upcoming deadlines',
      icon: ClockIcon,
      command: 'Show me upcoming deadlines for',
      category: 'case'
    },
    {
      id: 'email-compose',
      title: 'Compose Email',
      description: 'AI-powered email writing',
      icon: EnvelopeIcon,
      command: 'Help me compose an email for',
      category: 'email'
    },
    {
      id: 'legal-research',
      title: 'Legal Research',
      description: 'Advanced legal research with GPT-5',
      icon: BookOpenIcon,
      command: 'Research legal precedents for',
      category: 'legal_research'
    },
    {
      id: 'case-analysis',
      title: 'Smart Case Analysis',
      description: 'AI-powered SWOT and outcome prediction',
      icon: ScaleIcon,
      command: 'Analyze case strategy and outcomes for',
      category: 'analysis'
    },
    {
      id: 'document-upload',
      title: 'Magic Document Upload',
      description: 'AI-powered document intelligence',
      icon: CloudArrowUpIcon,
      command: 'Upload and analyze documents automatically',
      category: 'document'
    }
  ]

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Check permissions
  useEffect(() => {
    if (user && !canUseAI) {
      router.push('/dashboard')
    }
  }, [user, canUseAI, router])

  // Initialize with welcome message
  useEffect(() => {
    if (user && canUseAI && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        type: 'assistant',
        content: `Hello ${user.first_name || user.email}! I'm Aida, your AI legal assistant. I can help you with:

• **Document Generation** - Create contracts, letters, and legal documents
• **Legal Research** - Find relevant cases, statutes, and precedents  
• **Case Analysis** - Analyze case strategies and potential outcomes
• **Client Management** - Summarize client information and history
• **Deadline Tracking** - Monitor important dates and deadlines
• **Document Review** - Check documents for potential issues

What can I help you with today?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Draft a non-disclosure agreement',
          'Research contract law precedents',
          'Analyze my current caseload',
          'Show upcoming deadlines this week'
        ]
      }
      setMessages([welcomeMessage])
    }
  }, [user, canUseAI, messages.length])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || input.trim()
    if (!content || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setIsTyping(true)

    try {
      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Generate AI response based on content
      const aiResponse = await generateAIResponse(content)
      
      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI response error:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      setIsTyping(false)
    }
  }

  const generateAIResponse = async (userInput: string): Promise<Message> => {
    const lowerInput = userInput.toLowerCase()

    // Analyze user intent and generate appropriate response
    if (lowerInput.includes('draft') || lowerInput.includes('create') || lowerInput.includes('generate')) {
      if (lowerInput.includes('contract') || lowerInput.includes('agreement')) {
        return {
          id: Date.now().toString(),
          type: 'assistant',
          content: `I can help you draft a contract! To create the most appropriate document, I need some information:

**Contract Type**: What type of agreement are you creating? (e.g., NDA, service agreement, employment contract)

**Parties**: Who are the contracting parties?

**Key Terms**: What are the main terms and conditions?

**Jurisdiction**: What state/jurisdiction will govern this contract?

Would you like me to start with a template, or do you have specific requirements?`,
          timestamp: new Date().toISOString(),
          suggestions: [
            'Use NDA template',
            'Create service agreement',
            'Draft employment contract',
            'Show available templates'
          ],
          attachments: [
            {
              type: 'document',
              id: 'tmpl-nda',
              title: 'Standard NDA Template'
            },
            {
              type: 'document',
              id: 'tmpl-service',
              title: 'Service Agreement Template'
            }
          ]
        }
      }
    }

    if (lowerInput.includes('research') || lowerInput.includes('precedent') || lowerInput.includes('case law')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can provide comprehensive legal research powered by GPT-5! Here's what my advanced research system offers:

**GPT-5 Legal Research Capabilities**:
• **Case Law Analysis** - Find relevant precedents with AI-powered relevance scoring
• **Statutory Research** - Comprehensive statute and regulation analysis
• **Secondary Sources** - Law reviews, treatises, and expert commentary
• **Shepard's Analysis** - Citation analysis and treatment verification
• **International Law** - Cross-jurisdictional research and comparative analysis

**Advanced Features**:
• **AI Legal Analysis** - Deep contextual understanding of legal principles
• **Citation Generation** - Bluebook, ALWD, Chicago, and APA formats
• **Trend Analysis** - Identify emerging legal trends and developments
• **Strategic Recommendations** - Practical implications and strategy guidance
• **Multi-Jurisdiction Search** - Federal, state, and international sources

**Research Intelligence**:
• **Relevance Scoring** - AI-powered ranking of authority importance
• **Key Holdings Extraction** - Automatic identification of critical legal principles
• **Practice Area Categorization** - Smart organization by legal specialty
• **Real-time Updates** - Latest cases and regulatory changes

**Quick Research Examples**:
• *"Electronic signature validity in commercial contracts"*
• *"Non-compete agreement enforceability California 2024"*
• *"Discovery sanctions federal courts recent decisions"*
• *"Employment law remote work regulations"*

Ready to access the most advanced legal research platform available?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Open Legal Research System',
          'Research contract law precedents',
          'Find employment law updates',
          'Search specific jurisdiction'
        ]
      }
    }

    if (lowerInput.includes('analyze') || lowerInput.includes('strategy') || lowerInput.includes('case')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can provide case analysis and strategic insights:

**Case Strength Assessment**:
• Strong evidence for breach of contract claim
• Potential challenges with damages calculation
• Favorable jurisdiction for contract disputes

**Strategic Recommendations**:
1. **Settlement Approach**: Consider mediation before litigation
2. **Evidence Gathering**: Focus on email communications and contract amendments
3. **Timeline**: Statute of limitations expires in 18 months

**Risk Analysis**:
• **High probability** of establishing breach
• **Medium risk** on damages amount
• **Low risk** of sanctions or bad faith claims

**Next Steps**:
• Schedule client meeting to discuss settlement parameters
• Begin discovery planning if settlement fails
• Consider expert witness for damages calculation

Would you like me to elaborate on any of these points?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Explain damages calculation',
          'Show settlement options',
          'Create case timeline',
          'Draft demand letter'
        ]
      }
    }

    if (lowerInput.includes('deadline') || lowerInput.includes('calendar') || lowerInput.includes('due')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Here are your upcoming deadlines and important dates:

**This Week**:
• **Tomorrow**: Client meeting - Estate planning consultation (2:00 PM)
• **Friday**: Motion to dismiss filing deadline (Case #2024-CV-123)

**Next Week**:
• **Monday**: Discovery responses due (Johnson v. Smith)
• **Wednesday**: Deposition - Sarah Wilson (10:00 AM)
• **Friday**: Settlement conference (Superior Court Room 3)

**Critical Deadlines (30 days)**:
• **Feb 15**: Statute of limitations - Personal injury claim
• **Feb 22**: Trial date - Contract dispute case
• **Mar 1**: Annual corporate filings due

**Recommendations**:
• Schedule motion drafting time for Thursday
• Prepare deposition outline by Monday
• Send settlement position to opposing counsel

Would you like me to set reminders or create task lists for any of these items?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Set reminder for Friday filing',
          'Create deposition checklist',
          'Schedule client meeting prep',
          'Show full calendar view'
        ]
      }
    }

    if (lowerInput.includes('client') || lowerInput.includes('summary')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can provide client information and summaries. Which client would you like me to analyze?

**Recent Client Activity**:
• **Johnson Industries**: 3 active matters, upcoming corporate filing
• **Sarah Williams**: Estate planning - will execution scheduled
• **Tech Startup LLC**: Business formation completed, employment agreements pending

**Client Communication Summary**:
• 12 emails this week requiring responses
• 3 client meetings scheduled
• 2 urgent matters requiring immediate attention

**Action Items**:
• Follow up with Johnson Industries on contract amendments
• Send estate planning documents to Sarah Williams
• Review employment agreement templates for Tech Startup

Would you like detailed information about a specific client or case?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Show Johnson Industries details',
          'Review Sarah Williams estate plan',
          'Tech Startup matter status',
          'List all active clients'
        ]
      }
    }

    if (lowerInput.includes('email') || lowerInput.includes('compose') || lowerInput.includes('write')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can help you compose professional legal emails with AI assistance! Here's what I can do:

**Email Composition**:
• **AI-Powered Writing** - Describe what you want to write and I'll generate it
• **Smart Templates** - Use pre-built templates for common legal communications
• **Professional Tone** - Ensure appropriate tone for recipients (clients, opposing counsel, courts)

**Email Types I Can Help With**:
• **Client Communications** - Status updates, appointment scheduling, document requests
• **Settlement Negotiations** - Professional offers and counteroffers
• **Court Communications** - Hearing confirmations, scheduling requests
• **Opposing Counsel** - Discovery requests, meet and confer letters
• **Document Requests** - Clear instructions for clients and third parties

**AI Features**:
• **Smart Suggestions** - Get AI recommendations for replies
• **Template Variables** - Automatically fill in client/case information
• **Tone Analysis** - Ensure appropriate professional tone
• **Draft Management** - Save and organize email drafts

Ready to compose a professional email with AI assistance?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Open Email Integration',
          'Generate settlement email',
          'Write client update',
          'Create appointment request'
        ]
      }
    }

    if (lowerInput.includes('context') || lowerInput.includes('insight') || lowerInput.includes('pattern')) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can provide advanced contextual AI analysis powered by GPT-5! Here's what my contextual understanding system offers:

**Advanced AI Analysis**:
• **Pattern Recognition** - Identify patterns across cases, clients, and communications
• **Predictive Insights** - Forecast case outcomes, settlement likelihood, and client satisfaction
• **Risk Assessment** - Detect potential deadline conflicts and compliance issues
• **Opportunity Identification** - Spot business development and efficiency opportunities

**Contextual Intelligence**:
• **Client Behavior Analysis** - Understand communication preferences and decision patterns
• **Case Success Predictors** - Analyze factors that lead to successful outcomes
• **Relationship Insights** - Monitor client satisfaction and engagement trends
• **Legal Trend Analysis** - Stay ahead of regulatory changes and legal developments

**GPT-5 Powered Features**:
• **Multi-dimensional Reasoning** - Advanced analysis across multiple data points
• **Temporal Pattern Analysis** - Understand how patterns change over time
• **Predictive Modeling** - Forecast outcomes with high confidence scores
• **Context Mapping** - Build comprehensive understanding of client relationships

**Real-time Capabilities**:
• **Continuous Learning** - System improves with every interaction
• **Automated Insights** - Proactive notifications about important patterns
• **Risk Monitoring** - Early warning system for potential issues
• **Opportunity Alerts** - Identify business development opportunities

Ready to unlock the power of contextual AI analysis for your practice?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Open Contextual AI System',
          'Run practice analysis',
          'View client insights',
          'Check pattern analysis'
        ]
      }
    }

    if (lowerInput.includes('case') && (lowerInput.includes('analyze') || lowerInput.includes('analysis') || lowerInput.includes('swot') || lowerInput.includes('strategy') || lowerInput.includes('outcome') || lowerInput.includes('prediction'))) {
      return {
        id: Date.now().toString(),
        type: 'assistant',
        content: `I can provide comprehensive case analysis and strategic insights powered by GPT-5! Here's what my Smart Case Analysis system offers:

**Advanced Case Analysis**:
• **SWOT Analysis** - Comprehensive Strengths, Weaknesses, Opportunities, and Threats assessment
• **Outcome Prediction** - AI-powered predictions with confidence scores and probability modeling
• **Strategic Recommendations** - Priority-ranked action items with implementation timelines
• **Financial Analysis** - ROI calculations, cost projections, and recovery estimates

**GPT-5 Legal Intelligence**:
• **Multi-Factor Analysis** - Simultaneous evaluation of legal, factual, and strategic elements
• **Predictive Modeling** - Advanced algorithms analyze historical case patterns
• **Risk Assessment** - Comprehensive threat identification and mitigation strategies
• **Competitive Analysis** - Opposing counsel profiling and strategy prediction

**Comprehensive Insights**:
• **Case Strength Evaluation** - Detailed scoring of legal position with supporting evidence
• **Timeline Analysis** - Critical milestone tracking with risk factor identification
• **Settlement Strategy** - Optimal negotiation timing and positioning recommendations
• **Resource Allocation** - Cost-benefit analysis for litigation vs. settlement approaches

**Strategic Intelligence**:
• **Precedent Analysis** - Relevant case law with outcome correlation analysis
• **Jurisdiction Advantages** - Court-specific insights and judge assignment analysis
• **Evidence Assessment** - Strength evaluation with gap identification
• **Client Communication** - Stakeholder management and expectation setting guidance

**Advanced Features**:
• **Scenario Modeling** - Best case, likely, and worst case outcome projections
• **Decision Trees** - Strategic decision mapping with probability weighting
• **Real-time Updates** - Continuous analysis as case developments occur
• **Collaborative Planning** - Team-based strategy development and tracking

Ready to unlock the most advanced case analysis platform available?`,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Open Case Analysis System',
          'Run SWOT analysis',
          'Predict case outcomes',
          'Generate strategic plan'
        ]
      }
    }

    // Default helpful response
    return {
      id: Date.now().toString(),
      type: 'assistant',
      content: `I understand you're looking for assistance with "${userInput}". Here are some ways I can help:

**Document Tasks**:
• Draft contracts, letters, and legal documents
• Review existing documents for issues
• Generate documents from templates

**Legal Research**:
• Find relevant cases and statutes
• Research legal precedents
• Analyze legal principles

**Case Management**:
• Provide case analysis and strategy
• Track deadlines and important dates
• Summarize client information

**Practice Management**:
• Organize case workflows
• Manage client communications
• Create task lists and reminders

Could you be more specific about what you'd like me to help you with?`,
      timestamp: new Date().toISOString(),
      suggestions: [
        'Help me draft a document',
        'Research a legal issue',
        'Analyze my current cases',
        'Show my deadlines'
      ]
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    if (action.id === 'email-compose') {
      router.push('/ai-assistant/email-integration')
      return
    }
    if (action.id === 'legal-research') {
      router.push('/ai-assistant/legal-research')
      return
    }
    if (action.id === 'case-analysis') {
      router.push('/ai-assistant/case-analysis')
      return
    }
    setInput(action.command + ' ')
    inputRef.current?.focus()
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === 'Open Email Integration') {
      router.push('/ai-assistant/email-integration')
      return
    }
    if (suggestion === 'Open Contextual AI System') {
      router.push('/ai-assistant/contextual-understanding')
      return
    }
    if (suggestion === 'Open Legal Research System') {
      router.push('/ai-assistant/legal-research')
      return
    }
    if (suggestion === 'Open Case Analysis System') {
      router.push('/ai-assistant/case-analysis')
      return
    }
    handleSendMessage(suggestion)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const startVoiceInput = () => {
    setIsListening(true)
    // TODO: Implement speech recognition
    setTimeout(() => {
      setIsListening(false)
      setInput('Draft a non-disclosure agreement for my client')
    }, 2000)
  }

  // Handle command execution (FR-030 to FR-044)
  const handleCommandExecution = async (command: ParsedCommand) => {
    try {
      console.log('🤖 Aida: Executing command:', command)
      
      // Execute the command
      const result = await commandExecutor.executeCommand(command)
      
      // Create message showing command execution result
      const commandMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `🤖 **Command Executed: ${command.type}**\n\n**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n\n**Result:** ${result.message}`,
        timestamp: new Date().toISOString(),
        suggestions: result.next_steps || []
      }
      
      setMessages(prev => [...prev, commandMessage])
      
      // If command created a draft, show it
      if (result.data && result.action.includes('draft')) {
        const draftMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: `📧 **Email Draft Created**\n\n**To:** ${result.data.to.join(', ')}\n**Subject:** ${result.data.subject}\n\n**Message:**\n${result.data.body}`,
          timestamp: new Date().toISOString(),
          suggestions: ['Send Email', 'Edit Draft', 'Cancel']
        }
        
        setMessages(prev => [...prev, draftMessage])
      }
      
      // Learn from usage for improved suggestions
      await commandExecutor.learnFromUsage(command, result)
      
    } catch (error) {
      console.error('Command execution failed:', error)
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'system',
        content: `❌ Command execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessage])
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !canUseAI) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mr-3">
                <SparklesIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Aida AI Assistant
                </h1>
                <p className="text-gray-600 mt-1">
                  Your intelligent legal practice companion
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => router.push('/ai-assistant/legal-research')}
                className="btn-primary flex items-center"
              >
                <BookOpenIcon className="h-4 w-4 mr-2" />
                Legal Research
              </button>
              
              <button
                onClick={() => router.push('/ai-assistant/contextual-understanding')}
                className="btn-secondary flex items-center"
              >
                <CpuChipIcon className="h-4 w-4 mr-2" />
                Context AI
              </button>
              
              <button
                onClick={() => router.push('/ai-assistant/email-integration')}
                className="btn-secondary flex items-center"
              >
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Email Integration
              </button>
              
              <button
                onClick={() => router.push('/ai-assistant/case-analysis')}
                className="btn-secondary flex items-center"
              >
                <ScaleIcon className="h-4 w-4 mr-2" />
                Case Analysis
              </button>
              
              <button
                onClick={() => setMessages([])}
                className="btn-secondary flex items-center"
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                New Chat
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-3">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <action.icon className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{action.title}</p>
                        <p className="text-xs text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Status */}
            <div className="card mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Status</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Connection</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    <div className="w-2 h-2 bg-green-600 rounded-full mr-1"></div>
                    Online
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Model</span>
                  <span className="text-sm text-gray-900">Claude-3.5-Sonnet</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Context</span>
                  <span className="text-sm text-gray-900">Legal Practice</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-12rem)] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.type === 'user' 
                            ? 'bg-blue-600' 
                            : message.type === 'assistant'
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600'
                            : 'bg-gray-600'
                        }`}>
                          {message.type === 'user' ? (
                            <UserIcon className="h-4 w-4 text-white" />
                          ) : message.type === 'assistant' ? (
                            <SparklesIcon className="h-4 w-4 text-white" />
                          ) : (
                            <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                          )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1">
                          <div className={`rounded-lg px-4 py-3 ${
                            message.type === 'user'
                              ? 'bg-blue-600 text-white'
                              : message.type === 'assistant'
                              ? 'bg-gray-100 text-gray-900'
                              : 'bg-red-100 text-red-900'
                          }`}>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">
                              {message.content}
                            </div>
                            
                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map((attachment, index) => (
                                  <div key={index} className="flex items-center p-2 bg-white rounded border">
                                    <DocumentTextIcon className="h-4 w-4 text-blue-600 mr-2" />
                                    <span className="text-sm text-gray-900">{attachment.title}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>

                          {/* Suggestions */}
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {message.suggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleSuggestionClick(suggestion)}
                                  className="text-xs px-3 py-1 bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-gray-100 rounded-lg px-4 py-3">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask Aida anything about your legal practice..."
                      rows={2}
                      className="w-full resize-none border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={startVoiceInput}
                      disabled={loading || isListening}
                      className={`p-2 rounded-lg border transition-colors ${
                        isListening
                          ? 'bg-red-100 border-red-300 text-red-600'
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                      title="Voice Input"
                    >
                      <MicrophoneIcon className="h-5 w-5" />
                    </button>
                    
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!input.trim() || loading}
                      className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Send Message"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Press Enter to send, Shift+Enter for new line</span>
                    <button
                      onClick={() => setShowDocumentUpload(!showDocumentUpload)}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors mr-4"
                    >
                      ✨ Magic Document Upload
                    </button>
                    <button
                      onClick={() => setShowCommandInterface(!showCommandInterface)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                    >
                      💬 Command Interface
                    </button>
                  </div>
                  <span>{input.length}/2000</span>
                </div>
                
                {/* Document Upload Section */}
                {showDocumentUpload && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <AidaDocumentUpload
                      onDocumentProcessed={(analysis, clarifications) => {
                        // Add AI analysis as a message
                        const aiMessage: Message = {
                          id: Date.now().toString(),
                          type: 'assistant',
                          content: `🤖 **Document Analysis Complete!**\n\n**Document Type:** ${analysis.document_type} (${Math.round(analysis.confidence * 100)}% confidence)\n**Suggested Title:** ${analysis.suggested_title}\n**Category:** ${analysis.suggested_category}\n\n**Summary:** ${analysis.content_summary}\n\n${clarifications.length > 0 ? 'I have a few questions to ensure I handle this correctly...' : 'I\'ll process this document with the suggested settings.'}`,
                          timestamp: new Date().toISOString(),
                          suggestions: analysis.suggested_actions.map(action => action.action)
                        }
                        setMessages(prev => [...prev, aiMessage])
                      }}
                      onUploadComplete={(documentId) => {
                        const successMessage: Message = {
                          id: Date.now().toString(),
                          type: 'assistant',
                          content: `✅ **Document uploaded successfully!**\n\nDocument ID: ${documentId}\n\nI've automatically filed this document and will monitor any required actions. If this requires e-signatures, I'll start that process and keep you updated on the signing status.`,
                          timestamp: new Date().toISOString(),
                          suggestions: ['View document', 'Check e-signature status', 'Review filing location']
                        }
                        setMessages(prev => [...prev, successMessage])
                        setShowDocumentUpload(false)
                      }}
                    />
                  </div>
                )}
                
                {/* Command Interface Section */}
                {showCommandInterface && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">💬 Aida Command Interface</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Use sophisticated commands like <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">/email @contact &quot;message&quot;</code> with auto-complete and contextual understanding.
                      </p>
                    </div>
                    <AidaCommandInterface
                      onCommandExecute={handleCommandExecution}
                      className="mb-4"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}