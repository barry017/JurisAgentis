-- T029: Create document access table for granular permissions
-- Migration: Document Management System - Access Control

BEGIN;

-- Create enum types for access control
CREATE TYPE access_level AS ENUM (
  'view',
  'comment', 
  'edit',
  'manage'
);

CREATE TYPE access_source AS ENUM (
  'direct',
  'matter_inherited',
  'role_based',
  'temporary'
);

-- Create document_access table
CREATE TABLE document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permission details
  access_level access_level NOT NULL,
  access_source access_source NOT NULL DEFAULT 'direct',
  
  -- Granular permissions
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_download BOOLEAN NOT NULL DEFAULT false,
  can_comment BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_share BOOLEAN NOT NULL DEFAULT false,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  
  -- Access restrictions
  ip_restrictions INET[],
  time_restrictions JSONB, -- e.g., {"start_time": "09:00", "end_time": "17:00", "timezone": "UTC"}
  
  -- Temporary access
  expires_at TIMESTAMPTZ,
  access_token VARCHAR(255), -- For external/client access
  
  -- Audit trail
  granted_by UUID NOT NULL REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  
  -- Notes and context
  access_reason TEXT,
  notes TEXT,
  
  UNIQUE(document_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_document_access_document_id ON document_access(document_id);
CREATE INDEX idx_document_access_user_id ON document_access(user_id);
CREATE INDEX idx_document_access_level ON document_access(access_level);
CREATE INDEX idx_document_access_expires ON document_access(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_document_access_token ON document_access(access_token) WHERE access_token IS NOT NULL;
CREATE INDEX idx_document_access_active ON document_access(document_id, user_id) WHERE revoked_at IS NULL;

-- Row Level Security
ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own access records
CREATE POLICY document_access_own_policy ON document_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users with manage access can see all access records for documents they manage
CREATE POLICY document_access_manage_policy ON document_access
  FOR ALL
  USING (
    document_id IN (
      SELECT da.document_id 
      FROM document_access da
      WHERE da.user_id = auth.uid() 
        AND da.can_manage = true
        AND da.revoked_at IS NULL
    )
  );

-- Policy: Matter managers can manage document access
CREATE POLICY document_access_matter_manager_policy ON document_access
  FOR ALL
  USING (
    document_id IN (
      SELECT d.id 
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND ma.can_manage = true
    )
  );

-- Function to grant document access
CREATE OR REPLACE FUNCTION grant_document_access(
  p_document_id UUID,
  p_user_id UUID,
  p_access_level access_level,
  p_permissions JSONB DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL,
  p_access_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  access_id UUID;
  can_view_val BOOLEAN := true;
  can_download_val BOOLEAN := false;
  can_comment_val BOOLEAN := false;
  can_edit_val BOOLEAN := false;
  can_share_val BOOLEAN := false;
  can_manage_val BOOLEAN := false;
  can_approve_val BOOLEAN := false;
BEGIN
  -- Set default permissions based on access level
  CASE p_access_level
    WHEN 'view' THEN
      can_view_val := true;
    WHEN 'comment' THEN
      can_view_val := true;
      can_comment_val := true;
    WHEN 'edit' THEN
      can_view_val := true;
      can_download_val := true;
      can_comment_val := true;
      can_edit_val := true;
    WHEN 'manage' THEN
      can_view_val := true;
      can_download_val := true;
      can_comment_val := true;
      can_edit_val := true;
      can_share_val := true;
      can_manage_val := true;
      can_approve_val := true;
  END CASE;
  
  -- Override with custom permissions if provided
  IF p_permissions IS NOT NULL THEN
    can_view_val := COALESCE((p_permissions->>'can_view')::BOOLEAN, can_view_val);
    can_download_val := COALESCE((p_permissions->>'can_download')::BOOLEAN, can_download_val);
    can_comment_val := COALESCE((p_permissions->>'can_comment')::BOOLEAN, can_comment_val);
    can_edit_val := COALESCE((p_permissions->>'can_edit')::BOOLEAN, can_edit_val);
    can_share_val := COALESCE((p_permissions->>'can_share')::BOOLEAN, can_share_val);
    can_manage_val := COALESCE((p_permissions->>'can_manage')::BOOLEAN, can_manage_val);
    can_approve_val := COALESCE((p_permissions->>'can_approve')::BOOLEAN, can_approve_val);
  END IF;
  
  -- Insert or update access record
  INSERT INTO document_access (
    document_id, user_id, access_level,
    can_view, can_download, can_comment, can_edit, can_share, can_manage, can_approve,
    expires_at, access_reason, granted_by
  ) VALUES (
    p_document_id, p_user_id, p_access_level,
    can_view_val, can_download_val, can_comment_val, can_edit_val, can_share_val, can_manage_val, can_approve_val,
    p_expires_at, p_access_reason, auth.uid()
  )
  ON CONFLICT (document_id, user_id) 
  DO UPDATE SET
    access_level = EXCLUDED.access_level,
    can_view = EXCLUDED.can_view,
    can_download = EXCLUDED.can_download,
    can_comment = EXCLUDED.can_comment,
    can_edit = EXCLUDED.can_edit,
    can_share = EXCLUDED.can_share,
    can_manage = EXCLUDED.can_manage,
    can_approve = EXCLUDED.can_approve,
    expires_at = EXCLUDED.expires_at,
    access_reason = EXCLUDED.access_reason,
    granted_by = auth.uid(),
    granted_at = NOW(),
    revoked_at = NULL,
    revoked_by = NULL
  RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke document access
CREATE OR REPLACE FUNCTION revoke_document_access(
  p_document_id UUID,
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  access_exists BOOLEAN;
BEGIN
  UPDATE document_access 
  SET 
    revoked_at = NOW(),
    revoked_by = auth.uid(),
    notes = COALESCE(notes || ' | ', '') || 'Revoked: ' || COALESCE(p_reason, 'No reason provided')
  WHERE 
    document_id = p_document_id 
    AND user_id = p_user_id 
    AND revoked_at IS NULL;
  
  access_exists := FOUND;
  RETURN access_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_document_permission(
  p_document_id UUID,
  p_user_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN := false;
BEGIN
  -- Check direct document access
  SELECT 
    CASE p_permission
      WHEN 'view' THEN can_view
      WHEN 'download' THEN can_download
      WHEN 'comment' THEN can_comment
      WHEN 'edit' THEN can_edit
      WHEN 'share' THEN can_share
      WHEN 'manage' THEN can_manage
      WHEN 'approve' THEN can_approve
      ELSE false
    END
  INTO has_permission
  FROM document_access
  WHERE 
    document_id = p_document_id
    AND user_id = p_user_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
  
  -- If no direct access, check matter-level access
  IF NOT COALESCE(has_permission, false) THEN
    SELECT 
      CASE p_permission
        WHEN 'view' THEN ma.can_view
        WHEN 'download' THEN ma.can_view
        WHEN 'comment' THEN ma.can_edit
        WHEN 'edit' THEN ma.can_edit
        WHEN 'share' THEN ma.can_manage
        WHEN 'manage' THEN ma.can_manage
        WHEN 'approve' THEN ma.can_manage
        ELSE false
      END
    INTO has_permission
    FROM documents d
    JOIN matter_access ma ON d.matter_id = ma.matter_id
    WHERE 
      d.id = p_document_id
      AND ma.user_id = p_user_id;
  END IF;
  
  RETURN COALESCE(has_permission, false);
END;
$$ LANGUAGE plpgsql;

-- Function to track access
CREATE OR REPLACE FUNCTION track_document_access(
  p_document_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  p_user_id := COALESCE(p_user_id, auth.uid());
  
  UPDATE document_access 
  SET 
    last_accessed_at = NOW(),
    access_count = access_count + 1
  WHERE 
    document_id = p_document_id 
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- View for active document permissions
CREATE VIEW active_document_permissions AS
SELECT 
  da.*,
  d.title as document_title,
  d.matter_id,
  u.email as user_email
FROM document_access da
JOIN documents d ON da.document_id = d.id
JOIN auth.users u ON da.user_id = u.id
WHERE 
  da.revoked_at IS NULL 
  AND (da.expires_at IS NULL OR da.expires_at > NOW());

COMMIT;
