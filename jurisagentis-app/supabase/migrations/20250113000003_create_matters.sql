-- Create matters table for legal case/matter management
CREATE TABLE IF NOT EXISTS matters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Matter Information
  matter_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  matter_type VARCHAR(100) NOT NULL, -- e.g., 'estate_planning', 'business_law', 'litigation'
  practice_area VARCHAR(100) NOT NULL, -- e.g., 'trusts', 'wills', 'llc', 'contracts'
  
  -- Client Relationship
  client_id UUID NOT NULL REFERENCES clients(id),
  
  -- Matter Status and Lifecycle
  status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (
    status IN ('new', 'active', 'on_hold', 'pending_client', 'pending_court', 'review', 'completed', 'closed', 'cancelled')
  ),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),
  
  -- Important Dates
  date_opened DATE NOT NULL DEFAULT CURRENT_DATE,
  date_closed DATE,
  statute_of_limitations DATE,
  next_review_date DATE,
  
  -- Court and Legal Information
  court_name VARCHAR(255),
  case_number VARCHAR(100),
  judge_name VARCHAR(255),
  opposing_counsel VARCHAR(255),
  opposing_party VARCHAR(255),
  
  -- Financial Information
  hourly_rate DECIMAL(10,2),
  flat_fee DECIMAL(12,2),
  retainer_amount DECIMAL(12,2),
  billing_method VARCHAR(50) DEFAULT 'hourly' CHECK (
    billing_method IN ('hourly', 'flat_fee', 'contingency', 'pro_bono', 'hybrid')
  ),
  
  -- Assignment and Responsibility
  responsible_attorney UUID REFERENCES user_profiles(uid),
  assisting_paralegal UUID REFERENCES user_profiles(uid),
  originating_attorney UUID REFERENCES user_profiles(uid), -- For referrals/credits
  
  -- Matter Details
  complexity_level INTEGER CHECK (complexity_level >= 1 AND complexity_level <= 5),
  estimated_hours DECIMAL(8,2),
  actual_hours DECIMAL(8,2) DEFAULT 0,
  
  -- Organization and Categorization
  tags TEXT[], -- Array of tags
  keywords TEXT[], -- Array of searchable keywords
  internal_notes TEXT, -- Private notes for staff only
  client_notes TEXT, -- Notes visible to client
  
  -- Document and File Management
  matter_folder_path VARCHAR(500), -- Path to matter documents
  
  -- Compliance and Tracking
  conflict_cleared BOOLEAN DEFAULT false,
  conflict_cleared_date DATE,
  conflict_cleared_by UUID REFERENCES user_profiles(uid),
  
  -- Custom Fields for Different Practice Areas
  custom_fields JSONB, -- Flexible storage for practice-specific fields
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES user_profiles(uid),
  updated_by UUID NOT NULL REFERENCES user_profiles(uid),
  
  -- Soft delete
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES user_profiles(uid)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_matters_matter_number ON matters(matter_number);
CREATE INDEX IF NOT EXISTS idx_matters_client_id ON matters(client_id);
CREATE INDEX IF NOT EXISTS idx_matters_status ON matters(status);
CREATE INDEX IF NOT EXISTS idx_matters_practice_area ON matters(practice_area);
CREATE INDEX IF NOT EXISTS idx_matters_responsible_attorney ON matters(responsible_attorney);
CREATE INDEX IF NOT EXISTS idx_matters_date_opened ON matters(date_opened);
CREATE INDEX IF NOT EXISTS idx_matters_next_review_date ON matters(next_review_date) WHERE next_review_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matters_tags ON matters USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_matters_keywords ON matters USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_matters_active ON matters(status, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_matters_custom_fields ON matters USING GIN(custom_fields);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_matters_client_status ON matters(client_id, status);
CREATE INDEX IF NOT EXISTS idx_matters_attorney_status ON matters(responsible_attorney, status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_matters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_matters_updated_at
  BEFORE UPDATE ON matters
  FOR EACH ROW
  EXECUTE FUNCTION update_matters_updated_at();

-- Create matter tasks table for task management within matters
CREATE TABLE IF NOT EXISTS matter_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  
  -- Task Information
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(100), -- e.g., 'research', 'document_draft', 'court_filing', 'client_meeting'
  
  -- Status and Priority
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled', 'on_hold')
  ),
  priority VARCHAR(20) DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),
  
  -- Assignment
  assigned_to UUID REFERENCES user_profiles(uid),
  created_by UUID NOT NULL REFERENCES user_profiles(uid),
  
  -- Dates and Time Tracking
  due_date DATE,
  start_date DATE,
  completed_date DATE,
  estimated_hours DECIMAL(6,2),
  actual_hours DECIMAL(6,2) DEFAULT 0,
  
  -- Dependencies and Workflow
  prerequisite_task_ids UUID[], -- Array of task IDs that must be completed first
  blocks_task_ids UUID[], -- Array of task IDs that this task blocks
  
  -- Billing
  billable BOOLEAN DEFAULT true,
  billed BOOLEAN DEFAULT false,
  
  -- Notes and Documentation
  notes TEXT,
  completion_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Create indexes for matter tasks
CREATE INDEX IF NOT EXISTS idx_matter_tasks_matter_id ON matter_tasks(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_tasks_assigned_to ON matter_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_matter_tasks_status ON matter_tasks(status);
CREATE INDEX IF NOT EXISTS idx_matter_tasks_due_date ON matter_tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matter_tasks_priority ON matter_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_matter_tasks_active ON matter_tasks(status, deleted_at) WHERE deleted_at IS NULL;

-- Create trigger for matter_tasks updated_at
CREATE TRIGGER trigger_matter_tasks_updated_at
  BEFORE UPDATE ON matter_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_matters_updated_at();

-- Create matter participants table for tracking all parties involved
CREATE TABLE IF NOT EXISTS matter_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  
  -- Participant Information
  participant_type VARCHAR(50) NOT NULL CHECK (
    participant_type IN ('client', 'client_contact', 'opposing_party', 'opposing_counsel', 
                         'witness', 'expert_witness', 'court_reporter', 'mediator', 
                         'arbitrator', 'judge', 'co_counsel', 'other')
  ),
  
  -- Person Details (if not linked to existing records)
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  title VARCHAR(100),
  company VARCHAR(255),
  
  -- Contact Information
  email VARCHAR(255),
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  
  -- Relationships
  client_id UUID REFERENCES clients(id), -- If this participant is a client
  client_contact_id UUID REFERENCES client_contacts(id), -- If this is a client contact
  
  -- Role and Status
  role_description TEXT,
  active BOOLEAN DEFAULT true,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES user_profiles(uid),
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Create indexes for matter participants
CREATE INDEX IF NOT EXISTS idx_matter_participants_matter_id ON matter_participants(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_participants_type ON matter_participants(participant_type);
CREATE INDEX IF NOT EXISTS idx_matter_participants_client_id ON matter_participants(client_id);
CREATE INDEX IF NOT EXISTS idx_matter_participants_active ON matter_participants(matter_id, active) WHERE active = true;

-- Create trigger for matter_participants updated_at
CREATE TRIGGER trigger_matter_participants_updated_at
  BEFORE UPDATE ON matter_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_matters_updated_at();

-- Create function to generate matter number
CREATE OR REPLACE FUNCTION generate_matter_number(practice_area_code TEXT DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  year_code TEXT;
  area_code TEXT;
  sequence_num INTEGER;
  matter_num TEXT;
BEGIN
  -- Get current year (last 2 digits)
  year_code := TO_CHAR(CURRENT_DATE, 'YY');
  
  -- Use provided practice area code or default to 'GEN'
  area_code := COALESCE(practice_area_code, 'GEN');
  
  -- Get next sequence number for this year and practice area
  SELECT COALESCE(MAX(
    CASE 
      WHEN matter_number ~ ('^' || year_code || '-' || area_code || '-[0-9]+$')
      THEN CAST(SPLIT_PART(matter_number, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM matters
  WHERE matter_number LIKE year_code || '-' || area_code || '-%';
  
  -- Format: YY-AREA-NNNN (e.g., 25-EST-0001, 25-LIT-0042)
  matter_num := year_code || '-' || area_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN matter_num;
END;
$$ LANGUAGE plpgsql;

-- Create function to get matter display name
CREATE OR REPLACE FUNCTION get_matter_display_name(matter_row matters)
RETURNS TEXT AS $$
BEGIN
  RETURN matter_row.matter_number || ': ' || 
         CASE 
           WHEN LENGTH(matter_row.title) > 50 
           THEN LEFT(matter_row.title, 47) || '...'
           ELSE matter_row.title
         END;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate matter age in days
CREATE OR REPLACE FUNCTION get_matter_age_days(matter_row matters)
RETURNS INTEGER AS $$
BEGIN
  RETURN CASE 
    WHEN matter_row.date_closed IS NOT NULL 
    THEN (matter_row.date_closed - matter_row.date_opened)::INTEGER
    ELSE (CURRENT_DATE - matter_row.date_opened)::INTEGER
  END;
END;
$$ LANGUAGE plpgsql;