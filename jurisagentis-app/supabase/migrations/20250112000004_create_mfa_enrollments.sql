-- Create MFA factor type enum
CREATE TYPE mfa_factor_type AS ENUM ('totp', 'email', 'sms');

-- Create mfa_enrollments table for multi-factor authentication management
CREATE TABLE mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_type mfa_factor_type DEFAULT 'totp',
  secret_encrypted TEXT, -- Encrypted TOTP secret (server-side only)
  backup_codes TEXT[], -- Encrypted recovery codes
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  last_used TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Data validation constraints
  CONSTRAINT one_mfa_per_user UNIQUE(user_id, factor_type),
  CONSTRAINT verification_logic CHECK (
    (verified = FALSE AND verified_at IS NULL) OR
    (verified = TRUE AND verified_at IS NOT NULL)
  ),
  CONSTRAINT lock_logic CHECK (
    (failed_attempts < 5 AND locked_until IS NULL) OR
    (failed_attempts >= 5 AND locked_until IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_mfa_enrollments_user_id ON mfa_enrollments(user_id);
CREATE INDEX idx_mfa_enrollments_verified ON mfa_enrollments(verified) WHERE verified = TRUE;
CREATE INDEX idx_mfa_enrollments_locked ON mfa_enrollments(locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX idx_mfa_enrollments_created_at ON mfa_enrollments(created_at);

-- Enable Row Level Security
ALTER TABLE mfa_enrollments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own MFA
CREATE POLICY "Own MFA only" ON mfa_enrollments
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- RLS Policy: Admins can view MFA status (but not secrets)
CREATE POLICY "Admin MFA status view" ON mfa_enrollments
FOR SELECT TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Function to check if user has MFA enabled
CREATE OR REPLACE FUNCTION user_has_mfa(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM mfa_enrollments 
    WHERE user_id = user_uuid 
    AND verified = TRUE
    AND (locked_until IS NULL OR locked_until < NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user MFA enrollment status
CREATE OR REPLACE FUNCTION get_mfa_status(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  enrollment_record RECORD;
  result JSONB;
BEGIN
  SELECT verified, failed_attempts, locked_until, last_used, factor_type
  INTO enrollment_record
  FROM mfa_enrollments
  WHERE user_id = user_uuid AND factor_type = 'totp'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'enrolled', FALSE,
      'verified', FALSE,
      'locked', FALSE,
      'factor_type', NULL
    );
  END IF;
  
  result := jsonb_build_object(
    'enrolled', TRUE,
    'verified', enrollment_record.verified,
    'locked', (enrollment_record.locked_until IS NOT NULL AND enrollment_record.locked_until > NOW()),
    'failed_attempts', enrollment_record.failed_attempts,
    'last_used', enrollment_record.last_used,
    'factor_type', enrollment_record.factor_type
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create MFA enrollment
CREATE OR REPLACE FUNCTION create_mfa_enrollment(
  user_uuid UUID,
  factor_type_param mfa_factor_type DEFAULT 'totp',
  encrypted_secret TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  enrollment_id UUID;
BEGIN
  INSERT INTO mfa_enrollments (
    user_id,
    factor_type,
    secret_encrypted
  ) VALUES (
    user_uuid,
    factor_type_param,
    encrypted_secret
  ) 
  ON CONFLICT (user_id, factor_type) 
  DO UPDATE SET
    secret_encrypted = EXCLUDED.secret_encrypted,
    verified = FALSE,
    verified_at = NULL,
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
  RETURNING id INTO enrollment_id;
  
  RETURN enrollment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify MFA enrollment
CREATE OR REPLACE FUNCTION verify_mfa_enrollment(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE mfa_enrollments
  SET 
    verified = TRUE,
    verified_at = NOW(),
    failed_attempts = 0,
    locked_until = NULL,
    updated_at = NOW()
  WHERE user_id = user_uuid AND factor_type = 'totp';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record MFA verification attempt
CREATE OR REPLACE FUNCTION record_mfa_attempt(
  user_uuid UUID,
  success BOOLEAN
)
RETURNS BOOLEAN AS $$
DECLARE
  current_attempts INTEGER;
  is_locked BOOLEAN;
BEGIN
  SELECT failed_attempts, (locked_until IS NOT NULL AND locked_until > NOW())
  INTO current_attempts, is_locked
  FROM mfa_enrollments
  WHERE user_id = user_uuid AND factor_type = 'totp';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- If already locked and lock period hasn't expired, reject
  IF is_locked THEN
    RETURN FALSE;
  END IF;
  
  IF success THEN
    -- Reset failed attempts on successful verification
    UPDATE mfa_enrollments
    SET 
      failed_attempts = 0,
      locked_until = NULL,
      last_used = NOW(),
      updated_at = NOW()
    WHERE user_id = user_uuid AND factor_type = 'totp';
  ELSE
    -- Increment failed attempts
    current_attempts := current_attempts + 1;
    
    UPDATE mfa_enrollments
    SET 
      failed_attempts = current_attempts,
      locked_until = CASE 
        WHEN current_attempts >= 5 THEN NOW() + INTERVAL '15 minutes'
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE user_id = user_uuid AND factor_type = 'totp';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate backup codes (returns count, not actual codes)
CREATE OR REPLACE FUNCTION generate_backup_codes(
  user_uuid UUID,
  codes_encrypted TEXT[]
)
RETURNS INTEGER AS $$
BEGIN
  UPDATE mfa_enrollments
  SET 
    backup_codes = codes_encrypted,
    updated_at = NOW()
  WHERE user_id = user_uuid AND factor_type = 'totp';
  
  IF FOUND THEN
    RETURN array_length(codes_encrypted, 1);
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable MFA for user
CREATE OR REPLACE FUNCTION disable_mfa(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM mfa_enrollments
  WHERE user_id = user_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_mfa_enrollments_updated_at
    BEFORE UPDATE ON mfa_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON mfa_enrollments TO authenticated;