/**
 * AI Assistant Chat API - Handle AI conversations and commands
 */

import { NextRequest, NextResponse } from 'next/server'
// import { createClient } from '@supabase/supabase-js'
// import { Database } from '@/types/database'

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// )

interface ChatMessage {
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
}

interface AIResponse {
  content: string
  suggestions?: string[]
  attachments?: Array<{
    type: 'document' | 'case' | 'client' | 'template'
    id: string
    title: string
    url?: string
  }>
  actions?: Array<{
    type: 'create_document' | 'schedule_task' | 'send_email' | 'update_case'
    data: unknown
  }>
}

// Intent classification patterns
const INTENT_PATTERNS = {
  document_creation: [
    /draft|create|generate.*(?:contract|agreement|document|letter|will|nda)/i,
    /write.*(?:contract|agreement|document|letter)/i,
    /prepare.*(?:document|contract|agreement)/i
  ],
  legal_research: [
    /research|find|search.*(?:case|law|statute|precedent)/i,
    /look up.*(?:case|law|statute)/i,
    /precedent|case law|legal research/i
  ],
  case_analysis: [
    /analyze|review|assess.*(?:case|strategy|risk)/i,
    /case.*(?:analysis|strategy|assessment)/i,
    /evaluate.*(?:case|claim|defense)/i
  ],
  deadline_management: [
    /deadline|due|calendar|schedule|reminder/i,
    /when.*due|upcoming.*deadline/i,
    /court date|filing deadline/i
  ],
  client_management: [
    /client.*(?:summary|information|details|history)/i,
    /summarize.*client|client.*overview/i,
    /tell me about.*client/i
  ],
  document_review: [
    /review.*document|check.*document|analyze.*document/i,
    /issues.*document|problems.*document/i,
    /document.*review|document.*analysis/i
  ]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversation_id, user_id, context } = body

    if (!message || !user_id) {
      return NextResponse.json({
        success: false,
        error: { message: 'Missing required fields: message, user_id' }
      }, { status: 400 })
    }

    // Store user message
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      context
    }

    // Classify intent and generate AI response
    const intent = classifyIntent(message)
    const aiResponse = await generateAIResponse(message, intent, context, user_id)

    // Store AI response
    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      type: 'assistant',
      content: aiResponse.content,
      timestamp: new Date().toISOString(),
      context: {
        ...context,
        action: intent
      }
    }

    // Log conversation (mock for now)
    await logConversation(conversation_id, userMessage, assistantMessage, user_id)

    return NextResponse.json({
      success: true,
      data: {
        message: assistantMessage,
        suggestions: aiResponse.suggestions || [],
        attachments: aiResponse.attachments || [],
        actions: aiResponse.actions || []
      }
    })

  } catch (error) {
    console.error('AI Chat API error:', error)
    return NextResponse.json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 })
  }
}

function classifyIntent(message: string): string {
  const lowerMessage = message.toLowerCase()

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return intent
      }
    }
  }

  return 'general_assistance'
}

async function generateAIResponse(
  message: string, 
  intent: string, 
  context: unknown, 
  userId: string
): Promise<AIResponse> {

  switch (intent) {
    case 'document_creation':
      return await handleDocumentCreation(message, context, userId)
    
    case 'legal_research':
      return await handleLegalResearch(message, context, userId)
    
    case 'case_analysis':
      return await handleCaseAnalysis(message, context, userId)
    
    case 'deadline_management':
      return await handleDeadlineManagement(message, context, userId)
    
    case 'client_management':
      return await handleClientManagement(message, context, userId)
    
    case 'document_review':
      return await handleDocumentReview(message, context, userId)
    
    default:
      return await handleGeneralAssistance(message, context, userId)
  }
}

async function handleDocumentCreation(message: string, _context: unknown, _userId: string): Promise<AIResponse> {
  const lowerMessage = message.toLowerCase()

  // Determine document type
  let documentType = 'general'
  let templateSuggestions: Array<{ type: string; id: string; title: string }> = []

  if (lowerMessage.includes('nda') || lowerMessage.includes('non-disclosure')) {
    documentType = 'nda'
    templateSuggestions = [
      { type: 'template', id: 'tmpl-nda-standard', title: 'Standard NDA Template' },
      { type: 'template', id: 'tmpl-nda-mutual', title: 'Mutual NDA Template' }
    ]
  } else if (lowerMessage.includes('contract') || lowerMessage.includes('agreement')) {
    documentType = 'contract'
    templateSuggestions = [
      { type: 'template', id: 'tmpl-service-agreement', title: 'Service Agreement Template' },
      { type: 'template', id: 'tmpl-employment', title: 'Employment Agreement Template' }
    ]
  } else if (lowerMessage.includes('will') || lowerMessage.includes('testament')) {
    documentType = 'will'
    templateSuggestions = [
      { type: 'template', id: 'tmpl-simple-will', title: 'Simple Will Template' },
      { type: 'template', id: 'tmpl-complex-will', title: 'Complex Will Template' }
    ]
  }

  return {
    content: `I'll help you create a ${documentType === 'general' ? 'legal document' : documentType}! Here's what I can do:

**Document Creation Options**:
• **Use Template** - Start with a pre-built template and customize it
• **Custom Draft** - Create a new document from scratch with AI assistance
• **Smart Generation** - Answer questions and I'll build the document automatically

**Information Needed**:
• Parties involved (names, addresses, entity types)
• Key terms and conditions
• Jurisdiction/governing law
• Special requirements or clauses

**Template Suggestions**:
${templateSuggestions.map((t: { title: string }) => `• ${t.title}`).join('\n')}

Would you like to start with a template or provide me with the specific details?`,
    suggestions: [
      'Use a template',
      'Start from scratch',
      'Tell me about required information',
      'Show me all available templates'
    ],
    attachments: templateSuggestions,
    actions: [
      {
        type: 'create_document',
        data: {
          suggested_type: documentType,
          templates: templateSuggestions.map((t: { id: string }) => t.id)
        }
      }
    ]
  }
}

async function handleLegalResearch(message: string, _context: unknown, _userId: string): Promise<AIResponse> {
  const researchQuery = extractResearchQuery(message)

  // Mock legal research results
  const mockResults = [
    {
      type: 'case',
      title: 'Smith v. Johnson Industries (2023)',
      summary: 'Recent precedent on contract interpretation in digital agreements',
      citation: '456 F.3d 789 (9th Cir. 2023)',
      relevance: 'High'
    },
    {
      type: 'statute',
      title: 'Uniform Commercial Code § 2-207',
      summary: 'Additional terms in acceptance or confirmation',
      jurisdiction: 'Federal',
      relevance: 'Medium'
    },
    {
      type: 'case',
      title: 'Tech Corp v. Innovation LLC (2022)',
      summary: 'Non-compete agreement enforceability in tech industry',
      citation: '234 F.Supp.3d 567 (N.D. Cal. 2022)',
      relevance: 'Medium'
    }
  ]

  return {
    content: `I found relevant legal authorities for your research on "${researchQuery}":

**Case Law**:
• **Smith v. Johnson Industries (2023)** - 456 F.3d 789 (9th Cir. 2023)
  *Key holding*: Digital signatures in commercial contracts are presumptively valid
  *Relevance*: High - directly addresses modern contract formation

• **Tech Corp v. Innovation LLC (2022)** - 234 F.Supp.3d 567 (N.D. Cal. 2022)
  *Key holding*: Non-compete agreements limited to reasonable geographic scope
  *Relevance*: Medium - industry-specific enforcement standards

**Statutory Authority**:
• **UCC § 2-207** - Additional terms in acceptance or confirmation
  *Application*: Battle of the forms in commercial transactions
  *Jurisdiction*: Adopted in 49 states with variations

**Secondary Sources**:
• Restatement (Second) of Contracts § 90 - Reliance-based enforcement
• Williston on Contracts § 6:50 - Electronic contract formation

**Practice Notes**:
• Consider jurisdiction-specific variations in enforcement
• Recent trend toward strict construction of non-compete clauses
• Digital signature compliance requirements under E-SIGN Act

Would you like me to elaborate on any of these authorities or search for more specific precedents?`,
    suggestions: [
      'Explain Smith v. Johnson in detail',
      'Find more recent cases',
      'Search specific jurisdiction',
      'Show full case citations'
    ],
    attachments: mockResults.map(r => ({
      type: 'document' as const,
      id: `research_${r.title.replace(/\s+/g, '_')}`,
      title: r.title
    }))
  }
}

async function handleCaseAnalysis(_message: string, context: unknown, _userId: string): Promise<AIResponse> {
  // Extract case context if provided
  const contextObj = context as { case_id?: string } | undefined
  const caseId = contextObj?.case_id

  return {
    content: `I'll provide a comprehensive case analysis${caseId ? ' for the specified case' : ''}:

**Case Strength Assessment**:
• **Legal Merit**: Strong (8/10)
  - Clear breach of contract elements present
  - Well-documented evidence chain
  - Favorable jurisdiction for contract disputes

• **Factual Support**: Good (7/10)
  - Email communications support timeline
  - Witness testimony available
  - Some gaps in documentary evidence

**Strategic Considerations**:
1. **Settlement Potential**: High
   - Defendant has expressed willingness to negotiate
   - Economic incentives favor resolution
   - Mediation likely to be productive

2. **Litigation Risks**: Medium
   - Potential counterclaims on performance
   - Damages calculation may be disputed
   - Discovery costs could be substantial

3. **Timeline Analysis**:
   - Statute of limitations: 18 months remaining
   - Discovery period: 6-9 months estimated
   - Trial readiness: 12-15 months from filing

**Recommended Strategy**:
• **Phase 1**: Demand letter with 30-day response period
• **Phase 2**: Formal mediation if initial demand rejected
• **Phase 3**: Litigation preparation while maintaining settlement discussions

**Resource Requirements**:
• Associate attorney: 40-60 hours
• Paralegal support: 20-30 hours
• Expert witness (damages): $15,000-25,000 estimated
• Total estimated costs: $35,000-50,000

**Success Probability**:
• Settlement (favorable terms): 70%
• Trial victory: 65%
• Full damages recovery: 45%

Would you like me to dive deeper into any aspect of this analysis?`,
    suggestions: [
      'Explain settlement strategy',
      'Detail litigation timeline',
      'Calculate potential damages',
      'Review evidence gaps'
    ],
    actions: [
      {
        type: 'schedule_task',
        data: {
          task: 'Draft demand letter',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'high'
        }
      }
    ]
  }
}

async function handleDeadlineManagement(_message: string, _context: unknown, _userId: string): Promise<AIResponse> {
  // Mock deadline data
  const upcomingDeadlines = [
    {
      id: 'deadline_1',
      title: 'Motion to Dismiss Filing',
      case: 'Johnson v. Smith Construction',
      date: '2025-01-25T17:00:00Z',
      priority: 'High',
      days_remaining: 7
    },
    {
      id: 'deadline_2',
      title: 'Discovery Responses Due',
      case: 'Tech Corp Contract Dispute',
      date: '2025-01-30T17:00:00Z',
      priority: 'Medium',
      days_remaining: 12
    },
    {
      id: 'deadline_3',
      title: 'Client Meeting - Estate Planning',
      case: 'Williams Estate Matter',
      date: '2025-01-22T14:00:00Z',
      priority: 'Normal',
      days_remaining: 4
    }
  ]

  return {
    content: `Here are your upcoming deadlines and important dates:

**Critical Deadlines (Next 30 Days)**:

🔴 **HIGH PRIORITY**:
• **Motion to Dismiss Filing** - Johnson v. Smith Construction
  *Due*: January 25, 2025 (5:00 PM)
  *Status*: 7 days remaining
  *Action*: Draft motion and supporting brief

🟡 **MEDIUM PRIORITY**:
• **Discovery Responses Due** - Tech Corp Contract Dispute
  *Due*: January 30, 2025 (5:00 PM)
  *Status*: 12 days remaining
  *Action*: Review interrogatories and document requests

🟢 **NORMAL PRIORITY**:
• **Client Meeting** - Williams Estate Planning
  *Scheduled*: January 22, 2025 (2:00 PM)
  *Status*: 4 days remaining
  *Action*: Prepare estate planning documents for review

**Recommendations**:
• **Immediate**: Begin motion drafting for Johnson case
• **This Week**: Schedule client prep meeting for Williams matter
• **Next Week**: Start discovery response compilation for Tech Corp

**Calendar Integration**:
• 3 court appearances this month
• 5 client meetings scheduled
• 2 deposition dates confirmed

**Risk Analysis**:
• All deadlines currently manageable with proper planning
• Consider backup counsel for Johnson motion if trial schedule conflicts
• Williams meeting may need rescheduling based on document preparation time

Would you like me to set specific reminders or create detailed task lists for any of these deadlines?`,
    suggestions: [
      'Set reminder for motion filing',
      'Create task list for discovery',
      'Schedule client meeting prep',
      'Show full calendar view'
    ],
    attachments: upcomingDeadlines.map(d => ({
      type: 'case' as const,
      id: d.id,
      title: `${d.title} - ${d.case}`
    })),
    actions: [
      {
        type: 'schedule_task',
        data: {
          task: 'Draft motion to dismiss',
          case_id: 'case_johnson_smith',
          deadline: '2025-01-25T17:00:00Z',
          priority: 'high'
        }
      }
    ]
  }
}

async function handleClientManagement(message: string, context: unknown, _userId: string): Promise<AIResponse> {
  const contextObj = context as { client_id?: string } | undefined
  // Get client ID from context or extract from message
  const _clientId = contextObj?.client_id || extractClientReference(message)

  // Mock client data
  const clientSummary = {
    id: 'client_123',
    name: 'Johnson Industries Inc.',
    type: 'Corporate',
    relationship_start: '2023-03-15',
    active_matters: 3,
    total_matters: 8,
    last_contact: '2025-01-15',
    primary_contact: 'Sarah Johnson, CEO',
    billing_status: 'Current'
  }

  return {
    content: `Here's a comprehensive summary for ${clientSummary.name}:

**Client Overview**:
• **Client Type**: ${clientSummary.type}
• **Relationship Since**: March 2023 (22 months)
• **Primary Contact**: ${clientSummary.primary_contact}
• **Last Communication**: January 15, 2025

**Active Matters**:
1. **Contract Dispute Resolution** (Case #2024-CV-789)
   - Status: Discovery phase
   - Attorney: Associate counsel
   - Next action: Motion filing due 1/25

2. **Employment Agreement Review** (Matter #EMP-2024-12)
   - Status: Draft review in progress
   - Attorney: Senior partner
   - Next action: Client review scheduled 1/22

3. **Corporate Governance Update** (Matter #CORP-2024-15)
   - Status: Board resolution drafting
   - Attorney: Corporate team
   - Next action: Document finalization

**Recent Activity**:
• 12 hours billed this month
• 3 documents generated
• 2 client meetings held
• 1 court appearance attended

**Financial Summary**:
• **Billing Status**: Current (no outstanding invoices)
• **YTD Billings**: $45,000
• **Average Monthly**: $3,750
• **Payment Terms**: Net 30

**Communication History**:
• Email: 23 exchanges this month
• Phone calls: 4 substantive conversations
• Meetings: 2 in-person, 1 virtual
• Document reviews: 5 completed

**Upcoming Items**:
• Contract amendment review (due 1/28)
• Quarterly compliance check (scheduled 2/1)
• Board meeting attendance (scheduled 2/15)

**Client Satisfaction**:
• Response time: Excellent (avg 2.3 hours)
• Document quality: High satisfaction rating
• Communication: Preferred email, backup phone

Would you like me to dive deeper into any specific matter or schedule follow-up actions?`,
    suggestions: [
      'Show contract dispute details',
      'Review employment agreements',
      'Schedule quarterly compliance check',
      'Generate client billing summary'
    ],
    attachments: [
      { type: 'client', id: clientSummary.id, title: clientSummary.name },
      { type: 'case', id: 'case_789', title: 'Contract Dispute Resolution' },
      { type: 'document', id: 'emp_agreement_draft', title: 'Employment Agreement Draft' }
    ]
  }
}

async function handleDocumentReview(message: string, context: unknown, _userId: string): Promise<AIResponse> {
  const contextObj = context as { document_id?: string } | undefined
  const documentId = contextObj?.document_id || extractDocumentReference(message)

  return {
    content: `I'll review this document for potential issues and improvements:

**Document Analysis Results**:

**✅ Strengths Identified**:
• Clear and comprehensive terms and conditions
• Proper legal formatting and structure
• Appropriate governing law clauses
• Well-defined parties and responsibilities

**⚠️ Areas for Improvement**:
• **Ambiguous Language** (Line 23): "Reasonable efforts" should be more specifically defined
• **Missing Clause**: Consider adding force majeure provision
• **Date Format**: Inconsistent date formatting throughout document
• **Signature Block**: Missing witness signature lines for certain jurisdictions

**🔴 Critical Issues**:
• **Termination Clause**: Notice period may conflict with state requirements
• **Indemnification**: Current language may be unenforceable in some jurisdictions
• **Limitation of Liability**: May need revision to comply with recent case law

**Compliance Check**:
• **State Law Compliance**: ✅ Generally compliant with California law
• **Federal Requirements**: ✅ Meets applicable federal standards
• **Industry Standards**: ⚠️ Some provisions could be strengthened

**Recommendations**:
1. **Immediate**: Revise termination notice requirements
2. **Important**: Add force majeure and COVID-19 specific provisions
3. **Suggested**: Standardize date formats throughout
4. **Consider**: Update limitation of liability based on recent precedents

**Risk Assessment**:
• **Legal Risk**: Medium (mainly enforceability concerns)
• **Business Risk**: Low (terms generally favorable)
• **Compliance Risk**: Low (meets current standards)

**Redlining Suggestions**:
• 8 specific edits recommended
• 3 new clauses suggested
• 2 deletions proposed
• 1 restructuring recommendation

Would you like me to generate a redlined version with tracked changes or explain any specific issues in detail?`,
    suggestions: [
      'Generate redlined version',
      'Explain termination clause issues',
      'Show force majeure examples',
      'Create revision checklist'
    ],
    actions: [
      {
        type: 'create_document',
        data: {
          type: 'redlined_version',
          original_document_id: documentId,
          suggested_changes: 8
        }
      }
    ]
  }
}

async function handleGeneralAssistance(_message: string, context: unknown, _userId: string): Promise<AIResponse> {
  return {
    content: `I'm here to help with your legal practice! Based on your message, here are some ways I can assist:

**Available Services**:

📝 **Document Creation**:
• Draft contracts, letters, and legal documents
• Generate documents from templates
• Create custom legal forms

🔍 **Legal Research**:
• Find relevant cases and statutes
• Research legal precedents
• Analyze legal principles and trends

⚖️ **Case Management**:
• Analyze case strategies and risks
• Track deadlines and important dates
• Provide case summaries and insights

👥 **Client Services**:
• Generate client summaries
• Track communication history
• Manage client relationships

📋 **Practice Management**:
• Organize workflows and tasks
• Create reminders and calendars
• Analyze practice efficiency

**Quick Actions**:
• "Draft an NDA for my client"
• "Research contract law in California"
• "Analyze the Johnson case strategy"
• "Show my deadlines this week"
• "Summarize client communications"

**Current Context**:
${(context as { case_id?: string })?.case_id ? `• Working on Case ID: ${(context as { case_id?: string }).case_id}` : ''}
${(context as { client_id?: string })?.client_id ? `• Client Context: ${(context as { client_id?: string }).client_id}` : ''}
${(context as { document_id?: string })?.document_id ? `• Document Reference: ${(context as { document_id?: string }).document_id}` : ''}

What specific task can I help you with today?`,
    suggestions: [
      'Help me draft a document',
      'Research a legal issue',
      'Analyze my current cases',
      'Show my calendar and deadlines'
    ]
  }
}

// Utility functions
function extractResearchQuery(message: string): string {
  const patterns = [
    /research\s+(.+)/i,
    /find\s+(.+)/i,
    /search\s+for\s+(.+)/i,
    /look\s+up\s+(.+)/i
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[1].trim()
  }

  return message
}

function extractClientReference(message: string): string | null {
  const patterns = [
    /client\s+([A-Za-z\s]+)/i,
    /for\s+([A-Za-z\s]+\s+(?:inc|llc|corp|ltd))/i,
    /([A-Za-z\s]+\s+(?:industries|corporation|company))/i
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[1].trim()
  }

  return null
}

function extractDocumentReference(message: string): string | null {
  const patterns = [
    /document\s+([A-Za-z0-9-_]+)/i,
    /file\s+([A-Za-z0-9-_]+)/i,
    /contract\s+([A-Za-z0-9-_]+)/i
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match) return match[1].trim()
  }

  return null
}

async function logConversation(
  conversationId: string, 
  userMessage: ChatMessage, 
  assistantMessage: ChatMessage, 
  userId: string
): Promise<void> {
  // Mock logging - in real implementation, store in database
  console.log('AI Conversation logged:', {
    conversation_id: conversationId,
    user_id: userId,
    messages: [userMessage, assistantMessage]
  })
}