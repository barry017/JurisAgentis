/**
 * E-Signature System Types
 * T040: Business logic types for DocuSign integration and signature workflows
 */

import { Database } from './database';

// Extract database types for convenience
type SignatureRequestRow = Database['public']['Tables']['signature_requests']['Row'];
type SignatureRow = Database['public']['Tables']['signatures']['Row'];

// Core enums from database
export type SignatureRequestStatus = Database['public']['Enums']['signature_request_status'];
export type SignatureStatus = Database['public']['Enums']['signature_status'];
export type SignatureType = Database['public']['Enums']['signature_type'];

// Business logic types
export interface SignatureRequest extends SignatureRequestRow {
  // Enhanced with computed/joined data
  document?: {
    id: string;
    title: string;
    file_path: string;
    matter_id: string;
  };
  matter?: {
    id: string;
    title: string;
    client_name: string;
  };
  signatures: Signature[];
  signers: Signer[];
  workflow_progress: WorkflowProgress;
  estimated_completion?: string;
  can_send_reminders: boolean;
  can_void: boolean;
  can_correct: boolean;
}

export interface Signature extends SignatureRow {
  // Enhanced signature information
  signer_info?: SignerInfo;
  signature_image_url?: string;
  certificate_url?: string;
  ip_geolocation?: {
    country: string;
    region: string;
    city: string;
  };
}

export interface Signer {
  id?: string;
  name: string;
  email: string;
  role: string;
  signing_order: number;
  status: SignatureStatus;
  routing_order?: number;
  
  // Contact preferences
  phone?: string;
  language?: string;
  notification_preference?: 'email' | 'sms' | 'both';
  
  // Authentication requirements
  authentication_method?: 'email' | 'phone' | 'knowledge_based' | 'id_verification';
  require_id_verification?: boolean;
  access_code?: string;
  
  // Signing behavior
  signed_at?: string;
  viewed_at?: string;
  delivered_at?: string;
  decline_reason?: string;
  decline_comment?: string;
  
  // DocuSign specific
  recipient_id?: string;
  client_user_id?: string;
  embedded_signing_url?: string;
  signing_url?: string;
  signing_url_expires_at?: string;
}

export interface SignerInfo {
  full_name: string;
  email: string;
  company?: string;
  title?: string;
  ip_address: string;
  user_agent: string;
  signing_method: 'click_to_sign' | 'type_signature' | 'draw_signature' | 'upload_signature';
  authentication_method: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

export interface WorkflowProgress {
  current_signer_index: number;
  total_signers: number;
  completed_signatures: number;
  pending_signatures: number;
  declined_signatures: number;
  progress_percentage: number;
  estimated_completion_date?: string;
  next_signer?: Signer;
  bottleneck_analysis?: {
    delayed_signers: string[];
    average_delay_hours: number;
    suggested_actions: string[];
  };
}

// DocuSign integration types
export interface DocuSignConfig {
  integration_key: string;
  user_id: string;
  account_id: string;
  base_path: string;
  private_key: string;
  oauth_base_path: string;
}

export interface DocuSignEnvelope {
  envelope_id: string;
  status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
  created_date_time: string;
  sent_date_time?: string;
  completed_date_time?: string;
  voided_date_time?: string;
  voided_reason?: string;
  email_subject: string;
  email_blurb?: string;
  reminder_enabled: boolean;
  reminder_delay: number;
  reminder_frequency: number;
  expire_enabled: boolean;
  expire_after: number;
  expire_warn: number;
}

export interface DocuSignDocument {
  document_id: string;
  name: string;
  type: string;
  uri?: string;
  order?: number;
  pages?: number;
  display?: 'inline' | 'modal';
  include_in_download?: boolean;
}

export interface DocuSignTab {
  tab_id?: string;
  document_id: string;
  recipient_id: string;
  page_number: number;
  x_position: number;
  y_position: number;
  width?: number;
  height?: number;
  tab_type: 'signature' | 'initial' | 'date' | 'text' | 'checkbox' | 'radio' | 'list';
  required?: boolean;
  locked?: boolean;
  tab_label?: string;
  value?: string;
  validation_pattern?: string;
  validation_message?: string;
}

// Input/Output types for API operations
export interface SignatureRequestCreateInput {
  document_id: string;
  signers: SignerCreateInput[];
  email_subject?: string;
  email_message?: string;
  reminder_delay_hours?: number;
  reminder_frequency_days?: number;
  expires_in_days?: number;
  require_authentication?: boolean;
  allow_markup?: boolean;
  allow_reassign?: boolean;
  enforce_signer_visibility?: boolean;
  enable_wet_sign?: boolean;
  brand_id?: string;
  callback_url?: string;
  signing_location?: 'online' | 'in_person';
  certificate_delivery?: 'email' | 'none';
  tabs?: DocuSignTab[];
}

export interface SignerCreateInput {
  name: string;
  email: string;
  role: string;
  signing_order: number;
  routing_order?: number;
  phone?: string;
  language?: string;
  access_code?: string;
  require_id_verification?: boolean;
  authentication_method?: 'email' | 'phone' | 'knowledge_based' | 'id_verification';
  notification_preference?: 'email' | 'sms' | 'both';
  client_user_id?: string;
  embedded_signing?: boolean;
  default_recipient?: boolean;
  
  // Custom fields
  custom_fields?: Record<string, string>;
  tabs?: DocuSignTab[];
}

export interface SignatureRequestUpdateInput {
  email_subject?: string;
  email_message?: string;
  reminder_enabled?: boolean;
  reminder_delay_hours?: number;
  reminder_frequency_days?: number;
  expires_in_days?: number;
}

// Webhook and event types
export interface DocuSignWebhookPayload {
  event: string;
  api_version: string;
  uri: string;
  retry_count: number;
  configuration_id: number;
  generated_date_time: string;
  data: {
    account_id: string;
    user_id: string;
    envelope_summary: {
      envelope_id: string;
      status: string;
      documents_uri: string;
      recipients_uri: string;
      custom_fields_uri: string;
      notification_uri: string;
      enable_wet_sign: boolean;
      allow_markup: boolean;
      allow_reassign: boolean;
      created_date_time: string;
      last_modified_date_time: string;
      delivered_date_time?: string;
      sent_date_time?: string;
      completed_date_time?: string;
      voided_date_time?: string;
      voided_reason?: string;
    };
    envelope_status: {
      status: string;
      document_statuses: Array<{
        id: string;
        name: string;
        sequence: string;
        status: string;
      }>;
      recipient_statuses: Array<{
        type: string;
        email: string;
        user_name: string;
        routing_order: string;
        sent: string;
        delivered?: string;
        signed?: string;
        declined?: string;
        decline_reason?: string;
        status: string;
        recipient_id: string;
        recipient_id_guid: string;
      }>;
    };
  };
}

export interface SignatureEvent {
  id: string;
  signature_request_id: string;
  event_type: 'sent' | 'viewed' | 'signed' | 'completed' | 'declined' | 'voided' | 'reminder_sent';
  signer_email?: string;
  timestamp: string;
  details?: Record<string, unknown>;
  docusign_event_id?: string;
}

// Compliance and audit types
export interface ComplianceConfig {
  require_certificate: boolean;
  certificate_authority: string;
  timestamp_server_url?: string;
  long_term_validation: boolean;
  archive_documents: boolean;
  retention_years: number;
  encryption_algorithm: string;
  hash_algorithm: string;
  compliance_standards: string[]; // e.g., ['ESIGN', 'UETA', 'GDPR']
}

export interface AuditTrail {
  signature_request_id: string;
  events: AuditEvent[];
  certificate_chain?: string;
  timestamp_token?: string;
  legal_validity: LegalValidityResult;
  export_formats: ('json' | 'xml' | 'pdf')[];
  generated_at: string;
  generated_by: string;
}

export interface AuditEvent {
  timestamp: string;
  event_type: string;
  actor: {
    type: 'signer' | 'sender' | 'system';
    name: string;
    email: string;
    ip_address: string;
    user_agent: string;
  };
  action: string;
  resource: string;
  details: Record<string, unknown>;
  integrity_hash: string;
}

export interface LegalValidityResult {
  is_valid: boolean;
  compliance_standards_met: string[];
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    recommendation: string;
  }>;
  signature_authenticity: 'verified' | 'unverified' | 'tampered';
  document_integrity: 'intact' | 'modified' | 'corrupted';
  timestamp_validity: 'valid' | 'invalid' | 'expired';
  certificate_status: 'valid' | 'expired' | 'revoked' | 'unknown';
  legal_weight_score: number; // 0-100
}

// Bulk operations types
export interface BulkSignatureRequestInput {
  template_id?: string;
  documents: Array<{
    document_id: string;
    custom_fields?: Record<string, string>;
  }>;
  signers: SignerCreateInput[];
  bulk_settings: {
    email_subject_template: string;
    email_message_template: string;
    batch_size: number;
    delay_between_batches_minutes: number;
    stop_on_error: boolean;
  };
}

export interface BulkOperationResult {
  operation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  pending_requests: number;
  started_at: string;
  completed_at?: string;
  estimated_completion?: string;
  errors: Array<{
    document_id: string;
    error_code: string;
    error_message: string;
  }>;
  results: string[]; // Array of created signature request IDs
}

// Template and reusable workflow types
export interface SignatureTemplate {
  id: string;
  name: string;
  description: string;
  document_type: string;
  roles: TemplateRole[];
  tabs: DocuSignTab[];
  workflow_settings: {
    signing_order: 'sequential' | 'parallel';
    reminder_settings: ReminderSettings;
    expiration_settings: ExpirationSettings;
    authentication_requirements: AuthenticationRequirements;
  };
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface TemplateRole {
  name: string;
  sequence: number;
  can_edit_when_routing?: boolean;
  can_edit_recipient_emails?: boolean;
  can_edit_recipient_names?: boolean;
  default_recipient?: {
    name?: string;
    email?: string;
  };
}

export interface ReminderSettings {
  enabled: boolean;
  delay_hours: number;
  frequency_days: number;
  max_reminders: number;
}

export interface ExpirationSettings {
  enabled: boolean;
  expire_after_days: number;
  expire_warn_days: number;
}

export interface AuthenticationRequirements {
  require_email_authentication: boolean;
  require_phone_authentication: boolean;
  require_knowledge_based_authentication: boolean;
  require_id_verification: boolean;
  allow_signature_stamps: boolean;
}

// Analytics and reporting types
export interface SignatureAnalytics {
  period_start: string;
  period_end: string;
  total_requests: number;
  completed_requests: number;
  pending_requests: number;
  declined_requests: number;
  voided_requests: number;
  completion_rate: number;
  average_completion_time_hours: number;
  most_active_signers: Array<{
    email: string;
    name: string;
    signature_count: number;
  }>;
  document_type_breakdown: Record<string, number>;
  geographic_distribution: Record<string, number>;
  device_breakdown: Record<string, number>;
  peak_signing_hours: number[];
}

// Error and exception types
export interface SignatureError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  signature_request_id?: string;
  signer_email?: string;
  recoverable: boolean;
  suggested_actions: string[];
}

// UI/Display types
export interface SignatureRequestListItem {
  id: string;
  document_title: string;
  matter_title: string;
  client_name: string;
  status: SignatureRequestStatus;
  total_signers: number;
  completed_signatures: number;
  progress_percentage: number;
  created_at: string;
  due_date?: string;
  last_activity_at: string;
  next_signer?: {
    name: string;
    email: string;
  };
  can_send_reminder: boolean;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
}

export interface SignerStatusInfo {
  name: string;
  email: string;
  status: SignatureStatus;
  signed_at?: string;
  viewed_at?: string;
  sent_at: string;
  days_since_sent: number;
  reminder_count: number;
  last_reminder_sent?: string;
  can_send_reminder: boolean;
  estimated_sign_date?: string;
}