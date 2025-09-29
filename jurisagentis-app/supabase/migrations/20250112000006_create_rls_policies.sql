-- Advanced RLS policies and permission management functions
-- This migration creates additional security functions and policies

-- Function to check if user has specific permission level
CREATE OR REPLACE FUNCTION user_has_permission(
  user_uuid UUID, 
  permission_type TEXT, 
  required_level TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
  user_level TEXT;
BEGIN
  -- Get user permissions from auth metadata
  SELECT raw_user_meta_data->'permissions' INTO user_permissions
  FROM auth.users WHERE id = user_uuid;
  
  -- If no permissions set, assume minimal access
  IF user_permissions IS NULL THEN
    user_permissions := jsonb_build_object(
      'financial', 'none',
      'clients', 'own', 
      'documents', 'own',
      'administrative', 'none'
    );
  END IF;
  
  user_level := user_permissions->>permission_type;
  
  -- Define permission hierarchy logic
  CASE required_level
    WHEN 'none' THEN RETURN TRUE;
    WHEN 'own' THEN RETURN user_level IN ('own', 'assigned', 'limited', 'all');
    WHEN 'assigned' THEN RETURN user_level IN ('assigned', 'limited', 'all');
    WHEN 'limited' THEN RETURN user_level IN ('limited', 'all');
    WHEN 'all' THEN RETURN user_level = 'all';
    WHEN 'client_only' THEN RETURN user_level IN ('client_only', 'limited', 'all');
    WHEN 'time_only' THEN RETURN user_level IN ('time_only', 'limited', 'all');
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user role and permissions (admin only)
CREATE OR REPLACE FUNCTION update_user_role(
  target_user_id UUID,
  new_role user_role,
  new_permissions JSONB
)
RETURNS BOOLEAN AS $$
DECLARE
  old_metadata JSONB;
  new_metadata JSONB;
BEGIN
  -- Security check: only admins can update roles
  IF get_user_role(auth.uid()) != 'admin' THEN
    PERFORM log_audit_event(
      'unauthorized_access_attempt',
      'user_management',
      'update_user_role',
      'failure',
      jsonb_build_object(
        'attempted_by', auth.uid(),
        'target_user', target_user_id,
        'reason', 'insufficient_permissions'
      ),
      target_user_id,
      NULL,
      NULL,
      'error'
    );
    RAISE EXCEPTION 'Insufficient permissions: Admin role required';
  END IF;
  
  -- Get current user metadata
  SELECT raw_user_meta_data INTO old_metadata
  FROM auth.users WHERE id = target_user_id;
  
  -- Build new metadata preserving other fields
  new_metadata := COALESCE(old_metadata, '{}'::jsonb) || 
    jsonb_build_object('role', new_role, 'permissions', new_permissions);
  
  -- Update user metadata
  UPDATE auth.users 
  SET 
    raw_user_meta_data = new_metadata,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the role change
  PERFORM log_audit_event(
    'user_role_change',
    'user_profile',
    'update_role',
    'success',
    jsonb_build_object(
      'old_role', old_metadata->>'role',
      'new_role', new_role,
      'old_permissions', old_metadata->'permissions',
      'new_permissions', new_permissions
    ),
    target_user_id,
    old_metadata,
    new_metadata,
    'info'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to grant temporary developer access (admin only)
CREATE OR REPLACE FUNCTION grant_temporary_access(
  target_user_id UUID,
  access_scope TEXT,
  duration_hours INTEGER DEFAULT 24,
  justification TEXT DEFAULT 'Temporary access granted'
)
RETURNS BOOLEAN AS $$
DECLARE
  old_metadata JSONB;
  new_metadata JSONB;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Security check: only admins can grant temporary access
  IF get_user_role(auth.uid()) != 'admin' THEN
    RAISE EXCEPTION 'Insufficient permissions: Admin role required';
  END IF;
  
  -- Validate duration (max 24 hours)
  IF duration_hours > 24 OR duration_hours < 1 THEN
    RAISE EXCEPTION 'Invalid duration: Must be between 1 and 24 hours';
  END IF;
  
  expires_at := NOW() + (duration_hours || ' hours')::INTERVAL;
  
  -- Get current user metadata
  SELECT raw_user_meta_data INTO old_metadata
  FROM auth.users WHERE id = target_user_id;
  
  -- Add temporary access to metadata
  new_metadata := COALESCE(old_metadata, '{}'::jsonb) || 
    jsonb_build_object(
      'temporary_access', jsonb_build_object(
        'granted_by', auth.uid(),
        'granted_at', NOW(),
        'expires_at', expires_at,
        'scope', access_scope,
        'justification', justification
      )
    );
  
  -- Update user metadata
  UPDATE auth.users 
  SET 
    raw_user_meta_data = new_metadata,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the temporary access grant
  PERFORM log_audit_event(
    'temp_access_grant',
    'user_access',
    'grant_temporary_access',
    'success',
    jsonb_build_object(
      'scope', access_scope,
      'duration_hours', duration_hours,
      'expires_at', expires_at,
      'justification', justification
    ),
    target_user_id,
    old_metadata,
    new_metadata,
    'warning'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke temporary access
CREATE OR REPLACE FUNCTION revoke_temporary_access(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  old_metadata JSONB;
  new_metadata JSONB;
BEGIN
  -- Security check: only admins or the user themselves can revoke
  IF get_user_role(auth.uid()) != 'admin' AND auth.uid() != target_user_id THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;
  
  -- Get current user metadata
  SELECT raw_user_meta_data INTO old_metadata
  FROM auth.users WHERE id = target_user_id;
  
  -- Remove temporary access from metadata
  new_metadata := old_metadata - 'temporary_access';
  
  -- Update user metadata
  UPDATE auth.users 
  SET 
    raw_user_meta_data = new_metadata,
    updated_at = NOW()
  WHERE id = target_user_id;
  
  -- Log the temporary access revocation
  PERFORM log_audit_event(
    'temp_access_revoke',
    'user_access',
    'revoke_temporary_access',
    'success',
    jsonb_build_object(
      'revoked_by', auth.uid(),
      'old_access', old_metadata->'temporary_access'
    ),
    target_user_id,
    old_metadata,
    new_metadata,
    'info'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has temporary access
CREATE OR REPLACE FUNCTION has_temporary_access(
  user_uuid UUID,
  required_scope TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  temp_access JSONB;
  expires_at TIMESTAMPTZ;
  access_scope TEXT;
BEGIN
  -- Get temporary access from user metadata
  SELECT raw_user_meta_data->'temporary_access' INTO temp_access
  FROM auth.users WHERE id = user_uuid;
  
  -- No temporary access granted
  IF temp_access IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if access has expired
  expires_at := (temp_access->>'expires_at')::TIMESTAMPTZ;
  IF expires_at < NOW() THEN
    -- Access expired, clean it up
    PERFORM revoke_temporary_access(user_uuid);
    RETURN FALSE;
  END IF;
  
  -- If specific scope required, check it
  IF required_scope IS NOT NULL THEN
    access_scope := temp_access->>'scope';
    RETURN access_scope = required_scope OR access_scope = 'all';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comprehensive user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  user_metadata JSONB;
  user_role_val TEXT;
  permissions JSONB;
  temp_access JSONB;
  result JSONB;
BEGIN
  -- Get user metadata
  SELECT raw_user_meta_data INTO user_metadata
  FROM auth.users WHERE id = user_uuid;
  
  IF user_metadata IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  user_role_val := user_metadata->>'role';
  permissions := user_metadata->'permissions';
  temp_access := user_metadata->'temporary_access';
  
  -- Check if temporary access is still valid
  IF temp_access IS NOT NULL THEN
    IF (temp_access->>'expires_at')::TIMESTAMPTZ < NOW() THEN
      temp_access := NULL;
    END IF;
  END IF;
  
  result := jsonb_build_object(
    'user_id', user_uuid,
    'role', user_role_val,
    'permissions', permissions,
    'temporary_access', temp_access,
    'has_mfa', user_has_mfa(user_uuid),
    'active_sessions', get_active_session_count(user_uuid)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprehensive function to handle user registration with allowlist check
CREATE OR REPLACE FUNCTION handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  allowlisted_role user_role;
  default_permissions JSONB;
BEGIN
  user_email := NEW.email;
  
  -- Check if email is allowlisted
  IF NOT is_email_allowlisted(user_email) THEN
    -- Log unauthorized registration attempt
    PERFORM log_auth_event(
      'unauthorized_access_attempt',
      'failure',
      user_email,
      jsonb_build_object(
        'reason', 'email_not_allowlisted',
        'registration_attempt', true
      )
    );
    
    -- Delete the user record (this will cascade)
    DELETE FROM auth.users WHERE id = NEW.id;
    RETURN NULL;
  END IF;
  
  -- Get the allowlisted role
  allowlisted_role := get_allowlisted_role(user_email);
  
  -- Set default permissions based on role
  default_permissions := CASE allowlisted_role
    WHEN 'admin' THEN jsonb_build_object(
      'financial', 'all',
      'clients', 'all',
      'documents', 'all',
      'administrative', 'all'
    )
    WHEN 'associate_attorney' THEN jsonb_build_object(
      'financial', 'limited',
      'clients', 'all',
      'documents', 'all',
      'administrative', 'limited'
    )
    WHEN 'paralegal' THEN jsonb_build_object(
      'financial', 'time_only',
      'clients', 'assigned',
      'documents', 'assigned',
      'administrative', 'none'
    )
    WHEN 'assistant' THEN jsonb_build_object(
      'financial', 'none',
      'clients', 'assigned',
      'documents', 'assigned',
      'administrative', 'none'
    )
    WHEN 'client' THEN jsonb_build_object(
      'financial', 'client_only',
      'clients', 'own',
      'documents', 'own',
      'administrative', 'none'
    )
    WHEN 'client_related_party' THEN jsonb_build_object(
      'financial', 'none',
      'clients', 'shared',
      'documents', 'shared',
      'administrative', 'none'
    )
    ELSE jsonb_build_object(
      'financial', 'none',
      'clients', 'own',
      'documents', 'own',
      'administrative', 'none'
    )
  END;
  
  -- Update user metadata with role and permissions
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object(
    'role', allowlisted_role,
    'permissions', default_permissions,
    'registration_date', NOW()
  )
  WHERE id = NEW.id;
  
  -- Mark allowlist entry as used
  PERFORM mark_allowlist_used(user_email, NEW.id);
  
  -- Create user profile
  INSERT INTO user_profiles (
    id, email, status, created_at, updated_at
  ) VALUES (
    NEW.id, user_email, 'active', NOW(), NOW()
  );
  
  -- Log successful registration
  PERFORM log_auth_event(
    'auth_login',
    'success',
    user_email,
    jsonb_build_object(
      'registration', true,
      'role', allowlisted_role,
      'user_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_registration();

-- Function to run periodic maintenance tasks
CREATE OR REPLACE FUNCTION run_maintenance_tasks()
RETURNS JSONB AS $$
DECLARE
  expired_sessions INTEGER;
  expired_audits INTEGER;
  result JSONB;
BEGIN
  -- Cleanup expired sessions
  expired_sessions := cleanup_expired_sessions();
  
  -- Cleanup expired audit logs
  expired_audits := cleanup_expired_audit_logs();
  
  -- Ensure audit partitions exist
  PERFORM ensure_audit_partitions();
  
  result := jsonb_build_object(
    'maintenance_run_at', NOW(),
    'expired_sessions_cleaned', expired_sessions,
    'expired_audits_cleaned', expired_audits,
    'partitions_ensured', true
  );
  
  -- Log maintenance run
  PERFORM log_audit_event(
    'data_access',
    'system_maintenance',
    'run_maintenance_tasks',
    'success',
    result,
    NULL,
    NULL,
    NULL,
    'info'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for authenticated users where appropriate
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_temporary_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_permission(UUID, TEXT, TEXT) TO authenticated;
