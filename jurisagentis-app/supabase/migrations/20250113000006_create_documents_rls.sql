-- Enable Row Level Security on document tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Documents - Admin full access" ON documents;
DROP POLICY IF EXISTS "Documents - Attorney/Paralegal read/write assigned" ON documents;
DROP POLICY IF EXISTS "Documents - Assistant read assigned" ON documents;
DROP POLICY IF EXISTS "Documents - Client read own documents" ON documents;

DROP POLICY IF EXISTS "Document Templates - All authenticated users read" ON document_templates;
DROP POLICY IF EXISTS "Document Templates - Admin/Attorney full access" ON document_templates;

DROP POLICY IF EXISTS "Document Shares - Creator full access" ON document_shares;
DROP POLICY IF EXISTS "Document Shares - Shared recipient access" ON document_shares;

DROP POLICY IF EXISTS "Document Revisions - Same access as document" ON document_revisions;
DROP POLICY IF EXISTS "Document Comments - Same access as document" ON document_comments;

-- Helper function to check if user has access to a document
CREATE OR REPLACE FUNCTION user_has_document_access(doc_id UUID, access_level TEXT DEFAULT 'read')
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
  doc_matter_id UUID;
  doc_client_id UUID;
  doc_confidentiality TEXT;
BEGIN
  -- Get current user info
  SELECT auth.jwt() ->> 'sub' INTO user_id;
  SELECT role FROM user_profiles WHERE uid = user_id::UUID INTO user_role;
  
  -- Get document details
  SELECT matter_id, client_id, confidentiality_level 
  FROM documents 
  WHERE id = doc_id AND deleted_at IS NULL
  INTO doc_matter_id, doc_client_id, doc_confidentiality;
  
  -- Admin has access to all documents
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check confidentiality restrictions for all roles
  IF doc_confidentiality = 'attorney_client_privileged' AND user_role NOT IN ('admin', 'associate_attorney') THEN
    RETURN FALSE;
  END IF;
  
  -- Attorneys and paralegals have access to documents for matters/clients they can access
  IF user_role IN ('associate_attorney', 'paralegal') THEN
    -- Check matter access if document is tied to a matter
    IF doc_matter_id IS NOT NULL THEN
      RETURN user_has_matter_access(doc_matter_id);
    END IF;
    
    -- Check client access if document is tied to a client
    IF doc_client_id IS NOT NULL THEN
      RETURN user_has_client_access(doc_client_id);
    END IF;
    
    -- If no specific client/matter, allow access for attorneys/paralegals
    RETURN TRUE;
  END IF;
  
  -- Assistants have read access to documents for matters/clients they can access
  IF user_role = 'assistant' THEN
    -- Only read access for assistants
    IF access_level != 'read' THEN
      RETURN FALSE;
    END IF;
    
    -- Check matter access if document is tied to a matter
    IF doc_matter_id IS NOT NULL THEN
      RETURN user_has_matter_access(doc_matter_id);
    END IF;
    
    -- Check client access if document is tied to a client
    IF doc_client_id IS NOT NULL THEN
      RETURN user_has_client_access(doc_client_id);
    END IF;
    
    RETURN FALSE;
  END IF;
  
  -- Clients can see documents where they are the client (non-privileged only)
  IF user_role = 'client' THEN
    -- Only read access for clients
    IF access_level != 'read' THEN
      RETURN FALSE;
    END IF;
    
    -- Cannot see privileged or work product documents
    IF doc_confidentiality IN ('attorney_client_privileged', 'work_product') THEN
      RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON c.email = up.email
      WHERE c.id = doc_client_id 
      AND up.uid = user_id::UUID
      AND up.role = 'client'
      AND c.deleted_at IS NULL
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for documents table

-- Admin: Full access to all documents
CREATE POLICY "Documents - Admin full access" ON documents
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'admin'
    )
  );

-- Attorney/Paralegal: Read/write access to documents they can access
CREATE POLICY "Documents - Attorney/Paralegal read/write assigned" ON documents
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_document_access(id, 'write')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_document_access(id, 'write')
  );

-- Assistant: Read-only access to documents they can access
CREATE POLICY "Documents - Assistant read assigned" ON documents
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'assistant'
    )
    AND user_has_document_access(id, 'read')
    AND deleted_at IS NULL
  );

-- Client: Read access to their own non-privileged documents
CREATE POLICY "Documents - Client read own documents" ON documents
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'client'
    )
    AND user_has_document_access(id, 'read')
    AND confidentiality_level NOT IN ('attorney_client_privileged', 'work_product')
    AND deleted_at IS NULL
  );

-- RLS Policies for document_templates table

-- All authenticated users: Read access to active templates based on role
CREATE POLICY "Document Templates - All authenticated users read" ON document_templates
  FOR SELECT 
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = ANY(access_roles)
    )
  );

-- Admin/Attorney: Full access to all templates
CREATE POLICY "Document Templates - Admin/Attorney full access" ON document_templates
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney')
    )
  );

-- RLS Policies for document_shares table

-- Creator: Full access to shares they created
CREATE POLICY "Document Shares - Creator full access" ON document_shares
  FOR ALL 
  TO authenticated
  USING (
    created_by = (auth.jwt() ->> 'sub')::UUID
    OR user_has_document_access(document_id, 'read')
  )
  WITH CHECK (
    created_by = (auth.jwt() ->> 'sub')::UUID
    OR user_has_document_access(document_id, 'write')
  );

-- Shared recipient: Read access to shares where they are the recipient
CREATE POLICY "Document Shares - Shared recipient access" ON document_shares
  FOR SELECT 
  TO authenticated
  USING (
    shared_with_email = (
      SELECT email FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID
    )
    AND (expires_at IS NULL OR expires_at > NOW())
    AND revoked_at IS NULL
  );

-- RLS Policies for document_revisions table

-- Same access as parent document
CREATE POLICY "Document Revisions - Same access as document" ON document_revisions
  FOR ALL 
  TO authenticated
  USING (
    user_has_document_access(document_id, 'read')
  )
  WITH CHECK (
    user_has_document_access(document_id, 'write')
  );

-- RLS Policies for document_comments table

-- Same access as parent document
CREATE POLICY "Document Comments - Same access as document" ON document_comments
  FOR ALL 
  TO authenticated
  USING (
    user_has_document_access(document_id, 'read')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_document_access(document_id, 'read')
  );

-- Additional security functions

-- Function to check if user can download a document
CREATE OR REPLACE FUNCTION user_can_download_document(doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  doc_status TEXT;
BEGIN
  SELECT role FROM user_profiles 
  WHERE uid = (auth.jwt() ->> 'sub')::UUID 
  INTO user_role;
  
  SELECT status FROM documents 
  WHERE id = doc_id 
  INTO doc_status;
  
  -- Admin can download anything
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Others need basic document access
  IF NOT user_has_document_access(doc_id, 'read') THEN
    RETURN FALSE;
  END IF;
  
  -- Clients cannot download drafts or under-review documents
  IF user_role = 'client' AND doc_status IN ('draft', 'review', 'revision_requested') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can share a document
CREATE OR REPLACE FUNCTION user_can_share_document(doc_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  doc_confidentiality TEXT;
BEGIN
  SELECT role FROM user_profiles 
  WHERE uid = (auth.jwt() ->> 'sub')::UUID 
  INTO user_role;
  
  SELECT confidentiality_level FROM documents 
  WHERE id = doc_id 
  INTO doc_confidentiality;
  
  -- Admin can share anything
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Must have write access to document
  IF NOT user_has_document_access(doc_id, 'write') THEN
    RETURN FALSE;
  END IF;
  
  -- Attorneys can share any document they have access to
  IF user_role = 'associate_attorney' THEN
    RETURN TRUE;
  END IF;
  
  -- Paralegals cannot share privileged documents
  IF user_role = 'paralegal' AND doc_confidentiality = 'attorney_client_privileged' THEN
    RETURN FALSE;
  END IF;
  
  -- Others cannot share
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;