export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types from our database migrations
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type UserRole = 
  | 'admin'
  | 'associate_attorney'
  | 'paralegal'
  | 'assistant'
  | 'client'
  | 'client_related_party'
  | 'temp_developer'

export type AllowlistStatus = 'pending' | 'active' | 'used' | 'revoked'
export type SessionTerminationReason = 
  | 'user_logout'
  | 'admin_action'
  | 'system_timeout'
  | 'security_violation'
  | 'expired'

export type MfaFactorType = 'totp' | 'email' | 'sms'
export type AuditEventType =
  | 'auth_login'
  | 'auth_logout'
  | 'auth_failed_login'
  | 'auth_mfa_setup'
  | 'auth_mfa_verify'
  | 'auth_password_change'
  | 'user_role_change'
  | 'user_status_change'
  | 'allowlist_add'
  | 'allowlist_remove'
  | 'temp_access_grant'
  | 'temp_access_revoke'
  | 'session_terminate'
  | 'data_access'
  | 'unauthorized_access_attempt'

export type AuditResult = 'success' | 'failure' | 'error'
export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

// Client-specific enum types
export type ClientStatus = 'prospect' | 'active' | 'inactive' | 'former' | 'do_not_contact'
export type ClientType = 'individual' | 'business' | 'estate' | 'trust' | 'non_profit' | 'government'
export type ConflictCheckStatus = 'pending' | 'cleared' | 'conflict' | 'waived'
export type CommunicationPreference = 'email' | 'phone' | 'mail' | 'secure_portal' | 'no_contact'

// Matter-specific enum types
export type MatterStatus = 'new' | 'active' | 'on_hold' | 'pending_client' | 'pending_court' | 'review' | 'completed' | 'closed' | 'cancelled'
export type MatterPriority = 'low' | 'normal' | 'high' | 'urgent'
export type BillingMethod = 'hourly' | 'flat_fee' | 'contingency' | 'pro_bono' | 'hybrid'
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed' | 'cancelled' | 'on_hold'
export type ParticipantType = 'client' | 'client_contact' | 'opposing_party' | 'opposing_counsel' | 'witness' | 'expert_witness' | 'court_reporter' | 'mediator' | 'arbitrator' | 'judge' | 'co_counsel' | 'other'

// Document-specific enum types
export type DocumentStatus = 'draft' | 'review' | 'revision_requested' | 'final' | 'executed' | 'archived' | 'superseded' | 'cancelled'
export type ConfidentialityLevel = 'public' | 'internal' | 'client_confidential' | 'attorney_client_privileged' | 'work_product' | 'highly_confidential'
export type DocumentShareType = 'view_only' | 'download' | 'comment'
export type RevisionType = 'minor_edit' | 'major_revision' | 'final_version' | 'executed_copy'
export type CommentType = 'general' | 'review' | 'revision_request' | 'approval'
export type SignatureType = 'electronic' | 'digital' | 'wet_signature'

// Billing-specific enum types
export type PaymentSchedule = 'full_upfront' | 'retainer_completion' | 'installments'
export type BillingStatus = 'pending_retainer' | 'active' | 'completed' | 'collection' | 'written_off'
export type InvoiceType = 'retainer' | 'service_fee' | 'final_bill' | 'expense_reimbursement' | 'installment'
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial_payment' | 'paid' | 'overdue' | 'collection' | 'written_off'
export type PaymentMethod = 'check' | 'credit_card' | 'wire_transfer' | 'cash' | 'trust_account' | 'trust_transfer'
export type PaymentStatus = 'received' | 'deposited' | 'cleared' | 'bounced' | 'refunded'
export type LineItemType = 'service_fee' | 'retainer' | 'expense' | 'discount' | 'tax' | 'late_fee'
export type ExpenseCategory = 'court_filing' | 'copies' | 'postage' | 'travel' | 'expert_witness' | 'research' | 'other'
export type TimeEntryStatus = 'draft' | 'submitted' | 'approved' | 'billed'
export type WorkCategory = 'research' | 'drafting' | 'client_meeting' | 'court_appearance' | 'correspondence' | 'administrative' | 'travel'

// Calendar-specific enum types
export type EventType = 'court_date' | 'deadline' | 'client_meeting' | 'internal_meeting' | 'task_due' | 'reminder' | 'personal'
export type EventCategory = 'court' | 'client' | 'administrative' | 'deadline' | 'personal'
export type EventStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' | 'no_show'
export type LocationType = 'courthouse' | 'office' | 'client_location' | 'virtual' | 'phone'
export type HearingType = 'motion' | 'trial' | 'status_conference' | 'sentencing' | 'deposition' | 'mediation' | 'arbitration'
export type DeadlineType = 'statute_of_limitations' | 'discovery_cutoff' | 'motion_deadline' | 'filing_deadline' | 'response_deadline'
export type AttendeeType = 'internal_staff' | 'client' | 'opposing_counsel' | 'witness' | 'expert' | 'court_reporter' | 'interpreter' | 'other'
export type AttendanceStatus = 'invited' | 'accepted' | 'declined' | 'tentative' | 'no_response'
export type EventVisibility = 'public' | 'internal' | 'private' | 'confidential'
export type CourtType = 'federal' | 'state' | 'county' | 'municipal' | 'administrative'
export type HolidayType = 'federal' | 'state' | 'local' | 'court' | 'custom'
export type CalendarView = 'day' | 'week' | 'month' | 'agenda'
export type TimeFormat = '12h' | '24h'

// Permission levels
export type FinancialAccess = 'all' | 'limited' | 'time_only' | 'client_only' | 'none'
export type ClientAccess = 'all' | 'assigned' | 'own' | 'shared' | 'none'
export type DocumentAccess = 'all' | 'assigned' | 'own' | 'shared' | 'none'
export type AdministrativeAccess = 'all' | 'limited' | 'none'

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          title: string | null
          phone: string | null
          department: string | null
          preferences: Json
          status: UserStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          title?: string | null
          phone?: string | null
          department?: string | null
          preferences?: Json
          status?: UserStatus
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          title?: string | null
          phone?: string | null
          department?: string | null
          preferences?: Json
          status?: UserStatus
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      allowlist: {
        Row: {
          id: string
          email: string
          role: UserRole
          added_by: string | null
          added_at: string
          status: AllowlistStatus
          notes: string | null
          registration_completed: boolean
          registered_user_id: string | null
          registered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: UserRole
          added_by?: string | null
          added_at?: string
          status?: AllowlistStatus
          notes?: string | null
          registration_completed?: boolean
          registered_user_id?: string | null
          registered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          added_by?: string | null
          added_at?: string
          status?: AllowlistStatus
          notes?: string | null
          registration_completed?: boolean
          registered_user_id?: string | null
          registered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allowlist_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allowlist_registered_user_id_fkey"
            columns: ["registered_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          created_at: string
          expires_at: string
          last_activity: string
          ip_address: string | null
          user_agent: string | null
          device_info: Json
          location: Json
          active: boolean
          terminated_by: SessionTerminationReason | null
          terminated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          created_at?: string
          expires_at: string
          last_activity?: string
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json
          location?: Json
          active?: boolean
          terminated_by?: SessionTerminationReason | null
          terminated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          created_at?: string
          expires_at?: string
          last_activity?: string
          ip_address?: string | null
          user_agent?: string | null
          device_info?: Json
          location?: Json
          active?: boolean
          terminated_by?: SessionTerminationReason | null
          terminated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      mfa_enrollments: {
        Row: {
          id: string
          user_id: string
          factor_type: MfaFactorType
          secret_encrypted: string | null
          backup_codes: string[] | null
          enrolled_at: string
          verified: boolean
          verified_at: string | null
          last_used: string | null
          failed_attempts: number
          locked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          factor_type?: MfaFactorType
          secret_encrypted?: string | null
          backup_codes?: string[] | null
          enrolled_at?: string
          verified?: boolean
          verified_at?: string | null
          last_used?: string | null
          failed_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          factor_type?: MfaFactorType
          secret_encrypted?: string | null
          backup_codes?: string[] | null
          enrolled_at?: string
          verified?: boolean
          verified_at?: string | null
          last_used?: string | null
          failed_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mfa_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          timestamp: string
          user_id: string | null
          actor_id: string | null
          event_type: AuditEventType
          resource: string
          action: string
          result: AuditResult
          ip_address: string | null
          user_agent: string | null
          details: Json
          before_state: Json | null
          after_state: Json | null
          session_id: string | null
          severity: AuditSeverity
          retained_until: string
          created_at: string
        }
        Insert: {
          id?: string
          timestamp?: string
          user_id?: string | null
          actor_id?: string | null
          event_type: AuditEventType
          resource: string
          action: string
          result: AuditResult
          ip_address?: string | null
          user_agent?: string | null
          details?: Json
          before_state?: Json | null
          after_state?: Json | null
          session_id?: string | null
          severity?: AuditSeverity
          retained_until?: string
          created_at?: string
        }
        Update: {
          id?: string
          timestamp?: string
          user_id?: string | null
          actor_id?: string | null
          event_type?: AuditEventType
          resource?: string
          action?: string
          result?: AuditResult
          ip_address?: string | null
          user_agent?: string | null
          details?: Json
          before_state?: Json | null
          after_state?: Json | null
          session_id?: string | null
          severity?: AuditSeverity
          retained_until?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          first_name: string
          last_name: string
          preferred_name: string | null
          date_of_birth: string | null
          email: string | null
          phone_primary: string | null
          phone_secondary: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          country: string
          client_status: ClientStatus
          client_type: ClientType
          business_name: string | null
          business_tax_id: string | null
          business_type: string | null
          referral_source: string | null
          practice_areas: string[] | null
          conflict_check_date: string | null
          conflict_check_status: ConflictCheckStatus
          communication_preference: CommunicationPreference
          language_preference: string
          billing_rate: number | null
          payment_terms: number
          credit_limit: number | null
          notes: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          preferred_name?: string | null
          date_of_birth?: string | null
          email?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string
          client_status?: ClientStatus
          client_type?: ClientType
          business_name?: string | null
          business_tax_id?: string | null
          business_type?: string | null
          referral_source?: string | null
          practice_areas?: string[] | null
          conflict_check_date?: string | null
          conflict_check_status?: ConflictCheckStatus
          communication_preference?: CommunicationPreference
          language_preference?: string
          billing_rate?: number | null
          payment_terms?: number
          credit_limit?: number | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          preferred_name?: string | null
          date_of_birth?: string | null
          email?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          country?: string
          client_status?: ClientStatus
          client_type?: ClientType
          business_name?: string | null
          business_tax_id?: string | null
          business_type?: string | null
          referral_source?: string | null
          practice_areas?: string[] | null
          conflict_check_date?: string | null
          conflict_check_status?: ConflictCheckStatus
          communication_preference?: CommunicationPreference
          language_preference?: string
          billing_rate?: number | null
          payment_terms?: number
          credit_limit?: number | null
          notes?: string | null
          tags?: string[] | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "clients_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      client_contacts: {
        Row: {
          id: string
          client_id: string
          first_name: string
          last_name: string
          relationship: string | null
          title: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          is_primary_contact: boolean
          is_authorized_contact: boolean
          communication_preference: CommunicationPreference
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_id: string
          first_name: string
          last_name: string
          relationship?: string | null
          title?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          is_primary_contact?: boolean
          is_authorized_contact?: boolean
          communication_preference?: CommunicationPreference
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          first_name?: string
          last_name?: string
          relationship?: string | null
          title?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          is_primary_contact?: boolean
          is_authorized_contact?: boolean
          communication_preference?: CommunicationPreference
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      matters: {
        Row: {
          id: string
          matter_number: string
          title: string
          description: string | null
          matter_type: string
          practice_area: string
          client_id: string
          status: MatterStatus
          priority: MatterPriority
          date_opened: string
          date_closed: string | null
          statute_of_limitations: string | null
          next_review_date: string | null
          court_name: string | null
          case_number: string | null
          judge_name: string | null
          opposing_counsel: string | null
          opposing_party: string | null
          hourly_rate: number | null
          flat_fee: number | null
          retainer_amount: number | null
          billing_method: BillingMethod
          responsible_attorney: string | null
          assisting_paralegal: string | null
          originating_attorney: string | null
          complexity_level: number | null
          estimated_hours: number | null
          actual_hours: number
          tags: string[] | null
          keywords: string[] | null
          internal_notes: string | null
          client_notes: string | null
          matter_folder_path: string | null
          conflict_cleared: boolean
          conflict_cleared_date: string | null
          conflict_cleared_by: string | null
          custom_fields: Json | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          matter_number: string
          title: string
          description?: string | null
          matter_type: string
          practice_area: string
          client_id: string
          status?: MatterStatus
          priority?: MatterPriority
          date_opened?: string
          date_closed?: string | null
          statute_of_limitations?: string | null
          next_review_date?: string | null
          court_name?: string | null
          case_number?: string | null
          judge_name?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          hourly_rate?: number | null
          flat_fee?: number | null
          retainer_amount?: number | null
          billing_method?: BillingMethod
          responsible_attorney?: string | null
          assisting_paralegal?: string | null
          originating_attorney?: string | null
          complexity_level?: number | null
          estimated_hours?: number | null
          actual_hours?: number
          tags?: string[] | null
          keywords?: string[] | null
          internal_notes?: string | null
          client_notes?: string | null
          matter_folder_path?: string | null
          conflict_cleared?: boolean
          conflict_cleared_date?: string | null
          conflict_cleared_by?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          matter_number?: string
          title?: string
          description?: string | null
          matter_type?: string
          practice_area?: string
          client_id?: string
          status?: MatterStatus
          priority?: MatterPriority
          date_opened?: string
          date_closed?: string | null
          statute_of_limitations?: string | null
          next_review_date?: string | null
          court_name?: string | null
          case_number?: string | null
          judge_name?: string | null
          opposing_counsel?: string | null
          opposing_party?: string | null
          hourly_rate?: number | null
          flat_fee?: number | null
          retainer_amount?: number | null
          billing_method?: BillingMethod
          responsible_attorney?: string | null
          assisting_paralegal?: string | null
          originating_attorney?: string | null
          complexity_level?: number | null
          estimated_hours?: number | null
          actual_hours?: number
          tags?: string[] | null
          keywords?: string[] | null
          internal_notes?: string | null
          client_notes?: string | null
          matter_folder_path?: string | null
          conflict_cleared?: boolean
          conflict_cleared_date?: string | null
          conflict_cleared_by?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matters_responsible_attorney_fkey"
            columns: ["responsible_attorney"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "matters_assisting_paralegal_fkey"
            columns: ["assisting_paralegal"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "matters_originating_attorney_fkey"
            columns: ["originating_attorney"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "matters_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "matters_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      matter_tasks: {
        Row: {
          id: string
          matter_id: string
          title: string
          description: string | null
          task_type: string | null
          status: TaskStatus
          priority: MatterPriority
          assigned_to: string | null
          created_by: string
          due_date: string | null
          start_date: string | null
          completed_date: string | null
          estimated_hours: number | null
          actual_hours: number
          prerequisite_task_ids: string[] | null
          blocks_task_ids: string[] | null
          billable: boolean
          billed: boolean
          notes: string | null
          completion_notes: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          matter_id: string
          title: string
          description?: string | null
          task_type?: string | null
          status?: TaskStatus
          priority?: MatterPriority
          assigned_to?: string | null
          created_by: string
          due_date?: string | null
          start_date?: string | null
          completed_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          prerequisite_task_ids?: string[] | null
          blocks_task_ids?: string[] | null
          billable?: boolean
          billed?: boolean
          notes?: string | null
          completion_notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          matter_id?: string
          title?: string
          description?: string | null
          task_type?: string | null
          status?: TaskStatus
          priority?: MatterPriority
          assigned_to?: string | null
          created_by?: string
          due_date?: string | null
          start_date?: string | null
          completed_date?: string | null
          estimated_hours?: number | null
          actual_hours?: number
          prerequisite_task_ids?: string[] | null
          blocks_task_ids?: string[] | null
          billable?: boolean
          billed?: boolean
          notes?: string | null
          completion_notes?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_tasks_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "matter_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      matter_participants: {
        Row: {
          id: string
          matter_id: string
          participant_type: ParticipantType
          first_name: string | null
          last_name: string | null
          title: string | null
          company: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          client_id: string | null
          client_contact_id: string | null
          role_description: string | null
          active: boolean
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          matter_id: string
          participant_type: ParticipantType
          first_name?: string | null
          last_name?: string | null
          title?: string | null
          company?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          client_id?: string | null
          client_contact_id?: string | null
          role_description?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          matter_id?: string
          participant_type?: ParticipantType
          first_name?: string | null
          last_name?: string | null
          title?: string | null
          company?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          client_id?: string | null
          client_contact_id?: string | null
          role_description?: string | null
          active?: boolean
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matter_participants_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_participants_client_contact_id_fkey"
            columns: ["client_contact_id"]
            isOneToOne: false
            referencedRelation: "client_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matter_participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          document_number: string
          title: string
          description: string | null
          document_type: string
          document_category: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_extension: string
          file_hash: string | null
          client_id: string | null
          matter_id: string | null
          parent_document_id: string | null
          template_id: string | null
          status: DocumentStatus
          version_number: number
          is_current_version: boolean
          document_date: string | null
          execution_date: string | null
          effective_date: string | null
          expiration_date: string | null
          retention_date: string | null
          confidentiality_level: ConfidentialityLevel
          access_restrictions: string[] | null
          priority: string
          tags: string[] | null
          keywords: string[] | null
          text_content: string | null
          page_count: number | null
          word_count: number | null
          court_case_number: string | null
          docket_number: string | null
          filing_date: string | null
          filing_attorney: string | null
          opposing_counsel: string | null
          requires_review: boolean
          reviewed_by: string | null
          reviewed_at: string | null
          approved_by: string | null
          approved_at: string | null
          review_notes: string | null
          compliance_category: string | null
          retention_period_years: number | null
          destruction_date: string | null
          legal_hold: boolean
          legal_hold_reason: string | null
          is_signed: boolean
          signature_type: SignatureType | null
          notarized: boolean
          notary_details: Json | null
          custom_fields: Json | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          document_number: string
          title: string
          description?: string | null
          document_type: string
          document_category: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          file_extension: string
          file_hash?: string | null
          client_id?: string | null
          matter_id?: string | null
          parent_document_id?: string | null
          template_id?: string | null
          status?: DocumentStatus
          version_number?: number
          is_current_version?: boolean
          document_date?: string | null
          execution_date?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          retention_date?: string | null
          confidentiality_level?: ConfidentialityLevel
          access_restrictions?: string[] | null
          priority?: string
          tags?: string[] | null
          keywords?: string[] | null
          text_content?: string | null
          page_count?: number | null
          word_count?: number | null
          court_case_number?: string | null
          docket_number?: string | null
          filing_date?: string | null
          filing_attorney?: string | null
          opposing_counsel?: string | null
          requires_review?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          review_notes?: string | null
          compliance_category?: string | null
          retention_period_years?: number | null
          destruction_date?: string | null
          legal_hold?: boolean
          legal_hold_reason?: string | null
          is_signed?: boolean
          signature_type?: SignatureType | null
          notarized?: boolean
          notary_details?: Json | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          document_number?: string
          title?: string
          description?: string | null
          document_type?: string
          document_category?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          file_extension?: string
          file_hash?: string | null
          client_id?: string | null
          matter_id?: string | null
          parent_document_id?: string | null
          template_id?: string | null
          status?: DocumentStatus
          version_number?: number
          is_current_version?: boolean
          document_date?: string | null
          execution_date?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          retention_date?: string | null
          confidentiality_level?: ConfidentialityLevel
          access_restrictions?: string[] | null
          priority?: string
          tags?: string[] | null
          keywords?: string[] | null
          text_content?: string | null
          page_count?: number | null
          word_count?: number | null
          court_case_number?: string | null
          docket_number?: string | null
          filing_date?: string | null
          filing_attorney?: string | null
          opposing_counsel?: string | null
          requires_review?: boolean
          reviewed_by?: string | null
          reviewed_at?: string | null
          approved_by?: string | null
          approved_at?: string | null
          review_notes?: string | null
          compliance_category?: string | null
          retention_period_years?: number | null
          destruction_date?: string | null
          legal_hold?: boolean
          legal_hold_reason?: string | null
          is_signed?: boolean
          signature_type?: SignatureType | null
          notarized?: boolean
          notary_details?: Json | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      document_templates: {
        Row: {
          id: string
          template_name: string
          template_code: string
          description: string | null
          template_category: string
          practice_area: string
          template_content: string
          template_variables: Json | null
          version: string
          is_active: boolean
          requires_review: boolean
          usage_count: number
          access_roles: string[]
          template_file_path: string | null
          template_file_type: string | null
          preview_image_path: string | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
        }
        Insert: {
          id?: string
          template_name: string
          template_code: string
          description?: string | null
          template_category: string
          practice_area: string
          template_content: string
          template_variables?: Json | null
          version?: string
          is_active?: boolean
          requires_review?: boolean
          usage_count?: number
          access_roles?: string[]
          template_file_path?: string | null
          template_file_type?: string | null
          preview_image_path?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
        }
        Update: {
          id?: string
          template_name?: string
          template_code?: string
          description?: string | null
          template_category?: string
          practice_area?: string
          template_content?: string
          template_variables?: Json | null
          version?: string
          is_active?: boolean
          requires_review?: boolean
          usage_count?: number
          access_roles?: string[]
          template_file_path?: string | null
          template_file_type?: string | null
          preview_image_path?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      fee_schedules: {
        Row: {
          id: string
          service_name: string
          service_code: string
          description: string | null
          practice_area: string
          service_category: string
          base_fee: number
          complexity_multiplier: number
          minimum_fee: number | null
          maximum_fee: number | null
          retainer_percentage: number
          retainer_amount: number | null
          payment_schedule: PaymentSchedule
          installment_count: number | null
          included_services: string[] | null
          excluded_services: string[] | null
          estimated_hours: number | null
          rush_fee_percentage: number | null
          travel_fee_per_mile: number | null
          court_appearance_fee: number | null
          document_review_fee: number | null
          is_active: boolean
          effective_date: string
          expiration_date: string | null
          version: string
          usage_count: number
          last_used_date: string | null
          custom_fields: Json | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
        }
        Insert: {
          id?: string
          service_name: string
          service_code: string
          description?: string | null
          practice_area: string
          service_category: string
          base_fee: number
          complexity_multiplier?: number
          minimum_fee?: number | null
          maximum_fee?: number | null
          retainer_percentage?: number
          retainer_amount?: number | null
          payment_schedule?: PaymentSchedule
          installment_count?: number | null
          included_services?: string[] | null
          excluded_services?: string[] | null
          estimated_hours?: number | null
          rush_fee_percentage?: number | null
          travel_fee_per_mile?: number | null
          court_appearance_fee?: number | null
          document_review_fee?: number | null
          is_active?: boolean
          effective_date?: string
          expiration_date?: string | null
          version?: string
          usage_count?: number
          last_used_date?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
        }
        Update: {
          id?: string
          service_name?: string
          service_code?: string
          description?: string | null
          practice_area?: string
          service_category?: string
          base_fee?: number
          complexity_multiplier?: number
          minimum_fee?: number | null
          maximum_fee?: number | null
          retainer_percentage?: number
          retainer_amount?: number | null
          payment_schedule?: PaymentSchedule
          installment_count?: number | null
          included_services?: string[] | null
          excluded_services?: string[] | null
          estimated_hours?: number | null
          rush_fee_percentage?: number | null
          travel_fee_per_mile?: number | null
          court_appearance_fee?: number | null
          document_review_fee?: number | null
          is_active?: boolean
          effective_date?: string
          expiration_date?: string | null
          version?: string
          usage_count?: number
          last_used_date?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_schedules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "fee_schedules_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          matter_id: string
          client_id: string
          invoice_type: InvoiceType
          invoice_date: string
          due_date: string
          service_period_start: string | null
          service_period_end: string | null
          subtotal: number
          discount_amount: number
          tax_amount: number
          total_amount: number
          amount_paid: number
          balance_due: number
          payment_method: PaymentMethod | null
          payment_terms_days: number
          late_fee_rate: number
          status: InvoiceStatus
          sent_date: string | null
          viewed_date: string | null
          first_payment_date: string | null
          paid_date: string | null
          days_overdue: number
          collection_status: string | null
          last_reminder_date: string | null
          collection_notes: string | null
          pdf_path: string | null
          email_sent_to: string[] | null
          delivery_method: string
          trust_account_applied: number
          trust_account_date: string | null
          internal_notes: string | null
          client_notes: string | null
          custom_fields: Json | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          invoice_number: string
          matter_id: string
          client_id: string
          invoice_type?: InvoiceType
          invoice_date?: string
          due_date: string
          service_period_start?: string | null
          service_period_end?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total_amount?: number
          amount_paid?: number
          balance_due?: number
          payment_method?: PaymentMethod | null
          payment_terms_days?: number
          late_fee_rate?: number
          status?: InvoiceStatus
          sent_date?: string | null
          viewed_date?: string | null
          first_payment_date?: string | null
          paid_date?: string | null
          days_overdue?: number
          collection_status?: string | null
          last_reminder_date?: string | null
          collection_notes?: string | null
          pdf_path?: string | null
          email_sent_to?: string[] | null
          delivery_method?: string
          trust_account_applied?: number
          trust_account_date?: string | null
          internal_notes?: string | null
          client_notes?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          invoice_number?: string
          matter_id?: string
          client_id?: string
          invoice_type?: InvoiceType
          invoice_date?: string
          due_date?: string
          service_period_start?: string | null
          service_period_end?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total_amount?: number
          amount_paid?: number
          balance_due?: number
          payment_method?: PaymentMethod | null
          payment_terms_days?: number
          late_fee_rate?: number
          status?: InvoiceStatus
          sent_date?: string | null
          viewed_date?: string | null
          first_payment_date?: string | null
          paid_date?: string | null
          days_overdue?: number
          collection_status?: string | null
          last_reminder_date?: string | null
          collection_notes?: string | null
          pdf_path?: string | null
          email_sent_to?: string[] | null
          delivery_method?: string
          trust_account_applied?: number
          trust_account_date?: string | null
          internal_notes?: string | null
          client_notes?: string | null
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          payment_number: string | null
          matter_id: string
          client_id: string
          invoice_id: string | null
          payment_date: string
          amount: number
          payment_method: PaymentMethod
          check_number: string | null
          reference_number: string | null
          bank_name: string | null
          credit_card_last_four: string | null
          deposited_to_trust: boolean
          trust_account_number: string | null
          earned_date: string | null
          transferred_from_trust: boolean
          transfer_date: string | null
          processing_fee: number
          net_amount: number
          deposit_date: string | null
          cleared_date: string | null
          allocated_amount: number | null
          unallocated_amount: number
          payment_status: PaymentStatus
          bounced_date: string | null
          bounced_reason: string | null
          refund_date: string | null
          refund_amount: number | null
          refund_reason: string | null
          payment_notes: string | null
          internal_notes: string | null
          created_at: string
          updated_at: string
          created_by: string
          updated_by: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          payment_number?: string | null
          matter_id: string
          client_id: string
          invoice_id?: string | null
          payment_date?: string
          amount: number
          payment_method: PaymentMethod
          check_number?: string | null
          reference_number?: string | null
          bank_name?: string | null
          credit_card_last_four?: string | null
          deposited_to_trust?: boolean
          trust_account_number?: string | null
          earned_date?: string | null
          transferred_from_trust?: boolean
          transfer_date?: string | null
          processing_fee?: number
          net_amount: number
          deposit_date?: string | null
          cleared_date?: string | null
          allocated_amount?: number | null
          unallocated_amount?: number
          payment_status?: PaymentStatus
          bounced_date?: string | null
          bounced_reason?: string | null
          refund_date?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          payment_notes?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
          updated_by: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          payment_number?: string | null
          matter_id?: string
          client_id?: string
          invoice_id?: string | null
          payment_date?: string
          amount?: number
          payment_method?: PaymentMethod
          check_number?: string | null
          reference_number?: string | null
          bank_name?: string | null
          credit_card_last_four?: string | null
          deposited_to_trust?: boolean
          trust_account_number?: string | null
          earned_date?: string | null
          transferred_from_trust?: boolean
          transfer_date?: string | null
          processing_fee?: number
          net_amount?: number
          deposit_date?: string | null
          cleared_date?: string | null
          allocated_amount?: number | null
          unallocated_amount?: number
          payment_status?: PaymentStatus
          bounced_date?: string | null
          bounced_reason?: string | null
          refund_date?: string | null
          refund_amount?: number | null
          refund_reason?: string | null
          payment_notes?: string | null
          internal_notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          }
        ]
      }
      calendar_events: {
        Row: {
          id: string
          title: string
          description: string | null
          event_type: EventType
          event_category: EventCategory
          start_datetime: string
          end_datetime: string | null
          all_day: boolean
          timezone: string
          location: string | null
          location_type: LocationType | null
          virtual_meeting_url: string | null
          virtual_meeting_id: string | null
          room_or_courtroom: string | null
          matter_id: string | null
          client_id: string | null
          case_number: string | null
          judge_name: string | null
          court_name: string | null
          hearing_type: HearingType | null
          deadline_type: DeadlineType | null
          deadline_description: string | null
          is_hard_deadline: boolean
          deadline_consequence: string | null
          is_recurring: boolean
          recurrence_rule: string | null
          recurrence_end_date: string | null
          parent_event_id: string | null
          organizer_id: string | null
          assigned_attorney: string | null
          assigned_paralegal: string | null
          created_by: string
          status: EventStatus
          confirmation_required: boolean
          confirmed_by: string | null
          confirmed_at: string | null
          preparation_time_minutes: number
          travel_time_minutes: number
          estimated_duration_minutes: number | null
          preparation_notes: string | null
          pre_event_checklist: string[] | null
          post_event_notes: string | null
          outcome_summary: string | null
          billable: boolean
          billable_rate: number | null
          time_entry_id: string | null
          estimated_hours: number | null
          actual_hours: number | null
          reminder_enabled: boolean
          reminder_minutes_before: number[]
          email_reminders: boolean
          sms_reminders: boolean
          last_reminder_sent: string | null
          priority: string
          importance_level: number
          conflict_with_existing: boolean
          related_documents: string[] | null
          attachment_paths: string[] | null
          reference_links: string[] | null
          external_calendar_id: string | null
          external_event_id: string | null
          sync_to_external: boolean
          last_synced_at: string | null
          visibility: EventVisibility
          show_client_portal: boolean
          client_can_reschedule: boolean
          custom_fields: Json | null
          created_at: string
          updated_at: string
          updated_by: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          event_type: EventType
          event_category: EventCategory
          start_datetime: string
          end_datetime?: string | null
          all_day?: boolean
          timezone?: string
          location?: string | null
          location_type?: LocationType | null
          virtual_meeting_url?: string | null
          virtual_meeting_id?: string | null
          room_or_courtroom?: string | null
          matter_id?: string | null
          client_id?: string | null
          case_number?: string | null
          judge_name?: string | null
          court_name?: string | null
          hearing_type?: HearingType | null
          deadline_type?: DeadlineType | null
          deadline_description?: string | null
          is_hard_deadline?: boolean
          deadline_consequence?: string | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          recurrence_end_date?: string | null
          parent_event_id?: string | null
          organizer_id?: string | null
          assigned_attorney?: string | null
          assigned_paralegal?: string | null
          created_by: string
          status?: EventStatus
          confirmation_required?: boolean
          confirmed_by?: string | null
          confirmed_at?: string | null
          preparation_time_minutes?: number
          travel_time_minutes?: number
          estimated_duration_minutes?: number | null
          preparation_notes?: string | null
          pre_event_checklist?: string[] | null
          post_event_notes?: string | null
          outcome_summary?: string | null
          billable?: boolean
          billable_rate?: number | null
          time_entry_id?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number[]
          email_reminders?: boolean
          sms_reminders?: boolean
          last_reminder_sent?: string | null
          priority?: string
          importance_level?: number
          conflict_with_existing?: boolean
          related_documents?: string[] | null
          attachment_paths?: string[] | null
          reference_links?: string[] | null
          external_calendar_id?: string | null
          external_event_id?: string | null
          sync_to_external?: boolean
          last_synced_at?: string | null
          visibility?: EventVisibility
          show_client_portal?: boolean
          client_can_reschedule?: boolean
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          updated_by: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          event_type?: EventType
          event_category?: EventCategory
          start_datetime?: string
          end_datetime?: string | null
          all_day?: boolean
          timezone?: string
          location?: string | null
          location_type?: LocationType | null
          virtual_meeting_url?: string | null
          virtual_meeting_id?: string | null
          room_or_courtroom?: string | null
          matter_id?: string | null
          client_id?: string | null
          case_number?: string | null
          judge_name?: string | null
          court_name?: string | null
          hearing_type?: HearingType | null
          deadline_type?: DeadlineType | null
          deadline_description?: string | null
          is_hard_deadline?: boolean
          deadline_consequence?: string | null
          is_recurring?: boolean
          recurrence_rule?: string | null
          recurrence_end_date?: string | null
          parent_event_id?: string | null
          organizer_id?: string | null
          assigned_attorney?: string | null
          assigned_paralegal?: string | null
          created_by?: string
          status?: EventStatus
          confirmation_required?: boolean
          confirmed_by?: string | null
          confirmed_at?: string | null
          preparation_time_minutes?: number
          travel_time_minutes?: number
          estimated_duration_minutes?: number | null
          preparation_notes?: string | null
          pre_event_checklist?: string[] | null
          post_event_notes?: string | null
          outcome_summary?: string | null
          billable?: boolean
          billable_rate?: number | null
          time_entry_id?: string | null
          estimated_hours?: number | null
          actual_hours?: number | null
          reminder_enabled?: boolean
          reminder_minutes_before?: number[]
          email_reminders?: boolean
          sms_reminders?: boolean
          last_reminder_sent?: string | null
          priority?: string
          importance_level?: number
          conflict_with_existing?: boolean
          related_documents?: string[] | null
          attachment_paths?: string[] | null
          reference_links?: string[] | null
          external_calendar_id?: string | null
          external_event_id?: string | null
          sync_to_external?: boolean
          last_synced_at?: string | null
          visibility?: EventVisibility
          show_client_portal?: boolean
          client_can_reschedule?: boolean
          custom_fields?: Json | null
          created_at?: string
          updated_at?: string
          updated_by?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "calendar_events_assigned_attorney_fkey"
            columns: ["assigned_attorney"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      holidays: {
        Row: {
          id: string
          holiday_name: string
          holiday_type: HolidayType
          jurisdiction: string | null
          holiday_date: string
          observed_date: string | null
          year: number
          is_recurring: boolean
          recurrence_pattern: string | null
          month_number: number | null
          day_number: number | null
          weekday_number: number | null
          week_of_month: number | null
          affects_filing_deadlines: boolean
          affects_court_sessions: boolean
          court_closed: boolean
          is_active: boolean
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          holiday_name: string
          holiday_type: HolidayType
          jurisdiction?: string | null
          holiday_date: string
          observed_date?: string | null
          year: number
          is_recurring?: boolean
          recurrence_pattern?: string | null
          month_number?: number | null
          day_number?: number | null
          weekday_number?: number | null
          week_of_month?: number | null
          affects_filing_deadlines?: boolean
          affects_court_sessions?: boolean
          court_closed?: boolean
          is_active?: boolean
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          holiday_name?: string
          holiday_type?: HolidayType
          jurisdiction?: string | null
          holiday_date?: string
          observed_date?: string | null
          year?: number
          is_recurring?: boolean
          recurrence_pattern?: string | null
          month_number?: number | null
          day_number?: number | null
          weekday_number?: number | null
          week_of_month?: number | null
          affects_filing_deadlines?: boolean
          affects_court_sessions?: boolean
          court_closed?: boolean
          is_active?: boolean
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["uid"]
          }
        ]
      }
      workflow_templates: {
        Row: {
          id: string
          template_name: string
          template_code: string
          description: string | null
          category: string
          practice_area: string
          trigger_event: string
          workflow_definition: Json
          is_active: boolean
          auto_execute: boolean
          execution_count: number
          success_count: number
          failure_count: number
          estimated_duration_minutes: number | null
          last_executed_at: string | null
          created_at: string
          updated_at: string
          created_by: string
        }
        Insert: {
          id?: string
          template_name: string
          template_code: string
          description?: string | null
          category: string
          practice_area: string
          trigger_event: string
          workflow_definition: Json
          is_active?: boolean
          auto_execute?: boolean
          execution_count?: number
          success_count?: number
          failure_count?: number
          estimated_duration_minutes?: number | null
          last_executed_at?: string | null
          created_at?: string
          updated_at?: string
          created_by: string
        }
        Update: {
          id?: string
          template_name?: string
          template_code?: string
          description?: string | null
          category?: string
          practice_area?: string
          trigger_event?: string
          workflow_definition?: Json
          is_active?: boolean
          auto_execute?: boolean
          execution_count?: number
          success_count?: number
          failure_count?: number
          estimated_duration_minutes?: number | null
          last_executed_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_executions: {
        Row: {
          id: string
          template_id: string
          client_id: string | null
          matter_id: string | null
          execution_name: string
          status: WorkflowStatus
          current_step: number
          total_steps: number
          completion_percentage: number
          input_data: Json | null
          output_data: Json | null
          error_message: string | null
          priority: WorkflowPriority
          estimated_duration_minutes: number
          actual_duration_minutes: number | null
          started_at: string | null
          completed_at: string | null
          paused_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          template_id: string
          client_id?: string | null
          matter_id?: string | null
          execution_name: string
          status?: WorkflowStatus
          current_step?: number
          total_steps: number
          completion_percentage?: number
          input_data?: Json | null
          output_data?: Json | null
          error_message?: string | null
          priority?: WorkflowPriority
          estimated_duration_minutes: number
          actual_duration_minutes?: number | null
          started_at?: string | null
          completed_at?: string | null
          paused_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          template_id?: string
          client_id?: string | null
          matter_id?: string | null
          execution_name?: string
          status?: WorkflowStatus
          current_step?: number
          total_steps?: number
          completion_percentage?: number
          input_data?: Json | null
          output_data?: Json | null
          error_message?: string | null
          priority?: WorkflowPriority
          estimated_duration_minutes?: number
          actual_duration_minutes?: number | null
          started_at?: string | null
          completed_at?: string | null
          paused_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workflow_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "matters"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_execution_steps: {
        Row: {
          id: string
          execution_id: string
          step_number: number
          step_name: string
          step_type: string
          step_config: Json | null
          status: WorkflowStepStatus
          started_at: string | null
          completed_at: string | null
          error_message: string | null
          output_data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          execution_id: string
          step_number: number
          step_name: string
          step_type: string
          step_config?: Json | null
          status?: WorkflowStepStatus
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          output_data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          execution_id?: string
          step_number?: number
          step_name?: string
          step_type?: string
          step_config?: Json | null
          status?: WorkflowStepStatus
          started_at?: string | null
          completed_at?: string | null
          error_message?: string | null
          output_data?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_steps_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          }
        ]
      }
      workflow_execution_logs: {
        Row: {
          id: string
          execution_id: string
          level: WorkflowLogLevel
          message: string
          details: Json | null
          logged_at: string
        }
        Insert: {
          id?: string
          execution_id: string
          level: WorkflowLogLevel
          message: string
          details?: Json | null
          logged_at?: string
        }
        Update: {
          id?: string
          execution_id?: string
          level?: WorkflowLogLevel
          message?: string
          details?: Json | null
          logged_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_uuid: string
        }
        Returns: string
      }
      user_has_permission: {
        Args: {
          user_uuid: string
          permission_type: string
          required_level: string
        }
        Returns: boolean
      }
      get_user_permissions: {
        Args: {
          user_uuid: string
        }
        Returns: Json
      }
      is_email_allowlisted: {
        Args: {
          check_email: string
        }
        Returns: boolean
      }
      get_allowlisted_role: {
        Args: {
          check_email: string
        }
        Returns: UserRole
      }
      user_has_mfa: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      get_mfa_status: {
        Args: {
          user_uuid: string
        }
        Returns: Json
      }
      create_user_session: {
        Args: {
          session_token: string
          user_uuid: string
          ip_addr?: string | null
          user_agent_string?: string | null
          device_data?: Json
          location_data?: Json
        }
        Returns: string
      }
      terminate_session: {
        Args: {
          session_uuid: string
          termination_reason?: SessionTerminationReason
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          event_type_param: AuditEventType
          resource_name: string
          action_name: string
          result_status: AuditResult
          event_details?: Json
          target_user_id?: string | null
          before_data?: Json | null
          after_data?: Json | null
          severity_level?: AuditSeverity
        }
        Returns: string
      }
      log_auth_event: {
        Args: {
          event_type_param: AuditEventType
          result_status: AuditResult
          user_email?: string | null
          event_details?: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_status: UserStatus
      user_role: UserRole
      allowlist_status: AllowlistStatus
      session_termination_reason: SessionTerminationReason
      mfa_factor_type: MfaFactorType
      audit_event_type: AuditEventType
      audit_result: AuditResult
      audit_severity: AuditSeverity
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for application use
export interface UserPermissions {
  financial: FinancialAccess
  clients: ClientAccess  
  documents: DocumentAccess
  administrative: AdministrativeAccess
}

export interface TemporaryAccess {
  granted_by: string
  granted_at: string
  expires_at: string
  scope: string
  justification: string
}

export interface UserMetadata {
  role: UserRole
  permissions: UserPermissions
  temporary_access?: TemporaryAccess
  registration_date?: string
}

// Type aliases for easier use
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type AllowlistEntry = Database['public']['Tables']['allowlist']['Row']
export type UserSession = Database['public']['Tables']['user_sessions']['Row']
export type MfaEnrollment = Database['public']['Tables']['mfa_enrollments']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type ClientContact = Database['public']['Tables']['client_contacts']['Row']
export type Matter = Database['public']['Tables']['matters']['Row']
export type MatterTask = Database['public']['Tables']['matter_tasks']['Row']
export type MatterParticipant = Database['public']['Tables']['matter_participants']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type DocumentTemplate = Database['public']['Tables']['document_templates']['Row']
export type FeeSchedule = Database['public']['Tables']['fee_schedules']['Row']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row']
export type Holiday = Database['public']['Tables']['holidays']['Row']

// Workflow-specific enum types
export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'
export type WorkflowStepStatus = 'waiting' | 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled'
export type WorkflowLogLevel = 'debug' | 'info' | 'warning' | 'error'
export type WorkflowPriority = 'low' | 'medium' | 'high' | 'urgent'

// Insert and Update types
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']
export type AllowlistInsert = Database['public']['Tables']['allowlist']['Insert']
export type AllowlistUpdate = Database['public']['Tables']['allowlist']['Update']
export type UserSessionInsert = Database['public']['Tables']['user_sessions']['Insert']
export type UserSessionUpdate = Database['public']['Tables']['user_sessions']['Update']
export type MfaEnrollmentInsert = Database['public']['Tables']['mfa_enrollments']['Insert']
export type MfaEnrollmentUpdate = Database['public']['Tables']['mfa_enrollments']['Update']
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert']
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type ClientContactInsert = Database['public']['Tables']['client_contacts']['Insert']
export type ClientContactUpdate = Database['public']['Tables']['client_contacts']['Update']
export type MatterInsert = Database['public']['Tables']['matters']['Insert']
export type MatterUpdate = Database['public']['Tables']['matters']['Update']
export type MatterTaskInsert = Database['public']['Tables']['matter_tasks']['Insert']
export type MatterTaskUpdate = Database['public']['Tables']['matter_tasks']['Update']
export type MatterParticipantInsert = Database['public']['Tables']['matter_participants']['Insert']
export type MatterParticipantUpdate = Database['public']['Tables']['matter_participants']['Update']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']
export type DocumentTemplateInsert = Database['public']['Tables']['document_templates']['Insert']
export type DocumentTemplateUpdate = Database['public']['Tables']['document_templates']['Update']
export type FeeScheduleInsert = Database['public']['Tables']['fee_schedules']['Insert']
export type FeeScheduleUpdate = Database['public']['Tables']['fee_schedules']['Update']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type PaymentInsert = Database['public']['Tables']['payments']['Insert']
export type PaymentUpdate = Database['public']['Tables']['payments']['Update']
export type CalendarEventInsert = Database['public']['Tables']['calendar_events']['Insert']
export type CalendarEventUpdate = Database['public']['Tables']['calendar_events']['Update']
export type HolidayInsert = Database['public']['Tables']['holidays']['Insert']
export type HolidayUpdate = Database['public']['Tables']['holidays']['Update']

// Workflow type aliases
export type WorkflowTemplate = Database['public']['Tables']['workflow_templates']['Row']
export type WorkflowExecution = Database['public']['Tables']['workflow_executions']['Row']
export type WorkflowExecutionStep = Database['public']['Tables']['workflow_execution_steps']['Row']
export type WorkflowExecutionLog = Database['public']['Tables']['workflow_execution_logs']['Row']
export type WorkflowTemplateInsert = Database['public']['Tables']['workflow_templates']['Insert']
export type WorkflowTemplateUpdate = Database['public']['Tables']['workflow_templates']['Update']
export type WorkflowExecutionInsert = Database['public']['Tables']['workflow_executions']['Insert']
export type WorkflowExecutionUpdate = Database['public']['Tables']['workflow_executions']['Update']
export type WorkflowExecutionStepInsert = Database['public']['Tables']['workflow_execution_steps']['Insert']
export type WorkflowExecutionStepUpdate = Database['public']['Tables']['workflow_execution_steps']['Update']
export type WorkflowExecutionLogInsert = Database['public']['Tables']['workflow_execution_logs']['Insert']
export type WorkflowExecutionLogUpdate = Database['public']['Tables']['workflow_execution_logs']['Update']

// Supabase Auth User type extension
export interface AuthUser {
  id: string
  email?: string
  user_metadata: UserMetadata
  app_metadata: {
    provider?: string
    providers?: string[]
  }
  created_at: string
  updated_at?: string
}