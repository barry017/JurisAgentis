-- Create comprehensive workflow automation system for legal practice

-- Workflow templates table - defines reusable workflow patterns
CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Information
    template_name VARCHAR(500) NOT NULL,
    template_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Workflow Configuration
    category VARCHAR(100) NOT NULL, -- 'client_onboarding', 'matter_lifecycle', 'document_review', 'billing', 'deadline_tracking'
    practice_area VARCHAR(100),
    trigger_event VARCHAR(100) NOT NULL, -- 'client_created', 'matter_opened', 'document_uploaded', 'deadline_approaching'
    
    -- Template Definition (JSON workflow definition)
    workflow_definition JSONB NOT NULL,
    
    -- Execution Settings
    is_active BOOLEAN DEFAULT true,
    auto_execute BOOLEAN DEFAULT true, -- Execute automatically when triggered
    execution_priority INTEGER DEFAULT 3, -- 1-5 scale
    max_concurrent_executions INTEGER DEFAULT 10,
    
    -- Conditions for Execution
    execution_conditions JSONB, -- Complex conditions for when to run
    required_permissions TEXT[], -- Roles that can execute this workflow
    
    -- Usage Tracking
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Version Control
    version VARCHAR(20) DEFAULT '1.0',
    is_current_version BOOLEAN DEFAULT true,
    parent_template_id UUID REFERENCES workflow_templates(id),
    
    -- Template Management
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Workflow executions table - tracks individual workflow runs
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Execution Information
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    execution_name VARCHAR(500),
    
    -- Trigger Information
    triggered_by_event VARCHAR(100) NOT NULL,
    triggered_by_user UUID REFERENCES user_profiles(uid),
    trigger_data JSONB, -- Data that triggered the workflow
    
    -- Context Objects
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    matter_id UUID REFERENCES matters(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    
    -- Execution Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'cancelled', 'paused'
    current_step INTEGER DEFAULT 0,
    total_steps INTEGER,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Execution Results
    execution_results JSONB,
    error_message TEXT,
    error_details JSONB,
    
    -- Timing Information
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    
    -- Priority and Scheduling
    priority INTEGER DEFAULT 3,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow steps table - individual steps within workflow executions
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Step Information
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_name VARCHAR(500) NOT NULL,
    step_type VARCHAR(100) NOT NULL, -- 'create_task', 'send_email', 'generate_document', 'schedule_event', 'wait_for_approval', 'conditional', 'custom_action'
    
    -- Step Configuration
    step_config JSONB NOT NULL, -- Configuration specific to step type
    input_data JSONB,
    output_data JSONB,
    
    -- Step Dependencies
    depends_on_steps INTEGER[], -- Array of step orders this step depends on
    parallel_group INTEGER, -- Steps in same group can run in parallel
    
    -- Execution Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped', 'cancelled'
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    
    -- Human Task Information (for approval steps, etc.)
    assigned_to UUID REFERENCES user_profiles(uid),
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES user_profiles(uid),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,
    
    -- Created timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow triggers table - defines what events can trigger workflows
CREATE TABLE IF NOT EXISTS workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trigger Information
    trigger_name VARCHAR(200) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL, -- 'database_event', 'schedule', 'webhook', 'manual', 'api_call'
    
    -- Trigger Configuration
    trigger_config JSONB NOT NULL,
    
    -- Associated Workflows
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    
    -- Trigger Conditions
    trigger_conditions JSONB, -- Conditions that must be met for trigger to fire
    
    -- Status and Tracking
    is_active BOOLEAN DEFAULT true,
    trigger_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Workflow variables table - stores variables used during workflow execution
CREATE TABLE IF NOT EXISTS workflow_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Variable Information
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    variable_name VARCHAR(200) NOT NULL,
    variable_type VARCHAR(50) NOT NULL, -- 'string', 'number', 'boolean', 'date', 'json', 'array'
    
    -- Variable Value
    variable_value JSONB,
    
    -- Variable Metadata
    is_input BOOLEAN DEFAULT false, -- Input to the workflow
    is_output BOOLEAN DEFAULT false, -- Output from the workflow
    is_sensitive BOOLEAN DEFAULT false, -- Should be encrypted/protected
    
    -- Variable Source
    created_by_step INTEGER, -- Step order that created this variable
    last_updated_by_step INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow approvals table - tracks approval steps in workflows
CREATE TABLE IF NOT EXISTS workflow_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Approval Information
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    
    -- Approval Request
    approval_type VARCHAR(100) NOT NULL, -- 'document_review', 'matter_approval', 'fee_approval', 'client_communication'
    approval_title VARCHAR(500) NOT NULL,
    approval_description TEXT,
    
    -- Approval Requirements
    required_approvers UUID[], -- Array of user IDs who must approve
    minimum_approvals INTEGER DEFAULT 1,
    allow_delegation BOOLEAN DEFAULT true,
    
    -- Approval Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'cancelled', 'expired'
    
    -- Approval Responses
    approvers_responded UUID[],
    approval_responses JSONB, -- Array of approval responses with reasons
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    
    -- Final Approval
    final_decision VARCHAR(50), -- 'approved', 'rejected'
    final_approver UUID REFERENCES user_profiles(uid),
    approval_notes TEXT
);

-- Workflow schedules table - for recurring and scheduled workflows
CREATE TABLE IF NOT EXISTS workflow_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Schedule Information
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    schedule_name VARCHAR(200) NOT NULL,
    
    -- Schedule Configuration
    schedule_type VARCHAR(50) NOT NULL, -- 'once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'cron'
    cron_expression VARCHAR(100), -- For complex schedules
    
    -- Schedule Timing
    start_date DATE NOT NULL,
    end_date DATE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    
    -- Schedule Status
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    
    -- Schedule Context
    default_context JSONB, -- Default variables for scheduled executions
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Create indexes for performance
CREATE INDEX idx_workflow_templates_active ON workflow_templates(is_active, category, practice_area) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_templates_trigger ON workflow_templates(trigger_event, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_templates_code ON workflow_templates(template_code);

CREATE INDEX idx_workflow_executions_status ON workflow_executions(status, created_at DESC);
CREATE INDEX idx_workflow_executions_template ON workflow_executions(workflow_template_id, status);
CREATE INDEX idx_workflow_executions_context ON workflow_executions(client_id, matter_id, document_id) WHERE client_id IS NOT NULL OR matter_id IS NOT NULL OR document_id IS NOT NULL;
CREATE INDEX idx_workflow_executions_scheduled ON workflow_executions(scheduled_for) WHERE scheduled_for IS NOT NULL AND status = 'pending';

CREATE INDEX idx_workflow_steps_execution ON workflow_steps(execution_id, step_order);
CREATE INDEX idx_workflow_steps_status ON workflow_steps(status, created_at DESC);
CREATE INDEX idx_workflow_steps_assigned ON workflow_steps(assigned_to, status) WHERE assigned_to IS NOT NULL;

CREATE INDEX idx_workflow_triggers_active ON workflow_triggers(is_active, trigger_type);
CREATE INDEX idx_workflow_triggers_template ON workflow_triggers(workflow_template_id, is_active);

CREATE INDEX idx_workflow_variables_execution ON workflow_variables(execution_id, variable_name);
CREATE INDEX idx_workflow_variables_type ON workflow_variables(variable_type, is_input, is_output);

CREATE INDEX idx_workflow_approvals_pending ON workflow_approvals(status, requested_at) WHERE status = 'pending';
CREATE INDEX idx_workflow_approvals_execution ON workflow_approvals(execution_id, status);

CREATE INDEX idx_workflow_schedules_active ON workflow_schedules(is_active, next_run_at) WHERE is_active = true;
CREATE INDEX idx_workflow_schedules_template ON workflow_schedules(workflow_template_id, is_active);

-- Enable Row Level Security
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_templates

-- Admins and attorneys can manage workflow templates
CREATE POLICY "Admins can manage all workflow templates" ON workflow_templates
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role = 'admin'
    )
    AND deleted_at IS NULL
  );

-- Users can view and use workflow templates
CREATE POLICY "Users can view workflow templates" ON workflow_templates
  FOR SELECT 
  TO authenticated
  USING (
    deleted_at IS NULL AND is_active = true AND (
      -- Created by them
      created_by = (auth.jwt() ->> 'sub')::UUID OR
      -- They have required permissions
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.uid = (auth.jwt() ->> 'sub')::UUID
        AND (required_permissions IS NULL OR up.role = ANY(required_permissions))
      )
    )
  );

-- RLS Policies for workflow_executions

-- Users can view executions they're involved with
CREATE POLICY "Users can view related workflow executions" ON workflow_executions
  FOR SELECT 
  TO authenticated
  USING (
    triggered_by_user = (auth.jwt() ->> 'sub')::UUID OR
    EXISTS (
      SELECT 1 FROM workflow_steps ws
      WHERE ws.execution_id = workflow_executions.id
      AND ws.assigned_to = (auth.jwt() ->> 'sub')::UUID
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.uid = (auth.jwt() ->> 'sub')::UUID
      AND up.role IN ('admin', 'associate_attorney')
    )
  );

-- Users can create workflow executions
CREATE POLICY "Users can create workflow executions" ON workflow_executions
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    triggered_by_user = (auth.jwt() ->> 'sub')::UUID
  );

-- Users can update executions they're involved with
CREATE POLICY "Users can update related workflow executions" ON workflow_executions
  FOR UPDATE 
  TO authenticated
  USING (
    triggered_by_user = (auth.jwt() ->> 'sub')::UUID OR
    EXISTS (
      SELECT 1 FROM workflow_steps ws
      WHERE ws.execution_id = workflow_executions.id
      AND ws.assigned_to = (auth.jwt() ->> 'sub')::UUID
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.uid = (auth.jwt() ->> 'sub')::UUID
      AND up.role IN ('admin', 'associate_attorney')
    )
  );

-- Similar policies for other workflow tables...
CREATE POLICY "Users can manage workflow steps" ON workflow_steps
  FOR ALL 
  TO authenticated
  USING (
    assigned_to = (auth.jwt() ->> 'sub')::UUID OR
    EXISTS (
      SELECT 1 FROM workflow_executions we
      WHERE we.id = workflow_steps.execution_id
      AND we.triggered_by_user = (auth.jwt() ->> 'sub')::UUID
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.uid = (auth.jwt() ->> 'sub')::UUID
      AND up.role IN ('admin', 'associate_attorney')
    )
  );

-- Workflow automation functions

-- Function to trigger workflow execution
CREATE OR REPLACE FUNCTION trigger_workflow_execution(
  template_code_param VARCHAR,
  trigger_event_param VARCHAR,
  context_data JSONB DEFAULT '{}'::JSONB,
  triggered_by_user_param UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  template_record workflow_templates%ROWTYPE;
  execution_id UUID;
BEGIN
  -- Get the workflow template
  SELECT * INTO template_record
  FROM workflow_templates
  WHERE template_code = template_code_param
    AND is_active = true
    AND is_current_version = true
    AND deleted_at IS NULL;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow template not found: %', template_code_param;
  END IF;
  
  -- Check if conditions are met (simplified)
  IF template_record.execution_conditions IS NOT NULL THEN
    -- TODO: Implement condition checking logic
    NULL;
  END IF;
  
  -- Create workflow execution
  INSERT INTO workflow_executions (
    workflow_template_id,
    execution_name,
    triggered_by_event,
    triggered_by_user,
    trigger_data,
    client_id,
    matter_id,
    document_id,
    status,
    total_steps,
    priority,
    max_retries
  )
  VALUES (
    template_record.id,
    template_record.template_name || ' - ' || NOW()::TEXT,
    trigger_event_param,
    triggered_by_user_param,
    context_data,
    (context_data->>'client_id')::UUID,
    (context_data->>'matter_id')::UUID,
    (context_data->>'document_id')::UUID,
    'pending',
    jsonb_array_length(template_record.workflow_definition->'steps'),
    template_record.execution_priority,
    3
  )
  RETURNING id INTO execution_id;
  
  -- Create workflow steps from template
  INSERT INTO workflow_steps (
    execution_id,
    step_order,
    step_name,
    step_type,
    step_config,
    depends_on_steps,
    parallel_group,
    requires_approval
  )
  SELECT 
    execution_id,
    (step_def->>'order')::INTEGER,
    step_def->>'name',
    step_def->>'type',
    step_def->'config',
    CASE 
      WHEN step_def->'depends_on' IS NOT NULL 
      THEN array(SELECT jsonb_array_elements_text(step_def->'depends_on'))::INTEGER[]
      ELSE NULL
    END,
    (step_def->>'parallel_group')::INTEGER,
    COALESCE((step_def->>'requires_approval')::BOOLEAN, false)
  FROM jsonb_array_elements(template_record.workflow_definition->'steps') AS step_def;
  
  -- Update template usage statistics
  UPDATE workflow_templates
  SET 
    execution_count = execution_count + 1,
    last_executed_at = NOW(),
    updated_at = NOW()
  WHERE id = template_record.id;
  
  RETURN execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process workflow steps
CREATE OR REPLACE FUNCTION process_workflow_step(step_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  step_record workflow_steps%ROWTYPE;
  execution_record workflow_executions%ROWTYPE;
  step_result BOOLEAN := false;
BEGIN
  -- Get step and execution records
  SELECT ws.* INTO step_record
  FROM workflow_steps ws
  WHERE ws.id = step_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Workflow step not found: %', step_id_param;
  END IF;
  
  SELECT we.* INTO execution_record
  FROM workflow_executions we
  WHERE we.id = step_record.execution_id;
  
  -- Update step status to running
  UPDATE workflow_steps
  SET 
    status = 'running',
    started_at = NOW()
  WHERE id = step_id_param;
  
  -- Process step based on type
  CASE step_record.step_type
    WHEN 'create_task' THEN
      -- Create a task in the matter_tasks table
      step_result := workflow_create_task(step_record, execution_record);
    WHEN 'send_email' THEN
      -- Send an email (would integrate with email service)
      step_result := workflow_send_email(step_record, execution_record);
    WHEN 'generate_document' THEN
      -- Generate a document from template
      step_result := workflow_generate_document(step_record, execution_record);
    WHEN 'schedule_event' THEN
      -- Schedule a calendar event
      step_result := workflow_schedule_event(step_record, execution_record);
    WHEN 'wait_for_approval' THEN
      -- Create an approval request
      step_result := workflow_create_approval(step_record, execution_record);
    ELSE
      -- Unknown step type
      step_result := false;
  END CASE;
  
  -- Update step status
  IF step_result THEN
    UPDATE workflow_steps
    SET 
      status = CASE 
        WHEN step_type = 'wait_for_approval' THEN 'running' -- Keep running until approved
        ELSE 'completed'
      END,
      completed_at = CASE 
        WHEN step_type = 'wait_for_approval' THEN NULL
        ELSE NOW()
      END,
      duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
    WHERE id = step_id_param;
  ELSE
    UPDATE workflow_steps
    SET 
      status = 'failed',
      completed_at = NOW(),
      duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
      error_message = 'Step processing failed'
    WHERE id = step_id_param;
  END IF;
  
  RETURN step_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper functions for workflow step processing (simplified implementations)

CREATE OR REPLACE FUNCTION workflow_create_task(
  step_record workflow_steps,
  execution_record workflow_executions
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Create task logic would go here
  -- Insert into matter_tasks table
  RETURN true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workflow_send_email(
  step_record workflow_steps,
  execution_record workflow_executions
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Email sending logic would go here
  -- Integration with email service
  RETURN true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workflow_generate_document(
  step_record workflow_steps,
  execution_record workflow_executions
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Document generation logic would go here
  -- Integration with document template system
  RETURN true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workflow_schedule_event(
  step_record workflow_steps,
  execution_record workflow_executions
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Calendar event creation logic would go here
  -- Insert into calendar_events table
  RETURN true;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION workflow_create_approval(
  step_record workflow_steps,
  execution_record workflow_executions
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Approval request creation logic would go here
  -- Insert into workflow_approvals table
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Insert some default workflow templates

-- Client Onboarding Workflow
INSERT INTO workflow_templates (
  template_name,
  template_code,
  description,
  category,
  practice_area,
  trigger_event,
  workflow_definition,
  created_by,
  updated_by
) VALUES (
  'New Client Onboarding',
  'CLIENT_ONBOARDING_001',
  'Automated workflow for new client onboarding process',
  'client_onboarding',
  'general',
  'client_created',
  '{
    "steps": [
      {
        "order": 1,
        "name": "Send Welcome Email",
        "type": "send_email",
        "config": {
          "template": "welcome_email",
          "to": "{{client.email}}",
          "subject": "Welcome to Our Practice"
        }
      },
      {
        "order": 2,
        "name": "Create Client Intake Task",
        "type": "create_task",
        "config": {
          "title": "Complete Client Intake for {{client.name}}",
          "assigned_to": "{{matter.lead_attorney}}",
          "due_days": 3,
          "priority": "high"
        }
      },
      {
        "order": 3,
        "name": "Schedule Initial Consultation",
        "type": "schedule_event",
        "depends_on": [2],
        "config": {
          "title": "Initial Consultation - {{client.name}}",
          "duration_minutes": 60,
          "event_type": "client_meeting"
        }
      },
      {
        "order": 4,
        "name": "Generate Engagement Letter",
        "type": "generate_document",
        "depends_on": [3],
        "config": {
          "template": "engagement_letter",
          "output_name": "{{client.name}} - Engagement Letter"
        }
      }
    ]
  }'::JSONB,
  (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1),
  (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

-- Estate Planning Matter Workflow
INSERT INTO workflow_templates (
  template_name,
  template_code,
  description,
  category,
  practice_area,
  trigger_event,
  workflow_definition,
  created_by,
  updated_by
) VALUES (
  'Estate Planning Matter Setup',
  'ESTATE_MATTER_001',
  'Automated workflow for new estate planning matters',
  'matter_lifecycle',
  'estate_planning',
  'matter_opened',
  '{
    "steps": [
      {
        "order": 1,
        "name": "Create Document Review Task",
        "type": "create_task",
        "config": {
          "title": "Review Client Documents for {{matter.title}}",
          "description": "Review all client-provided documents and financial information",
          "assigned_to": "{{matter.assigned_paralegal}}",
          "due_days": 5,
          "priority": "normal"
        }
      },
      {
        "order": 2,
        "name": "Schedule Asset Inventory Meeting",
        "type": "schedule_event",
        "depends_on": [1],
        "config": {
          "title": "Asset Inventory Discussion - {{client.name}}",
          "duration_minutes": 90,
          "event_type": "client_meeting",
          "location": "Conference Room A"
        }
      },
      {
        "order": 3,
        "name": "Attorney Review Required",
        "type": "wait_for_approval",
        "depends_on": [2],
        "requires_approval": true,
        "config": {
          "approval_type": "matter_approval",
          "title": "Estate Plan Strategy Approval",
          "required_approvers": ["{{matter.lead_attorney}}"],
          "due_days": 3
        }
      },
      {
        "order": 4,
        "name": "Generate Initial Estate Plan Draft",
        "type": "generate_document",
        "depends_on": [3],
        "config": {
          "template": "estate_plan_package",
          "output_name": "{{client.name}} - Estate Plan Draft"
        }
      }
    ]
  }'::JSONB,
  (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1),
  (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)
);

ON CONFLICT (template_code) DO NOTHING;