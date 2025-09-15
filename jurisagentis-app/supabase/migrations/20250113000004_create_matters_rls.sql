-- Enable Row Level Security on matters and related tables
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Matters - Admin full access" ON matters;
DROP POLICY IF EXISTS "Matters - Attorney/Paralegal read/write assigned" ON matters;
DROP POLICY IF EXISTS "Matters - Assistant read assigned" ON matters;
DROP POLICY IF EXISTS "Matters - Client read own matters" ON matters;

DROP POLICY IF EXISTS "Matter Tasks - Admin full access" ON matter_tasks;
DROP POLICY IF EXISTS "Matter Tasks - Attorney/Paralegal read/write for assigned matters" ON matter_tasks;
DROP POLICY IF EXISTS "Matter Tasks - Assistant read for assigned matters" ON matter_tasks;
DROP POLICY IF EXISTS "Matter Tasks - Assigned user read/write own tasks" ON matter_tasks;

DROP POLICY IF EXISTS "Matter Participants - Admin full access" ON matter_participants;
DROP POLICY IF EXISTS "Matter Participants - Attorney/Paralegal read/write for assigned matters" ON matter_participants;
DROP POLICY IF EXISTS "Matter Participants - Assistant read for assigned matters" ON matter_participants;

-- Helper function to check if user has access to a matter
CREATE OR REPLACE FUNCTION user_has_matter_access(matter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get current user info
  SELECT auth.jwt() ->> 'sub' INTO user_id;
  SELECT role FROM user_profiles WHERE uid = user_id::UUID INTO user_role;
  
  -- Admin has access to all matters
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Attorneys and paralegals have access to matters they are assigned to or involved with
  IF user_role IN ('associate_attorney', 'paralegal') THEN
    RETURN EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = matter_id 
      AND m.deleted_at IS NULL
      AND (
        m.responsible_attorney = user_id::UUID OR
        m.assisting_paralegal = user_id::UUID OR
        m.originating_attorney = user_id::UUID OR
        m.created_by = user_id::UUID OR
        -- Also check if they have access to the client
        user_has_client_access(m.client_id)
      )
    );
  END IF;
  
  -- Assistants have read access to matters for clients they can access
  IF user_role = 'assistant' THEN
    RETURN EXISTS (
      SELECT 1 FROM matters m
      WHERE m.id = matter_id 
      AND m.deleted_at IS NULL
      AND user_has_client_access(m.client_id)
    );
  END IF;
  
  -- Clients can see matters where they are the client
  IF user_role = 'client' THEN
    RETURN EXISTS (
      SELECT 1 FROM matters m
      JOIN clients c ON m.client_id = c.id
      JOIN user_profiles up ON c.email = up.email
      WHERE m.id = matter_id 
      AND up.uid = user_id::UUID
      AND up.role = 'client'
      AND m.deleted_at IS NULL
      AND c.deleted_at IS NULL
    );
  END IF;
  
  -- Client-related parties have very limited access
  IF user_role = 'client_related_party' THEN
    -- TODO: Implement proper relationship-based access
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for matters table

-- Admin: Full access to all matters
CREATE POLICY "Matters - Admin full access" ON matters
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

-- Attorney/Paralegal: Read/write access to assigned matters
CREATE POLICY "Matters - Attorney/Paralegal read/write assigned" ON matters
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND (
      responsible_attorney = (auth.jwt() ->> 'sub')::UUID OR
      assisting_paralegal = (auth.jwt() ->> 'sub')::UUID OR
      originating_attorney = (auth.jwt() ->> 'sub')::UUID OR
      created_by = (auth.jwt() ->> 'sub')::UUID OR
      user_has_client_access(client_id)
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

-- Assistant: Read-only access to assigned matters
CREATE POLICY "Matters - Assistant read assigned" ON matters
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

-- Client: Read access to their own matters only
CREATE POLICY "Matters - Client read own matters" ON matters
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN clients c ON c.email = up.email
      WHERE up.uid = (auth.jwt() ->> 'sub')::UUID 
      AND up.role = 'client'
      AND c.id = matters.client_id
    )
    AND deleted_at IS NULL
  );

-- RLS Policies for matter_tasks table

-- Admin: Full access to all matter tasks
CREATE POLICY "Matter Tasks - Admin full access" ON matter_tasks
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

-- Attorney/Paralegal: Read/write access to tasks for matters they can access
CREATE POLICY "Matter Tasks - Attorney/Paralegal read/write for assigned matters" ON matter_tasks
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_matter_access(matter_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_matter_access(matter_id)
  );

-- Assistant: Read-only access to tasks for matters they can access
CREATE POLICY "Matter Tasks - Assistant read for assigned matters" ON matter_tasks
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'assistant'
    )
    AND user_has_matter_access(matter_id)
    AND deleted_at IS NULL
  );

-- All users: Read/write access to tasks specifically assigned to them
CREATE POLICY "Matter Tasks - Assigned user read/write own tasks" ON matter_tasks
  FOR ALL 
  TO authenticated
  USING (
    assigned_to = (auth.jwt() ->> 'sub')::UUID
    AND user_has_matter_access(matter_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    assigned_to = (auth.jwt() ->> 'sub')::UUID
    AND user_has_matter_access(matter_id)
  );

-- RLS Policies for matter_participants table

-- Admin: Full access to all matter participants
CREATE POLICY "Matter Participants - Admin full access" ON matter_participants
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

-- Attorney/Paralegal: Read/write access to participants for matters they can access
CREATE POLICY "Matter Participants - Attorney/Paralegal read/write for assigned matters" ON matter_participants
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_matter_access(matter_id)
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_matter_access(matter_id)
  );

-- Assistant: Read-only access to participants for matters they can access
CREATE POLICY "Matter Participants - Assistant read for assigned matters" ON matter_participants
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'assistant'
    )
    AND user_has_matter_access(matter_id)
    AND deleted_at IS NULL
  );