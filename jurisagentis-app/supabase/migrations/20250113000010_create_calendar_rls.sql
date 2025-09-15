-- Enable Row Level Security on calendar tables
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Calendar Events - Admin full access" ON calendar_events;
DROP POLICY IF EXISTS "Calendar Events - User read/write own and assigned" ON calendar_events;
DROP POLICY IF EXISTS "Calendar Events - Attorney/Paralegal read/write matter events" ON calendar_events;
DROP POLICY IF EXISTS "Calendar Events - Assistant read assigned events" ON calendar_events;
DROP POLICY IF EXISTS "Calendar Events - Client read own events" ON calendar_events;

DROP POLICY IF EXISTS "Event Attendees - Same access as event" ON event_attendees;
DROP POLICY IF EXISTS "Court Calendars - All authenticated users read" ON court_calendars;
DROP POLICY IF EXISTS "Court Calendars - Admin/Attorney full access" ON court_calendars;
DROP POLICY IF EXISTS "Deadline Rules - All authenticated users read" ON deadline_rules;
DROP POLICY IF EXISTS "Deadline Rules - Admin/Attorney full access" ON deadline_rules;
DROP POLICY IF EXISTS "Holidays - All authenticated users read" ON holidays;
DROP POLICY IF EXISTS "Holidays - Admin full access" ON holidays;
DROP POLICY IF EXISTS "Calendar Preferences - User own preferences" ON calendar_preferences;

-- Helper function to check if user has access to a calendar event
CREATE OR REPLACE FUNCTION user_has_calendar_access(event_id_param UUID, access_level TEXT DEFAULT 'read')
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
  event_matter_id UUID;
  event_client_id UUID;
  event_organizer_id UUID;
  event_assigned_attorney UUID;
  event_assigned_paralegal UUID;
  event_visibility TEXT;
BEGIN
  -- Get current user info
  SELECT auth.jwt() ->> 'sub' INTO user_id;
  SELECT role FROM user_profiles WHERE uid = user_id::UUID INTO user_role;
  
  -- Get event details
  SELECT matter_id, client_id, organizer_id, assigned_attorney, assigned_paralegal, visibility
  FROM calendar_events 
  WHERE id = event_id_param AND deleted_at IS NULL
  INTO event_matter_id, event_client_id, event_organizer_id, event_assigned_attorney, event_assigned_paralegal, event_visibility;
  
  -- Admin has access to all events
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is organizer, assigned attorney, or assigned paralegal
  IF user_id::UUID IN (event_organizer_id, event_assigned_attorney, event_assigned_paralegal) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is an attendee
  IF EXISTS (
    SELECT 1 FROM event_attendees 
    WHERE event_id = event_id_param AND user_id = user_id::UUID
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Attorneys and paralegals have access to events for matters/clients they can access
  IF user_role IN ('associate_attorney', 'paralegal') THEN
    -- Check matter access if event is tied to a matter
    IF event_matter_id IS NOT NULL THEN
      RETURN user_has_matter_access(event_matter_id);
    END IF;
    
    -- Check client access if event is tied to a client
    IF event_client_id IS NOT NULL THEN
      RETURN user_has_client_access(event_client_id);
    END IF;
    
    -- If no specific client/matter and event is internal/public, allow access
    IF event_visibility IN ('internal', 'public') THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Assistants have read access to events for matters/clients they can access
  IF user_role = 'assistant' THEN
    -- Only read access for assistants
    IF access_level != 'read' THEN
      RETURN FALSE;
    END IF;
    
    -- Check matter access if event is tied to a matter
    IF event_matter_id IS NOT NULL THEN
      RETURN user_has_matter_access(event_matter_id);
    END IF;
    
    -- Check client access if event is tied to a client
    IF event_client_id IS NOT NULL THEN
      RETURN user_has_client_access(event_client_id);
    END IF;
    
    -- If no specific client/matter and event is internal/public, allow read access
    IF event_visibility IN ('internal', 'public') THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Clients can see events where they are involved (non-confidential only)
  IF user_role = 'client' THEN
    -- Only read access for clients
    IF access_level != 'read' THEN
      RETURN FALSE;
    END IF;
    
    -- Cannot see confidential or private events
    IF event_visibility IN ('confidential', 'private') THEN
      RETURN FALSE;
    END IF;
    
    -- Can see their own client events
    IF event_client_id IS NOT NULL THEN
      RETURN EXISTS (
        SELECT 1 FROM clients c
        JOIN user_profiles up ON c.email = up.email
        WHERE c.id = event_client_id 
        AND up.uid = user_id::UUID
        AND up.role = 'client'
        AND c.deleted_at IS NULL
      );
    END IF;
    
    -- Can see events they're explicitly invited to
    IF EXISTS (
      SELECT 1 FROM event_attendees ea
      JOIN clients c ON ea.client_id = c.id
      JOIN user_profiles up ON c.email = up.email
      WHERE ea.event_id = event_id_param
      AND up.uid = user_id::UUID
      AND up.role = 'client'
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for calendar_events table

-- Admin: Full access to all calendar events
CREATE POLICY "Calendar Events - Admin full access" ON calendar_events
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'admin'
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'admin'
    )
  );

-- Users: Read/write access to their own events and events they're assigned to
CREATE POLICY "Calendar Events - User read/write own and assigned" ON calendar_events
  FOR ALL 
  TO authenticated
  USING (
    (
      organizer_id = (auth.jwt() ->> 'sub')::UUID OR
      assigned_attorney = (auth.jwt() ->> 'sub')::UUID OR
      assigned_paralegal = (auth.jwt() ->> 'sub')::UUID OR
      created_by = (auth.jwt() ->> 'sub')::UUID OR
      EXISTS (
        SELECT 1 FROM event_attendees 
        WHERE event_id = calendar_events.id 
        AND user_id = (auth.jwt() ->> 'sub')::UUID
      )
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    organizer_id = (auth.jwt() ->> 'sub')::UUID OR
    assigned_attorney = (auth.jwt() ->> 'sub')::UUID OR
    assigned_paralegal = (auth.jwt() ->> 'sub')::UUID OR
    created_by = (auth.jwt() ->> 'sub')::UUID
  );

-- Attorney/Paralegal: Read/write access to events for matters they can access
CREATE POLICY "Calendar Events - Attorney/Paralegal read/write matter events" ON calendar_events
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_calendar_access(id, 'write')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('associate_attorney', 'paralegal')
    )
    AND user_has_calendar_access(id, 'write')
  );

-- Assistant: Read-only access to events they can access
CREATE POLICY "Calendar Events - Assistant read assigned events" ON calendar_events
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'assistant'
    )
    AND user_has_calendar_access(id, 'read')
    AND deleted_at IS NULL
  );

-- Client: Read access to their own events (non-confidential)
CREATE POLICY "Calendar Events - Client read own events" ON calendar_events
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'client'
    )
    AND user_has_calendar_access(id, 'read')
    AND visibility NOT IN ('confidential', 'private')
    AND show_client_portal = true
    AND deleted_at IS NULL
  );

-- RLS Policies for event_attendees table

-- Same access as parent event
CREATE POLICY "Event Attendees - Same access as event" ON event_attendees
  FOR ALL 
  TO authenticated
  USING (
    user_has_calendar_access(event_id, 'read')
  )
  WITH CHECK (
    user_has_calendar_access(event_id, 'write')
  );

-- RLS Policies for court_calendars table

-- All authenticated users: Read access to court calendars
CREATE POLICY "Court Calendars - All authenticated users read" ON court_calendars
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Admin/Attorney: Full access to court calendars
CREATE POLICY "Court Calendars - Admin/Attorney full access" ON court_calendars
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney')
    )
  );

-- RLS Policies for deadline_rules table

-- All authenticated users: Read access to active deadline rules
CREATE POLICY "Deadline Rules - All authenticated users read" ON deadline_rules
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Admin/Attorney: Full access to deadline rules
CREATE POLICY "Deadline Rules - Admin/Attorney full access" ON deadline_rules
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney')
    )
  );

-- RLS Policies for holidays table

-- All authenticated users: Read access to holidays
CREATE POLICY "Holidays - All authenticated users read" ON holidays
  FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- Admin: Full access to holidays
CREATE POLICY "Holidays - Admin full access" ON holidays
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

-- RLS Policies for calendar_preferences table

-- Users: Access to their own calendar preferences only
CREATE POLICY "Calendar Preferences - User own preferences" ON calendar_preferences
  FOR ALL 
  TO authenticated
  USING (user_id = (auth.jwt() ->> 'sub')::UUID)
  WITH CHECK (user_id = (auth.jwt() ->> 'sub')::UUID);

-- Additional security functions

-- Function to check if user can schedule events for others
CREATE OR REPLACE FUNCTION user_can_schedule_for_others()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role FROM user_profiles 
  WHERE uid = (auth.jwt() ->> 'sub')::UUID 
  INTO user_role;
  
  -- Admin and attorneys can schedule events for others
  RETURN user_role IN ('admin', 'associate_attorney');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access court calendars
CREATE OR REPLACE FUNCTION user_can_access_court_calendars()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role FROM user_profiles 
  WHERE uid = (auth.jwt() ->> 'sub')::UUID 
  INTO user_role;
  
  -- All legal staff can access court calendars
  RETURN user_role IN ('admin', 'associate_attorney', 'paralegal', 'assistant');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create deadlines
CREATE OR REPLACE FUNCTION user_can_create_deadlines()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role FROM user_profiles 
  WHERE uid = (auth.jwt() ->> 'sub')::UUID 
  INTO user_role;
  
  -- Admin, attorneys, and paralegals can create deadlines
  RETURN user_role IN ('admin', 'associate_attorney', 'paralegal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;