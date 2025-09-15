-- Create session termination reason enum
CREATE TYPE session_termination_reason AS ENUM (
  'user_logout', 
  'admin_action', 
  'system_timeout', 
  'security_violation',
  'expired'
);

-- Create user_sessions table for session tracking and management
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  location JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  terminated_by session_termination_reason,
  terminated_at TIMESTAMPTZ,
  
  -- Data validation constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT valid_last_activity CHECK (last_activity >= created_at),
  CONSTRAINT termination_logic CHECK (
    (active = TRUE AND terminated_by IS NULL AND terminated_at IS NULL) OR
    (active = FALSE AND terminated_by IS NOT NULL AND terminated_at IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(active) WHERE active = TRUE;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_created_at ON user_sessions(created_at);
CREATE INDEX idx_user_sessions_ip_address ON user_sessions(ip_address);

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own sessions
CREATE POLICY "Own sessions only" ON user_sessions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Users can terminate their own sessions
CREATE POLICY "Own session termination" ON user_sessions
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS Policy: Admins can see and manage all sessions
CREATE POLICY "Admin session management" ON user_sessions
FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policy: System can create sessions during authentication
CREATE POLICY "System session creation" ON user_sessions
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- Function to create new session
CREATE OR REPLACE FUNCTION create_user_session(
  session_token TEXT,
  user_uuid UUID,
  ip_addr INET DEFAULT NULL,
  user_agent_string TEXT DEFAULT NULL,
  device_data JSONB DEFAULT '{}',
  location_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  session_id UUID;
  session_duration INTERVAL;
BEGIN
  -- Default session duration is 8 hours
  session_duration := INTERVAL '8 hours';
  
  INSERT INTO user_sessions (
    user_id, 
    session_token, 
    expires_at, 
    ip_address, 
    user_agent,
    device_info,
    location
  ) VALUES (
    user_uuid, 
    session_token, 
    NOW() + session_duration,
    ip_addr,
    user_agent_string,
    device_data,
    location_data
  ) RETURNING id INTO session_id;
  
  RETURN session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity(
  session_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions 
  SET last_activity = NOW()
  WHERE id = session_uuid AND active = TRUE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to terminate session
CREATE OR REPLACE FUNCTION terminate_session(
  session_uuid UUID,
  termination_reason session_termination_reason DEFAULT 'user_logout'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE user_sessions 
  SET 
    active = FALSE,
    terminated_by = termination_reason,
    terminated_at = NOW()
  WHERE id = session_uuid AND active = TRUE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to terminate all user sessions (for admin use)
CREATE OR REPLACE FUNCTION terminate_all_user_sessions(
  user_uuid UUID,
  termination_reason session_termination_reason DEFAULT 'admin_action'
)
RETURNS INTEGER AS $$
DECLARE
  terminated_count INTEGER;
BEGIN
  WITH terminated AS (
    UPDATE user_sessions 
    SET 
      active = FALSE,
      terminated_by = termination_reason,
      terminated_at = NOW()
    WHERE user_id = user_uuid AND active = TRUE
    RETURNING id
  )
  SELECT COUNT(*) INTO terminated_count FROM terminated;
  
  RETURN terminated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired sessions (run via cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  cleaned_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE user_sessions 
    SET 
      active = FALSE, 
      terminated_by = 'expired',
      terminated_at = NOW()
    WHERE expires_at < NOW() AND active = TRUE
    RETURNING id
  )
  SELECT COUNT(*) INTO cleaned_count FROM expired;
  
  RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active session count for user
CREATE OR REPLACE FUNCTION get_active_session_count(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM user_sessions
    WHERE user_id = user_uuid AND active = TRUE
  )::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT ALL ON user_sessions TO authenticated;