-- Add missing fields required by contract tests
-- Based on contract test failures, adding AI and confidentiality fields

BEGIN;

-- Create confidentiality level enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_confidentiality_level') THEN
        CREATE TYPE document_confidentiality_level AS ENUM (
            'public',
            'internal', 
            'client_confidential',
            'attorney_client_privileged'
        );
    END IF;
END $$;

-- Add confidentiality_level column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'confidentiality_level'
    ) THEN
        ALTER TABLE documents ADD COLUMN confidentiality_level document_confidentiality_level DEFAULT 'client_confidential';
    END IF;
END $$;

-- Add AI generation fields if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'ai_generated'
    ) THEN
        ALTER TABLE documents ADD COLUMN ai_generated BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'ai_model_used'
    ) THEN
        ALTER TABLE documents ADD COLUMN ai_model_used VARCHAR(100);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'ai_generation_prompt'
    ) THEN
        ALTER TABLE documents ADD COLUMN ai_generation_prompt TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'ai_metadata'
    ) THEN
        ALTER TABLE documents ADD COLUMN ai_metadata JSONB DEFAULT '{}';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'content'
    ) THEN
        ALTER TABLE documents ADD COLUMN content TEXT;
    END IF;
END $$;

-- Add legal compliance fields expected by contract tests
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'attorney_client_privileged'
    ) THEN
        ALTER TABLE documents ADD COLUMN attorney_client_privileged BOOLEAN DEFAULT true;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'legal_hold'
    ) THEN
        ALTER TABLE documents ADD COLUMN legal_hold BOOLEAN DEFAULT false;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'signature_required'
    ) THEN
        ALTER TABLE documents ADD COLUMN signature_required BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_documents_confidentiality ON documents(confidentiality_level);
CREATE INDEX IF NOT EXISTS idx_documents_ai_generated ON documents(ai_generated);
CREATE INDEX IF NOT EXISTS idx_documents_ai_model ON documents(ai_model_used);
CREATE INDEX IF NOT EXISTS idx_documents_attorney_client ON documents(attorney_client_privileged);
CREATE INDEX IF NOT EXISTS idx_documents_legal_hold ON documents(legal_hold);

-- Add full-text search index for content if it doesn't exist
DROP INDEX IF EXISTS idx_documents_content_search;
CREATE INDEX idx_documents_content_search ON documents USING GIN(
  to_tsvector('english', 
    title || ' ' || 
    COALESCE(description, '') || ' ' || 
    COALESCE(content_summary, '') || ' ' ||
    COALESCE(content, '')
  )
);

-- Update the user_has_matter_access function if it doesn't exist
CREATE OR REPLACE FUNCTION user_has_matter_access(p_matter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_id UUID;
    has_access BOOLEAN := false;
BEGIN
    -- Get current user ID
    user_id := auth.uid();
    
    -- Check if user is authenticated
    IF user_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check if user has access to this matter
    SELECT EXISTS(
        SELECT 1 FROM matter_access 
        WHERE matter_id = p_matter_id 
        AND user_id = auth.uid()
        AND (revoked_at IS NULL OR revoked_at > NOW())
        AND can_view = true
    ) INTO has_access;
    
    RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION user_has_matter_access(UUID) TO authenticated;

COMMIT;