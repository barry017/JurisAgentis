-- Create clients table for legal practice management
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  preferred_name VARCHAR(100),
  date_of_birth DATE,
  
  -- Contact Information
  email VARCHAR(255) UNIQUE,
  phone_primary VARCHAR(20),
  phone_secondary VARCHAR(20),
  
  -- Address Information
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'United States',
  
  -- Client Status and Type
  client_status VARCHAR(50) NOT NULL DEFAULT 'prospect' CHECK (
    client_status IN ('prospect', 'active', 'inactive', 'former', 'do_not_contact')
  ),
  client_type VARCHAR(50) NOT NULL DEFAULT 'individual' CHECK (
    client_type IN ('individual', 'business', 'estate', 'trust', 'non_profit', 'government')
  ),
  
  -- Business Information (for business clients)
  business_name VARCHAR(255),
  business_tax_id VARCHAR(50),
  business_type VARCHAR(100),
  
  -- Legal Practice Specific
  referral_source VARCHAR(255),
  practice_areas TEXT[], -- Array of practice areas
  conflict_check_date TIMESTAMP,
  conflict_check_status VARCHAR(50) DEFAULT 'pending' CHECK (
    conflict_check_status IN ('pending', 'cleared', 'conflict', 'waived')
  ),
  
  -- Communication Preferences
  communication_preference VARCHAR(50) DEFAULT 'email' CHECK (
    communication_preference IN ('email', 'phone', 'mail', 'secure_portal', 'no_contact')
  ),
  language_preference VARCHAR(50) DEFAULT 'english',
  
  -- Financial Information
  billing_rate DECIMAL(10,2),
  payment_terms INTEGER DEFAULT 30, -- Net payment days
  credit_limit DECIMAL(12,2),
  
  -- Internal Notes and Tags
  notes TEXT,
  tags TEXT[], -- Array of tags for categorization
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES user_profiles(uid),
  updated_by UUID NOT NULL REFERENCES user_profiles(uid),
  
  -- Soft delete
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES user_profiles(uid)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone_primary) WHERE phone_primary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(client_status);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients(client_type);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clients_business ON clients(business_name) WHERE business_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_practice_areas ON clients USING GIN(practice_areas);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(client_status, deleted_at) WHERE deleted_at IS NULL;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Create client contacts table for multiple contacts per client (e.g., spouse, business partners)
CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Contact Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  relationship VARCHAR(100), -- e.g., 'spouse', 'business_partner', 'attorney', 'accountant'
  title VARCHAR(100),
  
  -- Contact Details
  email VARCHAR(255),
  phone VARCHAR(20),
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  
  -- Preferences
  is_primary_contact BOOLEAN DEFAULT false,
  is_authorized_contact BOOLEAN DEFAULT false,
  communication_preference VARCHAR(50) DEFAULT 'email',
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES user_profiles(uid),
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Create indexes for client contacts
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_email ON client_contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_client_contacts_primary ON client_contacts(is_primary_contact) WHERE is_primary_contact = true;

-- Create trigger for client contacts updated_at
CREATE TRIGGER trigger_client_contacts_updated_at
  BEFORE UPDATE ON client_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_clients_updated_at();

-- Create function to get client full name
CREATE OR REPLACE FUNCTION get_client_full_name(client_row clients)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN client_row.preferred_name IS NOT NULL AND client_row.preferred_name != '' 
    THEN client_row.preferred_name || ' ' || client_row.last_name
    ELSE client_row.first_name || ' ' || client_row.last_name
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to get client display name (includes business name for business clients)
CREATE OR REPLACE FUNCTION get_client_display_name(client_row clients)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN client_row.client_type = 'business' AND client_row.business_name IS NOT NULL 
    THEN client_row.business_name || ' (' || get_client_full_name(client_row) || ')'
    ELSE get_client_full_name(client_row)
  END;
END;
$$ LANGUAGE plpgsql;