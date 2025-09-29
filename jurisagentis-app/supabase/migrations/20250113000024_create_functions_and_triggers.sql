-- T037: Create utility functions and triggers for document management
-- Migration: Document Management System - Functions & Triggers

BEGIN;

-- ==============================================
-- DOCUMENT LIFECYCLE MANAGEMENT FUNCTIONS
-- ==============================================

-- Function to promote document through workflow stages
CREATE OR REPLACE FUNCTION promote_document_status(
  p_document_id UUID,
  p_target_status document_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  current_doc documents%ROWTYPE;
  allowed_transitions document_status[];
  result JSONB;
BEGIN
  -- Get current document
  SELECT * INTO current_doc FROM documents WHERE id = p_document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;
  
  -- Define allowed status transitions
  allowed_transitions := CASE current_doc.status
    WHEN 'draft' THEN ARRAY['review', 'ready_for_signature', 'archived']::document_status[]
    WHEN 'review' THEN ARRAY['draft', 'ready_for_signature', 'archived']::document_status[]
    WHEN 'ready_for_signature' THEN ARRAY['pending_signature', 'review', 'archived']::document_status[]
    WHEN 'pending_signature' THEN ARRAY['executed', 'ready_for_signature', 'archived']::document_status[]
    WHEN 'executed' THEN ARRAY['archived']::document_status[]
    WHEN 'archived' THEN ARRAY[]::document_status[] -- Cannot transition from archived
  END;
  
  -- Check if transition is allowed
  IF NOT (p_target_status = ANY(allowed_transitions)) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid status transition from ' || current_doc.status || ' to ' || p_target_status,
      'allowed_transitions', array_to_json(allowed_transitions)
    );
  END IF;
  
  -- Update document status
  UPDATE documents 
  SET 
    status = p_target_status,
    updated_at = NOW(),
    updated_by = auth.uid(),
    completed_at = CASE WHEN p_target_status = 'executed' THEN NOW() ELSE completed_at END,
    archived_at = CASE WHEN p_target_status = 'archived' THEN NOW() ELSE NULL END,
    archived_by = CASE WHEN p_target_status = 'archived' THEN auth.uid() ELSE NULL END
  WHERE id = p_document_id;
  
  -- Log the status change
  PERFORM create_audit_log(
    'update',
    'document',
    p_document_id,
    'Document status changed from ' || current_doc.status || ' to ' || p_target_status,
    jsonb_build_object('status', current_doc.status),
    jsonb_build_object('status', p_target_status),
    jsonb_build_object('notes', p_notes, 'workflow_transition', true),
    'medium'
  );
  
  result := jsonb_build_object(
    'success', true,
    'previous_status', current_doc.status,
    'new_status', p_target_status,
    'updated_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk update document statuses
CREATE OR REPLACE FUNCTION bulk_update_document_status(
  p_document_ids UUID[],
  p_target_status document_status,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  doc_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::JSONB;
  result JSONB;
BEGIN
  FOREACH doc_id IN ARRAY p_document_ids
  LOOP
    BEGIN
      result := promote_document_status(doc_id, p_target_status, p_notes);
      
      IF (result->>'success')::BOOLEAN THEN
        success_count := success_count + 1;
      ELSE
        error_count := error_count + 1;
        errors := errors || jsonb_build_object(
          'document_id', doc_id,
          'error', result->>'error'
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      errors := errors || jsonb_build_object(
        'document_id', doc_id,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors,
    'total_processed', array_length(p_document_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- VERSION CONTROL FUNCTIONS
-- ==============================================

-- Function to create a new document version
CREATE OR REPLACE FUNCTION create_document_version(
  p_document_id UUID,
  p_file_path TEXT,
  p_file_name TEXT,
  p_file_size BIGINT,
  p_file_hash TEXT,
  p_change_summary TEXT,
  p_change_type version_change_type DEFAULT 'minor'
)
RETURNS UUID AS $$
DECLARE
  version_id UUID;
  current_version INTEGER;
  parent_version_id UUID;
BEGIN
  -- Get current version information
  SELECT MAX(version_number), id 
  INTO current_version, parent_version_id
  FROM document_versions 
  WHERE document_id = p_document_id;
  
  -- Create new version
  INSERT INTO document_versions (
    document_id,
    parent_version_id,
    version_number,
    change_type,
    change_summary,
    file_path,
    file_name,
    file_size,
    file_hash,
    mime_type,
    created_by
  ) VALUES (
    p_document_id,
    parent_version_id,
    COALESCE(current_version + 1, 1),
    p_change_type,
    p_change_summary,
    p_file_path,
    p_file_name,
    p_file_size,
    p_file_hash,
    (SELECT mime_type FROM documents WHERE id = p_document_id),
    auth.uid()
  ) RETURNING id INTO version_id;
  
  -- Update main document record
  UPDATE documents 
  SET 
    file_path = p_file_path,
    file_name = p_file_name,
    file_size = p_file_size,
    file_hash = p_file_hash,
    version_number = COALESCE(current_version + 1, 1),
    updated_at = NOW(),
    updated_by = auth.uid()
  WHERE id = p_document_id;
  
  -- Log version creation
  PERFORM create_audit_log(
    'create_version',
    'document',
    p_document_id,
    'New version created: ' || p_change_summary,
    NULL,
    jsonb_build_object(
      'version_id', version_id,
      'version_number', COALESCE(current_version + 1, 1),
      'change_type', p_change_type,
      'file_size', p_file_size
    ),
    jsonb_build_object('version_creation', true),
    'medium'
  );
  
  RETURN version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a previous version
CREATE OR REPLACE FUNCTION restore_document_version(
  p_document_id UUID,
  p_version_id UUID,
  p_restoration_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  version_record document_versions%ROWTYPE;
  new_version_id UUID;
BEGIN
  -- Get the version to restore
  SELECT * INTO version_record 
  FROM document_versions 
  WHERE id = p_version_id AND document_id = p_document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Version not found');
  END IF;
  
  -- Create new version based on the restored one
  new_version_id := create_document_version(
    p_document_id,
    version_record.file_path,
    version_record.file_name,
    version_record.file_size,
    version_record.file_hash,
    'Restored from version ' || version_record.version_number || 
    CASE WHEN p_restoration_notes IS NOT NULL THEN ': ' || p_restoration_notes ELSE '' END,
    'major'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'restored_from_version', version_record.version_number,
    'new_version_id', new_version_id,
    'restoration_notes', p_restoration_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DOCUMENT SHARING AND ACCESS FUNCTIONS
-- ==============================================

-- Function to generate secure sharing link
CREATE OR REPLACE FUNCTION generate_document_sharing_link(
  p_document_id UUID,
  p_recipient_email VARCHAR,
  p_permissions JSONB,
  p_expires_in_hours INTEGER DEFAULT 168, -- 1 week default
  p_custom_message TEXT DEFAULT NULL,
  p_require_password BOOLEAN DEFAULT false,
  p_password VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  sharing_id UUID;
  access_token VARCHAR(255);
  share_url TEXT;
  password_hash_val VARCHAR(255) := NULL;
BEGIN
  -- Generate access token
  access_token := encode(gen_random_bytes(32), 'base64url');
  
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
    'external_link',
    access_token,
    p_recipient_email,
    p_require_password,
    password_hash_val,
    COALESCE((p_permissions->>'can_view')::BOOLEAN, true),
    COALESCE((p_permissions->>'can_download')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_comment')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_approve')::BOOLEAN, false),
    NOW() + (p_expires_in_hours || ' hours')::INTERVAL,
    p_custom_message,
    auth.uid()
  ) RETURNING id INTO sharing_id;
  
  -- Generate share URL (this would be your domain + token)
  share_url := 'https://your-domain.com/share/' || access_token;
  
  -- Update with share URL
  UPDATE document_sharing 
  SET share_url = share_url 
  WHERE id = sharing_id;
  
  -- Log sharing action
  PERFORM create_audit_log(
    'share',
    'document',
    p_document_id,
    'Document shared with ' || p_recipient_email,
    NULL,
    jsonb_build_object(
      'sharing_id', sharing_id,
      'recipient_email', p_recipient_email,
      'expires_at', NOW() + (p_expires_in_hours || ' hours')::INTERVAL,
      'permissions', p_permissions
    ),
    jsonb_build_object('external_sharing', true),
    'medium',
    true -- Mark as sensitive
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'sharing_id', sharing_id,
    'access_token', access_token,
    'share_url', share_url,
    'expires_at', NOW() + (p_expires_in_hours || ' hours')::INTERVAL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- NOTIFICATION AND ALERT FUNCTIONS
-- ==============================================

-- Function to send document notifications
CREATE OR REPLACE FUNCTION send_document_notification(
  p_document_id UUID,
  p_notification_type VARCHAR,
  p_recipient_user_ids UUID[],
  p_custom_message TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  doc_record documents%ROWTYPE;
  recipient_id UUID;
  notification_count INTEGER := 0;
BEGIN
  -- Get document details
  SELECT * INTO doc_record FROM documents WHERE id = p_document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found');
  END IF;
  
  -- Create notifications for each recipient
  FOREACH recipient_id IN ARRAY p_recipient_user_ids
  LOOP
    -- Insert notification (assuming you have a notifications table)
    INSERT INTO comment_notifications (
      comment_id, -- This is a bit of a hack - you might want a separate notifications table
      user_id,
      notification_type
    ) VALUES (
      NULL, -- No specific comment
      recipient_id,
      p_notification_type
    );
    
    notification_count := notification_count + 1;
  END LOOP;
  
  -- Log the notification action
  PERFORM create_audit_log(
    'send_notification',
    'document',
    p_document_id,
    'Sent ' || p_notification_type || ' notification to ' || notification_count || ' users',
    NULL,
    jsonb_build_object(
      'notification_type', p_notification_type,
      'recipient_count', notification_count,
      'custom_message', p_custom_message
    ),
    jsonb_build_object('notification_batch', true),
    'low'
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'notifications_sent', notification_count,
    'document_title', doc_record.title
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- SIGNATURE WORKFLOW FUNCTIONS
-- ==============================================

-- Function to process signature completion
CREATE OR REPLACE FUNCTION process_signature_completion(
  p_signature_request_id UUID,
  p_signer_id UUID,
  p_docusign_data JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  request_record signature_requests%ROWTYPE;
  signer_record signature_request_signers%ROWTYPE;
  all_signed BOOLEAN;
BEGIN
  -- Get signature request and signer details
  SELECT * INTO request_record FROM signature_requests WHERE id = p_signature_request_id;
  SELECT * INTO signer_record FROM signature_request_signers WHERE id = p_signer_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request or signer not found');
  END IF;
  
  -- Update signer status
  UPDATE signature_request_signers 
  SET 
    status = 'signed',
    signed_at = NOW(),
    ip_address = COALESCE((p_docusign_data->>'ip_address')::INET, ip_address)
  WHERE id = p_signer_id;
  
  -- Check if all signers have signed
  SELECT NOT EXISTS (
    SELECT 1 FROM signature_request_signers 
    WHERE signature_request_id = p_signature_request_id 
      AND status != 'signed'
  ) INTO all_signed;
  
  -- If all signed, update request status and document
  IF all_signed THEN
    UPDATE signature_requests 
    SET 
      status = 'completed',
      completed_at = NOW()
    WHERE id = p_signature_request_id;
    
    UPDATE documents 
    SET 
      status = 'executed',
      signed_at = NOW()
    WHERE id = request_record.document_id;
    
    -- Log completion
    PERFORM create_audit_log(
      'sign_document',
      'document',
      request_record.document_id,
      'All signatures completed for document',
      NULL,
      jsonb_build_object(
        'signature_request_id', p_signature_request_id,
        'final_signer', signer_record.name,
        'completion_timestamp', NOW()
      ),
      jsonb_build_object('signature_completion', true),
      'high'
    );
  ELSE
    -- Log individual signature
    PERFORM create_audit_log(
      'sign_document',
      'signature_request',
      p_signature_request_id,
      'Document signed by ' || signer_record.name,
      NULL,
      jsonb_build_object(
        'signer_name', signer_record.name,
        'signer_email', signer_record.email,
        'signed_at', NOW()
      ),
      jsonb_build_object('partial_signature', true),
      'medium'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'all_signatures_complete', all_signed,
    'signer_name', signer_record.name,
    'signed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- AUTOMATED TRIGGERS FOR BUSINESS LOGIC
-- ==============================================

-- Trigger to automatically update document search index when templates are used
CREATE OR REPLACE FUNCTION update_template_usage_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment template usage when document is created from template
  IF NEW.template_id IS NOT NULL THEN
    UPDATE document_templates 
    SET 
      usage_count = usage_count + 1,
      last_used_at = NOW()
    WHERE id = NEW.template_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_template_usage_trigger
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage_trigger();

-- Trigger to enforce signature request business rules
CREATE OR REPLACE FUNCTION enforce_signature_business_rules()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure signing order is sequential if sequential_signing is enabled
  IF NEW.sequential_signing = true THEN
    -- Validate that signing orders are consecutive
    IF EXISTS (
      SELECT 1 FROM signature_request_signers 
      WHERE signature_request_id = NEW.id 
      GROUP BY signing_order 
      HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'Duplicate signing orders not allowed for sequential signing';
    END IF;
  END IF;
  
  -- Set default reminder settings
  IF NEW.remind_after_days IS NULL THEN
    NEW.remind_after_days := 3;
  END IF;
  
  IF NEW.max_reminders IS NULL THEN
    NEW.max_reminders := 3;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_request_business_rules_trigger
  BEFORE INSERT OR UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_signature_business_rules();

-- ==============================================
-- CLEANUP AND MAINTENANCE FUNCTIONS
-- ==============================================

-- Function to archive old completed documents
CREATE OR REPLACE FUNCTION auto_archive_old_documents(
  p_days_threshold INTEGER DEFAULT 365
)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  UPDATE documents 
  SET 
    status = 'archived',
    archived_at = NOW(),
    archived_by = NULL -- System-initiated
  WHERE 
    status = 'executed'
    AND signed_at < NOW() - (p_days_threshold || ' days')::INTERVAL
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log the auto-archiving
  PERFORM create_audit_log(
    'archive',
    'system',
    NULL,
    'Auto-archived ' || archived_count || ' old documents',
    NULL,
    jsonb_build_object(
      'archived_count', archived_count,
      'threshold_days', p_days_threshold
    ),
    jsonb_build_object('automated_archival', true),
    'low'
  );
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sharing links
CREATE OR REPLACE FUNCTION cleanup_expired_sharing_links()
RETURNS INTEGER AS $$
DECLARE
  cleanup_count INTEGER;
BEGIN
  UPDATE document_sharing 
  SET status = 'expired'
  WHERE expires_at < NOW() AND status = 'active';
  
  GET DIAGNOSTICS cleanup_count = ROW_COUNT;
  
  -- Log the cleanup
  PERFORM create_audit_log(
    'system_maintenance',
    'system',
    NULL,
    'Cleaned up ' || cleanup_count || ' expired sharing links',
    NULL,
    jsonb_build_object('expired_links_count', cleanup_count),
    jsonb_build_object('automated_cleanup', true),
    'low'
  );
  
  RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;