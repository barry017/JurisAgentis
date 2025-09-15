-- Create billing and financial management tables optimized for flat fee practice

-- Fee schedule templates for common services
CREATE TABLE IF NOT EXISTS fee_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Service identification
    service_name VARCHAR(200) NOT NULL,
    service_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    practice_area VARCHAR(100) NOT NULL,
    service_category VARCHAR(100) NOT NULL, -- 'estate_planning', 'business_formation', 'real_estate', etc.
    
    -- Pricing structure
    base_fee DECIMAL(10,2) NOT NULL,
    complexity_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 1.0 = standard, 1.5 = complex, etc.
    minimum_fee DECIMAL(10,2),
    maximum_fee DECIMAL(10,2),
    
    -- Payment structure (optimized for flat fees)
    retainer_percentage DECIMAL(5,2) DEFAULT 50.00, -- Default 50% retainer
    retainer_amount DECIMAL(10,2), -- Fixed retainer amount (overrides percentage)
    payment_schedule VARCHAR(50) DEFAULT 'retainer_completion', -- 'full_upfront', 'retainer_completion', 'installments'
    installment_count INTEGER, -- For installment plans
    
    -- Included services and scope
    included_services TEXT[], -- Array of what's included
    excluded_services TEXT[], -- Array of what's not included
    estimated_hours DECIMAL(5,2), -- For reference, not billing
    
    -- Additional fees
    rush_fee_percentage DECIMAL(5,2), -- Additional fee for rush jobs
    travel_fee_per_mile DECIMAL(5,2),
    court_appearance_fee DECIMAL(10,2),
    document_review_fee DECIMAL(10,2),
    
    -- Active status and versioning
    is_active BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    version VARCHAR(20) DEFAULT '1.0',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0,
    last_used_date DATE,
    
    -- Custom fields for practice-specific pricing
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Matter billing configurations (links matters to fee schedules)
CREATE TABLE IF NOT EXISTS matter_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    
    -- Fee structure for this matter
    fee_schedule_id UUID REFERENCES fee_schedules(id),
    billing_method VARCHAR(50) NOT NULL DEFAULT 'flat_fee', -- 'flat_fee', 'hourly', 'contingency', 'pro_bono', 'hybrid'
    
    -- Agreed fees and terms
    agreed_fee DECIMAL(10,2) NOT NULL,
    hourly_rate DECIMAL(8,2), -- For hourly or hybrid billing
    contingency_percentage DECIMAL(5,2), -- For contingency cases
    
    -- Payment structure
    retainer_required BOOLEAN DEFAULT true,
    retainer_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    retainer_received DECIMAL(10,2) DEFAULT 0,
    retainer_date DATE,
    
    -- Payment schedule
    payment_schedule VARCHAR(50) DEFAULT 'retainer_completion',
    installment_amount DECIMAL(10,2),
    installment_frequency VARCHAR(20), -- 'monthly', 'biweekly', 'weekly'
    next_payment_due DATE,
    
    -- Cost and expense tracking
    estimated_costs DECIMAL(10,2) DEFAULT 0,
    actual_costs DECIMAL(10,2) DEFAULT 0,
    cost_advance_required BOOLEAN DEFAULT false,
    cost_advance_amount DECIMAL(10,2) DEFAULT 0,
    cost_advance_received DECIMAL(10,2) DEFAULT 0,
    
    -- Payment terms
    payment_terms_days INTEGER DEFAULT 30,
    late_fee_percentage DECIMAL(5,2) DEFAULT 1.5,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    discount_reason TEXT,
    
    -- Status and tracking
    billing_status VARCHAR(50) DEFAULT 'pending_retainer', -- 'pending_retainer', 'active', 'completed', 'collection', 'written_off'
    final_billing_date DATE,
    collection_notes TEXT,
    
    -- Trust account information (for jurisdictions requiring it)
    trust_account_required BOOLEAN DEFAULT false,
    trust_account_number VARCHAR(50),
    trust_balance DECIMAL(10,2) DEFAULT 0,
    
    -- Custom billing terms
    special_terms TEXT,
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Invoices table for billing
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice identification
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Invoice details
    invoice_type VARCHAR(50) NOT NULL DEFAULT 'service_fee', -- 'retainer', 'service_fee', 'final_bill', 'expense_reimbursement', 'installment'
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    service_period_start DATE,
    service_period_end DATE,
    
    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,
    
    -- Payment information
    payment_method VARCHAR(50), -- 'check', 'credit_card', 'wire_transfer', 'cash', 'trust_account'
    payment_terms_days INTEGER DEFAULT 30,
    late_fee_rate DECIMAL(5,2) DEFAULT 1.5,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'viewed', 'partial_payment', 'paid', 'overdue', 'collection', 'written_off'
    sent_date DATE,
    viewed_date DATE,
    first_payment_date DATE,
    paid_date DATE,
    
    -- Collection information
    days_overdue INTEGER DEFAULT 0,
    collection_status VARCHAR(50), -- 'none', 'reminder_sent', 'formal_notice', 'attorney_referral'
    last_reminder_date DATE,
    collection_notes TEXT,
    
    -- Document references
    pdf_path TEXT, -- Path to generated PDF invoice
    email_sent_to TEXT[],
    delivery_method VARCHAR(50) DEFAULT 'email', -- 'email', 'mail', 'hand_delivery', 'portal'
    
    -- Trust account transactions
    trust_account_applied DECIMAL(10,2) DEFAULT 0,
    trust_account_date DATE,
    
    -- Notes and custom fields
    internal_notes TEXT,
    client_notes TEXT,
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Invoice line items (for detailed billing)
CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Line item details
    line_type VARCHAR(50) NOT NULL, -- 'service_fee', 'retainer', 'expense', 'discount', 'tax', 'late_fee'
    description TEXT NOT NULL,
    service_date DATE,
    
    -- Quantity and rates (for hourly billing when needed)
    quantity DECIMAL(8,2) DEFAULT 1,
    rate DECIMAL(10,2),
    amount DECIMAL(10,2) NOT NULL,
    
    -- Tax information
    taxable BOOLEAN DEFAULT false,
    tax_rate DECIMAL(5,2),
    tax_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Reference information
    timekeeper_id UUID REFERENCES user_profiles(uid), -- For hourly entries
    expense_category VARCHAR(100),
    billable BOOLEAN DEFAULT true,
    
    -- Sorting and grouping
    sort_order INTEGER DEFAULT 0,
    line_group VARCHAR(100), -- For grouping related items
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid)
);

-- Payments received
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Payment identification
    payment_number VARCHAR(50),
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'check', 'credit_card', 'wire_transfer', 'cash', 'trust_transfer'
    
    -- Payment method specific fields
    check_number VARCHAR(50),
    reference_number VARCHAR(100), -- Transaction ID, authorization code, etc.
    bank_name VARCHAR(200),
    credit_card_last_four VARCHAR(4),
    
    -- Trust account handling
    deposited_to_trust BOOLEAN DEFAULT false,
    trust_account_number VARCHAR(50),
    earned_date DATE, -- When funds are earned and can be transferred from trust
    transferred_from_trust BOOLEAN DEFAULT false,
    transfer_date DATE,
    
    -- Processing information
    processing_fee DECIMAL(10,2) DEFAULT 0,
    net_amount DECIMAL(10,2) NOT NULL, -- Amount minus processing fees
    deposit_date DATE,
    cleared_date DATE,
    
    -- Allocation (if payment covers multiple invoices)
    allocated_amount DECIMAL(10,2), -- Amount allocated to specific invoice
    unallocated_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status and notes
    payment_status VARCHAR(50) DEFAULT 'received', -- 'received', 'deposited', 'cleared', 'bounced', 'refunded'
    bounced_date DATE,
    bounced_reason TEXT,
    refund_date DATE,
    refund_amount DECIMAL(10,2),
    refund_reason TEXT,
    
    -- Notes
    payment_notes TEXT,
    internal_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Expenses for matters
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Expense identification
    expense_number VARCHAR(50),
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Expense details
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'court_filing', 'copies', 'postage', 'travel', 'expert_witness', 'research', etc.
    subcategory VARCHAR(100),
    
    -- Amount information
    amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    
    -- Vendor/payee information
    vendor_name VARCHAR(200),
    vendor_contact TEXT,
    
    -- Reimbursement tracking
    billable_to_client BOOLEAN DEFAULT true,
    markup_percentage DECIMAL(5,2) DEFAULT 0,
    client_charge_amount DECIMAL(10,2),
    reimbursed_by_client BOOLEAN DEFAULT false,
    reimbursement_date DATE,
    invoice_id UUID REFERENCES invoices(id),
    
    -- Payment tracking
    paid_by VARCHAR(50) DEFAULT 'firm', -- 'firm', 'client_advance', 'trust_account'
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_date DATE,
    
    -- Receipt and documentation
    receipt_required BOOLEAN DEFAULT true,
    receipt_received BOOLEAN DEFAULT false,
    receipt_path TEXT, -- Path to scanned receipt
    receipt_number VARCHAR(100),
    
    -- Approval workflow
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES user_profiles(uid),
    approved_date DATE,
    approval_notes TEXT,
    
    -- Mileage tracking (for travel expenses)
    mileage_start_location TEXT,
    mileage_end_location TEXT,
    mileage_distance DECIMAL(6,1),
    mileage_rate DECIMAL(5,3), -- Per mile rate
    
    -- Notes and custom fields
    internal_notes TEXT,
    custom_fields JSONB,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Time entries (for the 2% of cases that are hourly)
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Time entry identification
    matter_id UUID NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    timekeeper_id UUID NOT NULL REFERENCES user_profiles(uid),
    
    -- Time details
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,
    duration_hours DECIMAL(4,2) NOT NULL, -- Total hours worked
    
    -- Work description
    description TEXT NOT NULL,
    work_category VARCHAR(100), -- 'research', 'drafting', 'client_meeting', 'court_appearance', etc.
    task_code VARCHAR(20), -- For detailed reporting
    
    -- Billing information
    billable BOOLEAN DEFAULT true,
    billed BOOLEAN DEFAULT false,
    invoice_id UUID REFERENCES invoices(id),
    hourly_rate DECIMAL(8,2),
    amount DECIMAL(10,2), -- duration_hours * hourly_rate
    
    -- Status and approval
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'submitted', 'approved', 'billed'
    approved_by UUID REFERENCES user_profiles(uid),
    approved_date DATE,
    
    -- Timer tracking
    timer_started_at TIMESTAMP WITH TIME ZONE,
    timer_stopped_at TIMESTAMP WITH TIME ZONE,
    timer_running BOOLEAN DEFAULT false,
    
    -- Notes
    internal_notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES user_profiles(uid),
    updated_by UUID NOT NULL REFERENCES user_profiles(uid),
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by UUID REFERENCES user_profiles(uid)
);

-- Create indexes for performance
CREATE INDEX idx_fee_schedules_practice_area ON fee_schedules(practice_area) WHERE is_active = true;
CREATE INDEX idx_fee_schedules_service_category ON fee_schedules(service_category) WHERE is_active = true;
CREATE INDEX idx_fee_schedules_service_code ON fee_schedules(service_code) WHERE is_active = true;

CREATE INDEX idx_matter_billing_matter_id ON matter_billing(matter_id);
CREATE INDEX idx_matter_billing_status ON matter_billing(billing_status);
CREATE INDEX idx_matter_billing_next_payment_due ON matter_billing(next_payment_due) WHERE next_payment_due IS NOT NULL;

CREATE INDEX idx_invoices_matter_id ON invoices(matter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_client_id ON invoices(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_status ON invoices(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_invoice_date ON invoices(invoice_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_overdue ON invoices(due_date) WHERE status IN ('sent', 'viewed', 'partial_payment') AND due_date < CURRENT_DATE;

CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX idx_invoice_line_items_type ON invoice_line_items(line_type);

CREATE INDEX idx_payments_matter_id ON payments(matter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_client_id ON payments(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_date ON payments(payment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(payment_status) WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_matter_id ON expenses(matter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_client_id ON expenses(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_date ON expenses(expense_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_category ON expenses(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_billable ON expenses(billable_to_client) WHERE deleted_at IS NULL;

CREATE INDEX idx_time_entries_matter_id ON time_entries(matter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_timekeeper_id ON time_entries(timekeeper_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_date ON time_entries(entry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_time_entries_billable ON time_entries(billable) WHERE deleted_at IS NULL;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(invoice_type TEXT DEFAULT 'INV')
RETURNS TEXT AS $$
DECLARE
    year_code TEXT;
    sequence_num INTEGER;
    invoice_number TEXT;
BEGIN
    -- Get current year as 4-digit
    year_code := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Get next sequence number for this year
    SELECT COALESCE(MAX(
        CASE 
            WHEN invoice_number ~ ('^' || year_code || '-' || invoice_type || '-[0-9]+$')
            THEN RIGHT(invoice_number, 4)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE year_code || '-' || invoice_type || '-%';
    
    -- Format: YYYY-TYPE-NNNN (e.g., 2025-INV-0001)
    invoice_number := year_code || '-' || invoice_type || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update invoice totals when line items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    invoice_subtotal DECIMAL(10,2);
    invoice_tax_amount DECIMAL(10,2);
    invoice_total DECIMAL(10,2);
    invoice_discount DECIMAL(10,2);
BEGIN
    -- Calculate totals from line items
    SELECT 
        COALESCE(SUM(CASE WHEN line_type NOT IN ('tax', 'discount') THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN line_type = 'tax' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN line_type = 'discount' THEN amount ELSE 0 END), 0)
    INTO invoice_subtotal, invoice_tax_amount, invoice_discount
    FROM invoice_line_items
    WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    invoice_total := invoice_subtotal + invoice_tax_amount - invoice_discount;
    
    -- Update the invoice
    UPDATE invoices 
    SET 
        subtotal = invoice_subtotal,
        tax_amount = invoice_tax_amount,
        discount_amount = invoice_discount,
        total_amount = invoice_total,
        balance_due = invoice_total - amount_paid,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for invoice total updates
CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_totals();

-- Function to update fee schedule usage
CREATE OR REPLACE FUNCTION increment_fee_schedule_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fee_schedule_id IS NOT NULL THEN
        UPDATE fee_schedules 
        SET usage_count = usage_count + 1,
            last_used_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = NEW.fee_schedule_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fee schedule usage tracking
CREATE TRIGGER trigger_increment_fee_schedule_usage
    AFTER INSERT ON matter_billing
    FOR EACH ROW
    EXECUTE FUNCTION increment_fee_schedule_usage();

-- Function to update payment allocations
CREATE OR REPLACE FUNCTION update_payment_allocation()
RETURNS TRIGGER AS $$
BEGIN
    -- Update invoice amounts when payment is allocated
    IF NEW.invoice_id IS NOT NULL AND NEW.allocated_amount IS NOT NULL THEN
        UPDATE invoices 
        SET 
            amount_paid = amount_paid + NEW.allocated_amount,
            balance_due = total_amount - (amount_paid + NEW.allocated_amount),
            status = CASE 
                WHEN (total_amount - (amount_paid + NEW.allocated_amount)) <= 0 THEN 'paid'
                WHEN amount_paid > 0 THEN 'partial_payment'
                ELSE status
            END,
            paid_date = CASE 
                WHEN (total_amount - (amount_paid + NEW.allocated_amount)) <= 0 THEN NEW.payment_date
                ELSE paid_date
            END,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment allocation updates
CREATE TRIGGER trigger_update_payment_allocation
    AFTER INSERT OR UPDATE ON payments
    FOR EACH ROW
    WHEN (NEW.allocated_amount IS NOT NULL AND NEW.invoice_id IS NOT NULL)
    EXECUTE FUNCTION update_payment_allocation();

-- Add some common fee schedule templates as comments for reference
/*
Common Estate Planning Flat Fees:
- Simple Will: $500-800
- Will with Trust: $1,500-2,500
- Revocable Living Trust: $2,000-3,500
- Irrevocable Trust: $3,000-5,000
- Power of Attorney: $300-500
- Health Care Directive: $200-300
- Estate Planning Package: $2,500-4,000

Common Business Formation Flat Fees:
- LLC Formation: $800-1,200
- Corporation Formation: $1,000-1,500
- Partnership Agreement: $1,500-2,500
- Operating Agreement: $800-1,500
- Buy-Sell Agreement: $2,000-3,500

Payment Schedules:
- 'full_upfront': 100% due at engagement
- 'retainer_completion': 50% retainer, 50% at completion
- 'installments': Monthly payments over agreed period
*/