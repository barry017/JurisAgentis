-- Migration: Add collaborative editing tables
-- T076: Real-time collaborative editing with Supabase

-- Create collaborative_sessions table
CREATE TABLE collaborative_sessions (
    id VARCHAR(100) PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    participants JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT collaborative_sessions_document_id_not_null CHECK (document_id IS NOT NULL)
);

-- Create document_changes table for change tracking
CREATE TABLE document_changes (
    id VARCHAR(100) PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    change_type VARCHAR(50) NOT NULL CHECK (change_type IN ('insert', 'delete', 'replace', 'format', 'cursor_move', 'selection_change')),
    position JSONB NOT NULL, -- {line: number, column: number, position: number}
    content TEXT,
    previous_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied BOOLEAN DEFAULT false,
    conflict_resolved BOOLEAN DEFAULT false
);

-- Create conflict_resolutions table
CREATE TABLE conflict_resolutions (
    id VARCHAR(100) PRIMARY KEY,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    conflicting_changes JSONB NOT NULL, -- Array of document_change objects
    resolution_strategy VARCHAR(50) NOT NULL CHECK (resolution_strategy IN ('merge', 'manual', 'accept_latest', 'accept_first')),
    resolved_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    merged_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_presence table for tracking active users
CREATE TABLE user_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL REFERENCES collaborative_sessions(id) ON DELETE CASCADE,
    cursor_position JSONB, -- {line: number, column: number, position: number}
    selection JSONB, -- {start: cursor, end: cursor, content: string}
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    user_metadata JSONB DEFAULT '{}', -- name, email, role, etc.
    
    -- Ensure one presence record per user per document
    UNIQUE(user_id, document_id, session_id)
);

-- Create indexes for performance
CREATE INDEX idx_collaborative_sessions_document_id ON collaborative_sessions(document_id);
CREATE INDEX idx_collaborative_sessions_active ON collaborative_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_collaborative_sessions_last_activity ON collaborative_sessions(last_activity);

CREATE INDEX idx_document_changes_document_id ON document_changes(document_id);
CREATE INDEX idx_document_changes_session_id ON document_changes(session_id);
CREATE INDEX idx_document_changes_user_id ON document_changes(user_id);
CREATE INDEX idx_document_changes_created_at ON document_changes(created_at);
CREATE INDEX idx_document_changes_applied ON document_changes(applied);

CREATE INDEX idx_conflict_resolutions_document_id ON conflict_resolutions(document_id);
CREATE INDEX idx_conflict_resolutions_resolved_at ON conflict_resolutions(resolved_at);

CREATE INDEX idx_user_presence_document_id ON user_presence(document_id);
CREATE INDEX idx_user_presence_session_id ON user_presence(session_id);
CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX idx_user_presence_active ON user_presence(is_active) WHERE is_active = true;
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen);

-- Row Level Security
ALTER TABLE collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Policies for collaborative_sessions
CREATE POLICY "Users can view sessions for documents they have access to" ON collaborative_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = collaborative_sessions.document_id
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

CREATE POLICY "Users can create sessions for documents they can edit" ON collaborative_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = collaborative_sessions.document_id
            AND (
                -- Document owner
                d.created_by = auth.uid()
                -- Or user has edit access through matter/client relationship
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
                -- Or user has explicit edit access
                OR EXISTS (
                    SELECT 1 FROM document_access da
                    WHERE da.document_id = d.id
                    AND da.user_id = auth.uid()
                    AND da.access_level IN ('edit', 'admin')
                )
            )
        )
    );

CREATE POLICY "Users can update sessions they participate in" ON collaborative_sessions
    FOR UPDATE USING (
        auth.uid()::text = ANY(
            SELECT jsonb_array_elements_text(participants -> 'userId')
            FROM (SELECT participants) AS p
        )
    );

-- Policies for document_changes
CREATE POLICY "Users can view changes for sessions they participate in" ON document_changes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collaborative_sessions cs
            WHERE cs.id = document_changes.session_id
            AND auth.uid()::text = ANY(
                SELECT jsonb_array_elements_text(cs.participants -> 'userId')
            )
        )
    );

CREATE POLICY "Users can create changes in sessions they participate in" ON document_changes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM collaborative_sessions cs
            WHERE cs.id = document_changes.session_id
            AND auth.uid()::text = ANY(
                SELECT jsonb_array_elements_text(cs.participants -> 'userId')
            )
        )
    );

-- Policies for conflict_resolutions
CREATE POLICY "Users can view conflict resolutions for documents they have access to" ON conflict_resolutions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = conflict_resolutions.document_id
            AND (
                d.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM document_access da
                    WHERE da.document_id = d.id
                    AND da.user_id = auth.uid()
                    AND da.access_level IN ('view', 'edit', 'admin')
                )
            )
        )
    );

CREATE POLICY "Users can create conflict resolutions for documents they can edit" ON conflict_resolutions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM documents d
            WHERE d.id = conflict_resolutions.document_id
            AND (
                d.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM document_access da
                    WHERE da.document_id = d.id
                    AND da.user_id = auth.uid()
                    AND da.access_level IN ('edit', 'admin')
                )
            )
        )
    );

-- Policies for user_presence
CREATE POLICY "Users can view presence for sessions they participate in" ON user_presence
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collaborative_sessions cs
            WHERE cs.id = user_presence.session_id
            AND auth.uid()::text = ANY(
                SELECT jsonb_array_elements_text(cs.participants -> 'userId')
            )
        )
    );

CREATE POLICY "Users can manage their own presence" ON user_presence
    FOR ALL USING (user_id = auth.uid());

-- Functions for cleanup and maintenance

-- Function to deactivate old sessions
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS INTEGER AS $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    -- Deactivate sessions with no activity for more than 24 hours
    UPDATE collaborative_sessions
    SET is_active = false
    WHERE is_active = true
    AND last_activity < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deactivated_count = ROW_COUNT;
    
    -- Clean up old user presence records
    DELETE FROM user_presence
    WHERE last_seen < NOW() - INTERVAL '48 hours';
    
    RETURN deactivated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update session activity
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_activity when changes are made
    UPDATE collaborative_sessions
    SET last_activity = NOW()
    WHERE id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity on document changes
CREATE TRIGGER update_session_activity_trigger
    AFTER INSERT ON document_changes
    FOR EACH ROW
    EXECUTE FUNCTION update_session_activity();

-- Function to clean up user presence on disconnect
CREATE OR REPLACE FUNCTION cleanup_user_presence()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark user as inactive when they haven't been seen for 5 minutes
    UPDATE user_presence
    SET is_active = false
    WHERE user_id = OLD.user_id
    AND last_seen < NOW() - INTERVAL '5 minutes';
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for collaborative editing

-- Audit collaborative sessions
CREATE OR REPLACE FUNCTION audit_collaborative_session_changes()
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
            'collaborative_sessions',
            NEW.id,
            'collaboration_session_created',
            (SELECT user_id FROM user_presence WHERE session_id = NEW.id LIMIT 1),
            jsonb_build_object(
                'document_id', NEW.document_id,
                'participant_count', jsonb_array_length(NEW.participants),
                'is_active', NEW.is_active
            ),
            NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only log significant changes
        IF OLD.is_active != NEW.is_active OR jsonb_array_length(OLD.participants) != jsonb_array_length(NEW.participants) THEN
            INSERT INTO audit_logs (
                table_name,
                record_id,
                action,
                user_id,
                metadata,
                created_at
            ) VALUES (
                'collaborative_sessions',
                NEW.id,
                'collaboration_session_updated',
                (SELECT user_id FROM user_presence WHERE session_id = NEW.id AND is_active = true LIMIT 1),
                jsonb_build_object(
                    'document_id', NEW.document_id,
                    'old_participant_count', jsonb_array_length(OLD.participants),
                    'new_participant_count', jsonb_array_length(NEW.participants),
                    'old_active', OLD.is_active,
                    'new_active', NEW.is_active
                ),
                NOW()
            );
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit trigger for collaborative sessions
CREATE TRIGGER collaborative_session_audit_trigger
    AFTER INSERT OR UPDATE ON collaborative_sessions
    FOR EACH ROW
    EXECUTE FUNCTION audit_collaborative_session_changes();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON collaborative_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON document_changes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON conflict_resolutions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_presence TO authenticated;

-- Schedule cleanup job (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-collaborative-sessions', '0 */6 * * *', 'SELECT cleanup_inactive_sessions();');

-- Add helpful comments
COMMENT ON TABLE collaborative_sessions IS 'Tracks active collaborative editing sessions for documents';
COMMENT ON TABLE document_changes IS 'Stores individual changes made during collaborative editing';
COMMENT ON TABLE conflict_resolutions IS 'Tracks conflicts and their resolutions during collaborative editing';
COMMENT ON TABLE user_presence IS 'Tracks user presence and cursor/selection state during collaboration';

COMMENT ON COLUMN collaborative_sessions.participants IS 'Array of user objects currently in the session';
COMMENT ON COLUMN document_changes.position IS 'Cursor position where the change was made (line, column, position)';
COMMENT ON COLUMN document_changes.metadata IS 'Additional metadata like timestamp, client ID, operation ID';
COMMENT ON COLUMN user_presence.cursor_position IS 'Current cursor position of the user';
COMMENT ON COLUMN user_presence.selection IS 'Current text selection of the user';