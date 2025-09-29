/**
 * Database Types for Core Legal Practice Management Platform
 * Auto-generated from Supabase schema
 */
export type Json = string | number | boolean | null | {
    [key: string]: Json | undefined;
} | Json[];
export type Database = {
    public: {
        Tables: {
            audit_logs: {
                Row: {
                    id: string;
                    user_id: string | null;
                    user_email: string | null;
                    user_role: Database['public']['Enums']['user_role'] | null;
                    event_type: string;
                    action: string;
                    resource_type: string | null;
                    resource_id: string | null;
                    resource_identifier: string | null;
                    target_user_id: string | null;
                    old_values: Json | null;
                    new_values: Json | null;
                    changes_description: string | null;
                    ip_address: string | null;
                    user_agent: string | null;
                    session_id: string | null;
                    request_id: string | null;
                    risk_score: number | null;
                    requires_review: boolean;
                    reviewed_by: string | null;
                    reviewed_at: string | null;
                    review_notes: string | null;
                    details: Json;
                    tags: string[] | null;
                    event_timestamp: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id?: string | null;
                    user_email?: string | null;
                    user_role?: Database['public']['Enums']['user_role'] | null;
                    event_type: string;
                    action: string;
                    resource_type?: string | null;
                    resource_id?: string | null;
                    resource_identifier?: string | null;
                    target_user_id?: string | null;
                    old_values?: Json | null;
                    new_values?: Json | null;
                    changes_description?: string | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    session_id?: string | null;
                    request_id?: string | null;
                    risk_score?: number | null;
                    requires_review?: boolean;
                    reviewed_by?: string | null;
                    reviewed_at?: string | null;
                    review_notes?: string | null;
                    details?: Json;
                    tags?: string[] | null;
                    event_timestamp?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string | null;
                    user_email?: string | null;
                    user_role?: Database['public']['Enums']['user_role'] | null;
                    event_type?: string;
                    action?: string;
                    resource_type?: string | null;
                    resource_id?: string | null;
                    resource_identifier?: string | null;
                    target_user_id?: string | null;
                    old_values?: Json | null;
                    new_values?: Json | null;
                    changes_description?: string | null;
                    ip_address?: string | null;
                    user_agent?: string | null;
                    session_id?: string | null;
                    request_id?: string | null;
                    risk_score?: number | null;
                    requires_review?: boolean;
                    reviewed_by?: string | null;
                    reviewed_at?: string | null;
                    review_notes?: string | null;
                    details?: Json;
                    tags?: string[] | null;
                    event_timestamp?: string;
                    created_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "audit_logs_reviewed_by_fkey";
                        columns: ["reviewed_by"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "audit_logs_target_user_id_fkey";
                        columns: ["target_user_id"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "audit_logs_user_id_fkey";
                        columns: ["user_id"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    }
                ];
            };
            cases: {
                Row: {
                    id: string;
                    case_number: string;
                    title: string;
                    description: string | null;
                    case_type: Database['public']['Enums']['case_type'];
                    status: Database['public']['Enums']['case_status'];
                    primary_client_id: string;
                    assigned_attorney: string | null;
                    assigned_paralegal: string | null;
                    assigned_assistant: string | null;
                    opened_date: string;
                    statute_of_limitations: string | null;
                    estimated_completion: string | null;
                    closed_date: string | null;
                    flat_fee_amount: number | null;
                    hourly_rate: number | null;
                    retainer_amount: number | null;
                    billing_type: string;
                    court_case_number: string | null;
                    opposing_party: string | null;
                    opposing_counsel: string | null;
                    jurisdiction: string | null;
                    priority: string;
                    complexity: string;
                    tags: string[] | null;
                    custom_fields: Json;
                    notes: string | null;
                    internal_notes: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    case_number?: string;
                    title: string;
                    description?: string | null;
                    case_type: Database['public']['Enums']['case_type'];
                    status?: Database['public']['Enums']['case_status'];
                    primary_client_id: string;
                    assigned_attorney?: string | null;
                    assigned_paralegal?: string | null;
                    assigned_assistant?: string | null;
                    opened_date?: string;
                    statute_of_limitations?: string | null;
                    estimated_completion?: string | null;
                    closed_date?: string | null;
                    flat_fee_amount?: number | null;
                    hourly_rate?: number | null;
                    retainer_amount?: number | null;
                    billing_type?: string;
                    court_case_number?: string | null;
                    opposing_party?: string | null;
                    opposing_counsel?: string | null;
                    jurisdiction?: string | null;
                    priority?: string;
                    complexity?: string;
                    tags?: string[] | null;
                    custom_fields?: Json;
                    notes?: string | null;
                    internal_notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    case_number?: string;
                    title?: string;
                    description?: string | null;
                    case_type?: Database['public']['Enums']['case_type'];
                    status?: Database['public']['Enums']['case_status'];
                    primary_client_id?: string;
                    assigned_attorney?: string | null;
                    assigned_paralegal?: string | null;
                    assigned_assistant?: string | null;
                    opened_date?: string;
                    statute_of_limitations?: string | null;
                    estimated_completion?: string | null;
                    closed_date?: string | null;
                    flat_fee_amount?: number | null;
                    hourly_rate?: number | null;
                    retainer_amount?: number | null;
                    billing_type?: string;
                    court_case_number?: string | null;
                    opposing_party?: string | null;
                    opposing_counsel?: string | null;
                    jurisdiction?: string | null;
                    priority?: string;
                    complexity?: string;
                    tags?: string[] | null;
                    custom_fields?: Json;
                    notes?: string | null;
                    internal_notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "cases_assigned_assistant_fkey";
                        columns: ["assigned_assistant"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "cases_assigned_attorney_fkey";
                        columns: ["assigned_attorney"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "cases_assigned_paralegal_fkey";
                        columns: ["assigned_paralegal"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "cases_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "cases_primary_client_id_fkey";
                        columns: ["primary_client_id"];
                        isOneToOne: false;
                        referencedRelation: "clients";
                        referencedColumns: ["id"];
                    }
                ];
            };
            clients: {
                Row: {
                    id: string;
                    client_number: string;
                    type: string;
                    first_name: string | null;
                    last_name: string | null;
                    middle_name: string | null;
                    suffix: string | null;
                    date_of_birth: string | null;
                    ssn_encrypted: string | null;
                    entity_name: string | null;
                    entity_type: string | null;
                    tax_id_encrypted: string | null;
                    email: string | null;
                    phone_primary: string | null;
                    phone_secondary: string | null;
                    address_primary: Json | null;
                    address_secondary: Json | null;
                    occupation: string | null;
                    employer: string | null;
                    emergency_contact: Json | null;
                    referred_by: string | null;
                    referral_source: string | null;
                    status: string;
                    notes: string | null;
                    internal_notes: string | null;
                    tags: string[] | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    client_number?: string;
                    type?: string;
                    first_name?: string | null;
                    last_name?: string | null;
                    middle_name?: string | null;
                    suffix?: string | null;
                    date_of_birth?: string | null;
                    ssn_encrypted?: string | null;
                    entity_name?: string | null;
                    entity_type?: string | null;
                    tax_id_encrypted?: string | null;
                    email?: string | null;
                    phone_primary?: string | null;
                    phone_secondary?: string | null;
                    address_primary?: Json | null;
                    address_secondary?: Json | null;
                    occupation?: string | null;
                    employer?: string | null;
                    emergency_contact?: Json | null;
                    referred_by?: string | null;
                    referral_source?: string | null;
                    status?: string;
                    notes?: string | null;
                    internal_notes?: string | null;
                    tags?: string[] | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    client_number?: string;
                    type?: string;
                    first_name?: string | null;
                    last_name?: string | null;
                    middle_name?: string | null;
                    suffix?: string | null;
                    date_of_birth?: string | null;
                    ssn_encrypted?: string | null;
                    entity_name?: string | null;
                    entity_type?: string | null;
                    tax_id_encrypted?: string | null;
                    email?: string | null;
                    phone_primary?: string | null;
                    phone_secondary?: string | null;
                    address_primary?: Json | null;
                    address_secondary?: Json | null;
                    occupation?: string | null;
                    employer?: string | null;
                    emergency_contact?: Json | null;
                    referred_by?: string | null;
                    referral_source?: string | null;
                    status?: string;
                    notes?: string | null;
                    internal_notes?: string | null;
                    tags?: string[] | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "clients_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    }
                ];
            };
            communications: {
                Row: {
                    id: string;
                    type: Database['public']['Enums']['communication_type'];
                    direction: string | null;
                    from_user_id: string | null;
                    from_external_email: string | null;
                    to_user_ids: string[] | null;
                    to_external_emails: string[] | null;
                    cc_emails: string[] | null;
                    bcc_emails: string[] | null;
                    subject: string | null;
                    content: string | null;
                    content_html: string | null;
                    case_id: string | null;
                    client_id: string | null;
                    parent_communication_id: string | null;
                    email_message_id: string | null;
                    email_thread_id: string | null;
                    template_id: string | null;
                    template_data: Json | null;
                    status: string;
                    sent_at: string | null;
                    delivered_at: string | null;
                    read_at: string | null;
                    aida_context: Json | null;
                    auto_generated: boolean;
                    requires_approval: boolean;
                    approved_by: string | null;
                    approved_at: string | null;
                    attachments: Json;
                    priority: string;
                    tags: string[] | null;
                    notes: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    type: Database['public']['Enums']['communication_type'];
                    direction?: string | null;
                    from_user_id?: string | null;
                    from_external_email?: string | null;
                    to_user_ids?: string[] | null;
                    to_external_emails?: string[] | null;
                    cc_emails?: string[] | null;
                    bcc_emails?: string[] | null;
                    subject?: string | null;
                    content?: string | null;
                    content_html?: string | null;
                    case_id?: string | null;
                    client_id?: string | null;
                    parent_communication_id?: string | null;
                    email_message_id?: string | null;
                    email_thread_id?: string | null;
                    template_id?: string | null;
                    template_data?: Json | null;
                    status?: string;
                    sent_at?: string | null;
                    delivered_at?: string | null;
                    read_at?: string | null;
                    aida_context?: Json | null;
                    auto_generated?: boolean;
                    requires_approval?: boolean;
                    approved_by?: string | null;
                    approved_at?: string | null;
                    attachments?: Json;
                    priority?: string;
                    tags?: string[] | null;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    type?: Database['public']['Enums']['communication_type'];
                    direction?: string | null;
                    from_user_id?: string | null;
                    from_external_email?: string | null;
                    to_user_ids?: string[] | null;
                    to_external_emails?: string[] | null;
                    cc_emails?: string[] | null;
                    bcc_emails?: string[] | null;
                    subject?: string | null;
                    content?: string | null;
                    content_html?: string | null;
                    case_id?: string | null;
                    client_id?: string | null;
                    parent_communication_id?: string | null;
                    email_message_id?: string | null;
                    email_thread_id?: string | null;
                    template_id?: string | null;
                    template_data?: Json | null;
                    status?: string;
                    sent_at?: string | null;
                    delivered_at?: string | null;
                    read_at?: string | null;
                    aida_context?: Json | null;
                    auto_generated?: boolean;
                    requires_approval?: boolean;
                    approved_by?: string | null;
                    approved_at?: string | null;
                    attachments?: Json;
                    priority?: string;
                    tags?: string[] | null;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "communications_approved_by_fkey";
                        columns: ["approved_by"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "communications_case_id_fkey";
                        columns: ["case_id"];
                        isOneToOne: false;
                        referencedRelation: "cases";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "communications_client_id_fkey";
                        columns: ["client_id"];
                        isOneToOne: false;
                        referencedRelation: "clients";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "communications_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "communications_from_user_id_fkey";
                        columns: ["from_user_id"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "communications_parent_communication_id_fkey";
                        columns: ["parent_communication_id"];
                        isOneToOne: false;
                        referencedRelation: "communications";
                        referencedColumns: ["id"];
                    }
                ];
            };
            documents: {
                Row: {
                    id: string;
                    title: string;
                    description: string | null;
                    document_type: string | null;
                    file_name: string;
                    file_path: string;
                    file_size: number | null;
                    mime_type: string | null;
                    file_hash: string | null;
                    case_id: string | null;
                    client_id: string | null;
                    template_id: string | null;
                    confidentiality_level: Database['public']['Enums']['document_confidentiality_level'];
                    status: Database['public']['Enums']['document_status'];
                    version: string;
                    parent_document_id: string | null;
                    requires_signature: boolean;
                    signed_at: string | null;
                    signed_by: Json | null;
                    signature_method: string | null;
                    public: boolean;
                    password_protected: boolean;
                    password_hash: string | null;
                    expiration_date: string | null;
                    download_limit: number | null;
                    download_count: number;
                    tags: string[] | null;
                    custom_fields: Json;
                    notes: string | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                    archived_at: string | null;
                    archived_by: string | null;
                };
                Insert: {
                    id?: string;
                    title: string;
                    description?: string | null;
                    document_type?: string | null;
                    file_name: string;
                    file_path: string;
                    file_size?: number | null;
                    mime_type?: string | null;
                    file_hash?: string | null;
                    case_id?: string | null;
                    client_id?: string | null;
                    template_id?: string | null;
                    confidentiality_level?: Database['public']['Enums']['document_confidentiality_level'];
                    status?: Database['public']['Enums']['document_status'];
                    version?: string;
                    parent_document_id?: string | null;
                    requires_signature?: boolean;
                    signed_at?: string | null;
                    signed_by?: Json | null;
                    signature_method?: string | null;
                    public?: boolean;
                    password_protected?: boolean;
                    password_hash?: string | null;
                    expiration_date?: string | null;
                    download_limit?: number | null;
                    download_count?: number;
                    tags?: string[] | null;
                    custom_fields?: Json;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    archived_at?: string | null;
                    archived_by?: string | null;
                };
                Update: {
                    id?: string;
                    title?: string;
                    description?: string | null;
                    document_type?: string | null;
                    file_name?: string;
                    file_path?: string;
                    file_size?: number | null;
                    mime_type?: string | null;
                    file_hash?: string | null;
                    case_id?: string | null;
                    client_id?: string | null;
                    template_id?: string | null;
                    confidentiality_level?: Database['public']['Enums']['document_confidentiality_level'];
                    status?: Database['public']['Enums']['document_status'];
                    version?: string;
                    parent_document_id?: string | null;
                    requires_signature?: boolean;
                    signed_at?: string | null;
                    signed_by?: Json | null;
                    signature_method?: string | null;
                    public?: boolean;
                    password_protected?: boolean;
                    password_hash?: string | null;
                    expiration_date?: string | null;
                    download_limit?: number | null;
                    download_count?: number;
                    tags?: string[] | null;
                    custom_fields?: Json;
                    notes?: string | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    archived_at?: string | null;
                    archived_by?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "documents_case_id_fkey";
                        columns: ["case_id"];
                        isOneToOne: false;
                        referencedRelation: "cases";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "documents_client_id_fkey";
                        columns: ["client_id"];
                        isOneToOne: false;
                        referencedRelation: "clients";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "documents_created_by_fkey";
                        columns: ["created_by"];
                        isOneToOne: false;
                        referencedRelation: "user_profiles";
                        referencedColumns: ["uid"];
                    },
                    {
                        foreignKeyName: "documents_parent_document_id_fkey";
                        columns: ["parent_document_id"];
                        isOneToOne: false;
                        referencedRelation: "documents";
                        referencedColumns: ["id"];
                    }
                ];
            };
            user_profiles: {
                Row: {
                    uid: string;
                    email: string;
                    role: Database['public']['Enums']['user_role'];
                    first_name: string;
                    last_name: string;
                    title: string | null;
                    phone: string | null;
                    address: Json | null;
                    status: string;
                    mfa_enabled: boolean;
                    last_login_at: string | null;
                    password_changed_at: string | null;
                    preferences: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    uid?: string;
                    email: string;
                    role?: Database['public']['Enums']['user_role'];
                    first_name: string;
                    last_name: string;
                    title?: string | null;
                    phone?: string | null;
                    address?: Json | null;
                    status?: string;
                    mfa_enabled?: boolean;
                    last_login_at?: string | null;
                    password_changed_at?: string | null;
                    preferences?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    uid?: string;
                    email?: string;
                    role?: Database['public']['Enums']['user_role'];
                    first_name?: string;
                    last_name?: string;
                    title?: string | null;
                    phone?: string | null;
                    address?: Json | null;
                    status?: string;
                    mfa_enabled?: boolean;
                    last_login_at?: string | null;
                    password_changed_at?: string | null;
                    preferences?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            case_status: 'intake' | 'active' | 'on_hold' | 'pending_closure' | 'completed' | 'closed';
            case_type: 'estate_planning' | 'business_formation' | 'real_estate' | 'family_law' | 'litigation' | 'other';
            communication_type: 'email' | 'phone_call' | 'text_message' | 'meeting' | 'letter' | 'fax' | 'other';
            document_confidentiality_level: 'public' | 'internal' | 'client_confidential' | 'attorney_client_privileged';
            document_status: 'draft' | 'under_review' | 'client_review' | 'approved' | 'executed' | 'archived';
            financial_access_level: 'all' | 'limited' | 'time_only' | 'client_only' | 'none';
            permission_scope: 'read_only' | 'read_write' | 'full_access' | 'specific_documents' | 'financial_only' | 'no_financial';
            user_role: 'admin' | 'associate_attorney' | 'paralegal' | 'assistant' | 'client' | 'client_related_party' | 'developer';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};
export type UserRole = Database['public']['Enums']['user_role'];
export type CaseStatus = Database['public']['Enums']['case_status'];
export type CaseType = Database['public']['Enums']['case_type'];
export type CommunicationType = Database['public']['Enums']['communication_type'];
export type DocumentStatus = Database['public']['Enums']['document_status'];
export type PermissionScope = Database['public']['Enums']['permission_scope'];
export type FinancialAccessLevel = Database['public']['Enums']['financial_access_level'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type Client = Database['public']['Tables']['clients']['Row'];
export type Case = Database['public']['Tables']['cases']['Row'];
export type Document = Database['public']['Tables']['documents']['Row'];
export type Communication = Database['public']['Tables']['communications']['Row'];
export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert'];
export type ClientInsert = Database['public']['Tables']['clients']['Insert'];
export type CaseInsert = Database['public']['Tables']['cases']['Insert'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type CommunicationInsert = Database['public']['Tables']['communications']['Insert'];
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update'];
export type ClientUpdate = Database['public']['Tables']['clients']['Update'];
export type CaseUpdate = Database['public']['Tables']['cases']['Update'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];
export type CommunicationUpdate = Database['public']['Tables']['communications']['Update'];
//# sourceMappingURL=database.d.ts.map