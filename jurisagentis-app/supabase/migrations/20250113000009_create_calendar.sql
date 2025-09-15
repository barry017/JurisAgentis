-- Create calendar and event management tables for legal practice

-- Calendar events table for all scheduled items
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event identification
    title VARCHAR(500) NOT NULL,
    description TEXT,
    event_type VARCHAR(100) NOT NULL, -- 'court_date', 'deadline', 'client_meeting', 'internal_meeting', 'task_due', 'reminder', 'personal'
    event_category VARCHAR(100) NOT NULL, -- 'court', 'client', 'administrative', 'deadline', 'personal'
    
    -- Timing
    start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    end_datetime TIMESTAMP WITH TIME ZONE,
    all_day BOOLEAN DEFAULT false,
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    
    -- Location and details
    location VARCHAR(500),
    location_type VARCHAR(50), -- 'courthouse', 'office', 'client_location', 'virtual', 'phone'
    virtual_meeting_url TEXT,
    virtual_meeting_id VARCHAR(100),
    room_or_courtroom VARCHAR(100),
    
    -- Legal practice specific fields
    matter_id UUID REFERENCES matters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    case_number VARCHAR(100),
    judge_name VARCHAR(200),
    court_name VARCHAR(200),
    hearing_type VARCHAR(100), -- 'motion', 'trial', 'status_conference', 'sentencing', etc.
    
    -- Deadline specific fields
    deadline_type VARCHAR(100), -- 'statute_of_limitations', 'discovery_cutoff', 'motion_deadline', 'filing_deadline'
    deadline_description TEXT,
    is_hard_deadline BOOLEAN DEFAULT true, -- Cannot be extended
    deadline_consequence TEXT, -- What happens if missed
    
    -- Recurrence
    is_recurring BOOLEAN DEFAULT false,
    recurrence_rule TEXT, -- RRULE format for recurring events
    recurrence_end_date DATE,
    parent_event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    -- Attendees and assignments
    organizer_id UUID REFERENCES user_profiles(uid),
    assigned_attorney UUID REFERENCES user_profiles(uid),
    assigned_paralegal UUID REFERENCES user_profiles(uid),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    
    -- Status and workflow
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'
    confirmation_required BOOLEAN DEFAULT false,
    confirmed_by UUID REFERENCES user_profiles(uid),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Preparation and notes
    preparation_time_minutes INTEGER DEFAULT 0, -- Time needed before event
    travel_time_minutes INTEGER DEFAULT 0,
    estimated_duration_minutes INTEGER,
    preparation_notes TEXT,
    pre_event_checklist TEXT[],
    post_event_notes TEXT,
    outcome_summary TEXT,
    
    -- Billing and time tracking
    billable BOOLEAN DEFAULT true,
    billable_rate DECIMAL(8,2),
    time_entry_id UUID REFERENCES time_entries(id),
    estimated_hours DECIMAL(4,2),
    actual_hours DECIMAL(4,2),
    
    -- Notifications and reminders
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_minutes_before INTEGER[] DEFAULT ARRAY[1440, 60, 15], -- 1 day, 1 hour, 15 minutes
    email_reminders BOOLEAN DEFAULT true,
    sms_reminders BOOLEAN DEFAULT false,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    
    -- Priority and importance
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent', 'critical'
    importance_level INTEGER DEFAULT 3, -- 1-5 scale
    conflict_with_existing BOOLEAN DEFAULT false,
    
    -- Document and file attachments
    related_documents UUID[], -- Array of document IDs
    attachment_paths TEXT[],
    reference_links TEXT[],
    
    -- External calendar integration
    external_calendar_id VARCHAR(100), -- Google/Outlook calendar ID
    external_event_id VARCHAR(200),
    sync_to_external BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    
    -- Privacy and visibility
    visibility VARCHAR(50) DEFAULT 'internal', -- 'public', 'internal', 'private', 'confidential'
    show_client_portal BOOLEAN DEFAULT false,
    client_can_reschedule BOOLEAN DEFAULT false,
    
    -- Custom fields for practice-specific data
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Event attendees/participants table
CREATE TABLE IF NOT EXISTS event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
    
    -- Attendee information
    attendee_type VARCHAR(50) NOT NULL, -- 'internal_staff', 'client', 'opposing_counsel', 'witness', 'expert', 'court_reporter', 'interpreter', 'other'
    
    -- Internal staff
    user_id UUID REFERENCES user_profiles(uid),
    
    -- External attendees
    name VARCHAR(200),
    email VARCHAR(320),
    phone VARCHAR(50),
    organization VARCHAR(200),
    title VARCHAR(100),
    
    -- Client/matter participants
    client_id UUID REFERENCES clients(id),
    client_contact_id UUID REFERENCES client_contacts(id),
    matter_participant_id UUID REFERENCES matter_participants(id),
    
    -- Attendance tracking
    attendance_status VARCHAR(50) DEFAULT 'invited', -- 'invited', 'accepted', 'declined', 'tentative', 'no_response'
    attendance_confirmed BOOLEAN DEFAULT false,
    actually_attended BOOLEAN,
    arrival_time TIMESTAMP WITH TIME ZONE,
    departure_time TIMESTAMP WITH TIME ZONE,
    no_show BOOLEAN DEFAULT false,
    
    -- Role and responsibilities
    role_in_event VARCHAR(100), -- 'presenter', 'witness', 'observer', 'decision_maker', 'support'
    required_attendee BOOLEAN DEFAULT true,
    preparation_required BOOLEAN DEFAULT false,
    preparation_notes TEXT,
    
    -- Communication
    invitation_sent BOOLEAN DEFAULT false,
    invitation_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    custom_instructions TEXT,
    
    -- Notes
    attendee_notes TEXT,
    internal_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Court calendar and rule tracking
CREATE TABLE IF NOT EXISTS court_calendars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Court identification
    court_name VARCHAR(200) NOT NULL,
    court_type VARCHAR(100) NOT NULL, -- 'federal', 'state', 'county', 'municipal', 'administrative'
    jurisdiction VARCHAR(100) NOT NULL,
    court_address TEXT,
    court_phone VARCHAR(50),
    court_website VARCHAR(200),
    
    -- Calendar rules and schedules
    court_timezone VARCHAR(50) DEFAULT 'America/New_York',
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '17:00',
    business_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Monday=1, Sunday=7
    
    -- Filing deadlines and rules
    default_response_days INTEGER DEFAULT 30,
    motion_deadline_days INTEGER DEFAULT 30,
    discovery_cutoff_days INTEGER DEFAULT 90,
    trial_readiness_days INTEGER DEFAULT 30,
    
    -- Electronic filing
    efiling_required BOOLEAN DEFAULT false,
    efiling_system VARCHAR(100),
    efiling_deadline_time TIME DEFAULT '23:59',
    paper_filing_allowed BOOLEAN DEFAULT true,
    
    -- Special rules and holidays
    observes_federal_holidays BOOLEAN DEFAULT true,
    observes_state_holidays BOOLEAN DEFAULT true,
    custom_holidays DATE[],
    filing_deadline_extends_on_holidays BOOLEAN DEFAULT true,
    
    -- Contact information
    clerk_name VARCHAR(200),
    clerk_email VARCHAR(320),
    clerk_phone VARCHAR(50),
    calendar_coordinator VARCHAR(200),
    
    -- Active status and notes
    is_active BOOLEAN DEFAULT true,
    special_instructions TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Deadline calculation rules and templates
CREATE TABLE IF NOT EXISTS deadline_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rule identification
    rule_name VARCHAR(200) NOT NULL,
    rule_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    jurisdiction VARCHAR(100) NOT NULL,
    court_type VARCHAR(100),
    practice_area VARCHAR(100),
    
    -- Triggering event
    trigger_event VARCHAR(100) NOT NULL, -- 'service_of_process', 'complaint_filed', 'motion_filed', 'discovery_request', etc.
    trigger_description TEXT,
    
    -- Deadline calculation
    deadline_days INTEGER NOT NULL,
    business_days_only BOOLEAN DEFAULT true,
    exclude_weekends BOOLEAN DEFAULT true,
    exclude_holidays BOOLEAN DEFAULT true,
    
    -- Special rules
    minimum_days INTEGER,
    maximum_days INTEGER,
    can_be_extended BOOLEAN DEFAULT true,
    automatic_extensions BOOLEAN DEFAULT false,
    extension_days INTEGER,
    
    -- Consequences
    consequence_level VARCHAR(50) DEFAULT 'serious', -- 'minor', 'moderate', 'serious', 'severe', 'case_ending'
    consequence_description TEXT,
    can_be_cured BOOLEAN DEFAULT false,
    cure_method TEXT,
    
    -- Notification settings
    default_reminder_days INTEGER[] DEFAULT ARRAY[30, 14, 7, 3, 1],
    urgent_reminder_days INTEGER[] DEFAULT ARRAY[3, 1],
    
    -- Rule source and authority
    statute_citation VARCHAR(200),
    rule_citation VARCHAR(200),
    case_law_citation VARCHAR(500),
    effective_date DATE,
    expiration_date DATE,
    
    -- Active status and usage
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    last_used_date DATE,
    
    -- Custom fields
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Holiday calendar for deadline calculations
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Holiday identification
    holiday_name VARCHAR(200) NOT NULL,
    holiday_type VARCHAR(50) NOT NULL, -- 'federal', 'state', 'local', 'court', 'custom'
    jurisdiction VARCHAR(100),
    
    -- Date information
    holiday_date DATE NOT NULL,
    observed_date DATE, -- When date falls on weekend
    year INTEGER NOT NULL,
    
    -- Recurrence (for annual holidays)
    is_recurring BOOLEAN DEFAULT true,
    recurrence_pattern VARCHAR(100), -- 'fixed_date', 'nth_weekday', 'last_weekday', 'floating'
    month_number INTEGER,
    day_number INTEGER,
    weekday_number INTEGER, -- 1=Monday, 7=Sunday
    week_of_month INTEGER, -- 1=first, -1=last
    
    -- Court impact
    affects_filing_deadlines BOOLEAN DEFAULT true,
    affects_court_sessions BOOLEAN DEFAULT true,
    court_closed BOOLEAN DEFAULT true,
    
    -- Active status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Calendar preferences and settings per user
CREATE TABLE IF NOT EXISTS calendar_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
    
    -- Display preferences
    default_view VARCHAR(50) DEFAULT 'week', -- 'day', 'week', 'month', 'agenda'
    start_time TIME DEFAULT '08:00',
    end_time TIME DEFAULT '18:00',
    time_format VARCHAR(10) DEFAULT '12h', -- '12h', '24h'
    
    -- Working hours and availability
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '17:00',
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    lunch_break_start TIME DEFAULT '12:00',
    lunch_break_end TIME DEFAULT '13:00',
    
    -- Time zones and locations
    default_timezone VARCHAR(50) DEFAULT 'America/New_York',
    office_location VARCHAR(200),
    travel_buffer_minutes INTEGER DEFAULT 30,
    
    -- Notification preferences
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    desktop_notifications BOOLEAN DEFAULT true,
    reminder_defaults INTEGER[] DEFAULT ARRAY[1440, 60, 15],
    
    -- Calendar integration
    sync_google_calendar BOOLEAN DEFAULT false,
    google_calendar_id VARCHAR(200),
    sync_outlook_calendar BOOLEAN DEFAULT false,
    outlook_calendar_id VARCHAR(200),
    two_way_sync BOOLEAN DEFAULT false,
    
    -- Event defaults
    default_meeting_duration INTEGER DEFAULT 60,
    default_location VARCHAR(200),
    auto_add_video_link BOOLEAN DEFAULT false,
    default_reminder_time INTEGER DEFAULT 15,
    
    -- Privacy and sharing
    share_availability BOOLEAN DEFAULT true,
    show_event_details VARCHAR(50) DEFAULT 'internal', -- 'public', 'internal', 'title_only', 'private'
    allow_external_booking BOOLEAN DEFAULT false,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_calendar_events_start_datetime ON calendar_events(start_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_end_datetime ON calendar_events(end_datetime) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_matter_id ON calendar_events(matter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_client_id ON calendar_events(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_event_type ON calendar_events(event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_assigned_attorney ON calendar_events(assigned_attorney) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_organizer_id ON calendar_events(organizer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_status ON calendar_events(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_priority ON calendar_events(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_calendar_events_reminder_due ON calendar_events(start_datetime, reminder_enabled) WHERE deleted_at IS NULL AND reminder_enabled = true;

CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_event_attendees_client_id ON event_attendees(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_event_attendees_attendance_status ON event_attendees(attendance_status);

CREATE INDEX idx_court_calendars_jurisdiction ON court_calendars(jurisdiction) WHERE is_active = true;
CREATE INDEX idx_court_calendars_court_type ON court_calendars(court_type) WHERE is_active = true;

CREATE INDEX idx_deadline_rules_trigger_event ON deadline_rules(trigger_event) WHERE is_active = true;
CREATE INDEX idx_deadline_rules_jurisdiction ON deadline_rules(jurisdiction) WHERE is_active = true;
CREATE INDEX idx_deadline_rules_practice_area ON deadline_rules(practice_area) WHERE is_active = true;

CREATE INDEX idx_holidays_date ON holidays(holiday_date, jurisdiction) WHERE is_active = true;
CREATE INDEX idx_holidays_year ON holidays(year, holiday_type) WHERE is_active = true;
CREATE INDEX idx_holidays_jurisdiction ON holidays(jurisdiction) WHERE is_active = true;

CREATE INDEX idx_calendar_preferences_user_id ON calendar_preferences(user_id);

-- Function to calculate business days between dates excluding holidays
CREATE OR REPLACE FUNCTION calculate_business_days(
    start_date DATE,
    end_date DATE,
    jurisdiction_param VARCHAR DEFAULT 'federal',
    exclude_holidays BOOLEAN DEFAULT true
)
RETURNS INTEGER AS $$
DECLARE
    business_days INTEGER := 0;
    current_date DATE := start_date;
    holiday_dates DATE[];
BEGIN
    -- Get applicable holidays if excluding them
    IF exclude_holidays THEN
        SELECT ARRAY_AGG(holiday_date) 
        INTO holiday_dates
        FROM holidays 
        WHERE holiday_date BETWEEN start_date AND end_date
        AND (jurisdiction = jurisdiction_param OR jurisdiction = 'federal')
        AND is_active = true;
    END IF;
    
    -- Count business days
    WHILE current_date <= end_date LOOP
        -- Check if it's a weekday (Monday=1, Sunday=7)
        IF EXTRACT(DOW FROM current_date) BETWEEN 1 AND 5 THEN
            -- Check if it's not a holiday
            IF NOT exclude_holidays OR holiday_dates IS NULL OR NOT (current_date = ANY(holiday_dates)) THEN
                business_days := business_days + 1;
            END IF;
        END IF;
        current_date := current_date + INTERVAL '1 day';
    END LOOP;
    
    RETURN business_days;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate deadline date
CREATE OR REPLACE FUNCTION calculate_deadline_date(
    trigger_date DATE,
    deadline_days INTEGER,
    business_days_only BOOLEAN DEFAULT true,
    jurisdiction_param VARCHAR DEFAULT 'federal'
)
RETURNS DATE AS $$
DECLARE
    deadline_date DATE;
    days_added INTEGER := 0;
    current_date DATE := trigger_date;
    holiday_dates DATE[];
BEGIN
    -- Get applicable holidays
    SELECT ARRAY_AGG(holiday_date) 
    INTO holiday_dates
    FROM holidays 
    WHERE holiday_date >= trigger_date
    AND (jurisdiction = jurisdiction_param OR jurisdiction = 'federal')
    AND is_active = true;
    
    WHILE days_added < deadline_days LOOP
        current_date := current_date + INTERVAL '1 day';
        
        IF business_days_only THEN
            -- Only count weekdays
            IF EXTRACT(DOW FROM current_date) BETWEEN 1 AND 5 THEN
                -- Check if it's not a holiday
                IF holiday_dates IS NULL OR NOT (current_date = ANY(holiday_dates)) THEN
                    days_added := days_added + 1;
                END IF;
            END IF;
        ELSE
            -- Count all days except holidays
            IF holiday_dates IS NULL OR NOT (current_date = ANY(holiday_dates)) THEN
                days_added := days_added + 1;
            END IF;
        END IF;
    END LOOP;
    
    RETURN current_date;
END;
$$ LANGUAGE plpgsql;

-- Function to check for calendar conflicts
CREATE OR REPLACE FUNCTION check_calendar_conflicts(
    event_start TIMESTAMP WITH TIME ZONE,
    event_end TIMESTAMP WITH TIME ZONE,
    attendee_user_ids UUID[],
    exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
    conflict_event_id UUID,
    conflict_title VARCHAR,
    conflict_start TIMESTAMP WITH TIME ZONE,
    conflict_end TIMESTAMP WITH TIME ZONE,
    conflicted_attendee_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.start_datetime,
        ce.end_datetime,
        ea.user_id
    FROM calendar_events ce
    JOIN event_attendees ea ON ce.id = ea.event_id
    WHERE ce.deleted_at IS NULL
    AND ce.status IN ('scheduled', 'confirmed')
    AND ea.user_id = ANY(attendee_user_ids)
    AND ea.attendance_status NOT IN ('declined', 'no_response')
    AND (exclude_event_id IS NULL OR ce.id != exclude_event_id)
    AND (
        (ce.start_datetime <= event_start AND ce.end_datetime > event_start) OR
        (ce.start_datetime < event_end AND ce.end_datetime >= event_end) OR
        (ce.start_datetime >= event_start AND ce.end_datetime <= event_end)
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update event reminders
CREATE OR REPLACE FUNCTION update_event_reminders()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset reminder sent flag when event time changes
    IF OLD.start_datetime != NEW.start_datetime THEN
        NEW.last_reminder_sent := NULL;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for event reminder updates
CREATE TRIGGER trigger_update_event_reminders
    BEFORE UPDATE ON calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION update_event_reminders();

-- Populate federal holidays for current and next year
INSERT INTO holidays (holiday_name, holiday_type, jurisdiction, holiday_date, year, is_recurring, recurrence_pattern, month_number, day_number) VALUES
('New Year''s Day', 'federal', 'federal', '2025-01-01', 2025, true, 'fixed_date', 1, 1),
('Martin Luther King Jr. Day', 'federal', 'federal', '2025-01-20', 2025, true, 'nth_weekday', 1, 1, 3),
('Presidents'' Day', 'federal', 'federal', '2025-02-17', 2025, true, 'nth_weekday', 2, 1, 3),
('Memorial Day', 'federal', 'federal', '2025-05-26', 2025, true, 'last_weekday', 5, 1, -1),
('Independence Day', 'federal', 'federal', '2025-07-04', 2025, true, 'fixed_date', 7, 4),
('Labor Day', 'federal', 'federal', '2025-09-01', 2025, true, 'nth_weekday', 9, 1, 1),
('Columbus Day', 'federal', 'federal', '2025-10-13', 2025, true, 'nth_weekday', 10, 1, 2),
('Veterans Day', 'federal', 'federal', '2025-11-11', 2025, true, 'fixed_date', 11, 11),
('Thanksgiving Day', 'federal', 'federal', '2025-11-27', 2025, true, 'nth_weekday', 11, 4, 4),
('Christmas Day', 'federal', 'federal', '2025-12-25', 2025, true, 'fixed_date', 12, 25)
ON CONFLICT (rule_code) DO NOTHING;