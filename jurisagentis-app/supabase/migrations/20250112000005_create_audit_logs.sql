-- Create audit event type enum
CREATE TYPE audit_event_type AS ENUM (
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
  'unauthorized_access_attempt'
);

-- Create audit result enum
CREATE TYPE audit_result AS ENUM ('success', 'failure', 'error');

-- Create audit severity enum
CREATE TYPE audit_severity AS ENUM ('info', 'warning', 'error', 'critical');

-- Create audit_logs table with partitioning for performance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  actor_id UUID REFERENCES auth.users(id), -- Who performed the action
  event_type audit_event_type NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  result audit_result NOT NULL,
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  before_state JSONB,
  after_state JSONB,
  session_id UUID,
  severity audit_severity DEFAULT 'info',
  retained_until TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '6 years'),
  
  -- Partition key for performance (will be partitioned by created_at monthly)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Data validation constraints
  CONSTRAINT valid_timestamp CHECK (timestamp <= NOW()),
  CONSTRAINT valid_retention CHECK (retained_until > created_at)
) PARTITION BY RANGE (created_at);

-- Create initial partition for current month
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Create next month's partition  
CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs 
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Create indexes for performance (on parent table)
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_result ON audit_logs(result);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all audit logs
CREATE POLICY "Admin audit access" ON audit_logs
FOR SELECT TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policy: Users can view their own audit events
CREATE POLICY "Own audit events" ON audit_logs
FOR SELECT TO authenticated  
USING (user_id = auth.uid());

-- RLS Policy: System can insert audit logs
CREATE POLICY "System audit insert" ON audit_logs
FOR INSERT TO authenticated
WITH CHECK (TRUE); -- System needs to log all events

-- Function to create monthly partition automatically
CREATE OR REPLACE FUNCTION create_monthly_audit_partition(target_date DATE)
RETURNS BOOLEAN AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  partition_exists BOOLEAN;
BEGIN
  -- Calculate partition bounds
  start_date := date_trunc('month', target_date)::DATE;
  end_date := (start_date + INTERVAL '1 month')::DATE;
  partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
  
  -- Check if partition already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_class 
    WHERE relname = partition_name
  ) INTO partition_exists;
  
  IF partition_exists THEN
    RETURN FALSE;
  END IF;
  
  -- Create the partition
  EXECUTE format('CREATE TABLE %I PARTITION OF audit_logs 
                  FOR VALUES FROM (%L) TO (%L)',
                 partition_name, start_date, end_date);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically create next month's partition
CREATE OR REPLACE FUNCTION ensure_audit_partitions()
RETURNS void AS $$
BEGIN
  -- Create partition for next month
  PERFORM create_monthly_audit_partition(CURRENT_DATE + INTERVAL '1 month');
  -- Create partition for month after next (for safety)
  PERFORM create_monthly_audit_partition(CURRENT_DATE + INTERVAL '2 months');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic audit logging function
CREATE OR REPLACE FUNCTION log_audit_event(
  event_type_param audit_event_type,
  resource_name TEXT,
  action_name TEXT,
  result_status audit_result,
  event_details JSONB DEFAULT '{}',
  target_user_id UUID DEFAULT NULL,
  before_data JSONB DEFAULT NULL,
  after_data JSONB DEFAULT NULL,
  severity_level audit_severity DEFAULT 'info'
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
  current_session_id UUID;
  client_ip INET;
  client_user_agent TEXT;
BEGIN
  -- Try to get current session info (may be null for system events)
  BEGIN
    client_ip := inet_client_addr();
    client_user_agent := current_setting('request.headers.user-agent', true);
  EXCEPTION WHEN OTHERS THEN
    client_ip := NULL;
    client_user_agent := NULL;
  END;
  
  -- Insert audit log entry
  INSERT INTO audit_logs (
    user_id, 
    actor_id, 
    event_type, 
    resource, 
    action, 
    result, 
    details, 
    before_state,
    after_state,
    ip_address,
    user_agent,
    severity
  ) VALUES (
    COALESCE(target_user_id, auth.uid()),
    auth.uid(),
    event_type_param,
    resource_name,
    action_name, 
    result_status,
    event_details,
    before_data,
    after_data,
    client_ip,
    client_user_agent,
    severity_level
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log authentication events
CREATE OR REPLACE FUNCTION log_auth_event(
  event_type_param audit_event_type,
  result_status audit_result,
  user_email TEXT DEFAULT NULL,
  event_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  target_user_id UUID;
  severity_level audit_severity;
BEGIN
  -- Get user ID from email if provided
  IF user_email IS NOT NULL THEN
    SELECT id INTO target_user_id FROM auth.users WHERE email = user_email LIMIT 1;
  END IF;
  
  -- Set severity based on event type and result
  severity_level := CASE 
    WHEN event_type_param = 'auth_failed_login' THEN 'warning'
    WHEN event_type_param = 'unauthorized_access_attempt' THEN 'error'
    WHEN result_status = 'failure' THEN 'warning'
    WHEN result_status = 'error' THEN 'error'
    ELSE 'info'
  END;
  
  RETURN log_audit_event(
    event_type_param,
    'authentication',
    CASE event_type_param
      WHEN 'auth_login' THEN 'user_login'
      WHEN 'auth_logout' THEN 'user_logout'
      WHEN 'auth_failed_login' THEN 'failed_login_attempt'
      WHEN 'auth_mfa_setup' THEN 'mfa_enrollment'
      WHEN 'auth_mfa_verify' THEN 'mfa_verification'
      WHEN 'auth_password_change' THEN 'password_change'
      ELSE event_type_param::TEXT
    END,
    result_status,
    event_details || jsonb_build_object('user_email', user_email),
    target_user_id,
    NULL,
    NULL,
    severity_level
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old audit logs (run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM audit_logs 
    WHERE retained_until < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get audit statistics
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
    'unique_actors', COUNT(DISTINCT actor_id),
    'event_types', jsonb_object_agg(
      event_type::TEXT, 
      COUNT(*) FILTER (WHERE event_type IS NOT NULL)
    )
  ) INTO stats
  FROM audit_logs
  WHERE created_at BETWEEN start_date AND end_date;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON audit_logs TO authenticated;
GRANT ALL ON audit_logs_2025_01 TO authenticated;
GRANT ALL ON audit_logs_2025_02 TO authenticated;