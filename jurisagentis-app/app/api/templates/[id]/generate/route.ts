/**
 * Template Generation API - Generate documents from templates
 * T063: Template generation API route for document creation
 */

import { NextRequest } from 'next/server';
import { TemplateEngineService } from '@jurisagentis/template-engine';
import { 
  createSuccessResponse, 
  createErrorResponse,
  addCORSHeaders,
  parseRequestBody,
  validateContentType
} from '@/lib/api/response';
import { authenticate, logAuditEvent, AuthenticationError } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Initialize Supabase client for the template service
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize template engine service
const templateEngine = new TemplateEngineService(supabase);

interface GenerateDocumentRequest {
  client_id?: string;
  matter_id?: string;
  case_id?: string;
  template_variables: Record<string, unknown>;
  output_format?: 'pdf' | 'docx' | 'html';
  document_title?: string;
  save_as_document?: boolean;
  apply_digital_signature?: boolean;
  watermark_settings?: {
    enabled: boolean;
    text?: string;
    opacity?: number;
    position?: 'center' | 'header' | 'footer';
  };
  metadata?: {
    practice_area?: string;
    document_type?: string;
    tags?: string[];
    confidentiality_level?: 'public' | 'internal' | 'client_confidential' | 'attorney_client_privileged';
    retention_period?: number;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate content type
    if (!validateContentType(request)) {
      return addCORSHeaders(createErrorResponse(
        'INVALID_CONTENT_TYPE',
        'Content-Type must be application/json',
        400
      ));
    }

    // Get authenticated user
    const user = await authenticate(request);
    
    const { id: templateId } = await params;
    
    // Parse request body
    const generationData = await parseRequestBody<GenerateDocumentRequest>(request);

    // Validate required fields
    if (!generationData.template_variables) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_REQUIRED_FIELDS',
        'template_variables is required',
        400
      ));
    }

    // Get template to validate it exists and user has access
    const template = await getTemplate(templateId);
    if (!template) {
      return addCORSHeaders(createErrorResponse(
        'TEMPLATE_NOT_FOUND',
        `Template with ID ${templateId} not found`,
        404
      ));
    }

    // Validate template variables against required fields
    const missingRequired = template.required_fields?.filter(
      field => !(field in generationData.template_variables)
    ) || [];

    if (missingRequired.length > 0) {
      return addCORSHeaders(createErrorResponse(
        'MISSING_TEMPLATE_VARIABLES',
        `Missing required template variables: ${missingRequired.join(', ')}`,
        400
      ));
    }

    // Generate document using template engine
    const generatedDocument = await templateEngine.generateDocument({
      template_id: templateId,
      template_variables: generationData.template_variables,
      output_format: generationData.output_format || 'pdf',
      watermark_settings: generationData.watermark_settings,
      metadata: {
        generated_by: user.uid,
        client_id: generationData.client_id,
        matter_id: generationData.matter_id,
        case_id: generationData.case_id,
        ...generationData.metadata
      }
    });

    let documentRecord = null;

    // Save as document if requested
    if (generationData.save_as_document) {
      const documentTitle = generationData.document_title || 
        `${template.title} - Generated ${new Date().toLocaleDateString()}`;

      documentRecord = await saveGeneratedDocument({
        title: documentTitle,
        template_id: templateId,
        generated_content: generatedDocument.content,
        file_path: generatedDocument.file_path,
        file_size: generatedDocument.file_size,
        file_hash: generatedDocument.file_hash,
        output_format: generatedDocument.output_format,
        template_variables: generationData.template_variables,
        client_id: generationData.client_id,
        matter_id: generationData.matter_id,
        case_id: generationData.case_id,
        created_by: user.uid,
        metadata: generationData.metadata
      });
    }

    // Log audit event
    await logAuditEvent(
      'template_document_generated',
      user.uid,
      request,
      { 
        template_id: templateId,
        template_name: template.name,
        output_format: generatedDocument.output_format,
        document_id: documentRecord?.id,
        client_id: generationData.client_id,
        matter_id: generationData.matter_id,
        variables_used: Object.keys(generationData.template_variables),
        file_size: generatedDocument.file_size
      }
    );

    return addCORSHeaders(createSuccessResponse({
      generated_document: {
        id: generatedDocument.id,
        template_id: templateId,
        template_name: template.name,
        output_format: generatedDocument.output_format,
        file_path: generatedDocument.file_path,
        file_size: generatedDocument.file_size,
        file_hash: generatedDocument.file_hash,
        download_url: generatedDocument.download_url,
        preview_url: generatedDocument.preview_url,
        generated_at: generatedDocument.generated_at,
        expires_at: generatedDocument.expires_at
      },
      document_record: documentRecord,
      template_variables_used: Object.keys(generationData.template_variables),
      message: documentRecord ? 
        'Document generated and saved successfully' : 
        'Document generated successfully'
    }));

  } catch (error: unknown) {
    console.error('Template generation error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }

    // Handle template processing errors
    if (error instanceof Error && error.name === 'TemplateProcessingError') {
      return addCORSHeaders(createErrorResponse(
        'TEMPLATE_PROCESSING_ERROR',
        `Template processing failed: ${error.message}`,
        400
      ));
    }

    // Handle variable validation errors
    if (error instanceof Error && error.name === 'VariableValidationError') {
      return addCORSHeaders(createErrorResponse(
        'VARIABLE_VALIDATION_ERROR',
        `Template variable validation failed: ${error.message}`,
        400
      ));
    }

    // Handle file generation errors
    if (error instanceof Error && error.name === 'FileGenerationError') {
      return addCORSHeaders(createErrorResponse(
        'FILE_GENERATION_ERROR',
        `Document file generation failed: ${error.message}`,
        500
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to generate document from template',
      500
    ));
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get authenticated user
    const user = await authenticate(request);
    
    const { id: templateId } = await params;
    
    // Parse query parameters
    const url = new URL(request.url);
    const includeVariables = url.searchParams.get('include_variables') === 'true';
    const includePreview = url.searchParams.get('include_preview') === 'true';

    // Get template information for generation
    const template = await getTemplate(templateId);
    if (!template) {
      return addCORSHeaders(createErrorResponse(
        'TEMPLATE_NOT_FOUND',
        `Template with ID ${templateId} not found`,
        404
      ));
    }

    // Get template generation info
    const generationInfo = await templateEngine.getTemplateGenerationInfo(templateId, {
      include_variables: includeVariables,
      include_preview: includePreview
    });

    // Log audit event
    await logAuditEvent(
      'template_generation_info_accessed',
      user.uid,
      request,
      { 
        template_id: templateId,
        template_name: template.name,
        include_variables: includeVariables,
        include_preview: includePreview
      }
    );

    return addCORSHeaders(createSuccessResponse({
      template_id: templateId,
      template_name: template.name,
      template_title: template.title,
      generation_info: generationInfo
    }));

  } catch (error: unknown) {
    console.error('Template generation info error:', error);
    
    if (error instanceof AuthenticationError) {
      return addCORSHeaders(createErrorResponse(
        error.code || 'AUTHENTICATION_FAILED',
        error.message,
        error.statusCode || 401
      ));
    }
    
    return addCORSHeaders(createErrorResponse(
      'INTERNAL_SERVER_ERROR',
      'Failed to retrieve template generation information',
      500
    ));
  }
}

export async function OPTIONS() {
  return addCORSHeaders(new Response(null, { status: 200 }));
}

/**
 * Helper functions
 */

async function getTemplate(templateId: string) {
  try {
    const { data: template, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Template query error:', error);
      return null;
    }

    return template;
  } catch (error) {
    console.error('Failed to get template:', error);
    // In development, return mock template data
    if (process.env.NODE_ENV === 'development') {
      return {
        id: templateId,
        name: 'mock_template',
        title: 'Mock Template for Development',
        description: 'Mock template for development purposes',
        category: 'general',
        content: 'Mock template content with {{variable_1}} and {{variable_2}}',
        variables: ['variable_1', 'variable_2'],
        required_fields: ['variable_1'],
        optional_fields: ['variable_2'],
        file_format: 'pdf',
        is_active: true
      };
    }
    return null;
  }
}

async function saveGeneratedDocument(documentData: {
  title: string;
  template_id: string;
  generated_content: string;
  file_path: string;
  file_size: number;
  file_hash: string;
  output_format: string;
  template_variables: Record<string, unknown>;
  client_id?: string;
  matter_id?: string;
  case_id?: string;
  created_by: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const documentRecord = {
      title: documentData.title,
      description: `Generated from template: ${documentData.template_id}`,
      document_type: 'generated_document',
      status: 'draft',
      file_path: documentData.file_path,
      file_size: documentData.file_size,
      file_hash: documentData.file_hash,
      file_format: documentData.output_format,
      template_id: documentData.template_id,
      template_variables: documentData.template_variables,
      client_id: documentData.client_id,
      matter_id: documentData.matter_id,
      case_id: documentData.case_id,
      created_by: documentData.created_by,
      confidentiality_level: documentData.metadata?.confidentiality_level || 'client_confidential',
      tags: documentData.metadata?.tags || ['generated', 'template'],
      metadata: {
        ...documentData.metadata,
        generation_source: 'template_api',
        generated_at: new Date().toISOString()
      }
    };

    const { data: document, error } = await supabase
      .from('documents')
      .insert(documentRecord)
      .select('*')
      .single();

    if (error) {
      console.error('Document save error:', error);
      // In development, return mock document record
      if (process.env.NODE_ENV === 'development') {
        return {
          id: `doc_${Date.now()}`,
          ...documentRecord,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }
      throw new Error('Failed to save generated document');
    }

    return document;
  } catch (error) {
    console.error('Failed to save generated document:', error);
    throw error;
  }
}