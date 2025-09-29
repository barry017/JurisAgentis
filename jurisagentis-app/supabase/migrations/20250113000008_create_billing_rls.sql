-- Enable Row Level Security on billing tables
ALTER TABLE fee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Fee Schedules - Admin/Attorney full access" ON fee_schedules;
DROP POLICY IF EXISTS "Fee Schedules - Paralegal/Assistant read" ON fee_schedules;

DROP POLICY IF EXISTS "Matter Billing - Admin full access" ON matter_billing;
DROP POLICY IF EXISTS "Matter Billing - Attorney/Paralegal read/write assigned" ON matter_billing;
DROP POLICY IF EXISTS "Matter Billing - Assistant read assigned" ON matter_billing;

DROP POLICY IF EXISTS "Invoices - Admin full access" ON invoices;
DROP POLICY IF EXISTS "Invoices - Attorney/Paralegal read/write assigned" ON invoices;
DROP POLICY IF EXISTS "Invoices - Assistant read assigned" ON invoices;
DROP POLICY IF EXISTS "Invoices - Client read own invoices" ON invoices;

DROP POLICY IF EXISTS "Invoice Line Items - Same access as invoice" ON invoice_line_items;

DROP POLICY IF EXISTS "Payments - Admin full access" ON payments;
DROP POLICY IF EXISTS "Payments - Attorney/Paralegal read/write assigned" ON payments;
DROP POLICY IF EXISTS "Payments - Assistant read assigned" ON payments;

DROP POLICY IF EXISTS "Expenses - Admin full access" ON expenses;
DROP POLICY IF EXISTS "Expenses - Attorney/Paralegal read/write assigned" ON expenses;
DROP POLICY IF EXISTS "Expenses - Assistant read assigned" ON expenses;

DROP POLICY IF EXISTS "Time Entries - Admin full access" ON time_entries;
DROP POLICY IF EXISTS "Time Entries - Timekeeper read/write own entries" ON time_entries;
DROP POLICY IF EXISTS "Time Entries - Attorney/Paralegal read/write assigned" ON time_entries;

-- Helper function to check if user has access to billing for a matter
CREATE OR REPLACE FUNCTION user_has_billing_access(matter_id_param UUID, access_level TEXT DEFAULT 'read')
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_id UUID;
BEGIN
  -- Get current user info
  user_id := (auth.jwt() ->> 'sub')::UUID;
  user_role := get_user_role(user_id);
  
  -- Admin has full access to all billing
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Attorneys and paralegals have access to billing for matters they can access
  IF user_role IN ('associate_attorney', 'paralegal') THEN
    RETURN user_has_matter_access(matter_id_param);
  END IF;
  
  -- Assistants have read-only access to billing for matters they can access
  IF user_role = 'assistant' THEN
    IF access_level != 'read' THEN
      RETURN FALSE;
    END IF;
    RETURN user_has_matter_access(matter_id_param);
  END IF;
  
  -- Clients can view their own invoices and payments (read-only)
  IF user_role = 'client' THEN
    IF access_level != 'read' THEN
      RETURN FALSE;
    END IF;
    
    RETURN EXISTS (
      SELECT 1 FROM matters m
      JOIN clients c ON m.client_id = c.id
      JOIN user_profiles up ON c.email = up.email
      WHERE m.id = matter_id_param 
      AND up.id = user_id
      AND m.deleted_at IS NULL
      AND c.deleted_at IS NULL
    );
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can access financial information
CREATE OR REPLACE FUNCTION user_has_financial_access(access_level TEXT DEFAULT 'limited')
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_permissions JSONB;
  financial_access TEXT;
BEGIN
  user_role := get_user_role((auth.jwt() ->> 'sub')::UUID);
  
  -- Get user permissions
  SELECT get_user_permissions((auth.jwt() ->> 'sub')::UUID) INTO user_permissions;
  financial_access := user_permissions->>'financial';
  
  -- Admin always has full financial access
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Check permission level
  CASE access_level
    WHEN 'all' THEN
      RETURN financial_access IN ('all');
    WHEN 'limited' THEN
      RETURN financial_access IN ('all', 'limited');
    WHEN 'time_only' THEN
      RETURN financial_access IN ('all', 'limited', 'time_only');
    WHEN 'client_only' THEN
      RETURN financial_access IN ('all', 'limited', 'time_only', 'client_only');
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for fee_schedules table

-- Admin/Attorney: Full access to fee schedules
CREATE POLICY "Fee Schedules - Admin/Attorney full access" ON fee_schedules
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('admin', 'associate_attorney')
    AND user_has_financial_access('limited')
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('admin', 'associate_attorney')
  );

-- Paralegal/Assistant: Read-only access to active fee schedules
CREATE POLICY "Fee Schedules - Paralegal/Assistant read" ON fee_schedules
  FOR SELECT 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('paralegal', 'assistant')
    AND is_active = true
  );

-- RLS Policies for matter_billing table

-- Admin: Full access to all matter billing
CREATE POLICY "Matter Billing - Admin full access" ON matter_billing
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- Attorney/Paralegal: Read/write access to billing for assigned matters
CREATE POLICY "Matter Billing - Attorney/Paralegal read/write assigned" ON matter_billing
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
    AND user_has_financial_access('limited')
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
  );

-- Assistant: Read-only access to billing for assigned matters
CREATE POLICY "Matter Billing - Assistant read assigned" ON matter_billing
  FOR SELECT 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'assistant'
    AND user_has_billing_access(matter_id, 'read')
    AND user_has_financial_access('client_only')
  );

-- RLS Policies for invoices table

-- Admin: Full access to all invoices
CREATE POLICY "Invoices - Admin full access" ON invoices
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- Attorney/Paralegal: Read/write access to invoices for assigned matters
CREATE POLICY "Invoices - Attorney/Paralegal read/write assigned" ON invoices
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
    AND user_has_financial_access('limited')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
  );

-- Assistant: Read-only access to invoices for assigned matters
CREATE POLICY "Invoices - Assistant read assigned" ON invoices
  FOR SELECT 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'assistant'
    AND user_has_billing_access(matter_id, 'read')
    AND user_has_financial_access('client_only')
    AND deleted_at IS NULL
  );

-- Client: Read access to their own invoices
CREATE POLICY "Invoices - Client read own invoices" ON invoices
  FOR SELECT 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'client'
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN clients c ON c.email = up.email
      WHERE up.id = (auth.jwt() ->> 'sub')::UUID 
      AND c.id = invoices.client_id
      AND c.deleted_at IS NULL
    )
    AND status IN ('sent', 'viewed', 'partial_payment', 'paid', 'overdue')
    AND deleted_at IS NULL
  );

-- RLS Policies for invoice_line_items table

-- Same access as parent invoice
CREATE POLICY "Invoice Line Items - Same access as invoice" ON invoice_line_items
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices i
      WHERE i.id = invoice_line_items.invoice_id
    )
  );

-- RLS Policies for payments table

-- Admin: Full access to all payments
CREATE POLICY "Payments - Admin full access" ON payments
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- Attorney/Paralegal: Read/write access to payments for assigned matters
CREATE POLICY "Payments - Attorney/Paralegal read/write assigned" ON payments
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
    AND user_has_financial_access('limited')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
  );

-- Assistant: Read-only access to payments for assigned matters
CREATE POLICY "Payments - Assistant read assigned" ON payments
  FOR SELECT 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'assistant'
    AND user_has_billing_access(matter_id, 'read')
    AND user_has_financial_access('client_only')
    AND deleted_at IS NULL
  );

-- RLS Policies for expenses table

-- Admin: Full access to all expenses
CREATE POLICY "Expenses - Admin full access" ON expenses
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- Attorney/Paralegal: Read/write access to expenses for assigned matters
CREATE POLICY "Expenses - Attorney/Paralegal read/write assigned" ON expenses
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
  );

-- Assistant: Read-only access to expenses for assigned matters
CREATE POLICY "Expenses - Assistant read assigned" ON expenses
  FOR SELECT 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'assistant'
    AND user_has_billing_access(matter_id, 'read')
    AND deleted_at IS NULL
  );

-- RLS Policies for time_entries table

-- Admin: Full access to all time entries
CREATE POLICY "Time Entries - Admin full access" ON time_entries
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) = 'admin'
  );

-- Timekeeper: Read/write access to own time entries
CREATE POLICY "Time Entries - Timekeeper read/write own entries" ON time_entries
  FOR ALL 
  TO authenticated
  USING (
    timekeeper_id = (auth.jwt() ->> 'sub')::UUID
    AND user_has_billing_access(matter_id, 'read')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    timekeeper_id = (auth.jwt() ->> 'sub')::UUID
    AND user_has_billing_access(matter_id, 'read')
  );

-- Attorney/Paralegal: Read/write access to time entries for assigned matters
CREATE POLICY "Time Entries - Attorney/Paralegal read/write assigned" ON time_entries
  FOR ALL 
  TO authenticated
  USING (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
    AND user_has_financial_access('time_only')
    AND deleted_at IS NULL
  )
  WITH CHECK (
    get_user_role((auth.jwt() ->> 'sub')::UUID) IN ('associate_attorney', 'paralegal')
    AND user_has_billing_access(matter_id, 'write')
  );

-- Additional security functions

-- Function to check if user can view financial summaries
CREATE OR REPLACE FUNCTION user_can_view_financial_summary()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role((auth.jwt() ->> 'sub')::UUID);
  
  -- Only admin and attorneys can see overall financial summaries
  RETURN user_role IN ('admin', 'associate_attorney');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can process payments
CREATE OR REPLACE FUNCTION user_can_process_payments()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  financial_access TEXT;
BEGIN
  user_role := get_user_role((auth.jwt() ->> 'sub')::UUID);
  
  SELECT get_user_permissions((auth.jwt() ->> 'sub')::UUID)->>'financial' 
  INTO financial_access;
  
  -- Admin always can process payments
  IF user_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Others need appropriate financial access
  RETURN user_role IN ('associate_attorney', 'paralegal') 
    AND financial_access IN ('all', 'limited');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
