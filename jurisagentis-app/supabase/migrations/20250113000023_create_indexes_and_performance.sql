-- T036: Create additional indexes and performance optimizations
-- Migration: Document Management System - Performance & Optimization

BEGIN;

-- ==============================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ==============================================

-- Documents: Most common filtering combinations
CREATE INDEX idx_documents_matter_status_type ON documents(matter_id, status, document_type);
CREATE INDEX idx_documents_status_priority_date ON documents(status, priority, created_at);
CREATE INDEX idx_documents_user_status_date ON documents(created_by, status, created_at);
CREATE INDEX idx_documents_current_version_matter ON documents(matter_id, is_current_version) WHERE is_current_version = true;

-- Document access: Efficient permission checking
CREATE INDEX idx_document_access_user_active ON document_access(user_id, document_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_document_access_doc_permissions ON document_access(document_id, can_view, can_edit, can_manage) WHERE revoked_at IS NULL;

-- Document versions: Version history and comparison
CREATE INDEX idx_document_versions_doc_active ON document_versions(document_id, version_number) WHERE status = 'active';
CREATE INDEX idx_document_versions_doc_created ON document_versions(document_id, created_at);

-- Signature requests: Workflow tracking
CREATE INDEX idx_signature_requests_status_deadline ON signature_requests(status, signing_deadline);
CREATE INDEX idx_signature_requests_doc_status ON signature_requests(document_id, status);
CREATE INDEX idx_signature_request_signers_status_order ON signature_request_signers(signature_request_id, status, signing_order);

-- Document sharing: Portal access patterns
CREATE INDEX idx_document_sharing_token_status ON document_sharing(access_token, status) WHERE status = 'active';
CREATE INDEX idx_document_sharing_email_type ON document_sharing(recipient_email, share_type);
CREATE INDEX idx_document_sharing_expires ON document_sharing(expires_at) WHERE expires_at IS NOT NULL AND status = 'active';

-- Comments: Conversation threading
CREATE INDEX idx_document_comments_thread_created ON document_comments(thread_id, created_at) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_document_comments_doc_status_created ON document_comments(document_id, status, created_at);
CREATE INDEX idx_document_comments_user_created ON document_comments(created_by, created_at);

-- Templates: Usage and categorization
CREATE INDEX idx_document_templates_type_area_status ON document_templates(document_type, practice_area, status);
CREATE INDEX idx_document_templates_usage_date ON document_templates(usage_count, last_used_at) WHERE status = 'active';

-- Audit logs: Security and compliance queries
CREATE INDEX idx_audit_logs_entity_action_time ON audit_logs(entity_type, entity_id, action_type, timestamp);
CREATE INDEX idx_audit_logs_user_action_time ON audit_logs(user_id, action_type, timestamp);
CREATE INDEX idx_audit_logs_sensitive_time ON audit_logs(is_sensitive, timestamp) WHERE is_sensitive = true;

-- ==============================================
-- PARTIAL INDEXES FOR SPECIFIC CONDITIONS
-- ==============================================

-- Active/current records only
CREATE INDEX idx_documents_active_matters ON documents(matter_id, created_at) WHERE archived_at IS NULL;
CREATE INDEX idx_templates_active_by_type ON document_templates(document_type, usage_count) WHERE status = 'active';
CREATE INDEX idx_sharing_active_links ON document_sharing(document_id, created_at) WHERE status = 'active';

-- Expired/overdue items
CREATE INDEX idx_documents_active_due ON documents(due_date, status) WHERE status NOT IN ('executed', 'archived');
CREATE INDEX idx_signature_requests_active_deadline ON signature_requests(signing_deadline, status) WHERE status IN ('sent', 'pending', 'partially_signed');
CREATE INDEX idx_sharing_active_expiration ON document_sharing(expires_at, status) WHERE expires_at IS NOT NULL AND status = 'active';

-- High priority items
CREATE INDEX idx_documents_urgent ON documents(matter_id, created_at) WHERE priority = 'urgent';
CREATE INDEX idx_comments_urgent ON document_comments(document_id, created_at) WHERE priority = 'urgent' AND status = 'active';

-- ==============================================
-- EXPRESSION INDEXES FOR COMPUTED VALUES
-- ==============================================

-- Case-insensitive search on names/titles
CREATE INDEX idx_documents_title_lower ON documents(lower(title));
CREATE INDEX idx_templates_name_lower ON document_templates(lower(name));

-- JSON field extraction
CREATE INDEX idx_documents_auto_fields_client ON documents((auto_populated_fields->>'client_name')) WHERE auto_populated_fields ? 'client_name';
CREATE INDEX idx_search_metadata_matter ON search_index((metadata->>'matter_id')) WHERE metadata ? 'matter_id';

-- ==============================================
-- MATERIALIZED VIEWS FOR COMPLEX AGGREGATIONS
-- ==============================================

-- Document statistics by matter
CREATE MATERIALIZED VIEW mv_matter_document_stats AS
SELECT 
  d.matter_id,
  COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE d.status = 'draft') as draft_count,
  COUNT(*) FILTER (WHERE d.status = 'review') as review_count,
  COUNT(*) FILTER (WHERE d.status = 'executed') as executed_count,
  COUNT(*) FILTER (WHERE d.priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE d.due_date < NOW() AND d.status NOT IN ('executed', 'archived')) as overdue_count,
  MAX(d.created_at) as latest_document_at,
  SUM(COALESCE(d.file_size, 0)) as total_file_size
FROM documents d
WHERE d.archived_at IS NULL
GROUP BY d.matter_id;

CREATE UNIQUE INDEX idx_mv_matter_document_stats_matter ON mv_matter_document_stats(matter_id);

-- User activity summary
CREATE MATERIALIZED VIEW mv_user_activity_stats AS
SELECT 
  u.user_id,
  COUNT(DISTINCT al.entity_id) FILTER (WHERE al.entity_type = 'document' AND al.action_type = 'create') as documents_created,
  COUNT(DISTINCT al.entity_id) FILTER (WHERE al.entity_type = 'document' AND al.action_type = 'update') as documents_updated,
  COUNT(*) FILTER (WHERE al.action_type = 'add_comment') as comments_added,
  COUNT(*) FILTER (WHERE al.action_type = 'sign_document') as documents_signed,
  MAX(al.timestamp) as last_activity_at,
  COUNT(DISTINCT date_trunc('day', al.timestamp)) as active_days_count
FROM (
  SELECT DISTINCT user_id FROM audit_logs WHERE user_id IS NOT NULL
) u
LEFT JOIN audit_logs al ON u.user_id = al.user_id AND al.timestamp >= NOW() - INTERVAL '90 days'
GROUP BY u.user_id;

CREATE UNIQUE INDEX idx_mv_user_activity_stats_user ON mv_user_activity_stats(user_id);

-- Template usage analytics
CREATE MATERIALIZED VIEW mv_template_usage_stats AS
SELECT 
  dt.id as template_id,
  dt.name,
  dt.document_type,
  dt.practice_area,
  dt.usage_count,
  COUNT(d.id) as documents_generated,
  COUNT(d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as recent_usage,
  AVG(CASE WHEN sr.completion_percentage IS NOT NULL THEN sr.completion_percentage ELSE NULL END) as avg_completion_rate,
  MAX(d.created_at) as last_used_date
FROM document_templates dt
LEFT JOIN documents d ON dt.id = d.template_id
LEFT JOIN signature_requests sr ON d.id = sr.document_id
WHERE dt.status = 'active'
GROUP BY dt.id, dt.name, dt.document_type, dt.practice_area, dt.usage_count;

CREATE UNIQUE INDEX idx_mv_template_usage_stats_template ON mv_template_usage_stats(template_id);

-- ==============================================
-- PERFORMANCE MONITORING VIEWS
-- ==============================================

-- ==============================================
-- FUNCTIONS FOR MAINTENANCE AND OPTIMIZATION
-- ==============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_matter_document_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_activity_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_usage_stats;
  
  -- Log the refresh operation
  PERFORM create_audit_log(
    'system_maintenance',
    'system',
    NULL,
    'Analytics materialized views refreshed',
    NULL,
    jsonb_build_object('views_refreshed', 3, 'refresh_time', NOW()),
    jsonb_build_object('automated', true),
    'low'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS VOID AS $$
DECLARE
  table_name TEXT;
BEGIN
  -- Analyze all document management tables
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename LIKE ANY(ARRAY['documents%', 'signature_%', 'search_%', 'audit_%', 'template_%'])
  LOOP
    EXECUTE 'ANALYZE ' || quote_ident(table_name);
  END LOOP;
  
  -- Log the analysis
  PERFORM create_audit_log(
    'system_maintenance',
    'system',
    NULL,
    'Table statistics updated',
    NULL,
    jsonb_build_object('tables_analyzed', 
      (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' 
       AND tablename LIKE ANY(ARRAY['documents%', 'signature_%', 'search_%', 'audit_%', 'template_%']))
    ),
    jsonb_build_object('automated', true),
    'low'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE (
  table_name TEXT,
  column_names TEXT,
  query_count BIGINT,
  suggested_index TEXT
) AS $$
BEGIN
  -- This is a simplified version - in production, you'd use pg_stat_statements
  -- and more sophisticated analysis
  RETURN QUERY
  SELECT 
    'documents'::TEXT,
    'matter_id, status'::TEXT,
    1000::BIGINT,
    'CREATE INDEX idx_documents_matter_status ON documents(matter_id, status)'::TEXT
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_documents_matter_status'
  );
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- AUTOMATIC MAINTENANCE TASKS
-- ==============================================

-- Function to cleanup old search queries
CREATE OR REPLACE FUNCTION cleanup_old_search_data()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
  temp_count INTEGER;
BEGIN
  -- Delete old search queries (keep 90 days)
  DELETE FROM search_queries 
  WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Clean up unused search suggestions
  DELETE FROM search_suggestions 
  WHERE usage_count = 0 AND created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_count := deleted_count + temp_count;
  
  -- Update search index for items marked for reindexing
  UPDATE search_index 
  SET needs_reindex = false,
      last_indexed_at = NOW()
  WHERE needs_reindex = true;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- DATABASE HEALTH MONITORING
-- ==============================================

-- View for index usage statistics
CREATE VIEW v_index_usage_stats AS
SELECT 
  schemaname,
  relname AS table_name,
  indexrelname AS index_name,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Never used'
    WHEN idx_scan < 10 THEN 'Rarely used'
    WHEN idx_scan < 100 THEN 'Moderately used'
    ELSE 'Frequently used'
  END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- View for table bloat estimation
CREATE VIEW v_table_bloat_estimate AS
SELECT 
  schemaname,
  relname AS table_name,
  n_live_tup,
  n_dead_tup,
  CASE 
    WHEN n_live_tup = 0 THEN 0
    ELSE ROUND((n_dead_tup::NUMERIC / NULLIF(n_live_tup, 0)::NUMERIC) * 100, 2)
  END as bloat_percentage,
  pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(relname))) as table_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

COMMIT;
