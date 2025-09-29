/**
 * Template Engine Types
 * T039: Business logic types for document template system
 */

import { Database } from './database';
import { DocumentType } from './documents';

// Extract database types for convenience
type TemplateRow = Database['public']['Tables']['document_templates']['Row'];
type TemplateInsert = Database['public']['Tables']['document_templates']['Insert'];
type TemplateUpdate = Database['public']['Tables']['document_templates']['Update'];
type TemplateFieldRow = Database['public']['Tables']['template_fields']['Row'];

// Core enums from database
export type TemplateStatus = Database['public']['Enums']['template_status'];
export type FieldType = Database['public']['Enums']['field_type'];

// Business logic types
export interface Template extends TemplateRow {
  // Enhanced with computed/joined data
  field_definitions: TemplateField[];
  usage_count: number;
  last_used_at?: string;
  created_by_name?: string;
  category?: string;
  tags?: string[];
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
}

export interface TemplateField extends TemplateFieldRow {
  // Enhanced field information
  validation_rules?: FieldValidationRule[];
  conditional_logic?: ConditionalLogic[];
  auto_populate_source?: string;
  help_text?: string;
  placeholder?: string;
}

// Field validation and logic types
export interface FieldValidationRule {
  type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'custom';
  value?: string | number;
  message: string;
  condition?: string; // JavaScript expression
}

export interface ConditionalLogic {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: unknown;
  action: 'show' | 'hide' | 'require' | 'disable';
}

// Template field definition structure
export interface TemplateFieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  default_value?: unknown;
  description?: string;
  validation?: FieldValidationRule[];
  conditional_logic?: ConditionalLogic[];
  
  // Type-specific properties
  options?: SelectOption[]; // For select/multi_select fields
  format?: string; // For date, number, currency fields
  min?: number;
  max?: number;
  step?: number;
  
  // UI properties
  placeholder?: string;
  help_text?: string;
  group?: string;
  order?: number;
  width?: 'full' | 'half' | 'third' | 'quarter';
  
  // Auto-population
  auto_populate?: {
    source: 'client' | 'matter' | 'user' | 'system';
    field: string;
    transform?: string; // JavaScript function
  };
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}

// Input/Output types for API operations
export interface TemplateCreateInput {
  name: string;
  description?: string;
  document_type: DocumentType;
  practice_area?: string;
  jurisdiction?: string;
  template_file_path: string;
  template_file_name: string;
  template_file_size: number;
  field_definitions: TemplateFieldDefinition[];
  required_fields: string[];
  conditional_logic?: Record<string, ConditionalLogic[]>;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  allowed_roles?: string[];
}

export interface TemplateUpdateInput {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  field_definitions?: TemplateFieldDefinition[];
  required_fields?: string[];
  conditional_logic?: Record<string, ConditionalLogic[]>;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  allowed_roles?: string[];
}

export interface TemplateSearchParams {
  query?: string;
  document_type?: DocumentType[];
  practice_area?: string[];
  jurisdiction?: string[];
  status?: TemplateStatus[];
  category?: string[];
  tags?: string[];
  is_public?: boolean;
  created_by?: string;
  created_after?: Date;
  created_before?: Date;
  limit?: number;
  offset?: number;
  sort_by?: 'usage_count' | 'created_at' | 'updated_at' | 'name';
  sort_order?: 'asc' | 'desc';
}

export interface TemplateSearchResponse {
  templates: Template[];
  total: number;
  facets?: {
    document_type?: Record<string, number>;
    practice_area?: Record<string, number>;
    status?: Record<string, number>;
    category?: Record<string, number>;
  };
  suggestions?: string[];
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// Document generation types
export interface DocumentGenerationInput {
  template_id: string;
  matter_id: string;
  title?: string;
  field_values: Record<string, unknown>;
  output_format?: 'html' | 'pdf' | 'docx';
  auto_populate?: boolean;
  custom_styles?: Record<string, string>;
  watermark?: {
    text: string;
    opacity: number;
    position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
}

export interface GeneratedDocument {
  id: string;
  template_id: string;
  matter_id: string;
  title: string;
  generated_content: string;
  output_format: 'html' | 'pdf' | 'docx';
  field_values: Record<string, unknown>;
  auto_populated_values: Record<string, unknown>;
  generated_at: string;
  generated_by: string;
  generation_duration_ms: number;
  validation_passed: boolean;
  validation_errors: string[];
  file_path?: string;
  file_size?: number;
}

// Template validation types
export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationError[];
  warnings: TemplateValidationError[];
  field_count: number;
  syntax_score: number; // 0-100
  complexity_score: number; // 0-100
  estimated_generation_time_ms: number;
}

export interface TemplateValidationError {
  type: 'syntax' | 'field' | 'logic' | 'style' | 'reference';
  severity: 'error' | 'warning' | 'info';
  field?: string;
  line?: number;
  column?: number;
  message: string;
  suggestion?: string;
  code?: string;
}

// AI-powered template generation (GPT-5 integration)
export interface AITemplateGenerationRequest {
  documentType: DocumentType;
  description: string;
  practiceArea?: string;
  jurisdiction?: string;
  includeClauses?: string[];
  targetAudience?: 'attorney' | 'client' | 'court';
  formality?: 'formal' | 'standard' | 'informal';
  complexity?: 'simple' | 'moderate' | 'complex';
  language?: string;
  customRequirements?: string;
}

export interface AITemplateGenerationResult {
  templateContent: string;
  suggestedFields: TemplateFieldDefinition[];
  validationNotes: string[];
  confidenceScore: number; // 0-100
  alternativeVersions?: string[];
  recommendedClauses?: string[];
  legalReferences?: string[];
  generatedAt: string;
  model: string;
  tokens_used: number;
}

// Template statistics and analytics
export interface TemplateStats {
  total_templates: number;
  active_templates: number;
  most_used_templates: Array<{
    id: string;
    name: string;
    usage_count: number;
    document_type: DocumentType;
  }>;
  templates_by_type: Record<DocumentType, number>;
  templates_by_practice_area: Record<string, number>;
  average_generation_time_ms: number;
  success_rate: number;
}

export interface TemplateUsageAnalytics {
  template_id: string;
  total_uses: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time_ms: number;
  most_common_fields: Array<{
    field: string;
    usage_count: number;
    most_common_values: string[];
  }>;
  user_feedback_score?: number;
  last_30_days_usage: number;
  trending_score: number;
}

// UI/Display types
export interface TemplateListItem {
  id: string;
  name: string;
  document_type: DocumentType;
  practice_area?: string;
  status: TemplateStatus;
  usage_count: number;
  field_count: number;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
  is_public: boolean;
  created_by_name: string;
  tags: string[];
}

export interface TemplatePreview {
  id: string;
  name: string;
  description: string;
  document_type: DocumentType;
  field_definitions: TemplateFieldDefinition[];
  sample_content: string;
  estimated_completion_time: number; // minutes
  complexity_level: 'beginner' | 'intermediate' | 'advanced';
  required_permissions: string[];
}

// Export utility types
export interface TemplateExportOptions {
  format: 'json' | 'yaml' | 'xml';
  include_usage_stats?: boolean;
  include_field_definitions?: boolean;
  include_sample_data?: boolean;
  compress?: boolean;
}

export interface TemplateImportResult {
  success: boolean;
  template_id?: string;
  errors?: string[];
  warnings?: string[];
  conflicts?: Array<{
    field: string;
    existing_value: unknown;
    imported_value: unknown;
    resolution: 'keep' | 'replace' | 'merge';
  }>;
}