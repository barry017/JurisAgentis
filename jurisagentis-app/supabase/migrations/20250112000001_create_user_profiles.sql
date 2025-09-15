-- Create enum types for user management
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE user_role AS ENUM (
  'admin',
  'associate_attorney', 
  'paralegal',
  'assistant',
  'client',
  'client_related_party',
  'temp_developer'
);

-- Create user_profiles table extending auth.users
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  phone TEXT,
  department TEXT,
  preferences JSONB DEFAULT '{}',
  status user_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Data validation constraints
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$'),
  CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~* '^\+?[1-9]\d{1,14}$')
);

-- Create indexes for performance
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
CREATE INDEX idx_user_profiles_created_at ON user_profiles(created_at);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Function to get user role from auth.users metadata
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(raw_user_meta_data->>'role', 'client')::TEXT
    FROM auth.users 
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Users can view own profile
CREATE POLICY "Users can view own profile" ON user_profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- RLS Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles  
FOR SELECT TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policy: Users can update own profile (limited fields)
CREATE POLICY "Users can update own profile" ON user_profiles
FOR UPDATE TO authenticated  
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- Users can only update these fields themselves
  (OLD.email = NEW.email) AND
  (OLD.status = NEW.status)
);

-- RLS Policy: Admins can update any profile
CREATE POLICY "Admins can update any profile" ON user_profiles
FOR UPDATE TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- RLS Policy: Only admins can insert profiles
CREATE POLICY "Admins can insert profiles" ON user_profiles
FOR INSERT TO authenticated
WITH CHECK (get_user_role(auth.uid()) = 'admin');

-- RLS Policy: Only admins can delete profiles  
CREATE POLICY "Admins can delete profiles" ON user_profiles
FOR DELETE TO authenticated
USING (get_user_role(auth.uid()) = 'admin');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;