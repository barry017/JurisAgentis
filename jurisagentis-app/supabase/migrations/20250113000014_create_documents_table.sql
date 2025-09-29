-- T027: Create documents table with comprehensive schema
-- Migration: Document Management System - Core Documents Table

BEGIN;

-- Create enum types for documents
CREATE TYPE document_status AS ENUM (
  'draft',
  'review', 
  'ready_for_signature',
  'pending_signature',
  'executed',
  'archived'
);

CREATE TYPE document_type AS ENUM (
  'contract',
  'trust',
  'will',
  'power_of_attorney',
  'operating_agreement',
  'lease',
  'deed',
  'application',
  'insurance',
  'correspondence',
  'memo',
  'research',
  'pleading',
  'motion',
  'brief',
  'discovery',
  'settlement',
  'other'
);

CREATE TYPE priority_level AS ENUM (
  'low',
  'medium', 
  'high',
  'urgent'
);

-- Ensure matter_access table exists for permission checks
CREATE TABLE IF NOT EXISTS matter_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES user_profiles(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_matter_access_matter_user ON matter_access(matter_id, user_id);
CREATE INDEX IF NOT EXISTS idx_matter_access_user ON matter_access(user_id);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  template_id UUID,
  signature_request_id UUID,
  
  -- Core document metadata
  title VARCHAR(500) NOT NULL,
  description TEXT,
  document_type document_type NOT NULL,
  status document_status NOT NULL DEFAULT 'draft',
  priority priority_level DEFAULT 'medium',
  
  -- File storage
  file_path TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  file_hash VARCHAR(64), -- SHA-256 hash for integrity
  mime_type VARCHAR(100),
  
  -- Content and organization
  tags TEXT[] DEFAULT '{}',
  content_summary TEXT,
  auto_populated_fields JSONB DEFAULT '{}',
  
  -- Version control
  version_number INTEGER DEFAULT 1,
  is_current_version BOOLEAN DEFAULT true,
  parent_version_id UUID REFERENCES documents(id),
  
  -- Client interaction
  client_approval_status VARCHAR(50),
  client_approved_at TIMESTAMPTZ,
  client_notes TEXT,
  
  -- Workflow tracking
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX idx_documents_matter_id ON documents(matter_id);
CREATE INDEX idx_documents_template_id ON documents(template_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_document_type ON documents(document_type);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);
CREATE INDEX idx_documents_priority ON documents(priority);
CREATE INDEX idx_documents_due_date ON documents(due_date);
CREATE INDEX idx_documents_current_version ON documents(is_current_version) WHERE is_current_version = true;
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_file_hash ON documents(file_hash);

-- Full-text search index
CREATE INDEX idx_documents_search ON documents USING GIN(
  to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content_summary, ''))
);

-- Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access documents from matters they have access to
CREATE POLICY documents_access_policy ON documents
  FOR ALL
  USING (user_has_matter_access(matter_id))
  WITH CHECK (user_has_matter_access(matter_id));

-- Policy: Only users with edit access can modify documents
CREATE POLICY documents_modify_policy ON documents
  FOR UPDATE
  USING (user_has_matter_access(matter_id));

-- Policy: Only users with manage access can delete documents
CREATE POLICY documents_delete_policy ON documents
  FOR DELETE
  USING (user_has_matter_access(matter_id));

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at_trigger
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_documents_updated_at();

-- Trigger to maintain version control integrity
CREATE OR REPLACE FUNCTION enforce_document_version_control()
RETURNS TRIGGER AS $$
BEGIN
  -- When creating a new version, mark previous versions as not current
  IF NEW.parent_version_id IS NOT NULL AND NEW.is_current_version = true THEN
    UPDATE documents 
    SET is_current_version = false 
    WHERE id = NEW.parent_version_id OR parent_version_id = NEW.parent_version_id;
  END IF;
  
  -- Ensure version numbers are sequential
  IF NEW.parent_version_id IS NOT NULL THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO NEW.version_number
    FROM documents 
    WHERE id = NEW.parent_version_id OR parent_version_id = NEW.parent_version_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_version_control_trigger
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION enforce_document_version_control();

COMMIT;
