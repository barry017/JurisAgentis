-- Migration: Add encryption keys table for document security
-- T075: File encryption and virus scanning support

-- Create encryption_keys table
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key_data TEXT NOT NULL, -- Base64 encoded encryption key
    algorithm VARCHAR(50) DEFAULT 'aes-256-gcm',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT encryption_keys_key_data_not_empty CHECK (length(key_data) > 0)
);

-- Add security metadata columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS security_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS encrypted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS encryption_key_id UUID REFERENCES encryption_keys(id),
ADD COLUMN IF NOT EXISTS virus_scanned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS virus_scan_result JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS integrity_checksum VARCHAR(128),
ADD COLUMN IF NOT EXISTS integrity_algorithm VARCHAR(50) DEFAULT 'sha256',
ADD COLUMN IF NOT EXISTS security_level VARCHAR(20) DEFAULT 'confidential'
    CHECK (security_level IN ('public', 'internal', 'confidential', 'restricted'));

-- Create indexes for performance
CREATE INDEX idx_encryption_keys_active ON encryption_keys(active) WHERE active = true;
CREATE INDEX idx_encryption_keys_created_at ON encryption_keys(created_at);
CREATE INDEX idx_documents_encrypted ON documents(encrypted) WHERE encrypted = true;
CREATE INDEX idx_documents_security_level ON documents(security_level);
CREATE INDEX idx_documents_virus_scanned ON documents(virus_scanned);

-- Row Level Security for encryption_keys
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access encryption keys for documents they have access to
CREATE POLICY "Users can access encryption keys for their documents" ON encryption_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.encryption_key_id = encryption_keys.id
            AND (
                -- Document owner
                d.created_by = auth.uid()
                -- Or user has access through matter/client relationship
                OR EXISTS (
                    SELECT 1 FROM matters m
                    JOIN user_profiles up ON up.user_id = auth.uid()
                    WHERE m.id = d.matter_id
                    AND (
                        m.primary_attorney = auth.uid()
                        OR m.assigned_paralegal = auth.uid()
                        OR up.role IN ('admin', 'associate_attorney')
                    )
                )
                -- Or user has explicit document access
                OR EXISTS (
                    SELECT 1 FROM document_access da
                    WHERE da.document_id = d.id
                    AND da.user_id = auth.uid()
                    AND da.access_level IN ('view', 'edit', 'admin')
                )
            )
        )
    );

-- Policy: Only admin and associate attorneys can create encryption keys
CREATE POLICY "Only authorized users can create encryption keys" ON encryption_keys
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'associate_attorney')
        )
    );

-- Policy: Only admin can update encryption keys
CREATE POLICY "Only admin can update encryption keys" ON encryption_keys
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Add security audit trigger for encryption key operations
CREATE OR REPLACE FUNCTION audit_encryption_key_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            user_id,
            metadata,
            created_at
        ) VALUES (
            'encryption_keys',
            NEW.id::text,
            'encryption_key_created',
            auth.uid(),
            jsonb_build_object(
                'algorithm', NEW.algorithm,
                'active', NEW.active,
                'expires_at', NEW.expires_at
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            user_id,
            metadata,
            created_at
        ) VALUES (
            'encryption_keys',
            NEW.id::text,
            'encryption_key_updated',
            auth.uid(),
            jsonb_build_object(
                'old_active', OLD.active,
                'new_active', NEW.active,
                'changes', jsonb_build_object(
                    'active', CASE WHEN OLD.active != NEW.active THEN jsonb_build_object('from', OLD.active, 'to', NEW.active) END,
                    'expires_at', CASE WHEN OLD.expires_at != NEW.expires_at THEN jsonb_build_object('from', OLD.expires_at, 'to', NEW.expires_at) END
                )
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            user_id,
            metadata,
            created_at
        ) VALUES (
            'encryption_keys',
            OLD.id::text,
            'encryption_key_deleted',
            auth.uid(),
            jsonb_build_object(
                'algorithm', OLD.algorithm,
                'was_active', OLD.active
            ),
            NOW()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for encryption key audit trail
CREATE TRIGGER encryption_key_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON encryption_keys
    FOR EACH ROW
    EXECUTE FUNCTION audit_encryption_key_changes();

-- Add security audit trigger for document security metadata changes
CREATE OR REPLACE FUNCTION audit_document_security_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only audit when security-related fields change
    IF TG_OP = 'UPDATE' AND (
        OLD.encrypted != NEW.encrypted OR
        OLD.encryption_key_id != NEW.encryption_key_id OR
        OLD.virus_scanned != NEW.virus_scanned OR
        OLD.security_level != NEW.security_level OR
        OLD.integrity_checksum != NEW.integrity_checksum
    ) THEN
        INSERT INTO audit_logs (
            table_name,
            record_id,
            action,
            user_id,
            metadata,
            created_at
        ) VALUES (
            'documents',
            NEW.id::text,
            'document_security_updated',
            auth.uid(),
            jsonb_build_object(
                'security_changes', jsonb_build_object(
                    'encrypted', CASE WHEN OLD.encrypted != NEW.encrypted THEN jsonb_build_object('from', OLD.encrypted, 'to', NEW.encrypted) END,
                    'encryption_key_id', CASE WHEN OLD.encryption_key_id != NEW.encryption_key_id THEN jsonb_build_object('from', OLD.encryption_key_id, 'to', NEW.encryption_key_id) END,
                    'virus_scanned', CASE WHEN OLD.virus_scanned != NEW.virus_scanned THEN jsonb_build_object('from', OLD.virus_scanned, 'to', NEW.virus_scanned) END,
                    'security_level', CASE WHEN OLD.security_level != NEW.security_level THEN jsonb_build_object('from', OLD.security_level, 'to', NEW.security_level) END,
                    'integrity_checksum', CASE WHEN OLD.integrity_checksum != NEW.integrity_checksum THEN jsonb_build_object('changed', true) END
                ),
                'document_title', NEW.title
            ),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for document security audit trail
CREATE TRIGGER document_security_audit_trigger
    AFTER UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION audit_document_security_changes();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON encryption_keys TO authenticated;
GRANT USAGE ON SEQUENCE encryption_keys_id_seq TO authenticated;

-- Add helpful comments
COMMENT ON TABLE encryption_keys IS 'Stores encryption keys for document security';
COMMENT ON COLUMN documents.security_metadata IS 'Comprehensive security metadata including scan results and encryption info';
COMMENT ON COLUMN documents.encrypted IS 'Whether the document file is encrypted at rest';
COMMENT ON COLUMN documents.encryption_key_id IS 'Reference to the encryption key used for this document';
COMMENT ON COLUMN documents.virus_scanned IS 'Whether the document has been scanned for viruses';
COMMENT ON COLUMN documents.virus_scan_result IS 'Detailed virus scan results and metadata';
COMMENT ON COLUMN documents.integrity_checksum IS 'Checksum for verifying document integrity';
COMMENT ON COLUMN documents.security_level IS 'Security classification level of the document';