-- T028: Create document versions table for comprehensive version control
-- Migration: Document Management System - Version Control

BEGIN;

-- Create enum types for version control
CREATE TYPE version_change_type AS ENUM (
  'minor',
  'major',
  'patch',
  'initial'
);

CREATE TYPE version_status AS ENUM (
  'active',
  'superseded',
  'archived',
  'draft'
);

-- Create document_versions table
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  parent_version_id UUID REFERENCES document_versions(id),
  
  -- Version metadata
  version_number INTEGER NOT NULL,
  version_label VARCHAR(50), -- e.g., "v1.0", "Draft 2", "Final"
  change_type version_change_type NOT NULL DEFAULT 'minor',
  change_summary TEXT NOT NULL,
  status version_status NOT NULL DEFAULT 'active',
  
  -- File information for this version
  file_path TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
  mime_type VARCHAR(100) NOT NULL,
  
  -- Content metadata
  page_count INTEGER,
  word_count INTEGER,
  content_checksum VARCHAR(64),
  
  -- Review and approval
  requires_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_status VARCHAR(50),
  review_comments TEXT,
  
  -- Comparison data
  diff_from_previous JSONB, -- Structured diff data
  changes_summary TEXT,
  
  -- Collaboration
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  superseded_at TIMESTAMPTZ,
  superseded_by UUID REFERENCES auth.users(id),
  
  -- Branch information (for advanced version control)
  branch_name VARCHAR(100) DEFAULT 'main',
  is_merged BOOLEAN DEFAULT false,
  merged_at TIMESTAMPTZ,
  merged_by UUID REFERENCES auth.users(id),
  
  UNIQUE(document_id, version_number)
);

-- Create indexes for performance
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_parent_version ON document_versions(parent_version_id);
CREATE INDEX idx_document_versions_version_number ON document_versions(document_id, version_number);
CREATE INDEX idx_document_versions_status ON document_versions(status);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at);
CREATE INDEX idx_document_versions_file_hash ON document_versions(file_hash);
CREATE INDEX idx_document_versions_branch ON document_versions(document_id, branch_name);
CREATE INDEX idx_document_versions_review_status ON document_versions(review_status) WHERE review_status IS NOT NULL;

-- Ensure matter_access table exists for permission joins
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

-- Row Level Security
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can access versions of documents they have access to
CREATE POLICY document_versions_access_policy ON document_versions
  FOR ALL
  USING (
    document_id IN (
      SELECT d.id 
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

-- Policy: Only users with edit access can create new versions
CREATE POLICY document_versions_create_policy ON document_versions
  FOR INSERT
  WITH CHECK (
    document_id IN (
      SELECT d.id 
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_edit = true OR ma.can_manage = true)
    )
  );

-- Function to get next version number
CREATE OR REPLACE FUNCTION get_next_version_number(p_document_id UUID, p_branch_name VARCHAR DEFAULT 'main')
RETURNS INTEGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM document_versions 
  WHERE document_id = p_document_id 
    AND branch_name = p_branch_name;
  
  RETURN next_version;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-assign version number on insert
CREATE OR REPLACE FUNCTION assign_version_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign version number if not provided
  IF NEW.version_number IS NULL THEN
    NEW.version_number := get_next_version_number(NEW.document_id, NEW.branch_name);
  END IF;
  
  -- Set initial version metadata
  IF NEW.version_number = 1 THEN
    NEW.change_type := 'initial';
    NEW.change_summary := COALESCE(NEW.change_summary, 'Initial version');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_versions_assign_number_trigger
  BEFORE INSERT ON document_versions
  FOR EACH ROW
  EXECUTE FUNCTION assign_version_number();

-- Function to manage version supersession
CREATE OR REPLACE FUNCTION manage_version_supersession()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new version is created, mark previous versions as superseded
  IF NEW.status = 'active' AND NEW.branch_name = 'main' THEN
    UPDATE document_versions 
    SET 
      status = 'superseded',
      superseded_at = NOW(),
      superseded_by = NEW.created_by
    WHERE 
      document_id = NEW.document_id 
      AND branch_name = NEW.branch_name
      AND status = 'active'
      AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_versions_supersession_trigger
  AFTER INSERT ON document_versions
  FOR EACH ROW
  EXECUTE FUNCTION manage_version_supersession();

-- View for getting current version of each document
CREATE VIEW current_document_versions AS
SELECT DISTINCT ON (document_id, branch_name) *
FROM document_versions
WHERE status = 'active'
ORDER BY document_id, branch_name, version_number DESC;

-- Function to compare two versions
CREATE OR REPLACE FUNCTION compare_document_versions(
  version1_id UUID,
  version2_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v1 document_versions%ROWTYPE;
  v2 document_versions%ROWTYPE;
  comparison JSONB;
BEGIN
  SELECT * INTO v1 FROM document_versions WHERE id = version1_id;
  SELECT * INTO v2 FROM document_versions WHERE id = version2_id;
  
  IF v1.document_id != v2.document_id THEN
    RAISE EXCEPTION 'Cannot compare versions from different documents';
  END IF;
  
  comparison := jsonb_build_object(
    'version1', jsonb_build_object(
      'id', v1.id,
      'version_number', v1.version_number,
      'file_size', v1.file_size,
      'created_at', v1.created_at,
      'created_by', v1.created_by
    ),
    'version2', jsonb_build_object(
      'id', v2.id,
      'version_number', v2.version_number,
      'file_size', v2.file_size,
      'created_at', v2.created_at,
      'created_by', v2.created_by
    ),
    'differences', jsonb_build_object(
      'file_size_change', v2.file_size - v1.file_size,
      'version_gap', v2.version_number - v1.version_number,
      'time_between_versions', EXTRACT(EPOCH FROM (v2.created_at - v1.created_at)) / 3600 -- hours
    )
  );
  
  RETURN comparison;
END;
$$ LANGUAGE plpgsql;

COMMIT;
