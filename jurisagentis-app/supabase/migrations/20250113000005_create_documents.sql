-- Create documents and related tables for legal document management

-- First, create the documents table with comprehensive document tracking
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Document identification and metadata
    document_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    document_type VARCHAR(100) NOT NULL, -- 'contract', 'court_filing', 'correspondence', 'memo', 'agreement', etc.
    document_category VARCHAR(100) NOT NULL, -- 'legal', 'administrative', 'financial', 'discovery', etc.
    
    -- File information
    file_name VARCHAR(500) NOT NULL,
    file_path TEXT NOT NULL, -- Path to actual file in storage
    file_size BIGINT NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- MIME type
    file_extension VARCHAR(10) NOT NULL,
    file_hash VARCHAR(128), -- For integrity checking
    
    -- Document relationships
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    parent_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    
    -- Document status and versioning
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'review', 'final', 'executed', 'archived', 'superseded'
    version_number INTEGER NOT NULL DEFAULT 1,
    is_current_version BOOLEAN NOT NULL DEFAULT true,
    
    -- Dates and deadlines
    document_date DATE,
    execution_date DATE,
    effective_date DATE,
    expiration_date DATE,
    retention_date DATE,
    
    -- Security and access
    confidentiality_level VARCHAR(50) NOT NULL DEFAULT 'client_confidential', -- 'public', 'internal', 'client_confidential', 'privileged'
    access_restrictions TEXT[],
    
    -- Organization and workflow
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    tags TEXT[],
    keywords TEXT[],
    
    -- Content and indexing
    text_content TEXT, -- Extracted text for search
    page_count INTEGER,
    word_count INTEGER,
    
    -- Legal-specific fields
    court_case_number VARCHAR(100),
    docket_number VARCHAR(100),
    filing_date DATE,
    filing_attorney UUID REFERENCES user_profiles(uid),
    opposing_counsel VARCHAR(500),
    
    -- Review and approval workflow
    requires_review BOOLEAN DEFAULT false,
    reviewed_by UUID REFERENCES user_profiles(uid),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES user_profiles(uid),
    approved_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Compliance and retention
    compliance_category VARCHAR(100),
    retention_period_years INTEGER,
    destruction_date DATE,
    legal_hold BOOLEAN DEFAULT false,
    legal_hold_reason TEXT,
    
    -- Digital signature and notarization
    is_signed BOOLEAN DEFAULT false,
    signature_type VARCHAR(50), -- 'electronic', 'digital', 'wet_signature'
    notarized BOOLEAN DEFAULT false,
    notary_details JSONB,
    
    -- Custom fields for practice-specific data
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Create document templates table for standardized legal documents
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template identification
    template_name VARCHAR(200) NOT NULL,
    template_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    template_category VARCHAR(100) NOT NULL, -- 'contracts', 'pleadings', 'correspondence', etc.
    practice_area VARCHAR(100) NOT NULL,
    
    -- Template content
    template_content TEXT NOT NULL, -- Template with variables like {{client_name}}
    template_variables JSONB, -- List of available variables and their types
    
    -- Template metadata
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    requires_review BOOLEAN DEFAULT false,
    
    -- Usage and access
    usage_count INTEGER DEFAULT 0,
    access_roles TEXT[] DEFAULT ARRAY['admin', 'associate_attorney', 'paralegal'],
    
    -- Template files
    template_file_path TEXT, -- Path to template file (Word, PDF, etc.)
    template_file_type VARCHAR(50),
    preview_image_path TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Create document shares table for controlled document sharing
CREATE TABLE IF NOT EXISTS document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Share details
    shared_with_email VARCHAR(320) NOT NULL,
    shared_with_name VARCHAR(200),
    share_type VARCHAR(50) NOT NULL, -- 'view_only', 'download', 'comment'
    
    -- Access control
    password_protected BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    download_limit INTEGER,
    downloads_used INTEGER DEFAULT 0,
    
    -- Tracking
    first_accessed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by UUID REFERENCES user_profiles(uid)
);

-- Create document revisions table for version control
CREATE TABLE IF NOT EXISTS document_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Revision information
    revision_number INTEGER NOT NULL,
    revision_description TEXT,
    revision_type VARCHAR(50) NOT NULL, -- 'minor_edit', 'major_revision', 'final_version', 'executed_copy'
    
    -- File information for this revision
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_hash VARCHAR(128),
    
    -- Change tracking
    changes_summary TEXT,
    changed_by UUID NOT NULL REFERENCES user_profiles(uid),
    change_reason TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document comments/notes table
CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- Comment details
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'general', -- 'general', 'review', 'revision_request', 'approval'
    
    -- Context
    page_number INTEGER,
    section_reference VARCHAR(200),
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES user_profiles(uid),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Parent comment for threading
    parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_documents_client_id ON documents(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_matter_id ON documents(matter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_document_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_status ON documents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_document_date ON documents(document_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_created_by ON documents(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_text_search ON documents USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(text_content, '')));
CREATE INDEX idx_documents_tags ON documents USING GIN (tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_keywords ON documents USING GIN (keywords) WHERE deleted_at IS NULL;

CREATE INDEX idx_document_templates_category ON document_templates(template_category) WHERE is_active = true;
CREATE INDEX idx_document_templates_practice_area ON document_templates(practice_area) WHERE is_active = true;

CREATE INDEX idx_document_shares_document_id ON document_shares(document_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_document_shares_shared_with_email ON document_shares(shared_with_email) WHERE revoked_at IS NULL;

CREATE INDEX idx_document_revisions_document_id ON document_revisions(document_id);
CREATE INDEX idx_document_comments_document_id ON document_comments(document_id) WHERE deleted_at IS NULL;

-- Function to generate document numbers
CREATE OR REPLACE FUNCTION generate_document_number(doc_type TEXT DEFAULT 'DOC')
RETURNS TEXT AS $$
DECLARE
    year_code TEXT;
    sequence_num INTEGER;
    doc_number TEXT;
BEGIN
    -- Get current year as 2-digit
    year_code := RIGHT(EXTRACT(YEAR FROM NOW())::TEXT, 2);
    
    -- Get next sequence number for this year and document type
    SELECT COALESCE(MAX(
        CASE 
            WHEN document_number ~ ('^' || year_code || '-' || doc_type || '-[0-9]+$')
            THEN RIGHT(document_number, 4)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM documents
    WHERE document_number LIKE year_code || '-' || doc_type || '-%';
    
    -- Format: YY-TYPE-NNNN (e.g., 25-CON-0001 for contract)
    doc_number := year_code || '-' || doc_type || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN doc_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update document version tracking
CREATE OR REPLACE FUNCTION update_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an update and not a delete
    IF TG_OP = 'UPDATE' AND OLD.version_number = NEW.version_number THEN
        -- Check if significant fields changed
        IF OLD.file_path != NEW.file_path OR 
           OLD.title != NEW.title OR 
           OLD.status != NEW.status THEN
            -- Increment version number
            NEW.version_number = OLD.version_number + 1;
            NEW.updated_at = NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document version tracking
CREATE TRIGGER trigger_update_document_version
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_document_version();

-- Function to update template usage count
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NOT NULL THEN
        UPDATE document_templates 
        SET usage_count = usage_count + 1,
            updated_at = NOW()
        WHERE id = NEW.template_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for template usage tracking
CREATE TRIGGER trigger_increment_template_usage
    AFTER INSERT ON documents
    FOR EACH ROW
    EXECUTE FUNCTION increment_template_usage();

-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER trigger_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_document_comments_updated_at
    BEFORE UPDATE ON document_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add some sample document types and categories as comments for reference
/*
Document Types:
- contract, agreement, lease, deed, will, trust, power_of_attorney
- pleading, motion, brief, order, judgment, subpoena
- correspondence, letter, email, memo, note
- discovery, interrogatories, deposition, exhibit
- financial, invoice, receipt, retainer_agreement
- administrative, checklist, workflow, policy

Document Categories:
- legal, administrative, financial, discovery, correspondence
- court_filings, client_documents, internal_documents
- templates, forms, checklists
- marketing, business_development, hr

Confidentiality Levels:
- public, internal, client_confidential, attorney_client_privileged
- work_product, highly_confidential

Status Values:
- draft, review, revision_requested, final, executed, archived, superseded, cancelled
*/