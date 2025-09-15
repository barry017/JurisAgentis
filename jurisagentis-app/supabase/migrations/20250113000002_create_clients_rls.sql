-- Enable Row Level Security on clients and related tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Clients - Admin full access" ON clients;
DROP POLICY IF EXISTS "Clients - Attorney/Paralegal read/write assigned" ON clients;
DROP POLICY IF EXISTS "Clients - Assistant read assigned" ON clients;
DROP POLICY IF EXISTS "Clients - Client read own record" ON clients;

DROP POLICY IF EXISTS "Client Contacts - Admin full access" ON client_contacts;
DROP POLICY IF EXISTS "Client Contacts - Attorney/Paralegal read/write for assigned clients" ON client_contacts;
DROP POLICY IF EXISTS "Client Contacts - Assistant read for assigned clients" ON client_contacts;
DROP POLICY IF EXISTS "Client Contacts - Client read own contacts" ON client_contacts;

-- Helper function to check if user has access to a client
CREATE OR REPLACE FUNCTION user_has_client_access(client_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get current user info
  SELECT auth.jwt() ->> 'sub' INTO user_id;
  SELECT role FROM user_profiles WHERE uid = user_id::UUID INTO user_role;
  
  -- Admin has access to all clients
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- For now, attorneys and paralegals have access to all active clients
  -- TODO: Implement proper client assignment system
  IF user_role IN ('associate_attorney', 'paralegal') THEN
    RETURN EXISTS (
      SELECT 1 FROM clients 
      WHERE id = client_id 
      AND deleted_at IS NULL
    );
  END IF;
  
  -- Assistants have read-only access to active clients
  IF user_role = 'assistant' THEN
    RETURN EXISTS (
      SELECT 1 FROM clients 
      WHERE id = client_id 
      AND deleted_at IS NULL
    );
  END IF;
  
  -- Clients can only see their own record
  IF user_role = 'client' THEN
    -- Check if this user profile is linked to this client
    -- For now, we'll use email matching
    RETURN EXISTS (
      SELECT 1 FROM clients c
      JOIN user_profiles up ON c.email = up.email
      WHERE c.id = client_id 
      AND up.uid = user_id::UUID
      AND c.deleted_at IS NULL
    );
  END IF;
  
  -- Client-related parties have very limited access
  IF user_role = 'client_related_party' THEN
    -- TODO: Implement proper relationship system
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for clients table

-- Admin: Full access to all clients
CREATE POLICY "Clients - Admin full access" ON clients
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

-- Attorney/Paralegal: Read/write access to assigned clients (for now, all active clients)
CREATE POLICY "Clients - Attorney/Paralegal read/write assigned" ON clients
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
  );

-- Assistant: Read-only access to assigned clients
CREATE POLICY "Clients - Assistant read assigned" ON clients
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'assistant'
    )
    AND deleted_at IS NULL
  );

-- Client: Read access to their own record only
CREATE POLICY "Clients - Client read own record" ON clients
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.uid = (auth.jwt() ->> 'sub')::UUID 
      AND up.role = 'client'
      AND up.email = clients.email
    )
    AND deleted_at IS NULL
  );

-- RLS Policies for client_contacts table

-- Admin: Full access to all client contacts
CREATE POLICY "Client Contacts - Admin full access" ON client_contacts
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

-- Attorney/Paralegal: Read/write access to contacts for assigned clients
CREATE POLICY "Client Contacts - Attorney/Paralegal read/write for assigned clients" ON client_contacts
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_client_access(client_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_client_access(client_id)
  );

-- Assistant: Read-only access to contacts for assigned clients
CREATE POLICY "Client Contacts - Assistant read for assigned clients" ON client_contacts
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'assistant'
    )
    AND user_has_client_access(client_id)
    AND deleted_at IS NULL
  );

-- Client: Read access to their own client contacts
CREATE POLICY "Client Contacts - Client read own contacts" ON client_contacts
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN clients c ON c.email = up.email
      WHERE up.uid = (auth.jwt() ->> 'sub')::UUID 
      AND up.role = 'client'
      AND c.id = client_contacts.client_id
    )
    AND deleted_at IS NULL
  );