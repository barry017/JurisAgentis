-- Create pending registrations table for user registration workflow

-- Pending registrations table for new user signups awaiting approval
CREATE TABLE IF NOT EXISTS pending_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Personal Information
    email VARCHAR(320) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    
    -- Professional Information
    job_title VARCHAR(200) NOT NULL,
    organization VARCHAR(200),
    bar_number VARCHAR(50),
    
    -- System Access Request
    requested_role VARCHAR(50) NOT NULL DEFAULT 'assistant',
    request_reason TEXT NOT NULL,
    accept_communications BOOLEAN DEFAULT false,
    
    -- Authentication
    password_hash TEXT NOT NULL,
    
    -- Email Verification
    verification_token UUID NOT NULL,
    verification_token_expires TIMESTAMP WITH TIME ZONE NOT NULL,
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Registration Status
    registration_status VARCHAR(50) DEFAULT 'pending_verification', 
    -- 'pending_verification', 'pending_approval', 'approved', 'rejected', 'expired'
    
    -- Admin Review
    reviewed_by UUID REFERENCES user_profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    rejection_reason TEXT,
    
    -- Final User Account
    approved_user_id UUID REFERENCES user_profiles(id),
    approved_role VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Email verification tokens table for additional security
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Token Information
    token UUID NOT NULL UNIQUE,
    token_type VARCHAR(50) NOT NULL, -- 'registration', 'password_reset', 'email_change'
    
    -- Associated Data
    email VARCHAR(320) NOT NULL,
    pending_registration_id UUID REFERENCES pending_registrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Token Status
    used BOOLEAN DEFAULT false,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_ip VARCHAR(45),
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notifications table for registration workflow
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification Details
    notification_type VARCHAR(100) NOT NULL, -- 'new_registration', 'user_approved', 'system_alert'
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    
    -- Associated Records
    pending_registration_id UUID REFERENCES pending_registrations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    
    -- Recipient
    recipient_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    
    -- Status
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    dismissed BOOLEAN DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    
    -- Action Taken
    action_taken VARCHAR(100), -- 'approved', 'rejected', 'contacted_user', etc.
    action_taken_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Create indexes for performance
CREATE INDEX idx_pending_registrations_email ON pending_registrations(email);
CREATE INDEX idx_pending_registrations_status ON pending_registrations(registration_status);
CREATE INDEX idx_pending_registrations_verification_token ON pending_registrations(verification_token);
CREATE INDEX idx_pending_registrations_expires_at ON pending_registrations(expires_at);

CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX idx_email_verification_tokens_email ON email_verification_tokens(email);
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

CREATE INDEX idx_admin_notifications_recipient ON admin_notifications(recipient_id, read);
CREATE INDEX idx_admin_notifications_type ON admin_notifications(notification_type);
CREATE INDEX idx_admin_notifications_created_at ON admin_notifications(created_at);

-- Enable Row Level Security
ALTER TABLE pending_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pending_registrations

-- Public access for creating new registrations (no auth required)
CREATE POLICY "Anyone can create registration request" ON pending_registrations
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own pending registration
CREATE POLICY "Users can view own pending registration" ON pending_registrations
  FOR SELECT 
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

-- Admins can view and manage all pending registrations
CREATE POLICY "Admins can manage pending registrations" ON pending_registrations
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- RLS Policies for email_verification_tokens

-- Public access for token verification (no auth required for email verification)
CREATE POLICY "Anyone can verify tokens" ON email_verification_tokens
  FOR SELECT 
  TO anon, authenticated
  USING (expires_at > NOW() AND used = false);

-- System can create verification tokens
CREATE POLICY "System can create verification tokens" ON email_verification_tokens
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- System can update tokens when used
CREATE POLICY "System can mark tokens as used" ON email_verification_tokens
  FOR UPDATE 
  TO anon, authenticated
  USING (true);

-- RLS Policies for admin_notifications

-- Admins can view notifications sent to them
CREATE POLICY "Admins can view their notifications" ON admin_notifications
  FOR SELECT 
  TO authenticated
  USING (
    recipient_id = (auth.jwt() ->> 'sub')::UUID AND
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- System can create notifications
CREATE POLICY "System can create admin notifications" ON admin_notifications
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    get_user_role(recipient_id) = 'admin'
  );

-- Admins can update their own notifications
CREATE POLICY "Admins can update their notifications" ON admin_notifications
  FOR UPDATE 
  TO authenticated
  USING (
    recipient_id = (auth.jwt() ->> 'sub')::UUID AND
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- Function to clean up expired registrations
CREATE OR REPLACE FUNCTION cleanup_expired_registrations()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Delete expired pending registrations
  DELETE FROM pending_registrations 
  WHERE expires_at < NOW() 
    OR (registration_status = 'pending_verification' AND verification_token_expires < NOW());
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Clean up expired verification tokens
  DELETE FROM email_verification_tokens 
  WHERE expires_at < NOW();
  
  -- Clean up old notifications
  DELETE FROM admin_notifications 
  WHERE expires_at < NOW() AND dismissed = true;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create admin notification when new registration is submitted
CREATE OR REPLACE FUNCTION notify_admins_of_new_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all admin users
  INSERT INTO admin_notifications (
    notification_type,
    title,
    message,
    priority,
    pending_registration_id,
    recipient_id
  )
  SELECT 
    'new_registration',
    'New User Registration Pending Approval',
    format('New user registration from %s %s (%s) requesting %s role. Job title: %s', 
           NEW.first_name, NEW.last_name, NEW.email, NEW.requested_role, NEW.job_title),
    'normal',
    NEW.id,
    up.id
  FROM user_profiles up
  WHERE get_user_role(up.id) = 'admin'
    AND up.status = 'active';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create admin notifications for new registrations
CREATE TRIGGER trigger_notify_admins_new_registration
  AFTER INSERT ON pending_registrations
  FOR EACH ROW
  WHEN (NEW.registration_status = 'pending_verification')
  EXECUTE FUNCTION notify_admins_of_new_registration();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_pending_registration_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating timestamps
CREATE TRIGGER trigger_update_pending_registration_timestamp
  BEFORE UPDATE ON pending_registrations
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_registration_timestamp();
