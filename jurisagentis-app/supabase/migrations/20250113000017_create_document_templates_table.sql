-- T030: Create document templates table for template management
-- Migration: Document Management System - Templates

BEGIN;

-- Create enum types for templates
CREATE TYPE template_status AS ENUM (
  'draft',
  'active',
  'deprecated',
  'archived'
);

CREATE TYPE field_type AS ENUM (
  'text',
  'number',
  'date',
  'boolean',
  'select',
  'multi_select',
  'email',
  'phone',
  'address',
  'currency',
  'percentage',
  'signature'
);

-- Create document_templates table
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  document_type document_type NOT NULL,
  practice_area VARCHAR(100),
  jurisdiction VARCHAR(100),
  
  -- Template file information
  template_file_path TEXT NOT NULL,
  template_file_name VARCHAR(255) NOT NULL,
  template_file_size BIGINT NOT NULL,
  template_version VARCHAR(50) DEFAULT '1.0',
  
  -- Template configuration
  field_definitions JSONB NOT NULL DEFAULT '[]', -- Array of field definitions
  required_fields TEXT[] DEFAULT '{}',
  conditional_logic JSONB DEFAULT '{}', -- Rules for conditional fields
  
  -- Usage and metadata
  status template_status NOT NULL DEFAULT 'draft',
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Preview and samples
  preview_image_path TEXT,
  sample_output_path TEXT,
  instructions TEXT,
  
  -- Version control
  is_latest_version BOOLEAN DEFAULT true,
  parent_template_id UUID REFERENCES document_templates(id),
  version_notes TEXT,
  
  -- Access control
  is_public BOOLEAN DEFAULT false,
  allowed_roles TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Audit fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id)
);

-- Create template_fields table for structured field definitions
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  
  -- Field definition
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type field_type NOT NULL,
  
  -- Field properties
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  placeholder_text VARCHAR(255),
  help_text TEXT,
  
  -- Validation rules
  validation_rules JSONB DEFAULT '{}', -- e.g., {"min_length": 5, "max_length": 100, "pattern": "regex"}
  
  -- Options for select fields
  field_options JSONB DEFAULT '[]', -- Array of options for select/multi_select
  
  -- Positioning and layout
  field_order INTEGER NOT NULL DEFAULT 0,
  field_group VARCHAR(100), -- For grouping related fields
  
  -- Conditional display
  display_conditions JSONB DEFAULT '{}', -- Conditions for showing this field
  
  -- Data source integration
  auto_populate_source VARCHAR(100), -- e.g., 'client_data', 'matter_data'
  auto_populate_field VARCHAR(100),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, field_name)
);

-- Create indexes
CREATE INDEX idx_document_templates_name ON document_templates(name);
CREATE INDEX idx_document_templates_document_type ON document_templates(document_type);
CREATE INDEX idx_document_templates_practice_area ON document_templates(practice_area);
CREATE INDEX idx_document_templates_status ON document_templates(status);
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_document_templates_tags ON document_templates USING GIN(tags);
CREATE INDEX idx_document_templates_usage_count ON document_templates(usage_count);
CREATE INDEX idx_document_templates_latest ON document_templates(is_latest_version) WHERE is_latest_version = true;

CREATE INDEX idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX idx_template_fields_order ON template_fields(template_id, field_order);
CREATE INDEX idx_template_fields_type ON template_fields(field_type);

-- Full-text search for templates
CREATE INDEX idx_document_templates_search ON document_templates USING GIN(
  to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(category, ''))
);

-- Row Level Security
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;

-- Policy: Public templates are visible to all authenticated users
CREATE POLICY document_templates_public_policy ON document_templates
  FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

-- Policy: Users can only modify their own templates
CREATE POLICY document_templates_owner_policy ON document_templates
  FOR ALL
  USING (created_by = auth.uid());

-- Policy: Template fields follow template access
CREATE POLICY template_fields_access_policy ON template_fields
  FOR ALL
  USING (
    template_id IN (
      SELECT id FROM document_templates 
      WHERE is_public = true OR created_by = auth.uid()
    )
  );

-- Update trigger for templates
CREATE OR REPLACE FUNCTION update_document_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_templates_updated_at_trigger
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_templates_updated_at();

-- Function to increment template usage
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE document_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_at = NOW()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate field definitions
CREATE OR REPLACE FUNCTION validate_template_fields(p_template_id UUID)
RETURNS JSONB AS $$
DECLARE
  validation_result JSONB;
  field_errors JSONB := '[]'::JSONB;
  field_record RECORD;
BEGIN
  -- Check for required fields
  FOR field_record IN 
    SELECT * FROM template_fields 
    WHERE template_id = p_template_id 
  LOOP
    -- Validate field name format
    IF field_record.field_name !~ '^[a-zA-Z][a-zA-Z0-9_]*$' THEN
      field_errors := field_errors || jsonb_build_object(
        'field', field_record.field_name,
        'error', 'Invalid field name format. Must start with letter and contain only letters, numbers, and underscores.'
      );
    END IF;
    
    -- Validate select field options
    IF field_record.field_type IN ('select', 'multi_select') THEN
      IF field_record.field_options IS NULL OR jsonb_array_length(field_record.field_options) = 0 THEN
        field_errors := field_errors || jsonb_build_object(
          'field', field_record.field_name,
          'error', 'Select fields must have at least one option.'
        );
      END IF;
    END IF;
  END LOOP;
  
  validation_result := jsonb_build_object(
    'valid', jsonb_array_length(field_errors) = 0,
    'errors', field_errors,
    'field_count', (SELECT COUNT(*) FROM template_fields WHERE template_id = p_template_id)
  );
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- Function to generate document from template
CREATE OR REPLACE FUNCTION generate_document_from_template(
  p_template_id UUID,
  p_matter_id UUID,
  p_field_values JSONB,
  p_title VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  template_record document_templates%ROWTYPE;
  document_id UUID;
  auto_title VARCHAR;
BEGIN
  -- Get template information
  SELECT * INTO template_record 
  FROM document_templates 
  WHERE id = p_template_id AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or not active';
  END IF;
  
  -- Generate title if not provided
  auto_title := COALESCE(p_title, template_record.name || ' - Generated ' || to_char(NOW(), 'YYYY-MM-DD'));
  
  -- Create document record
  INSERT INTO documents (
    matter_id,
    template_id,
    title,
    document_type,
    status,
    auto_populated_fields,
    created_by
  ) VALUES (
    p_matter_id,
    p_template_id,
    auto_title,
    template_record.document_type,
    'draft',
    p_field_values,
    auth.uid()
  ) RETURNING id INTO document_id;
  
  -- Increment template usage
  PERFORM increment_template_usage(p_template_id);
  
  RETURN document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for template with field information
CREATE VIEW template_details AS
SELECT 
  t.*,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', tf.id,
        'field_name', tf.field_name,
        'field_label', tf.field_label,
        'field_type', tf.field_type,
        'is_required', tf.is_required,
        'default_value', tf.default_value,
        'field_options', tf.field_options,
        'field_order', tf.field_order,
        'field_group', tf.field_group
      ) ORDER BY tf.field_order
    )
    FROM template_fields tf 
    WHERE tf.template_id = t.id
  ) as fields
FROM document_templates t;

COMMIT;