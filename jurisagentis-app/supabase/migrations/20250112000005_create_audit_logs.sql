-- Comprehensive audit logging foundation
-- Consolidates audit infrastructure for authentication, document, and workflow events

BEGIN;

DROP TABLE IF EXISTS audit_log_search_index CASCADE;
DROP TABLE IF EXISTS audit_log_attachments CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type') THEN
    DROP TYPE audit_event_type;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_entity_type') THEN
    DROP TYPE audit_entity_type;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_severity') THEN
    DROP TYPE audit_severity;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_result') THEN
    DROP TYPE audit_result;
  END IF;
END;
$$;

-- Action catalogue combines legacy and new events
CREATE TYPE audit_event_type AS ENUM (
  -- Legacy authentication & access events
  'auth_login',
  'auth_logout',
  'auth_failed_login',
  'auth_mfa_setup',
  'auth_mfa_verify',
  'auth_password_change',
  'user_role_change',
  'user_status_change',
  'allowlist_add',
  'allowlist_remove',
  'temp_access_grant',
  'temp_access_revoke',
  'session_terminate',
  'data_access',
  'unauthorized_access_attempt',
  -- Document lifecycle actions
  'create',
  'read',
  'update',
  'delete',
  'archive',
  'restore',
  'generate_from_template',
  'create_version',
  'download',
  'print',
  'share',
  -- Permission & security actions
  'grant_access',
  'revoke_access',
  'modify_permissions',
  'login',
  'logout',
  'failed_login',
  -- Collaboration & workflow
  'add_comment',
  'resolve_comment',
  'mention_user',
  'react_to_comment',
  -- Signature & template management
  'create_signature_request',
  'sign_document',
  'decline_signature',
  'cancel_signature_request',
  'send_reminder',
  'create_template',
  'update_template',
  'use_template',
  'archive_template',
  -- System maintenance
  'backup_created',
  'system_maintenance',
  'security_scan',
  'data_export',
  'data_import',
  'configuration_change',
  -- Workflow execution
  'start_workflow',
  'complete_workflow',
  'fail_workflow',
  'pause_workflow',
  'resume_workflow'
);

-- Entities covered across the platform
CREATE TYPE audit_entity_type AS ENUM (
  'authentication',
  'user_management',
  'user_access',
  'user_profile',
  'system',
  'document',
  'document_version',
  'template',
  'signature_request',
  'comment',
  'user',
  'matter',
  'client',
  'share_link',
  'configuration',
  'workflow',
  'workflow_execution',
  'workflow_step',
  'calendar_event',
  'calendar_deadline',
  'integration',
  'search',
  'retention_policy'
);

CREATE TYPE audit_result AS ENUM ('success', 'failure', 'error');
CREATE TYPE audit_severity AS ENUM ('info', 'warning', 'error', 'critical', 'low', 'medium', 'high');

-- Main audit table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type audit_event_type NOT NULL,
  entity_type audit_entity_type NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255),
  impersonated_by UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(255),
  action_description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  severity audit_severity DEFAULT 'info',
  is_sensitive BOOLEAN DEFAULT false,
  compliance_tags TEXT[] DEFAULT '{}',
  result audit_result DEFAULT 'success',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_code VARCHAR(100),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_ms INTEGER,
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  device_type VARCHAR(50),
  browser_name VARCHAR(100),
  operating_system VARCHAR(100),
  is_anonymized BOOLEAN DEFAULT false,
  retention_until TIMESTAMPTZ,
  parent_audit_id UUID REFERENCES audit_logs(id),
  trace_id VARCHAR(255),
  correlation_id VARCHAR(255)
);

CREATE TABLE audit_log_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_log_id UUID NOT NULL REFERENCES audit_logs(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100),
  file_hash VARCHAR(64),
  attachment_type VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log_search_index (
  audit_log_id UUID PRIMARY KEY REFERENCES audit_logs(id) ON DELETE CASCADE,
  search_vector TSVECTOR NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query paths
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_result ON audit_logs(result);
CREATE INDEX idx_audit_logs_sensitive ON audit_logs(is_sensitive) WHERE is_sensitive = true;
CREATE INDEX idx_audit_logs_compliance ON audit_logs USING GIN(compliance_tags);
CREATE INDEX idx_audit_logs_correlation ON audit_logs(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_audit_logs_trace ON audit_logs(trace_id) WHERE trace_id IS NOT NULL;
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, timestamp);
CREATE INDEX idx_audit_logs_entity_timestamp ON audit_logs(entity_type, entity_id, timestamp);
CREATE INDEX idx_audit_logs_action_timestamp ON audit_logs(action_type, timestamp);
CREATE INDEX idx_audit_log_search_vector ON audit_log_search_index USING GIN(search_vector);

-- Row level security: leverage existing role helper
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_access_policy ON audit_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (entity_type IN ('document', 'document_version') AND entity_id IN (
      SELECT d.id
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() AND (ma.can_view OR ma.can_edit OR ma.can_manage)
    ))
    OR
    (entity_type IN ('matter', 'client') AND entity_id IN (
      SELECT ma.matter_id
      FROM matter_access ma
      WHERE ma.user_id = auth.uid() AND ma.can_manage
    ))
    OR
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

CREATE POLICY audit_log_attachments_access_policy ON audit_log_attachments
  FOR SELECT
  USING (audit_log_id IN (SELECT id FROM audit_logs WHERE true));

CREATE POLICY audit_log_search_index_access_policy ON audit_log_search_index
  FOR SELECT
  USING (audit_log_id IN (SELECT id FROM audit_logs WHERE true));

-- Helper to build search vectors
CREATE OR REPLACE FUNCTION audit_log_search_index_refresh()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log_search_index (audit_log_id, search_vector, updated_at)
  VALUES (
    NEW.id,
    to_tsvector('english',
      COALESCE(NEW.action_description, '') || ' ' ||
      COALESCE(NEW.action_type::TEXT, '') || ' ' ||
      COALESCE(NEW.entity_type::TEXT, '') || ' ' ||
      COALESCE(NEW.old_values::TEXT, '') || ' ' ||
      COALESCE(NEW.new_values::TEXT, '') || ' ' ||
      COALESCE(NEW.metadata::TEXT, '')
    ),
    NOW()
  )
  ON CONFLICT (audit_log_id)
  DO UPDATE SET
    search_vector = EXCLUDED.search_vector,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_search_vector_trigger
  AFTER INSERT OR UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_log_search_index_refresh();

-- Core API: used by later migrations and wrappers
CREATE OR REPLACE FUNCTION create_audit_log(
  p_action_type audit_event_type,
  p_entity_type audit_entity_type,
  p_entity_id UUID,
  p_description TEXT,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity audit_severity DEFAULT 'info',
  p_is_sensitive BOOLEAN DEFAULT false,
  p_compliance_tags TEXT[] DEFAULT NULL,
  p_result audit_result DEFAULT 'success',
  p_correlation_id VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  current_ip INET;
  current_user_agent TEXT;
BEGIN
  BEGIN
    current_ip := current_setting('request.ip_address', true)::INET;
  EXCEPTION WHEN OTHERS THEN
    current_ip := NULL;
  END;

  BEGIN
    current_user_agent := current_setting('request.user_agent', true);
  EXCEPTION WHEN OTHERS THEN
    current_user_agent := NULL;
  END;

  INSERT INTO audit_logs (
    action_type,
    entity_type,
    entity_id,
    user_id,
    action_description,
    old_values,
    new_values,
    metadata,
    severity,
    is_sensitive,
    compliance_tags,
    result,
    success,
    ip_address,
    user_agent,
    correlation_id
  ) VALUES (
    p_action_type,
    p_entity_type,
    p_entity_id,
    auth.uid(),
    p_description,
    p_old_values,
    p_new_values,
    COALESCE(p_metadata, '{}'::jsonb),
    p_severity,
    p_is_sensitive,
    COALESCE(p_compliance_tags, '{}'::text[]),
    p_result,
    (p_result = 'success'),
    current_ip,
    current_user_agent,
    p_correlation_id
  ) RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search helper
CREATE OR REPLACE FUNCTION search_audit_logs(
  p_search_query TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_action_types audit_event_type[] DEFAULT NULL,
  p_entity_types audit_entity_type[] DEFAULT NULL,
  p_severity audit_severity[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  action_type audit_event_type,
  entity_type audit_entity_type,
  entity_id UUID,
  user_id UUID,
  action_description TEXT,
  event_timestamp TIMESTAMPTZ,
  severity audit_severity,
  result audit_result,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id,
    al.action_type,
    al.entity_type,
    al.entity_id,
    al.user_id,
    al.action_description,
    al.timestamp AS event_timestamp,
    al.severity,
    al.result,
    ts_rank(si.search_vector, plainto_tsquery('english', p_search_query))
  FROM audit_logs al
  LEFT JOIN audit_log_search_index si ON al.id = si.audit_log_id
  WHERE
    (p_search_query IS NULL OR si.search_vector @@ plainto_tsquery('english', p_search_query))
    AND (p_start_date IS NULL OR al.timestamp >= p_start_date)
    AND (p_end_date IS NULL OR al.timestamp <= p_end_date)
    AND (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_action_types IS NULL OR al.action_type = ANY(p_action_types))
    AND (p_entity_types IS NULL OR al.entity_type = ANY(p_entity_types))
    AND (p_severity IS NULL OR al.severity = ANY(p_severity))
  ORDER BY al.timestamp DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automatic auditing for document table
CREATE OR REPLACE FUNCTION audit_document_operations()
RETURNS TRIGGER AS $$
DECLARE
  action_type_val audit_event_type;
  description_val TEXT;
  old_vals JSONB;
  new_vals JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type_val := 'create';
    description_val := 'Document created: ' || NEW.title;
    new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    action_type_val := 'update';
    description_val := 'Document updated: ' || NEW.title;
    old_vals := to_jsonb(OLD);
    new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    action_type_val := 'delete';
    description_val := 'Document deleted: ' || OLD.title;
    old_vals := to_jsonb(OLD);
  END IF;

  PERFORM create_audit_log(
    action_type_val,
    'document',
    COALESCE(NEW.id, OLD.id),
    description_val,
    old_vals,
    new_vals,
    jsonb_build_object(
      'table', 'documents',
      'operation', TG_OP,
      'matter_id', COALESCE(NEW.matter_id, OLD.matter_id)
    ),
    'medium',
    true,
    ARRAY['document_management']
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_documents_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION audit_document_operations();

-- Legacy compatibility wrapper (used by early migrations)
CREATE OR REPLACE FUNCTION log_audit_event(
  event_type_param audit_event_type,
  resource_name TEXT,
  action_name TEXT,
  result_status audit_result,
  event_details JSONB DEFAULT '{}'::JSONB,
  target_user_id UUID DEFAULT NULL,
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL,
  severity_level audit_severity DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  severity_mapped audit_severity;
  description TEXT;
  entity_mapping audit_entity_type;
BEGIN
  CASE severity_level
    WHEN 'info' THEN severity_mapped := 'info';
    WHEN 'warning' THEN severity_mapped := 'warning';
    WHEN 'error' THEN severity_mapped := 'error';
    WHEN 'critical' THEN severity_mapped := 'critical';
    ELSE severity_mapped := severity_level;
  END CASE;

  description := format('%s: %s', resource_name, action_name);

  BEGIN
    entity_mapping := resource_name::audit_entity_type;
  EXCEPTION WHEN OTHERS THEN
    entity_mapping := 'system';
  END;

  RETURN create_audit_log(
    event_type_param,
    entity_mapping,
    target_user_id,
    description,
    before_data,
    after_data,
    event_details,
    severity_mapped,
    FALSE,
    NULL,
    result_status,
    NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_auth_event(
  event_type_param audit_event_type,
  result_status audit_result,
  user_email TEXT DEFAULT NULL,
  event_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  target_user UUID;
  combined_details JSONB;
BEGIN
  SELECT id INTO target_user FROM auth.users WHERE email = user_email;
  combined_details := event_details || jsonb_build_object('user_email', user_email);

  RETURN log_audit_event(
    event_type_param,
    'authentication',
    event_type_param::TEXT,
    result_status,
    combined_details,
    target_user,
    NULL,
    NULL,
    CASE
      WHEN result_status = 'error' THEN 'error'
      WHEN result_status = 'failure' THEN 'warning'
      ELSE 'info'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH removed AS (
    DELETE FROM audit_logs
    WHERE retention_until IS NOT NULL
      AND retention_until < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM removed;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_audit_statistics(
  start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    'success_events', COUNT(*) FILTER (WHERE result = 'success'),
    'failure_events', COUNT(*) FILTER (WHERE result = 'failure'),
    'error_events', COUNT(*) FILTER (WHERE result = 'error'),
    'critical_events', COUNT(*) FILTER (WHERE severity = 'critical'),
    'unique_users', COUNT(DISTINCT user_id),
    'action_breakdown', jsonb_object_agg(action_type::TEXT, COUNT(*))
  ) INTO stats
  FROM audit_logs
  WHERE timestamp BETWEEN start_date AND end_date;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON audit_log_attachments TO authenticated;
GRANT ALL ON audit_log_search_index TO authenticated;

COMMIT;
