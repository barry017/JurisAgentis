/**
 * Document Management Types
 * T038: Business logic types for document management system
 */
import { Database } from './database';
type DocumentRow = Database['public']['Tables']['documents']['Row'];
type DocumentVersionRow = Database['public']['Tables']['document_versions']['Row'];
type DocumentAccessRow = Database['public']['Tables']['document_access']['Row'];
type DocumentShareRow = Database['public']['Tables']['document_shares']['Row'];
export type DocumentStatus = Database['public']['Enums']['document_status'];
export type DocumentType = Database['public']['Enums']['document_type'];
export type DocumentConfidentialityLevel = Database['public']['Enums']['document_confidentiality_level'];
export type PriorityLevel = Database['public']['Enums']['priority_level'];
export type VersionChangeType = Database['public']['Enums']['version_change_type'];
export type VersionStatus = Database['public']['Enums']['version_status'];
export interface Document extends DocumentRow {
    versions?: DocumentVersion[];
    access_permissions?: DocumentAccess[];
    shares?: DocumentShare[];
    current_version?: DocumentVersion;
    signature_request?: SignatureRequest;
    matter?: {
        id: string;
        title: string;
        client_name: string;
    };
    template?: {
        id: string;
        name: string;
        document_type: DocumentType;
    };
}
export interface DocumentVersion extends DocumentVersionRow {
    created_by_name?: string;
    review_by_name?: string;
    is_current?: boolean;
    download_url?: string;
}
export interface DocumentAccess extends DocumentAccessRow {
    user_name?: string;
    user_email?: string;
    user_role?: string;
    granted_by_name?: string;
}
export interface DocumentShare extends DocumentShareRow {
    recipient_name?: string;
    views_count?: number;
    downloads_count?: number;
    last_accessed_at?: string;
    is_expired?: boolean;
    share_url?: string;
}
export interface DocumentCreateInput {
    matter_id: string;
    template_id?: string;
    title: string;
    description?: string;
    document_type: DocumentType;
    priority?: PriorityLevel;
    confidentiality_level?: DocumentConfidentialityLevel;
    tags?: string[];
    due_date?: Date;
    auto_populated_fields?: Record<string, unknown>;
    created_by: string;
    client_id?: string;
}
export interface DocumentUpdateInput {
    title?: string;
    description?: string;
    status?: DocumentStatus;
    priority?: PriorityLevel;
    confidentiality_level?: DocumentConfidentialityLevel;
    tags?: string[];
    due_date?: Date;
    client_approval_status?: string;
    client_notes?: string;
}
export interface DocumentSearchParams {
    query?: string;
    matter_id?: string;
    client_id?: string;
    document_type?: DocumentType[];
    status?: DocumentStatus[];
    confidentiality_level?: DocumentConfidentialityLevel;
    priority?: PriorityLevel[];
    tags?: string[];
    created_by?: string;
    created_after?: Date;
    created_before?: Date;
    updated_after?: Date;
    updated_before?: Date;
    due_after?: Date;
    due_before?: Date;
    limit?: number;
    offset?: number;
    sort_by?: 'created_at' | 'updated_at' | 'title' | 'due_date' | 'priority';
    sort_order?: 'asc' | 'desc';
    include_archived?: boolean;
}
export interface DocumentSearchResponse {
    documents: Document[];
    total: number;
    facets?: Record<string, Record<string, number>>;
    suggestions?: string[];
    execution_time_ms?: number;
    pagination: {
        limit: number;
        offset: number;
        has_more: boolean;
    };
}
export interface DocumentVersionCreateInput {
    file_path: string;
    file_name: string;
    file_size: number;
    file_hash: string;
    change_summary: string;
    change_type?: VersionChangeType;
    branch_name?: string;
    requires_review?: boolean;
    mime_type?: string;
    page_count?: number;
    word_count?: number;
}
export interface DocumentAccessCreateInput {
    user_id: string;
    access_level: 'view' | 'comment' | 'edit' | 'manage';
    permissions?: Record<string, boolean>;
    expires_at?: string;
    access_reason?: string;
}
export interface DocumentShareCreateInput {
    recipient_email: string;
    share_type: 'client_portal' | 'external_link' | 'email_attachment' | 'secure_download';
    permissions: {
        can_view: boolean;
        can_download: boolean;
        can_comment: boolean;
        can_approve: boolean;
        can_print?: boolean;
    };
    expires_in_hours?: number;
    custom_message?: string;
    require_password?: boolean;
    password?: string;
    apply_watermark?: boolean;
    max_views?: number;
    max_downloads?: number;
}
export interface SignatureRequest {
    id: string;
    document_id: string;
    docusign_envelope_id?: string;
    status: 'created' | 'sent' | 'delivered' | 'signed' | 'completed' | 'declined' | 'voided';
    signers: Signer[];
    created_at: string;
    completed_at?: string;
    expires_at?: string;
}
export interface Signer {
    id?: string;
    name: string;
    email: string;
    role: string;
    signing_order: number;
    status?: 'pending' | 'sent' | 'delivered' | 'signed' | 'declined';
    signed_at?: string;
    decline_reason?: string;
}
export interface DocumentValidationError {
    field: string;
    message: string;
    code: string;
}
export interface DocumentOperationResult<T = Document> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: DocumentValidationError[];
    };
}
export interface DocumentAuditLog {
    id: string;
    document_id: string;
    action: 'created' | 'viewed' | 'updated' | 'shared' | 'signed' | 'deleted' | 'restored';
    user_id: string;
    user_name: string;
    timestamp: string;
    ip_address?: string;
    user_agent?: string;
    details?: Record<string, unknown>;
    old_values?: Record<string, unknown>;
    new_values?: Record<string, unknown>;
}
export interface DocumentListItem {
    id: string;
    title: string;
    document_type: DocumentType;
    status: DocumentStatus;
    priority: PriorityLevel;
    matter_title: string;
    client_name: string;
    created_at: string;
    updated_at: string;
    due_date?: string;
    has_pending_signature: boolean;
    version_count: number;
    tags: string[];
}
export interface DocumentStatusInfo {
    current_status: DocumentStatus;
    next_possible_statuses: DocumentStatus[];
    can_change_status: boolean;
    pending_approvals: string[];
    workflow_position: number;
    workflow_total: number;
}
export {};
//# sourceMappingURL=documents.d.ts.map