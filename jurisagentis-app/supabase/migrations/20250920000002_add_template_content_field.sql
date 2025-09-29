-- Add template_content field to document_templates table for AI generation
-- Required by contract tests for template-based document generation

BEGIN;

-- Add template_content field if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_templates' AND column_name = 'template_content'
    ) THEN
        ALTER TABLE document_templates ADD COLUMN template_content TEXT;
    END IF;
END $$;

-- Add content index for searching template content
CREATE INDEX IF NOT EXISTS idx_document_templates_content ON document_templates USING GIN(
  to_tsvector('english', 
    name || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(template_content, '')
  )
);

-- Update the template generation function to use template_content
CREATE OR REPLACE FUNCTION generate_document_from_template_with_ai(
  p_template_id UUID,
  p_matter_id UUID,
  p_field_values JSONB,
  p_title VARCHAR DEFAULT NULL,
  p_use_ai BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  template_record document_templates%ROWTYPE;
  document_id UUID;
  auto_title VARCHAR;
  ai_content TEXT := NULL;
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
  
  -- If AI generation is requested, set ai_generated flag
  -- (The actual AI content generation would be handled by the application layer)
  
  -- Create document record
  INSERT INTO documents (
    matter_id,
    template_id,
    title,
    document_type,
    status,
    content,
    auto_populated_fields,
    ai_generated,
    ai_model_used,
    confidentiality_level,
    created_by
  ) VALUES (
    p_matter_id,
    p_template_id,
    auto_title,
    template_record.document_type,
    'draft',
    CASE WHEN p_use_ai THEN ai_content ELSE template_record.template_content END,
    p_field_values,
    p_use_ai,
    CASE WHEN p_use_ai THEN 'gpt-5' ELSE NULL END,
    'client_confidential',
    auth.uid()
  ) RETURNING id INTO document_id;
  
  -- Increment template usage
  PERFORM increment_template_usage(p_template_id);
  
  RETURN document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;