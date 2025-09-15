-- Create document templates system for legal practice

-- Document templates table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Template Identification
    template_name VARCHAR(500) NOT NULL,
    template_code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    
    -- Template Content
    template_content TEXT NOT NULL,
    template_format VARCHAR(50) DEFAULT 'docx', -- 'docx', 'pdf', 'html', 'txt'
    
    -- Template Categories
    category VARCHAR(100) NOT NULL, -- 'contract', 'letter', 'pleading', 'form', 'notice', 'agreement'
    practice_area VARCHAR(100) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    
    -- Template Properties
    is_fillable BOOLEAN DEFAULT true, -- Has merge fields
    merge_fields JSONB, -- Array of field definitions
    required_fields JSONB, -- Required merge fields
    
    -- Usage and Access
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false, -- Available to all users vs. private
    usage_count INTEGER DEFAULT 0,
    last_used_date TIMESTAMP WITH TIME ZONE,
    
    -- Versioning
    version_number VARCHAR(20) DEFAULT '1.0',
    is_current_version BOOLEAN DEFAULT true,
    parent_template_id UUID REFERENCES document_templates(id),
    
    -- Permissions and Sharing
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    shared_with_roles TEXT[], -- Array of roles that can use this template
    
    -- Legal Compliance
    jurisdiction VARCHAR(100),
    compliance_notes TEXT,
    review_required BOOLEAN DEFAULT false,
    last_reviewed_date TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES user_profiles(uid),
    
    -- File Storage
    file_path TEXT, -- Path to stored template file
    file_size INTEGER, -- File size in bytes
    mime_type VARCHAR(100),
    
    -- Template Variables
    default_variables JSONB, -- Default values for merge fields
    conditional_logic JSONB, -- Rules for conditional content
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Template usage tracking
CREATE TABLE IF NOT EXISTS template_usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Usage Details
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    template_version VARCHAR(20),
    
    -- Document Generated
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    generated_filename VARCHAR(500),
    
    -- Usage Context
    used_by UUID NOT NULL REFERENCES user_profiles(uid),
    matter_id UUID REFERENCES matters(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    -- Merge Data Used
    merge_data JSONB, -- The actual data used to fill the template
    generation_status VARCHAR(50) DEFAULT 'success', -- 'success', 'failed', 'partial'
    error_message TEXT,
    
    -- Performance Metrics
    generation_time_ms INTEGER, -- Time to generate document
    file_size_generated INTEGER,
    
    -- Timestamps
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generated_at TIMESTAMP WITH TIME ZONE
);

-- Template categories for organization
CREATE TABLE IF NOT EXISTS template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Details
    category_name VARCHAR(200) NOT NULL,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_category_id UUID REFERENCES template_categories(id),
    category_level INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    
    -- Permissions
    allowed_roles TEXT[], -- Roles that can see this category
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Template fields definition for merge functionality
CREATE TABLE IF NOT EXISTS template_merge_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Field Definition
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    field_name VARCHAR(200) NOT NULL,
    field_code VARCHAR(100) NOT NULL, -- Used in template content like {{client_name}}
    field_type VARCHAR(50) NOT NULL, -- 'text', 'number', 'date', 'boolean', 'list', 'address', 'phone', 'email'
    
    -- Field Properties
    field_label VARCHAR(200) NOT NULL,
    field_description TEXT,
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    
    -- Data Source
    data_source VARCHAR(100), -- 'client', 'matter', 'user', 'manual', 'calculation'
    data_field VARCHAR(100), -- Field name in source table
    
    -- Validation Rules
    validation_rules JSONB, -- Regex, min/max length, etc.
    validation_message VARCHAR(500),
    
    -- Field Options (for dropdowns, etc.)
    field_options JSONB, -- Array of options for list types
    
    -- Display Properties
    display_order INTEGER DEFAULT 0,
    field_group VARCHAR(100), -- Group related fields together
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Template sharing and permissions
CREATE TABLE IF NOT EXISTS template_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Permission Details
    template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
    
    -- Permission Target
    permission_type VARCHAR(50) NOT NULL, -- 'user', 'role', 'public'
    user_id UUID REFERENCES user_profiles(uid) ON DELETE CASCADE,
    role_name VARCHAR(50), -- For role-based permissions
    
    -- Permission Level
    permission_level VARCHAR(50) NOT NULL, -- 'read', 'use', 'edit', 'admin'
    can_share BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    granted_by UUID NOT NULL REFERENCES user_profiles(uid),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_document_templates_category ON document_templates(category, practice_area);
CREATE INDEX idx_document_templates_code ON document_templates(template_code);
CREATE INDEX idx_document_templates_active ON document_templates(is_active, is_current_version) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_templates_usage ON document_templates(usage_count DESC, last_used_date DESC);
CREATE INDEX idx_document_templates_created_by ON document_templates(created_by) WHERE deleted_at IS NULL;

CREATE INDEX idx_template_usage_template_id ON template_usage_history(template_id, used_at DESC);
CREATE INDEX idx_template_usage_user ON template_usage_history(used_by, used_at DESC);
CREATE INDEX idx_template_usage_matter ON template_usage_history(matter_id) WHERE matter_id IS NOT NULL;
CREATE INDEX idx_template_usage_client ON template_usage_history(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX idx_template_categories_parent ON template_categories(parent_category_id, sort_order);
CREATE INDEX idx_template_categories_active ON template_categories(is_active, category_level, sort_order);

CREATE INDEX idx_template_merge_fields_template ON template_merge_fields(template_id, display_order);
CREATE INDEX idx_template_merge_fields_active ON template_merge_fields(template_id, is_active);

CREATE INDEX idx_template_permissions_template ON template_permissions(template_id, is_active);
CREATE INDEX idx_template_permissions_user ON template_permissions(user_id, permission_level) WHERE user_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_merge_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates

-- Users can view templates they have permission to use
CREATE POLICY "Users can view permitted templates" ON document_templates
  FOR SELECT 
  TO authenticated
  USING (
    deleted_at IS NULL AND is_active = true AND (
      -- Public templates
      is_public = true OR
      -- Templates they created
      created_by = (auth.jwt() ->> 'sub')::UUID OR
      -- Templates shared with their role
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.uid = (auth.jwt() ->> 'sub')::UUID
        AND up.role = ANY(shared_with_roles)
      ) OR
      -- Templates with explicit permission
      EXISTS (
        SELECT 1 FROM template_permissions tp
        JOIN user_profiles up ON up.uid = (auth.jwt() ->> 'sub')::UUID
        WHERE tp.template_id = document_templates.id
        AND tp.is_active = true
        AND (
          (tp.permission_type = 'user' AND tp.user_id = up.uid) OR
          (tp.permission_type = 'role' AND tp.role_name = up.role)
        )
        AND (tp.expires_at IS NULL OR tp.expires_at > NOW())
      )
    )
  );

-- Users can create templates
CREATE POLICY "Users can create templates" ON document_templates
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    created_by = (auth.jwt() ->> 'sub')::UUID AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE uid = (auth.jwt() ->> 'sub')::UUID 
      AND role IN ('admin', 'associate_attorney', 'paralegal')
    )
  );

-- Users can update their own templates or templates they have edit permission for
CREATE POLICY "Users can update permitted templates" ON document_templates
  FOR UPDATE 
  TO authenticated
  USING (
    deleted_at IS NULL AND (
      created_by = (auth.jwt() ->> 'sub')::UUID OR
      EXISTS (
        SELECT 1 FROM template_permissions tp
        JOIN user_profiles up ON up.uid = (auth.jwt() ->> 'sub')::UUID
        WHERE tp.template_id = document_templates.id
        AND tp.is_active = true
        AND tp.permission_level IN ('edit', 'admin')
        AND (
          (tp.permission_type = 'user' AND tp.user_id = up.uid) OR
          (tp.permission_type = 'role' AND tp.role_name = up.role)
        )
        AND (tp.expires_at IS NULL OR tp.expires_at > NOW())
      )
    )
  );

-- Template usage history policies
CREATE POLICY "Users can view their own template usage" ON template_usage_history
  FOR SELECT 
  TO authenticated
  USING (used_by = (auth.jwt() ->> 'sub')::UUID);

CREATE POLICY "Users can create template usage records" ON template_usage_history
  FOR INSERT 
  TO authenticated
  WITH CHECK (used_by = (auth.jwt() ->> 'sub')::UUID);

-- Template categories policies  
CREATE POLICY "Users can view active template categories" ON template_categories
  FOR SELECT 
  TO authenticated
  USING (
    is_active = true AND (
      allowed_roles IS NULL OR
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE uid = (auth.jwt() ->> 'sub')::UUID 
        AND role = ANY(allowed_roles)
      )
    )
  );

-- Template merge fields policies
CREATE POLICY "Users can view merge fields for permitted templates" ON template_merge_fields
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_templates dt
      WHERE dt.id = template_merge_fields.template_id
      -- Use the same permission logic as templates
    )
  );

-- Functions for template operations

-- Function to update template usage statistics
CREATE OR REPLACE FUNCTION update_template_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update usage count and last used date
  UPDATE document_templates 
  SET 
    usage_count = usage_count + 1,
    last_used_date = NEW.used_at,
    updated_at = NOW()
  WHERE id = NEW.template_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update template usage statistics
CREATE TRIGGER trigger_update_template_usage_stats
  AFTER INSERT ON template_usage_history
  FOR EACH ROW
  EXECUTE FUNCTION update_template_usage_stats();

-- Function to update template timestamps
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating template timestamps
CREATE TRIGGER trigger_update_template_timestamp
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- Function to get available templates for user
CREATE OR REPLACE FUNCTION get_user_available_templates(user_id_param UUID)
RETURNS TABLE (
  template_id UUID,
  template_name VARCHAR,
  template_code VARCHAR,
  category VARCHAR,
  practice_area VARCHAR,
  description TEXT,
  usage_count INTEGER,
  permission_level VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dt.id,
    dt.template_name,
    dt.template_code,
    dt.category,
    dt.practice_area,
    dt.description,
    dt.usage_count,
    CASE 
      WHEN dt.created_by = user_id_param THEN 'admin'
      WHEN tp.permission_level IS NOT NULL THEN tp.permission_level
      ELSE 'use'
    END as permission_level
  FROM document_templates dt
  LEFT JOIN user_profiles up ON up.uid = user_id_param
  LEFT JOIN template_permissions tp ON tp.template_id = dt.id 
    AND tp.is_active = true
    AND (
      (tp.permission_type = 'user' AND tp.user_id = user_id_param) OR
      (tp.permission_type = 'role' AND tp.role_name = up.role)
    )
    AND (tp.expires_at IS NULL OR tp.expires_at > NOW())
  WHERE dt.deleted_at IS NULL 
    AND dt.is_active = true
    AND dt.is_current_version = true
    AND (
      dt.is_public = true OR
      dt.created_by = user_id_param OR
      up.role = ANY(dt.shared_with_roles) OR
      tp.id IS NOT NULL
    )
  ORDER BY dt.usage_count DESC, dt.template_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default template categories
INSERT INTO template_categories (category_name, category_code, description, parent_category_id, sort_order, created_by) 
VALUES 
('Contracts & Agreements', 'contracts', 'Legal contracts and agreements', NULL, 1, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)),
('Estate Planning', 'estate_planning', 'Wills, trusts, and estate planning documents', NULL, 2, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)),
('Business Formation', 'business_formation', 'Business entity formation documents', NULL, 3, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)),
('Real Estate', 'real_estate', 'Real estate transaction documents', NULL, 4, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)),
('Litigation', 'litigation', 'Court pleadings and litigation documents', NULL, 5, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)),
('Letters & Correspondence', 'letters', 'Client letters and legal correspondence', NULL, 6, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1)),
('Forms & Applications', 'forms', 'Legal forms and applications', NULL, 7, (SELECT uid FROM user_profiles WHERE role = 'admin' LIMIT 1))
ON CONFLICT (category_code) DO NOTHING;