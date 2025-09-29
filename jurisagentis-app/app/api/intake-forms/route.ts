/**
 * Intake Forms API - Generate and process client intake forms for document generation
 * Supports Phase 5: Document Management System
 */

import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createMethodNotAllowedResponse,
  parseRequestBody,
  validateContentType,
  addCORSHeaders
} from '@/lib/api/response'
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware'
import { gmailService } from '@/lib/services/gmail'

interface GenerateIntakeFormRequest {
  client_id: string
  document_type: string
  missing_fields: string[]
  delivery_method: 'email' | 'portal' | 'both'
  urgent?: boolean
}

interface IntakeFormSubmission {
  form_id: string
  client_id: string
  responses: Record<string, unknown>
  partial_submission?: boolean
}

interface Client {
  first_name: string
  last_name: string
  email: string
  [key: string]: unknown
}

interface IntakeForm {
  title: string
  sections: Array<{
    title: string
    description: string
    fields: unknown[]
  }>
  estimated_time?: number
  expiration_date: string
  [key: string]: unknown
}

interface FieldDefinition {
  name: string
  label: string
  type: string
  required?: boolean
  placeholder?: string
  fields?: Array<{
    name: string
    label: string
    type: string
    required?: boolean
  }>
  [key: string]: unknown
}

// GET /api/intake-forms - List intake forms for a client or attorney
export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    
    // Check permissions
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to view intake forms',
        403
      ))
    }

    const url = new URL(request.url)
    const clientId = url.searchParams.get('client_id')
    const status = url.searchParams.get('status')

    let query = supabaseAdmin
      .from('intake_forms')
      .select(`
        *,
        client:clients(first_name, last_name, email),
        created_by_profile:user_profiles!intake_forms_created_by_fkey(first_name, last_name)
      `)
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: forms, error } = await query

    if (error) {
      console.error('Database error:', error)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to retrieve intake forms',
        500
      ))
    }

    await logAuditEvent(
      'intake_forms_access',
      user.uid,
      request,
      { 
        client_id: clientId,
        status,
        result_count: forms?.length || 0
      }
    )

    return addCORSHeaders(createSuccessResponse({
      forms: forms || []
    }))

  } catch (error) {
    console.error('Intake forms list error:', error)
    
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

// POST /api/intake-forms - Generate new intake form for missing client data
export async function POST(request: NextRequest) {
  try {
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    const user = await authenticate(request)
    
    // Check permissions
    if (!['admin', 'associate_attorney', 'paralegal'].includes(user.role)) {
      return addCORSHeaders(createErrorResponse(
        'INSUFFICIENT_PRIVILEGES',
        'Access denied: insufficient privileges to generate intake forms',
        403
      ))
    }

    const formData = await parseRequestBody<GenerateIntakeFormRequest>(request)

    // Validate required fields
    if (!formData.client_id || !formData.document_type || !formData.missing_fields) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'client_id, document_type, and missing_fields are required',
        400
      ))
    }

    // Get client information
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', formData.client_id)
      .single()

    if (clientError || !client) {
      return addCORSHeaders(createErrorResponse(
        'CLIENT_NOT_FOUND',
        'Client not found',
        404
      ))
    }

    // Generate intake form
    const intakeForm = await generateIntakeForm(
      formData.document_type,
      formData.missing_fields,
      client
    )

    // Create intake form record
    const { data: form, error: formError } = await supabaseAdmin
      .from('intake_forms')
      .insert({
        client_id: formData.client_id,
        document_type: formData.document_type,
        missing_fields: formData.missing_fields,
        form_content: intakeForm,
        delivery_method: formData.delivery_method || 'email',
        status: 'sent',
        is_urgent: formData.urgent || false,
        created_by: user.uid
      })
      .select()
      .single()

    if (formError) {
      console.error('Database error creating form:', formError)
      return addCORSHeaders(createErrorResponse(
        'DATABASE_ERROR',
        'Failed to create intake form',
        500
      ))
    }

    // Send intake form via email if requested
    if (['email', 'both'].includes(formData.delivery_method) && client.email) {
      await sendIntakeFormEmail(client, intakeForm, form.id, formData.urgent)
    }

    await logAuditEvent(
      'intake_form_generated',
      user.uid,
      request,
      { 
        client_id: formData.client_id,
        document_type: formData.document_type,
        form_id: form.id,
        delivery_method: formData.delivery_method
      }
    )

    return addCORSHeaders(createSuccessResponse({
      form,
      message: 'Intake form generated and sent successfully'
    }))

  } catch (error) {
    console.error('Intake form generation error:', error)
    
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

// PUT /api/intake-forms - Submit intake form responses
export async function PUT(request: NextRequest) {
  try {
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ))
    }

    const submission = await parseRequestBody<IntakeFormSubmission>(request)

    // Validate required fields
    if (!submission.form_id || !submission.client_id || !submission.responses) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'form_id, client_id, and responses are required',
        400
      ))
    }

    // Get intake form
    const { data: form, error: formError } = await supabaseAdmin
      .from('intake_forms')
      .select('*')
      .eq('id', submission.form_id)
      .eq('client_id', submission.client_id)
      .single()

    if (formError || !form) {
      return addCORSHeaders(createErrorResponse(
        'FORM_NOT_FOUND',
        'Intake form not found',
        404
      ))
    }

    // Update client record with submitted data
    const updatedClientData = mapIntakeResponsesToClientFields(
      submission.responses,
      form.document_type
    )

    const { error: updateError } = await supabaseAdmin
      .from('clients')
      .update({
        ...updatedClientData,
        last_document_update: new Date().toISOString()
      })
      .eq('id', submission.client_id)

    if (updateError) {
      console.error('Error updating client:', updateError)
      return addCORSHeaders(createErrorResponse(
        'UPDATE_FAILED',
        'Failed to update client information',
        500
      ))
    }

    // Update intake form status
    const newStatus = submission.partial_submission ? 'partial' : 'completed'
    const { error: formUpdateError } = await supabaseAdmin
      .from('intake_forms')
      .update({
        status: newStatus,
        responses: submission.responses,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', submission.form_id)

    if (formUpdateError) {
      console.error('Error updating form:', formUpdateError)
    }

    // Trigger document regeneration if form is complete
    if (!submission.partial_submission) {
      // TODO: Trigger document regeneration workflow
      // This will be implemented when we build the document generation system
    }

    return addCORSHeaders(createSuccessResponse({
      message: newStatus === 'completed' 
        ? 'Intake form completed. Document will be regenerated and flagged for attorney review.'
        : 'Partial intake form saved. Complete remaining fields to proceed.',
      status: newStatus,
      trigger_document_regeneration: !submission.partial_submission
    }))

  } catch (error) {
    console.error('Intake form submission error:', error)
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    ))
  }
}

/**
 * Generate intake form content based on missing fields and document type
 */
async function generateIntakeForm(
  documentType: string,
  missingFields: string[],
  client: Client
): Promise<IntakeForm> {
  
  const formSections = []
  
  // Add client confirmation section
  formSections.push({
    title: 'Client Information Verification',
    description: `Please verify and complete your information for your ${documentType} document.`,
    fields: [
      {
        name: 'client_confirmation',
        label: `I confirm this form is being completed by ${client.first_name} ${client.last_name}`,
        type: 'checkbox',
        required: true
      }
    ]
  })

  // Generate sections based on missing fields
  const fieldGroups = groupFieldsByCategory(missingFields, documentType)
  
  for (const [category, fields] of Object.entries(fieldGroups)) {
    formSections.push({
      title: category,
      description: getFieldCategoryDescription(category, documentType),
      fields: fields.map(field => generateFieldDefinition(field, documentType))
    })
  }

  return {
    title: `${documentType.charAt(0).toUpperCase() + documentType.slice(1)} Information Form`,
    description: `Please complete the following information to finalize your ${documentType} document.`,
    sections: formSections,
    estimated_time: Math.ceil(missingFields.length * 0.5), // 30 seconds per field
    expiration_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  }
}

/**
 * Group missing fields by logical categories
 */
function groupFieldsByCategory(fields: string[], _documentType: string): Record<string, string[]> {
  const groups: Record<string, string[]> = {}
  
  const categoryMappings = {
    'Spouse/Partner Information': ['spouse_first_name', 'spouse_last_name', 'spouse_date_of_birth', 'marital_status'],
    'Beneficiary Information': ['primary_beneficiaries', 'contingent_beneficiaries'],
    'Asset Information': ['real_estate', 'financial_accounts', 'business_interests', 'personal_property'],
    'Family Information': ['children', 'parents'],
    'Legal Designations': ['successor_trustees', 'executor_personal_rep', 'attorney_in_fact', 'healthcare_proxy'],
    'Healthcare Directives': ['healthcare_directives', 'burial_instructions'],
    'Business Information': ['business_formation_info', 'business_members', 'business_managers', 'registered_agent']
  }

  for (const field of fields) {
    let categorized = false
    
    for (const [category, categoryFields] of Object.entries(categoryMappings)) {
      if (categoryFields.includes(field)) {
        if (!groups[category]) groups[category] = []
        groups[category].push(field)
        categorized = true
        break
      }
    }
    
    if (!categorized) {
      if (!groups['Additional Information']) groups['Additional Information'] = []
      groups['Additional Information'].push(field)
    }
  }
  
  return groups
}

/**
 * Generate field definition for form rendering
 */
function generateFieldDefinition(fieldName: string, _documentType: string): FieldDefinition {
  const fieldDefinitions: Record<string, FieldDefinition> = {
    spouse_first_name: {
      name: 'spouse_first_name',
      label: 'Spouse/Partner First Name',
      type: 'text',
      required: true,
      placeholder: 'Enter first name'
    },
    spouse_last_name: {
      name: 'spouse_last_name', 
      label: 'Spouse/Partner Last Name',
      type: 'text',
      required: true,
      placeholder: 'Enter last name'
    },
    primary_beneficiaries: {
      name: 'primary_beneficiaries',
      label: 'Primary Beneficiaries',
      type: 'repeating_group',
      required: true,
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'relationship', label: 'Relationship', type: 'text', required: true },
        { name: 'percentage', label: 'Percentage (%)', type: 'number', required: true },
        { name: 'address', label: 'Address', type: 'textarea' }
      ]
    },
    real_estate: {
      name: 'real_estate',
      label: 'Real Estate Properties',
      type: 'repeating_group',
      required: false,
      fields: [
        { name: 'address', label: 'Property Address', type: 'textarea', required: true },
        { name: 'type', label: 'Property Type', type: 'select', options: ['Primary Residence', 'Rental Property', 'Vacation Home', 'Commercial', 'Land'], required: true },
        { name: 'estimated_value', label: 'Estimated Value ($)', type: 'number' },
        { name: 'mortgage_balance', label: 'Mortgage Balance ($)', type: 'number' }
      ]
    }
    // Add more field definitions as needed
  }

  return fieldDefinitions[fieldName] || {
    name: fieldName,
    label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: 'text',
    required: false
  }
}

/**
 * Get description for field categories
 */
function getFieldCategoryDescription(category: string, _documentType: string): string {
  const descriptions: Record<string, string> = {
    'Spouse/Partner Information': 'Please provide information about your spouse or partner.',
    'Beneficiary Information': 'Who should receive your assets and in what proportions?',
    'Asset Information': 'Help us understand your assets for proper trust/estate planning.',
    'Legal Designations': 'Who would you like to designate for various legal roles?',
    'Healthcare Directives': 'Your preferences for healthcare and end-of-life decisions.'
  }
  
  return descriptions[category] || 'Please provide the following information.'
}

/**
 * Send intake form via email
 */
async function sendIntakeFormEmail(client: Client, form: IntakeForm, formId: string, isUrgent?: boolean): Promise<void> {
  try {
    const subject = isUrgent 
      ? `URGENT: Complete Your ${form.title} - Action Required`
      : `Please Complete Your ${form.title}`

    const emailBody = `Dear ${client.first_name} ${client.last_name},

We need additional information to complete your ${form.sections?.[0]?.description?.split('your ')[1]?.split(' document')[0] || 'legal document'}.

Please click the link below to complete the secure form:
[FORM_LINK_PLACEHOLDER_${formId}]

Estimated time to complete: ${form.estimated_time || 5} minutes

This form will expire on ${new Date(form.expiration_date).toLocaleDateString()}.

If you have any questions, please don't hesitate to contact our office.

Best regards,
JurisAgentis PLLC`

    // Send via Gmail if authenticated, otherwise log for manual sending
    if (gmailService.isAuthenticated()) {
      await gmailService.sendEmail({
        to: [client.email],
        subject,
        body: emailBody
      })
    } else {
      console.log('Gmail not authenticated. Email would be sent:', {
        to: client.email,
        subject,
        preview: emailBody.substring(0, 100) + '...'
      })
    }
  } catch (error) {
    console.error('Error sending intake form email:', error)
  }
}

/**
 * Map intake form responses to client database fields
 */
function mapIntakeResponsesToClientFields(responses: Record<string, Record<string, unknown>>, _documentType: string): Record<string, Record<string, unknown>> {
  const mappedData: Record<string, Record<string, unknown>> = {}
  
  // Direct field mappings
  const directMappings: Record<string, string> = {
    spouse_first_name: 'spouse_first_name',
    spouse_last_name: 'spouse_last_name',
    spouse_date_of_birth: 'spouse_date_of_birth',
    marital_status: 'marital_status'
  }
  
  for (const [responseKey, dbField] of Object.entries(directMappings)) {
    if (responses[responseKey]) {
      mappedData[dbField] = responses[responseKey]
    }
  }
  
  // Complex field mappings (JSONB fields)
  const jsonbMappings: Record<string, string> = {
    primary_beneficiaries: 'primary_beneficiaries',
    contingent_beneficiaries: 'contingent_beneficiaries',
    real_estate: 'real_estate',
    financial_accounts: 'financial_accounts',
    children: 'children'
  }
  
  for (const [responseKey, dbField] of Object.entries(jsonbMappings)) {
    if (responses[responseKey]) {
      mappedData[dbField] = JSON.stringify(responses[responseKey])
    }
  }
  
  return mappedData
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }))
}

export async function DELETE() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'PUT', 'OPTIONS']))
}

export async function PATCH() {
  return addCORSHeaders(createMethodNotAllowedResponse(['GET', 'POST', 'PUT', 'OPTIONS']))
}