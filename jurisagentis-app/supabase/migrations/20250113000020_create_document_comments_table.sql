-- T033: Create document comments table for collaborative review
-- Migration: Document Management System - Comments and Collaboration

BEGIN;

-- Create enum types for comments if they do not already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_type') THEN
    CREATE TYPE comment_type AS ENUM (
      'general',
      'review',
      'question',
      'suggestion',
      'approval',
      'rejection',
      'clarification',
      'reply'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_status') THEN
    CREATE TYPE comment_status AS ENUM (
      'active',
      'resolved',
      'archived',
      'deleted'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM (
      'low',
      'medium',
      'high',
      'urgent'
    );
  END IF;
END;
$$;

-- Create document_comments table
CREATE TABLE document_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
  
  -- Comment content
  content TEXT NOT NULL,
  comment_type comment_type NOT NULL DEFAULT 'general',
  status comment_status NOT NULL DEFAULT 'active',
  priority priority_level DEFAULT 'medium',
  
  -- Document location/context
  page_number INTEGER,
  section_reference VARCHAR(255), -- e.g., "Article III", "Section 2.1"
  annotation_coordinates JSONB, -- For precise positioning: {"x": 100, "y": 200, "width": 150, "height": 30}
  selected_text TEXT, -- Text that was highlighted/selected when commenting
  
  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT false, -- Private comments only visible to author and document owner
  requires_response BOOLEAN DEFAULT false,
  due_date TIMESTAMPTZ,
  
  -- Resolution tracking
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Threading and conversation
  thread_id UUID, -- Groups related comments together
  is_thread_starter BOOLEAN DEFAULT false,
  
  -- Approval workflow
  approval_required BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Audit fields
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Version tracking
  document_version_id UUID REFERENCES document_versions(id),
  is_version_specific BOOLEAN DEFAULT true,
  
  -- Additional metadata
  mentions UUID[] DEFAULT '{}', -- User IDs mentioned in the comment (@mentions)
  attachments JSONB DEFAULT '[]', -- Array of attachment metadata
  custom_fields JSONB DEFAULT '{}'
);

-- Create comment_reactions table for emoji reactions
CREATE TABLE comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reaction details
  reaction_type VARCHAR(50) NOT NULL, -- thumbs_up, thumbs_down, heart, laugh, etc.
  emoji VARCHAR(10), -- Unicode emoji
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Create comment_notifications table
CREATE TABLE comment_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification details
  notification_type VARCHAR(100) NOT NULL, -- new_comment, mention, reply, resolution, etc.
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Delivery preferences
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comment_history table for edit tracking
CREATE TABLE comment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES document_comments(id) ON DELETE CASCADE,
  
  -- Historical content
  previous_content TEXT NOT NULL,
  change_summary VARCHAR(500),
  
  -- Edit metadata
  edited_by UUID NOT NULL REFERENCES auth.users(id),
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Change tracking
  content_diff JSONB, -- Structured diff of changes
  edit_reason VARCHAR(255)
);

-- Create indexes for performance
CREATE INDEX idx_document_comments_document_id ON document_comments(document_id);
CREATE INDEX idx_document_comments_parent_id ON document_comments(parent_comment_id);
CREATE INDEX idx_document_comments_status ON document_comments(status);
CREATE INDEX idx_document_comments_type ON document_comments(comment_type);
CREATE INDEX idx_document_comments_created_by ON document_comments(created_by);
CREATE INDEX idx_document_comments_created_at ON document_comments(created_at);
CREATE INDEX idx_document_comments_page ON document_comments(page_number) WHERE page_number IS NOT NULL;
CREATE INDEX idx_document_comments_thread ON document_comments(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_document_comments_mentions ON document_comments USING GIN(mentions);
CREATE INDEX idx_document_comments_tags ON document_comments USING GIN(tags);
CREATE INDEX idx_document_comments_resolved ON document_comments(resolved_at) WHERE resolved_at IS NOT NULL;

CREATE INDEX idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX idx_comment_reactions_type ON comment_reactions(reaction_type);

CREATE INDEX idx_comment_notifications_user_id ON comment_notifications(user_id);
CREATE INDEX idx_comment_notifications_read ON comment_notifications(is_read);
CREATE INDEX idx_comment_notifications_type ON comment_notifications(notification_type);

CREATE INDEX idx_comment_history_comment_id ON comment_history(comment_id);
CREATE INDEX idx_comment_history_edited_at ON comment_history(edited_at);

-- Full-text search for comments
CREATE INDEX idx_document_comments_search ON document_comments USING GIN(
  to_tsvector('english', content)
);

-- Row Level Security
ALTER TABLE document_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_history ENABLE ROW LEVEL SECURITY;

-- Policies for document_comments
CREATE POLICY document_comments_access_policy ON document_comments
  FOR ALL
  USING (
    -- Users can access comments on documents they have access to
    document_id IN (
      SELECT d.id 
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
    OR
    -- Users can always see their own comments
    created_by = auth.uid()
  );

-- Policy for private comments
CREATE POLICY document_comments_private_policy ON document_comments
  FOR SELECT
  USING (
    CASE 
      WHEN is_private = true THEN 
        created_by = auth.uid() 
        OR document_id IN (
          SELECT d.id 
          FROM documents d
          JOIN matter_access ma ON d.matter_id = ma.matter_id
          WHERE ma.user_id = auth.uid() AND ma.can_manage = true
        )
      ELSE true
    END
  );

-- Policies for related tables
CREATE POLICY comment_reactions_access_policy ON comment_reactions
  FOR ALL
  USING (
    comment_id IN (
      SELECT dc.id 
      FROM document_comments dc
      JOIN documents d ON dc.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

CREATE POLICY comment_notifications_access_policy ON comment_notifications
  FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY comment_history_access_policy ON comment_history
  FOR ALL
  USING (
    comment_id IN (
      SELECT dc.id 
      FROM document_comments dc
      JOIN documents d ON dc.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

-- Function to generate thread ID for new comment threads
CREATE OR REPLACE FUNCTION generate_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If this is a top-level comment (no parent), generate new thread ID
  IF NEW.parent_comment_id IS NULL AND NEW.thread_id IS NULL THEN
    NEW.thread_id := NEW.id;
    NEW.is_thread_starter := true;
  -- If this is a reply, inherit thread ID from parent
  ELSIF NEW.parent_comment_id IS NOT NULL THEN
    SELECT thread_id INTO NEW.thread_id
    FROM document_comments
    WHERE id = NEW.parent_comment_id;
    
    NEW.is_thread_starter := false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_thread_trigger
  BEFORE INSERT ON document_comments
  FOR EACH ROW
  EXECUTE FUNCTION generate_thread_id();

-- Function to track comment edits
CREATE OR REPLACE FUNCTION track_comment_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- Only track if content actually changed
  IF OLD.content != NEW.content THEN
    INSERT INTO comment_history (
      comment_id,
      previous_content,
      edited_by,
      change_summary
    ) VALUES (
      NEW.id,
      OLD.content,
      auth.uid(),
      'Content updated'
    );
    
    NEW.updated_at := NOW();
    NEW.updated_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_edit_tracking_trigger
  BEFORE UPDATE ON document_comments
  FOR EACH ROW
  EXECUTE FUNCTION track_comment_edits();

-- Function to create notifications for new comments
CREATE OR REPLACE FUNCTION create_comment_notifications()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_user UUID;
  document_owner UUID;
  matter_users UUID[];
BEGIN
  -- Notify mentioned users
  IF NEW.mentions IS NOT NULL AND array_length(NEW.mentions, 1) > 0 THEN
    FOREACH mentioned_user IN ARRAY NEW.mentions
    LOOP
      IF mentioned_user != NEW.created_by THEN
        INSERT INTO comment_notifications (
          comment_id,
          user_id,
          notification_type
        ) VALUES (
          NEW.id,
          mentioned_user,
          'mention'
        );
      END IF;
    END LOOP;
  END IF;
  
  -- Notify document stakeholders
  SELECT ARRAY_AGG(DISTINCT ma.user_id)
  INTO matter_users
  FROM documents d
  JOIN matter_access ma ON d.matter_id = ma.matter_id
  WHERE d.id = NEW.document_id
    AND ma.user_id != NEW.created_by;
  
  -- Create notifications for matter users
  IF matter_users IS NOT NULL THEN
    INSERT INTO comment_notifications (comment_id, user_id, notification_type)
    SELECT NEW.id, unnest(matter_users), 'new_comment';
  END IF;
  
  -- If this is a reply, notify the parent comment author
  IF NEW.parent_comment_id IS NOT NULL THEN
    INSERT INTO comment_notifications (
      comment_id,
      user_id,
      notification_type
    )
    SELECT 
      NEW.id,
      dc.created_by,
      'reply'
    FROM document_comments dc
    WHERE dc.id = NEW.parent_comment_id
      AND dc.created_by != NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_notification_trigger
  AFTER INSERT ON document_comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notifications();

-- Function to resolve comment threads
CREATE OR REPLACE FUNCTION resolve_comment_thread(
  p_comment_id UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  thread_id_val UUID;
  comments_updated INTEGER;
BEGIN
  -- Get the thread ID
  SELECT thread_id INTO thread_id_val
  FROM document_comments
  WHERE id = p_comment_id;
  
  IF thread_id_val IS NULL THEN
    RETURN false;
  END IF;
  
  -- Update all comments in the thread
  UPDATE document_comments
  SET 
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes
  WHERE thread_id = thread_id_val
    AND status = 'active';
  
  GET DIAGNOSTICS comments_updated = ROW_COUNT;
  
  -- Create notification for thread participants
  INSERT INTO comment_notifications (comment_id, user_id, notification_type)
  SELECT DISTINCT 
    p_comment_id,
    dc.created_by,
    'resolution'
  FROM document_comments dc
  WHERE dc.thread_id = thread_id_val
    AND dc.created_by != auth.uid();
  
  RETURN comments_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get comment thread
CREATE OR REPLACE FUNCTION get_comment_thread(p_thread_id UUID)
RETURNS TABLE (
  comment_id UUID,
  content TEXT,
  comment_type comment_type,
  status comment_status,
  created_by UUID,
  created_at TIMESTAMPTZ,
  parent_comment_id UUID,
  reactions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    dc.comment_type,
    dc.status,
    dc.created_by,
    dc.created_at,
    dc.parent_comment_id,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'reaction_type', cr.reaction_type,
            'emoji', cr.emoji,
            'user_id', cr.user_id
          )
        )
        FROM comment_reactions cr
        WHERE cr.comment_id = dc.id
      ),
      '[]'::jsonb
    ) as reactions
  FROM document_comments dc
  WHERE dc.thread_id = p_thread_id
  ORDER BY dc.created_at;
END;
$$ LANGUAGE plpgsql;

-- View for comment analytics
CREATE VIEW comment_analytics AS
SELECT 
  d.id as document_id,
  d.title as document_title,
  COUNT(dc.id) as total_comments,
  COUNT(dc.id) FILTER (WHERE dc.status = 'active') as active_comments,
  COUNT(dc.id) FILTER (WHERE dc.status = 'resolved') as resolved_comments,
  COUNT(DISTINCT dc.thread_id) as total_threads,
  COUNT(DISTINCT dc.created_by) as unique_commenters,
  AVG(
    CASE WHEN dc.resolved_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (dc.resolved_at - dc.created_at)) / 3600 
    END
  ) as avg_resolution_time_hours,
  MAX(dc.created_at) as latest_comment_at
FROM documents d
LEFT JOIN document_comments dc ON d.id = dc.document_id
GROUP BY d.id, d.title;

COMMIT;
