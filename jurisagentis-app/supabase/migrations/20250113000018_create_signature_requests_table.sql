-- T031: Create signature requests table for DocuSign integration
-- Migration: Document Management System - E-Signatures

BEGIN;

-- Create enum types for signatures
CREATE TYPE signature_status AS ENUM (
  'draft',
  'sent',
  'pending',
  'partially_signed',
  'completed',
  'declined',
  'cancelled',
  'expired'
);

CREATE TYPE signer_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'signed',
  'declined',
  'auto_responded'
);

CREATE TYPE reminder_frequency AS ENUM (
  'daily',
  'every_2_days',
  'weekly',
  'custom'
);

-- Create signature_requests table
CREATE TABLE signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- DocuSign integration
  docusign_envelope_id VARCHAR(255) UNIQUE,
  docusign_status VARCHAR(100),
  
  -- Request metadata
  status signature_status NOT NULL DEFAULT 'draft',
  subject VARCHAR(500),
  message TEXT,
  
  -- Signing configuration
  signing_deadline TIMESTAMPTZ,
  require_id_verification BOOLEAN DEFAULT false,
  allow_markup BOOLEAN DEFAULT true,
  sequential_signing BOOLEAN DEFAULT false,
  
  -- Reminders
  remind_after_days INTEGER DEFAULT 3,
  reminder_frequency reminder_frequency DEFAULT 'every_2_days',
  max_reminders INTEGER DEFAULT 3,
  reminder_count INTEGER DEFAULT 0,
  
  -- Completion tracking
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  first_signed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- URLs and access
  signing_url TEXT,
  sender_view_url TEXT,
  signed_document_url TEXT,
  
  -- Audit trail
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT
);

-- Create signature_request_signers table
CREATE TABLE signature_request_signers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  
  -- Signer information
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  role VARCHAR(100), -- e.g., 'grantor', 'witness', 'notary'
  
  -- DocuSign integration
  docusign_recipient_id VARCHAR(255),
  docusign_client_user_id VARCHAR(255),
  
  -- Signing configuration
  signing_order INTEGER NOT NULL DEFAULT 1,
  status signer_status NOT NULL DEFAULT 'pending',
  
  -- Access and authentication
  access_code VARCHAR(50),
  id_verification_required BOOLEAN DEFAULT false,
  
  -- Signing details
  signing_url TEXT,
  embedded_signing_url TEXT,
  signed_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  decline_reason TEXT,
  
  -- IP and location tracking
  ip_address INET,
  location_info JSONB,
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  
  -- Notes and custom fields
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create signature_fields table for signature placement
CREATE TABLE signature_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL REFERENCES signature_request_signers(id) ON DELETE CASCADE,
  
  -- Field positioning
  page_number INTEGER NOT NULL,
  x_position INTEGER NOT NULL,
  y_position INTEGER NOT NULL,
  width INTEGER DEFAULT 100,
  height INTEGER DEFAULT 50,
  
  -- Field type and properties
  field_type VARCHAR(50) NOT NULL DEFAULT 'signature', -- signature, initial, date, text, checkbox
  field_label VARCHAR(255),
  
  -- Field requirements
  is_required BOOLEAN DEFAULT true,
  tab_order INTEGER,
  
  -- DocuSign integration
  docusign_tab_id VARCHAR(255),
  
  -- Value and completion
  field_value TEXT,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create signature_events table for detailed audit trail
CREATE TABLE signature_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES signature_request_signers(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(100) NOT NULL, -- sent, delivered, signed, viewed, etc.
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Event metadata
  ip_address INET,
  user_agent TEXT,
  location_info JSONB,
  
  -- DocuSign event data
  docusign_event_data JSONB,
  
  -- Additional context
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_signature_requests_document_id ON signature_requests(document_id);
CREATE INDEX idx_signature_requests_status ON signature_requests(status);
CREATE INDEX idx_signature_requests_docusign_envelope ON signature_requests(docusign_envelope_id);
CREATE INDEX idx_signature_requests_deadline ON signature_requests(signing_deadline);
CREATE INDEX idx_signature_requests_created_at ON signature_requests(created_at);

CREATE INDEX idx_signature_request_signers_request_id ON signature_request_signers(signature_request_id);
CREATE INDEX idx_signature_request_signers_email ON signature_request_signers(email);
CREATE INDEX idx_signature_request_signers_status ON signature_request_signers(status);
CREATE INDEX idx_signature_request_signers_order ON signature_request_signers(signature_request_id, signing_order);

CREATE INDEX idx_signature_fields_request_id ON signature_fields(signature_request_id);
CREATE INDEX idx_signature_fields_signer_id ON signature_fields(signer_id);
CREATE INDEX idx_signature_fields_page ON signature_fields(page_number);

CREATE INDEX idx_signature_events_request_id ON signature_events(signature_request_id);
CREATE INDEX idx_signature_events_type ON signature_events(event_type);
CREATE INDEX idx_signature_events_timestamp ON signature_events(event_timestamp);

-- Row Level Security
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_request_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_events ENABLE ROW LEVEL SECURITY;

-- Policies for signature_requests
CREATE POLICY signature_requests_access_policy ON signature_requests
  FOR ALL
  USING (
    document_id IN (
      SELECT d.id 
      FROM documents d
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

-- Policies for related tables (inherit from signature_requests)
CREATE POLICY signature_request_signers_access_policy ON signature_request_signers
  FOR ALL
  USING (
    signature_request_id IN (
      SELECT sr.id 
      FROM signature_requests sr
      JOIN documents d ON sr.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

CREATE POLICY signature_fields_access_policy ON signature_fields
  FOR ALL
  USING (
    signature_request_id IN (
      SELECT sr.id 
      FROM signature_requests sr
      JOIN documents d ON sr.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

CREATE POLICY signature_events_access_policy ON signature_events
  FOR ALL
  USING (
    signature_request_id IN (
      SELECT sr.id 
      FROM signature_requests sr
      JOIN documents d ON sr.document_id = d.id
      JOIN matter_access ma ON d.matter_id = ma.matter_id
      WHERE ma.user_id = auth.uid() 
        AND (ma.can_view = true OR ma.can_edit = true OR ma.can_manage = true)
    )
  );

-- Update triggers
CREATE OR REPLACE FUNCTION update_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_requests_updated_at_trigger
  BEFORE UPDATE ON signature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_requests_updated_at();

-- Function to update completion percentage
CREATE OR REPLACE FUNCTION update_signature_completion_percentage()
RETURNS TRIGGER AS $$
DECLARE
  total_signers INTEGER;
  completed_signers INTEGER;
  new_percentage DECIMAL(5,2);
BEGIN
  -- Get counts for the signature request
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'signed')
  INTO total_signers, completed_signers
  FROM signature_request_signers
  WHERE signature_request_id = COALESCE(NEW.signature_request_id, OLD.signature_request_id);
  
  -- Calculate percentage
  IF total_signers > 0 THEN
    new_percentage := (completed_signers::DECIMAL / total_signers) * 100;
  ELSE
    new_percentage := 0;
  END IF;
  
  -- Update signature request
  UPDATE signature_requests
  SET 
    completion_percentage = new_percentage,
    status = CASE 
      WHEN new_percentage = 100 THEN 'completed'
      WHEN new_percentage > 0 THEN 'partially_signed'
      ELSE status
    END,
    completed_at = CASE 
      WHEN new_percentage = 100 AND completed_at IS NULL THEN NOW()
      ELSE completed_at
    END
  WHERE id = COALESCE(NEW.signature_request_id, OLD.signature_request_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_completion_trigger
  AFTER INSERT OR UPDATE OR DELETE ON signature_request_signers
  FOR EACH ROW
  EXECUTE FUNCTION update_signature_completion_percentage();

-- Function to log signature events
CREATE OR REPLACE FUNCTION log_signature_event(
  p_signature_request_id UUID,
  p_event_type VARCHAR,
  p_signer_id UUID DEFAULT NULL,
  p_docusign_data JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO signature_events (
    signature_request_id,
    signer_id,
    event_type,
    docusign_event_data,
    ip_address,
    notes
  ) VALUES (
    p_signature_request_id,
    p_signer_id,
    p_event_type,
    p_docusign_data,
    p_ip_address,
    p_notes
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- View for signature request summary
CREATE VIEW signature_request_summary AS
SELECT 
  sr.*,
  d.title as document_title,
  d.matter_id,
  (
    SELECT COUNT(*) 
    FROM signature_request_signers srs 
    WHERE srs.signature_request_id = sr.id
  ) as total_signers,
  (
    SELECT COUNT(*) 
    FROM signature_request_signers srs 
    WHERE srs.signature_request_id = sr.id AND srs.status = 'signed'
  ) as signed_count,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', srs.id,
        'name', srs.name,
        'email', srs.email,
        'role', srs.role,
        'status', srs.status,
        'signing_order', srs.signing_order,
        'signed_at', srs.signed_at
      ) ORDER BY srs.signing_order
    )
    FROM signature_request_signers srs 
    WHERE srs.signature_request_id = sr.id
  ) as signers
FROM signature_requests sr
JOIN documents d ON sr.document_id = d.id;

COMMIT;
