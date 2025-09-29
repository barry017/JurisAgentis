-- T032: Create document sharing table for client portal and external sharing
-- Migration: Document Management System - Document Sharing

BEGIN;

-- Create enum types for sharing
CREATE TYPE share_type AS ENUM (
  'client_portal',
  'external_link',
  'email_attachment',
  'secure_download'
);

CREATE TYPE share_status AS ENUM (
  'active',
  'expired',
  'revoked',
  'pending'
);

-- Create document_sharing table
CREATE TABLE document_sharing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Sharing configuration
  share_type share_type NOT NULL,
  status share_status NOT NULL DEFAULT 'pending',
  
  -- Access details
  access_token VARCHAR(255) UNIQUE NOT NULL,
  share_url TEXT,
  
  -- Recipient information
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(50),
  
  -- Security settings
  requires_password BOOLEAN DEFAULT false,
  password_hash VARCHAR(255), -- Hashed password for access
  require_email_verification BOOLEAN DEFAULT false,
  
  -- Access permissions
  can_view BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT false,
  can_comment BOOLEAN DEFAULT false,
  can_approve BOOLEAN DEFAULT false,
  can_print BOOLEAN DEFAULT false,
  
  -- Time restrictions
  expires_at TIMESTAMPTZ,
  max_views INTEGER,
  max_downloads INTEGER,
  
  -- Watermarking and security
  apply_watermark BOOLEAN DEFAULT true,
  watermark_text VARCHAR(255),
  disable_right_click BOOLEAN DEFAULT true,
  track_user_activity BOOLEAN DEFAULT true,
  
  -- Notification settings
  notify_on_access BOOLEAN DEFAULT true,
  notify_on_download BOOLEAN DEFAULT true,
  send_access_notification BOOLEAN DEFAULT true,
  
  -- Usage tracking
  view_count INTEGER DEFAULT 0,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  first_accessed_at TIMESTAMPTZ,
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,
  
  -- Additional metadata
  share_notes TEXT,
  custom_message TEXT,
  client_metadata JSONB DEFAULT '{}'
);

-- Create document_sharing_access_log table for detailed tracking
CREATE TABLE document_sharing_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES document_sharing(id) ON DELETE CASCADE,
  
  -- Access details
  access_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_type VARCHAR(50) NOT NULL, -- view, download, print, approve, etc.
  
  -- Client information
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  
  -- Geographic information
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  
  -- Browser and device info
  browser_name VARCHAR(100),
  browser_version VARCHAR(50),
  device_type VARCHAR(50), -- desktop, mobile, tablet
  operating_system VARCHAR(100),
  
  -- Access duration and engagement
  session_duration INTEGER, -- seconds
  pages_viewed INTEGER,
  
  -- Security events
  failed_password_attempts INTEGER DEFAULT 0,
  suspicious_activity BOOLEAN DEFAULT false,
  
  -- Additional context
  notes TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Create document_sharing_approvals table for client approvals
CREATE TABLE document_sharing_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES document_sharing(id) ON DELETE CASCADE,
  
  -- Approval details
  approval_status VARCHAR(50) NOT NULL, -- approved, rejected, pending
  approval_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Client signature/approval
  client_signature TEXT,
  approval_method VARCHAR(50), -- electronic, wet_signature, verbal
  
  -- Approval content
  approval_comments TEXT,
  rejection_reason TEXT,
  
  -- Authentication verification
  verified_email BOOLEAN DEFAULT false,
  verified_phone BOOLEAN DEFAULT false,
  verification_code VARCHAR(10),
  
  -- Legal compliance
  ip_address INET,
  consent_given BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  
  -- Audit trail
  approval_hash VARCHAR(255), -- Hash for integrity verification
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create document_sharing_notifications table
CREATE TABLE document_sharing_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sharing_id UUID NOT NULL REFERENCES document_sharing(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(100) NOT NULL, -- access_granted, document_viewed, approval_received
  recipient_email VARCHAR(255) NOT NULL,
  
  -- Email details
  subject VARCHAR(500),
  email_body TEXT,
  template_used VARCHAR(100),
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Status and errors
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_document_sharing_document_id ON document_sharing(document_id);
CREATE INDEX idx_document_sharing_access_token ON document_sharing(access_token);
CREATE INDEX idx_document_sharing_recipient_email ON document_sharing(recipient_email);
CREATE INDEX idx_document_sharing_status ON document_sharing(status);
CREATE INDEX idx_document_sharing_expires_at ON document_sharing(expires_at);
CREATE INDEX idx_document_sharing_created_at ON document_sharing(created_at);

CREATE INDEX idx_sharing_access_log_sharing_id ON document_sharing_access_log(sharing_id);
CREATE INDEX idx_sharing_access_log_timestamp ON document_sharing_access_log(access_timestamp);
CREATE INDEX idx_sharing_access_log_action ON document_sharing_access_log(action_type);
CREATE INDEX idx_sharing_access_log_ip ON document_sharing_access_log(ip_address);

CREATE INDEX idx_sharing_approvals_sharing_id ON document_sharing_approvals(sharing_id);
CREATE INDEX idx_sharing_approvals_status ON document_sharing_approvals(approval_status);

CREATE INDEX idx_sharing_notifications_sharing_id ON document_sharing_notifications(sharing_id);
CREATE INDEX idx_sharing_notifications_status ON document_sharing_notifications(status);

-- Row Level Security
ALTER TABLE document_sharing ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sharing_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sharing_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sharing_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for document_sharing
CREATE POLICY document_sharing_access_policy ON document_sharing
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

-- Policies for related tables
CREATE POLICY sharing_access_log_policy ON document_sharing_access_log
  FOR ALL
  USING (
    sharing_id IN (
      SELECT ds.id 
      FROM document_sharing ds
      JOIN documents d ON ds.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

CREATE POLICY sharing_approvals_policy ON document_sharing_approvals
  FOR ALL
  USING (
    sharing_id IN (
      SELECT ds.id 
      FROM document_sharing ds
      JOIN documents d ON ds.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

CREATE POLICY sharing_notifications_policy ON document_sharing_notifications
  FOR ALL
  USING (
    sharing_id IN (
      SELECT ds.id 
      FROM document_sharing ds
      JOIN documents d ON ds.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

-- Function to generate secure access token
CREATE OR REPLACE FUNCTION generate_access_token()
RETURNS VARCHAR(255) AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

-- Function to create document share
CREATE OR REPLACE FUNCTION create_document_share(
  p_document_id UUID,
  p_recipient_email VARCHAR,
  p_share_type share_type,
  p_permissions JSONB,
  p_expires_in_days INTEGER DEFAULT 7,
  p_custom_message TEXT DEFAULT NULL,
  p_require_password BOOLEAN DEFAULT false,
  p_password VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  share_id UUID;
  access_token VARCHAR(255);
  password_hash_val VARCHAR(255) := NULL;
BEGIN
  -- Generate access token
  access_token := generate_access_token();
  
  -- Hash password if provided
  IF p_require_password AND p_password IS NOT NULL THEN
    password_hash_val := crypt(p_password, gen_salt('bf', 8));
  END IF;
  
  -- Create sharing record
  INSERT INTO document_sharing (
    document_id,
    share_type,
    access_token,
    recipient_email,
    requires_password,
    password_hash,
    can_view,
    can_download,
    can_comment,
    can_approve,
    expires_at,
    custom_message,
    created_by
  ) VALUES (
    p_document_id,
    p_share_type,
    access_token,
    p_recipient_email,
    p_require_password,
    password_hash_val,
    COALESCE((p_permissions->>'can_view')::BOOLEAN, true),
    COALESCE((p_permissions->>'can_download')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_comment')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_approve')::BOOLEAN, false),
    NOW() + (p_expires_in_days || ' days')::INTERVAL,
    p_custom_message,
    auth.uid()
  ) RETURNING id INTO share_id;
  
  RETURN share_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log access activity
CREATE OR REPLACE FUNCTION log_sharing_access(
  p_sharing_id UUID,
  p_action_type VARCHAR,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_additional_data JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO document_sharing_access_log (
    sharing_id,
    action_type,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_sharing_id,
    p_action_type,
    p_ip_address,
    p_user_agent,
    p_additional_data
  ) RETURNING id INTO log_id;
  
  -- Update sharing statistics
  CASE p_action_type
    WHEN 'view' THEN
      UPDATE document_sharing 
      SET 
        view_count = view_count + 1,
        last_accessed_at = NOW(),
        first_accessed_at = COALESCE(first_accessed_at, NOW())
      WHERE id = p_sharing_id;
    WHEN 'download' THEN
      UPDATE document_sharing 
      SET 
        download_count = download_count + 1,
        last_accessed_at = NOW()
      WHERE id = p_sharing_id;
  END CASE;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate sharing access
CREATE OR REPLACE FUNCTION validate_sharing_access(
  p_access_token VARCHAR,
  p_password VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  sharing_record document_sharing%ROWTYPE;
  validation_result JSONB;
BEGIN
  -- Get sharing record
  SELECT * INTO sharing_record
  FROM document_sharing
  WHERE access_token = p_access_token;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid access token');
  END IF;
  
  -- Check if expired
  IF sharing_record.expires_at IS NOT NULL AND sharing_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Access link has expired');
  END IF;
  
  -- Check if revoked
  IF sharing_record.status = 'revoked' THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Access has been revoked');
  END IF;
  
  -- Check password if required
  IF sharing_record.requires_password THEN
    IF p_password IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Password required');
    END IF;
    
    IF NOT (sharing_record.password_hash = crypt(p_password, sharing_record.password_hash)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'Invalid password');
    END IF;
  END IF;
  
  -- Check view limits
  IF sharing_record.max_views IS NOT NULL AND sharing_record.view_count >= sharing_record.max_views THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Maximum views exceeded');
  END IF;
  
  -- Return success with sharing details
  validation_result := jsonb_build_object(
    'valid', true,
    'sharing_id', sharing_record.id,
    'document_id', sharing_record.document_id,
    'permissions', jsonb_build_object(
      'can_view', sharing_record.can_view,
      'can_download', sharing_record.can_download,
      'can_comment', sharing_record.can_comment,
      'can_approve', sharing_record.can_approve
    ),
    'expires_at', sharing_record.expires_at,
    'custom_message', sharing_record.custom_message
  );
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- View for sharing analytics
CREATE VIEW document_sharing_analytics AS
SELECT 
  ds.id,
  ds.document_id,
  ds.share_type,
  ds.recipient_email,
  ds.status,
  ds.view_count,
  ds.download_count,
  ds.created_at,
  ds.last_accessed_at,
  (
    SELECT COUNT(*) 
    FROM document_sharing_access_log dsal 
    WHERE dsal.sharing_id = ds.id
  ) as total_access_events,
  (
    SELECT jsonb_agg(DISTINCT action_type)
    FROM document_sharing_access_log dsal
    WHERE dsal.sharing_id = ds.id
  ) as action_types,
  (
    SELECT approval_status
    FROM document_sharing_approvals dsa
    WHERE dsa.sharing_id = ds.id
    ORDER BY dsa.created_at DESC
    LIMIT 1
  ) as latest_approval_status
FROM document_sharing ds;

COMMIT;