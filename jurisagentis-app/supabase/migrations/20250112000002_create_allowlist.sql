-- Create allowlist status enum
CREATE TYPE allowlist_status AS ENUM ('pending', 'active', 'used', 'revoked');

-- Create allowlist table for email-based registration control
CREATE TABLE allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL,
  added_by UUID REFERENCES auth.users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  status allowlist_status DEFAULT 'pending',
  notes TEXT,
  registration_completed BOOLEAN DEFAULT FALSE,
  registered_user_id UUID REFERENCES auth.users(id),
  registered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Data validation constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
  CONSTRAINT email_lowercase CHECK (email = LOWER(email)),
  CONSTRAINT registration_logic CHECK (
    (registration_completed = FALSE AND registered_user_id IS NULL AND registered_at IS NULL) OR
    (registration_completed = TRUE AND registered_user_id IS NOT NULL AND registered_at IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX idx_allowlist_email ON allowlist(email);
CREATE INDEX idx_allowlist_status ON allowlist(status);
CREATE INDEX idx_allowlist_role ON allowlist(role);
CREATE INDEX idx_allowlist_added_by ON allowlist(added_by);
CREATE INDEX idx_allowlist_created_at ON allowlist(created_at);

-- Enable Row Level Security
ALTER TABLE allowlist ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can access allowlist
CREATE POLICY "Admin only allowlist access" ON allowlist
FOR ALL TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Function to check if email is allowlisted and active
CREATE OR REPLACE FUNCTION is_email_allowlisted(check_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM allowlist 
    WHERE LOWER(email) = LOWER(check_email) 
    AND status IN ('pending', 'active')
    AND registration_completed = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get allowlisted role for email
CREATE OR REPLACE FUNCTION get_allowlisted_role(check_email TEXT)
RETURNS user_role AS $$
DECLARE
  user_role_result user_role;
BEGIN
  SELECT role INTO user_role_result
  FROM allowlist 
  WHERE LOWER(email) = LOWER(check_email) 
  AND status IN ('pending', 'active')
  AND registration_completed = FALSE
  LIMIT 1;
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark allowlist entry as used after registration
CREATE OR REPLACE FUNCTION mark_allowlist_used(
  user_email TEXT,
  user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE allowlist 
  SET 
    registration_completed = TRUE,
    registered_user_id = user_id,
    registered_at = NOW(),
    status = 'used',
    updated_at = NOW()
  WHERE LOWER(email) = LOWER(user_email)
  AND status IN ('pending', 'active')
  AND registration_completed = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_allowlist_updated_at
    BEFORE UPDATE ON allowlist
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON allowlist TO authenticated;