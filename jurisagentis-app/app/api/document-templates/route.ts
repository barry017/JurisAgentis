/**
 * Document Templates API - Manage legal document templates
 */

import { NextRequest } from 'next/server'
import { supabaseServer, supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware'

interface DocumentTemplate {
  id: string
  name: string
  title: string
  description: string
  category: 'estate_planning' | 'business_law' | 'family_law' | 'contracts' | 'litigation' | 'real_estate' | 'tax_law' | 'employment' | 'general'
  content: string
  variables: string[]
  jurisdictions: string[]
  practice_areas: string[]
  is_active: boolean
  version: string
  created_at: string
  updated_at: string
  created_by: string
  usage_count?: number
  file_format: 'docx' | 'pdf' | 'txt'
  required_fields: string[]
  optional_fields: string[]
}

interface CreateTemplateRequest {
  name: string
  title: string
  description: string
  category: string
  content: string
  variables?: string[]
  jurisdictions?: string[]
  practice_areas?: string[]
  file_format: 'docx' | 'pdf' | 'txt'
  required_fields?: string[]
  optional_fields?: string[]
}

export async function POST(request: NextRequest) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Allow template operations when external services are not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - only certain roles can create templates
    if (!['admin', 'associate_attorney'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to create document templates',
        403
      ))
    }

    // Parse request body
    const templateData = await parseRequestBody<CreateTemplateRequest>(request)

    // Validate required fields
    if (!templateData.name || !templateData.title || !templateData.content) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'Name, title, and content are required',
        400
      ))
    }

    // Extract variables from content if not provided
    const extractVariables = (text: string) => {
      const variableRegex = /\{\{(\w+)\}\}/g
      const variables = new Set<string>()
      let match
      
      while ((match = variableRegex.exec(text)) !== null) {
        variables.add(match[1])
      }
      
      return Array.from(variables)
    }

    const detectedVariables = extractVariables(templateData.content)
    const variables = templateData.variables || detectedVariables

    // Create template record
    const templateRecord = {
      name: templateData.name,
      title: templateData.title,
      description: templateData.description,
      category: templateData.category,
      content: templateData.content,
      variables: variables,
      jurisdictions: templateData.jurisdictions || ['US'],
      practice_areas: templateData.practice_areas || [],
      file_format: templateData.file_format,
      required_fields: templateData.required_fields || [],
      optional_fields: templateData.optional_fields || [],
      is_active: true,
      version: '1.0',
      created_by: user.uid
    }

    let templateId = null
    let error = null

    try {
      const result = await supabaseAdmin
        .from('document_templates')
        .insert(templateRecord)
        .select('id')
        .single()

      templateId = result.data?.id
      error = result.error

      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - create mock template in development
      if (isDevelopment) {
        console.log('Database connection failed, creating mock template record')
        templateId = `tmpl-${Date.now()}`
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error creating template:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create document template',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'template_created',
      user.uid,
      request,
      { 
        template_id: templateId,
        template_name: templateData.name,
        category: templateData.category
      }
    )

    return addCORSHeaders(createSuccessResponse({
      template_id: templateId,
      message: 'Document template created successfully',
      variables_detected: variables.length
    }))

  } catch (error) {
    console.error('Document template creation error:', error)
    
    // Handle authentication errors properly
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ))
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticate(request)
    
    // Development mode: Return mock data when database is not available
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
    
    // Check permissions - all authenticated users can view templates
    if (!['admin', 'associate_attorney', 'paralegal', 'assistant'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to view document templates',
        403
      ))
    }

    // Parse query parameters
    const url = new URL(request.url)
    const category = url.searchParams.get('category')
    const practice_area = url.searchParams.get('practice_area')
    const jurisdiction = url.searchParams.get('jurisdiction')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    let templates = []
    let error = null

    try {
      let query = supabaseAdmin
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      // Apply filters
      if (category) query = query.eq('category', category)
      if (practice_area) query = query.contains('practice_areas', [practice_area])
      if (jurisdiction) query = query.contains('jurisdictions', [jurisdiction])

      // Apply pagination
      query = query.range(offset, offset + limit - 1)

      const result = await query
      templates = result.data || []
      error = result.error

      if (error && error.message && error.message.includes('fetch failed')) {
        throw new Error('Database connection failed')
      }
    } catch (dbError) {
      // Database connection failed - use mock data in development
      if (isDevelopment) {
        console.log('Database connection failed, using mock template data')
        templates = [
          {
            id: 'tmpl-1',
            name: 'simple_will',
            title: 'Simple Last Will and Testament',
            description: 'A basic will template for straightforward estate planning needs',
            category: 'estate_planning',
            content: `LAST WILL AND TESTAMENT

I, {{testator_name}}, of {{testator_address}}, being of sound mind and disposing memory, do hereby make, publish, and declare this to be my Last Will and Testament, hereby revoking all former wills and codicils made by me.

ARTICLE I - FAMILY
I am {{marital_status}}. {{spouse_clause}}

I have {{number_of_children}} children:
{{children_list}}

ARTICLE II - DEBTS AND EXPENSES
I direct that all my just debts, funeral expenses, and the expenses of administering my estate be paid as soon as practicable after my death.

ARTICLE III - DISPOSITION OF PROPERTY
I give, devise, and bequeath all of my property, real and personal, of every kind and description, wherever situated, to {{primary_beneficiary}}.

ARTICLE IV - EXECUTOR
I nominate and appoint {{executor_name}} as the Executor of this Will.

IN WITNESS WHEREOF, I have hereunto set my hand this {{execution_date}}.

                    _________________________
                    {{testator_name}}, Testator`,
            variables: ['testator_name', 'testator_address', 'marital_status', 'spouse_clause', 'number_of_children', 'children_list', 'primary_beneficiary', 'executor_name', 'execution_date'],
            jurisdictions: ['US', 'California', 'New York', 'Texas'],
            practice_areas: ['Estate Planning', 'Wills'],
            file_format: 'docx',
            required_fields: ['testator_name', 'testator_address', 'primary_beneficiary', 'executor_name'],
            optional_fields: ['spouse_clause', 'children_list'],
            is_active: true,
            version: '1.0',
            created_at: '2025-01-10T08:00:00Z',
            updated_at: '2025-01-10T08:00:00Z',
            created_by: user.uid,
            usage_count: 15
          },
          {
            id: 'tmpl-2',
            name: 'nda_standard',
            title: 'Standard Non-Disclosure Agreement',
            description: 'A comprehensive NDA template for business relationships',
            category: 'contracts',
            content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on {{effective_date}} by and between {{disclosing_party}}, a {{disclosing_party_type}} ("Disclosing Party"), and {{receiving_party}}, a {{receiving_party_type}} ("Receiving Party").

WHEREAS, the Disclosing Party possesses certain confidential and proprietary information relating to {{subject_matter}};

WHEREAS, the Receiving Party desires to receive and evaluate such confidential information for the purpose of {{purpose}};

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the parties agree as follows:

1. CONFIDENTIAL INFORMATION
For purposes of this Agreement, "Confidential Information" means {{confidential_info_definition}}.

2. NON-DISCLOSURE
The Receiving Party agrees to hold all Confidential Information in strict confidence and not to disclose such information to any third party without the prior written consent of the Disclosing Party.

3. TERM
This Agreement shall commence on the Effective Date and shall remain in effect for {{term_duration}} unless earlier terminated.

4. GOVERNING LAW
This Agreement shall be governed by the laws of {{governing_jurisdiction}}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

{{disclosing_party}}                {{receiving_party}}

_________________________        _________________________
By: {{disclosing_signatory}}      By: {{receiving_signatory}}
Title: {{disclosing_title}}        Title: {{receiving_title}}
Date: ___________________        Date: ___________________`,
            variables: ['effective_date', 'disclosing_party', 'disclosing_party_type', 'receiving_party', 'receiving_party_type', 'subject_matter', 'purpose', 'confidential_info_definition', 'term_duration', 'governing_jurisdiction', 'disclosing_signatory', 'disclosing_title', 'receiving_signatory', 'receiving_title'],
            jurisdictions: ['US', 'Delaware', 'California', 'New York'],
            practice_areas: ['Business Law', 'Contracts', 'Intellectual Property'],
            file_format: 'docx',
            required_fields: ['disclosing_party', 'receiving_party', 'subject_matter', 'purpose'],
            optional_fields: ['term_duration', 'confidential_info_definition'],
            is_active: true,
            version: '1.2',
            created_at: '2025-01-08T14:20:00Z',
            updated_at: '2025-01-12T10:30:00Z',
            created_by: user.uid,
            usage_count: 28
          },
          {
            id: 'tmpl-3',
            name: 'llc_operating_agreement',
            title: 'LLC Operating Agreement',
            description: 'Operating agreement template for Limited Liability Companies',
            category: 'business_law',
            content: `OPERATING AGREEMENT OF {{company_name}}

This Operating Agreement ("Agreement") of {{company_name}}, a {{state_of_formation}} limited liability company (the "Company"), is entered into on {{effective_date}} by and between the undersigned members (the "Members").

ARTICLE 1 - FORMATION
1.1 The Company was formed on {{formation_date}} by filing Articles of Organization with the {{state_of_formation}} Secretary of State.

1.2 The Company's principal place of business is {{principal_address}}.

ARTICLE 2 - PURPOSES AND POWERS
2.1 The Company is organized for the purpose of {{business_purpose}}.

ARTICLE 3 - MEMBERS AND MEMBERSHIP INTERESTS
3.1 Initial Members and Capital Contributions:
{{member_list}}

3.2 Total Initial Capital: {{total_initial_capital}}

ARTICLE 4 - MANAGEMENT
4.1 The Company shall be managed by {{management_structure}}.

{{management_provisions}}

ARTICLE 5 - DISTRIBUTIONS
5.1 Distributions shall be made {{distribution_policy}}.

ARTICLE 6 - DISSOLUTION
6.1 The Company shall dissolve upon {{dissolution_events}}.

IN WITNESS WHEREOF, the Members have executed this Agreement as of the date first written above.

MEMBERS:

{{member_signatures}}`,
            variables: ['company_name', 'state_of_formation', 'effective_date', 'formation_date', 'principal_address', 'business_purpose', 'member_list', 'total_initial_capital', 'management_structure', 'management_provisions', 'distribution_policy', 'dissolution_events', 'member_signatures'],
            jurisdictions: ['US', 'Delaware', 'Nevada', 'Wyoming', 'California'],
            practice_areas: ['Business Law', 'Corporate Formation', 'LLC'],
            file_format: 'docx',
            required_fields: ['company_name', 'state_of_formation', 'business_purpose', 'member_list'],
            optional_fields: ['distribution_policy', 'dissolution_events'],
            is_active: true,
            version: '2.1',
            created_at: '2025-01-05T11:15:00Z',
            updated_at: '2025-01-11T16:45:00Z',
            created_by: user.uid,
            usage_count: 12
          },
          {
            id: 'tmpl-4',
            name: 'employment_agreement',
            title: 'Employment Agreement Template',
            description: 'Comprehensive employment agreement for new hires',
            category: 'employment',
            content: `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is entered into on {{start_date}} between {{company_name}}, a {{company_type}} ("Company"), and {{employee_name}} ("Employee").

1. POSITION AND DUTIES
Employee is hired as {{job_title}} and shall perform the following duties:
{{job_duties}}

2. COMPENSATION
Employee's annual salary shall be {{annual_salary}}, payable {{payment_frequency}}.

3. BENEFITS
Employee shall be entitled to the following benefits:
{{benefits_list}}

4. TERM
This Agreement shall commence on {{start_date}} and shall continue {{employment_term}}.

5. CONFIDENTIALITY
Employee agrees to maintain the confidentiality of all proprietary information of the Company.

6. NON-COMPETE
{{non_compete_clause}}

7. TERMINATION
Either party may terminate this Agreement {{termination_terms}}.

8. GOVERNING LAW
This Agreement shall be governed by the laws of {{governing_state}}.

IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first written above.

{{company_name}}                    {{employee_name}}

_________________________        _________________________
By: {{company_signatory}}          Employee
Title: {{company_title}}
Date: ___________________        Date: ___________________`,
            variables: ['start_date', 'company_name', 'company_type', 'employee_name', 'job_title', 'job_duties', 'annual_salary', 'payment_frequency', 'benefits_list', 'employment_term', 'non_compete_clause', 'termination_terms', 'governing_state', 'company_signatory', 'company_title'],
            jurisdictions: ['US', 'California', 'New York', 'Texas', 'Florida'],
            practice_areas: ['Employment Law', 'Human Resources'],
            file_format: 'docx',
            required_fields: ['company_name', 'employee_name', 'job_title', 'annual_salary', 'start_date'],
            optional_fields: ['non_compete_clause', 'benefits_list', 'termination_terms'],
            is_active: true,
            version: '1.3',
            created_at: '2025-01-01T09:00:00Z',
            updated_at: '2025-01-01T09:00:00Z',
            created_by: user.uid,
            usage_count: 7
          }
        ]

        // Apply filters to mock data
        if (category) templates = templates.filter(t => t.category === category)
        if (practice_area) templates = templates.filter(t => t.practice_areas.includes(practice_area))
        if (jurisdiction) templates = templates.filter(t => t.jurisdictions.includes(jurisdiction))

        // Apply pagination
        templates = templates.slice(offset, offset + limit)
        error = null
      } else {
        throw dbError
      }
    }

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve document templates',
        500
      ))
    }

    // Log audit event
    await logAuditEvent(
      'data_access',
      user.uid,
      request,
      { 
        resource: 'document_templates',
        action: 'list',
        filters: { category, practice_area, jurisdiction },
        result_count: templates.length
      }
    )

    return addCORSHeaders(createSuccessResponse({
      templates,
      pagination: {
        limit,
        offset,
        total: templates.length,
        has_more: false // Would calculate based on total count
      }
    }))

  } catch (error) {
    console.error('Document templates list error:', error)
    
    // Handle authentication errors properly
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ))
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

// Handle unsupported methods
export async function PUT() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'OPTIONS']))
}