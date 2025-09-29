-- T035: Create search index table for advanced document search capabilities
-- Migration: Document Management System - Search & Discovery

BEGIN;

-- Ensure pgvector extension is available for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum types for search
CREATE TYPE search_index_type AS ENUM (
  'document_content',
  'document_metadata',
  'template_content',
  'comment_content',
  'user_content',
  'matter_content'
);

CREATE TYPE content_language AS ENUM (
  'english',
  'spanish',
  'french',
  'german',
  'simple' -- Simple dictionary for mixed content
);

-- Create search_index table for full-text search
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity information
  entity_type search_index_type NOT NULL,
  entity_id UUID NOT NULL,
  
  -- Content for searching
  title TEXT,
  content TEXT NOT NULL,
  content_language content_language DEFAULT 'english',
  
  -- Searchable metadata
  tags TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  practice_areas TEXT[] DEFAULT '{}',
  document_types TEXT[] DEFAULT '{}',
  
  -- Structured data for filtering
  metadata JSONB DEFAULT '{}',
  
  -- Search vectors for different languages/configurations
  search_vector_english TSVECTOR,
  search_vector_simple TSVECTOR,
  search_vector_title TSVECTOR,
  
  -- Boost and relevance scoring
  content_boost DECIMAL(3,2) DEFAULT 1.0, -- Multiplier for relevance scoring
  quality_score DECIMAL(3,2) DEFAULT 1.0, -- Content quality indicator
  recency_boost DECIMAL(3,2) DEFAULT 1.0, -- Boost for recent content
  
  -- Content analysis
  word_count INTEGER,
  unique_words INTEGER,
  reading_level INTEGER, -- Flesch reading ease score
  
  -- Access control for search results
  is_public BOOLEAN DEFAULT false,
  access_level VARCHAR(50) DEFAULT 'private', -- public, internal, restricted, private
  allowed_roles TEXT[] DEFAULT '{}',
  
  -- Indexing metadata
  last_indexed_at TIMESTAMPTZ DEFAULT NOW(),
  index_version INTEGER DEFAULT 1,
  needs_reindex BOOLEAN DEFAULT false,
  
  -- Performance tracking
  search_count INTEGER DEFAULT 0, -- How often this item is found in searches
  click_count INTEGER DEFAULT 0, -- How often search results are clicked
  last_accessed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(entity_type, entity_id)
);

-- Create search_queries table to track search analytics
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Query details
  query_text TEXT NOT NULL,
  query_hash VARCHAR(64), -- Hash of normalized query for deduplication
  
  -- Search parameters
  filters JSONB DEFAULT '{}',
  sort_criteria JSONB DEFAULT '{}',
  entity_types search_index_type[],
  
  -- User and session context
  user_id UUID REFERENCES auth.users(id),
  session_id VARCHAR(255),
  ip_address INET,
  
  -- Results and performance
  results_count INTEGER NOT NULL,
  execution_time_ms INTEGER,
  
  -- User behavior
  clicked_results UUID[], -- Array of entity_ids that were clicked
  clicked_position INTEGER[], -- Position of clicked results
  session_duration INTEGER, -- Time spent reviewing results
  
  -- Search quality metrics
  zero_results BOOLEAN DEFAULT false,
  reformulated_query TEXT, -- If user modified their search
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create search_suggestions table for autocomplete and query suggestions
CREATE TABLE search_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Suggestion content
  suggestion_text VARCHAR(255) NOT NULL,
  suggestion_type VARCHAR(50) NOT NULL, -- query, tag, category, entity_name
  
  -- Context and relevance
  context_entity_type search_index_type,
  popularity_score DECIMAL(5,2) DEFAULT 0.0,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Quality and filtering
  is_active BOOLEAN DEFAULT true,
  quality_rating DECIMAL(3,2) DEFAULT 1.0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(suggestion_text, suggestion_type)
);

-- Create semantic_embeddings table for AI-powered semantic search
CREATE TABLE semantic_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference to indexed content
  search_index_id UUID NOT NULL REFERENCES search_index(id) ON DELETE CASCADE,
  
  -- Embedding data
  embedding_vector VECTOR(1536), -- OpenAI embedding dimension
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
  embedding_version INTEGER DEFAULT 1,
  
  -- Content chunks for large documents
  chunk_index INTEGER DEFAULT 0,
  chunk_text TEXT,
  chunk_token_count INTEGER,
  
  -- Semantic metadata
  semantic_tags TEXT[] DEFAULT '{}',
  topic_categories TEXT[] DEFAULT '{}',
  key_concepts TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(search_index_id, chunk_index)
);

-- Create indexes for optimal search performance
CREATE INDEX idx_search_index_entity ON search_index(entity_type, entity_id);
CREATE INDEX idx_search_index_boost ON search_index(content_boost, quality_score);
CREATE INDEX idx_search_index_access ON search_index(is_public, access_level);
CREATE INDEX idx_search_index_language ON search_index(content_language);
CREATE INDEX idx_search_index_needs_reindex ON search_index(needs_reindex) WHERE needs_reindex = true;
CREATE INDEX idx_search_index_tags ON search_index USING GIN(tags);
CREATE INDEX idx_search_index_categories ON search_index USING GIN(categories);
CREATE INDEX idx_search_index_metadata ON search_index USING GIN(metadata);

-- Full-text search indexes with different configurations
CREATE INDEX idx_search_vector_english ON search_index USING GIN(search_vector_english);
CREATE INDEX idx_search_vector_simple ON search_index USING GIN(search_vector_simple);
CREATE INDEX idx_search_vector_title ON search_index USING GIN(search_vector_title);

-- Search queries indexes
CREATE INDEX idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX idx_search_queries_query_hash ON search_queries(query_hash);
CREATE INDEX idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX idx_search_queries_zero_results ON search_queries(zero_results) WHERE zero_results = true;

-- Search suggestions indexes
CREATE INDEX idx_search_suggestions_text ON search_suggestions(suggestion_text);
CREATE INDEX idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX idx_search_suggestions_popularity ON search_suggestions(popularity_score DESC);
CREATE INDEX idx_search_suggestions_active ON search_suggestions(is_active) WHERE is_active = true;

-- Semantic embeddings indexes
CREATE INDEX idx_semantic_embeddings_search_index ON semantic_embeddings(search_index_id);
CREATE INDEX idx_semantic_embeddings_vector ON semantic_embeddings USING ivfflat (embedding_vector vector_cosine_ops);

-- Row Level Security
ALTER TABLE search_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_embeddings ENABLE ROW LEVEL SECURITY;

-- Policies for search_index
CREATE POLICY search_index_access_policy ON search_index
  FOR SELECT
  USING (
    is_public = true
    OR
    (entity_type = 'document_content' AND entity_id IN (
      SELECT d.id 
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    ))
    OR
    (entity_type = 'comment_content' AND entity_id IN (
      SELECT dc.id 
      FROM document_comments dc
      JOIN documents d ON dc.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    ))
    -- Add similar conditions for other entity types
  );

-- Policies for search_queries (users can see their own queries)
CREATE POLICY search_queries_access_policy ON search_queries
  FOR ALL
  USING (user_id = auth.uid());

-- Policies for search_suggestions (public)
CREATE POLICY search_suggestions_access_policy ON search_suggestions
  FOR SELECT
  USING (is_active = true);

-- Policies for semantic_embeddings (follows search_index access)
CREATE POLICY semantic_embeddings_access_policy ON semantic_embeddings
  FOR SELECT
  USING (
    search_index_id IN (
      SELECT id FROM search_index WHERE true -- Inherits from search_index policy
    )
  );

-- Function to update search index for documents
CREATE OR REPLACE FUNCTION update_document_search_index()
RETURNS TRIGGER AS $$
DECLARE
  content_text TEXT;
  title_text TEXT;
  tags_array TEXT[];
  categories_array TEXT[];
BEGIN
  -- Extract searchable content
  title_text := COALESCE(NEW.title, OLD.title);
  content_text := COALESCE(
    title_text || ' ' ||
    COALESCE(NEW.description, OLD.description, '') || ' ' ||
    COALESCE(NEW.content_summary, OLD.content_summary, '') || ' ' ||
    array_to_string(COALESCE(NEW.tags, OLD.tags, '{}'), ' ')
  );
  
  tags_array := COALESCE(NEW.tags, OLD.tags, '{}');
  categories_array := ARRAY[COALESCE(NEW.document_type::text, OLD.document_type::text)];
  
  IF TG_OP = 'DELETE' THEN
    DELETE FROM search_index 
    WHERE entity_type = 'document_content' AND entity_id = OLD.id;
    RETURN OLD;
  END IF;
  
  -- Upsert search index entry
  INSERT INTO search_index (
    entity_type,
    entity_id,
    title,
    content,
    tags,
    categories,
    document_types,
    metadata,
    word_count,
    content_boost,
    quality_score
  ) VALUES (
    'document_content',
    NEW.id,
    title_text,
    content_text,
    tags_array,
    categories_array,
    ARRAY[NEW.document_type::text],
    jsonb_build_object(
      'matter_id', NEW.matter_id,
      'status', NEW.status,
      'priority', NEW.priority,
      'created_at', NEW.created_at
    ),
    array_length(string_to_array(content_text, ' '), 1),
    CASE 
      WHEN NEW.priority = 'urgent' THEN 1.5
      WHEN NEW.priority = 'high' THEN 1.2
      ELSE 1.0
    END,
    CASE 
      WHEN NEW.status = 'executed' THEN 1.3
      WHEN NEW.status = 'review' THEN 1.1
      ELSE 1.0
    END
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    tags = EXCLUDED.tags,
    categories = EXCLUDED.categories,
    document_types = EXCLUDED.document_types,
    metadata = EXCLUDED.metadata,
    word_count = EXCLUDED.word_count,
    content_boost = EXCLUDED.content_boost,
    quality_score = EXCLUDED.quality_score,
    needs_reindex = true,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for document search indexing
CREATE TRIGGER update_document_search_index_trigger
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_document_search_index();

-- Function to update search vectors
CREATE OR REPLACE FUNCTION update_search_vectors()
RETURNS TRIGGER AS $$
BEGIN
  -- Update search vectors when content changes
  NEW.search_vector_english := to_tsvector('english', 
    COALESCE(NEW.title, '') || ' ' || NEW.content
  );
  
  NEW.search_vector_simple := to_tsvector('simple', 
    COALESCE(NEW.title, '') || ' ' || NEW.content
  );
  
  NEW.search_vector_title := to_tsvector('english', 
    COALESCE(NEW.title, '')
  );
  
  NEW.last_indexed_at := NOW();
  NEW.needs_reindex := false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_search_vectors_trigger
  BEFORE INSERT OR UPDATE ON search_index
  FOR EACH ROW
  EXECUTE FUNCTION update_search_vectors();

-- Function to log search queries
CREATE OR REPLACE FUNCTION log_search_query(
  p_query_text TEXT,
  p_filters JSONB DEFAULT NULL,
  p_entity_types search_index_type[] DEFAULT NULL,
  p_results_count INTEGER DEFAULT 0,
  p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  query_id UUID;
  query_hash_val VARCHAR(64);
BEGIN
  -- Generate hash for query deduplication/analytics
  query_hash_val := encode(sha256(lower(trim(p_query_text))::bytea), 'hex');
  
  INSERT INTO search_queries (
    query_text,
    query_hash,
    filters,
    entity_types,
    user_id,
    results_count,
    execution_time_ms,
    zero_results
  ) VALUES (
    p_query_text,
    query_hash_val,
    COALESCE(p_filters, '{}'::jsonb),
    p_entity_types,
    auth.uid(),
    p_results_count,
    p_execution_time_ms,
    p_results_count = 0
  ) RETURNING id INTO query_id;
  
  -- Update search suggestions based on successful queries
  IF p_results_count > 0 THEN
    INSERT INTO search_suggestions (
      suggestion_text,
      suggestion_type,
      popularity_score,
      usage_count
    ) VALUES (
      p_query_text,
      'query',
      1.0,
      1
    )
    ON CONFLICT (suggestion_text, suggestion_type) DO UPDATE SET
      usage_count = search_suggestions.usage_count + 1,
      popularity_score = search_suggestions.popularity_score + 0.1,
      last_used_at = NOW();
  END IF;
  
  RETURN query_id;
END;
$$ LANGUAGE plpgsql;

-- Function for advanced search with ranking
CREATE OR REPLACE FUNCTION advanced_search(
  p_query TEXT,
  p_entity_types search_index_type[] DEFAULT NULL,
  p_filters JSONB DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  entity_id UUID,
  entity_type search_index_type,
  title TEXT,
  content_snippet TEXT,
  relevance_score REAL,
  metadata JSONB
) AS $$
DECLARE
  search_start_time TIMESTAMPTZ;
  execution_time INTEGER;
  results_count INTEGER;
BEGIN
  search_start_time := clock_timestamp();
  
  RETURN QUERY
  SELECT 
    si.entity_id,
    si.entity_type,
    si.title,
    ts_headline('english', si.content, plainto_tsquery('english', p_query)) as content_snippet,
    (
      ts_rank_cd(si.search_vector_english, plainto_tsquery('english', p_query)) * si.content_boost * si.quality_score * si.recency_boost +
      ts_rank_cd(si.search_vector_title, plainto_tsquery('english', p_query)) * 2.0 -- Title matches get double weight
    ) as relevance_score,
    si.metadata
  FROM search_index si
  WHERE 
    (p_entity_types IS NULL OR si.entity_type = ANY(p_entity_types))
    AND (
      si.search_vector_english @@ plainto_tsquery('english', p_query)
      OR si.search_vector_simple @@ plainto_tsquery('simple', p_query)
    )
    AND (
      p_filters IS NULL 
      OR (
        (p_filters ? 'tags' AND si.tags && (p_filters->>'tags')::TEXT[])
        OR (p_filters ? 'categories' AND si.categories && (p_filters->>'categories')::TEXT[])
        OR (p_filters ? 'document_types' AND si.document_types && (p_filters->>'document_types')::TEXT[])
      )
    )
  ORDER BY relevance_score DESC
  LIMIT p_limit
  OFFSET p_offset;
  
  -- Log the search query
  GET DIAGNOSTICS results_count = ROW_COUNT;
  execution_time := EXTRACT(MILLISECONDS FROM (clock_timestamp() - search_start_time));
  
  PERFORM log_search_query(
    p_query,
    p_filters,
    p_entity_types,
    results_count,
    execution_time
  );
END;
$$ LANGUAGE plpgsql;

-- Function for semantic search using embeddings
CREATE OR REPLACE FUNCTION semantic_search(
  p_query_embedding VECTOR(1536),
  p_similarity_threshold REAL DEFAULT 0.7,
  p_entity_types search_index_type[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  entity_id UUID,
  entity_type search_index_type,
  title TEXT,
  similarity_score REAL,
  chunk_text TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.entity_id,
    si.entity_type,
    si.title,
    1 - (se.embedding_vector <=> p_query_embedding) as similarity_score,
    se.chunk_text
  FROM semantic_embeddings se
  JOIN search_index si ON se.search_index_id = si.id
  WHERE 
    (p_entity_types IS NULL OR si.entity_type = ANY(p_entity_types))
    AND (1 - (se.embedding_vector <=> p_query_embedding)) >= p_similarity_threshold
  ORDER BY se.embedding_vector <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- View for search analytics
CREATE VIEW search_analytics AS
SELECT 
  date_trunc('day', created_at) as search_date,
  COUNT(*) as total_searches,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE zero_results = true) as zero_result_searches,
  AVG(results_count) as avg_results_per_search,
  AVG(execution_time_ms) as avg_execution_time_ms,
  COUNT(*) FILTER (WHERE array_length(clicked_results, 1) > 0) as searches_with_clicks,
  array_agg(DISTINCT query_text ORDER BY query_text DESC) FILTER (WHERE results_count > 0) as top_queries
FROM search_queries
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)
ORDER BY search_date DESC;

COMMIT;
