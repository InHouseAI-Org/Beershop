-- ============================================
-- COMPLETE NEON DATABASE MIGRATION SCRIPT
-- Run this script on your Neon database
-- ============================================
-- This script includes:
-- 1. Schemes tracking system
-- 2. Recurring expenses system
-- 3. Bill number generation for existing orders
-- ============================================

BEGIN;

-- ============================================
-- PART 1: SCHEMES TRACKING SYSTEM
-- ============================================

-- Create schemes table
CREATE TABLE IF NOT EXISTS schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  scheme_name VARCHAR(255) NOT NULL,
  scheme_start_date DATE NOT NULL,
  scheme_period_value INTEGER NOT NULL CHECK (scheme_period_value > 0),
  scheme_period_unit VARCHAR(20) NOT NULL CHECK (scheme_period_unit IN ('weeks', 'months', 'years')),
  scheme_target_qty DECIMAL(10, 2) NOT NULL CHECK (scheme_target_qty > 0),
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('overall', 'per_product')),
  scheme_products JSONB NOT NULL,
  scheme_value DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'closed')),
  achieved BOOLEAN DEFAULT FALSE,
  achieved_date DATE,
  notes TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for schemes
CREATE INDEX IF NOT EXISTS idx_schemes_organisation ON schemes(organisation_id);
CREATE INDEX IF NOT EXISTS idx_schemes_distributor ON schemes(distributor_id);
CREATE INDEX IF NOT EXISTS idx_schemes_status ON schemes(status);
CREATE INDEX IF NOT EXISTS idx_schemes_start_date ON schemes(scheme_start_date);

-- Create trigger for schemes updated_at
CREATE OR REPLACE FUNCTION update_schemes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_schemes_updated_at ON schemes;
CREATE TRIGGER trigger_schemes_updated_at
BEFORE UPDATE ON schemes
FOR EACH ROW
EXECUTE FUNCTION update_schemes_updated_at();

-- Add comments for schemes
COMMENT ON TABLE schemes IS 'Tracks distributor schemes with target quantities and values';
COMMENT ON COLUMN schemes.scheme_products IS 'JSON array: [{"product_id": "uuid", "product_name": "name", "target_qty": 100}]';
COMMENT ON COLUMN schemes.target_type IS 'overall: sum all products, per_product: each product has individual target';

-- Create scheme tracking view
CREATE OR REPLACE VIEW scheme_tracking AS
SELECT
  s.id,
  s.organisation_id,
  s.distributor_id,
  d.name as distributor_name,
  s.scheme_name,
  s.scheme_start_date,
  s.scheme_period_value,
  s.scheme_period_unit,
  CASE
    WHEN s.scheme_period_unit = 'weeks' THEN s.scheme_start_date + (s.scheme_period_value || ' weeks')::INTERVAL
    WHEN s.scheme_period_unit = 'months' THEN s.scheme_start_date + (s.scheme_period_value || ' months')::INTERVAL
    WHEN s.scheme_period_unit = 'years' THEN s.scheme_start_date + (s.scheme_period_value || ' years')::INTERVAL
  END as scheme_end_date,
  s.scheme_target_qty,
  s.target_type,
  s.scheme_products,
  s.scheme_value,
  s.status,
  s.achieved,
  s.achieved_date,
  s.notes,
  s.created_at,
  s.updated_at,
  CASE
    WHEN s.scheme_period_unit = 'weeks' THEN CURRENT_DATE > (s.scheme_start_date + (s.scheme_period_value || ' weeks')::INTERVAL)::DATE
    WHEN s.scheme_period_unit = 'months' THEN CURRENT_DATE > (s.scheme_start_date + (s.scheme_period_value || ' months')::INTERVAL)::DATE
    WHEN s.scheme_period_unit = 'years' THEN CURRENT_DATE > (s.scheme_start_date + (s.scheme_period_value || ' years')::INTERVAL)::DATE
  END as is_expired,
  CASE
    WHEN s.scheme_period_unit = 'weeks' THEN (s.scheme_start_date + (s.scheme_period_value || ' weeks')::INTERVAL)::DATE - CURRENT_DATE
    WHEN s.scheme_period_unit = 'months' THEN (s.scheme_start_date + (s.scheme_period_value || ' months')::INTERVAL)::DATE - CURRENT_DATE
    WHEN s.scheme_period_unit = 'years' THEN (s.scheme_start_date + (s.scheme_period_value || ' years')::INTERVAL)::DATE - CURRENT_DATE
  END as days_remaining
FROM schemes s
LEFT JOIN distributors d ON s.distributor_id = d.id
ORDER BY s.created_at DESC;

COMMENT ON VIEW scheme_tracking IS 'Enhanced view of schemes with calculated end dates and expiry status';

-- ============================================
-- PART 2: RECURRING EXPENSES SYSTEM
-- ============================================

-- Create recurring_expenses table
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  recurrence_type VARCHAR(20) NOT NULL CHECK (recurrence_type IN ('weekly', 'monthly', 'yearly')),
  recurrence_frequency INTEGER NOT NULL DEFAULT 1 CHECK (recurrence_frequency > 0),
  expense_amount DECIMAL(10, 2) NOT NULL CHECK (expense_amount > 0),
  next_due_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create recurring_expense_payments table
CREATE TABLE IF NOT EXISTS recurring_expense_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  paid_from VARCHAR(20) NOT NULL CHECK (paid_from IN ('cash_balance', 'bank_balance', 'gala_balance')),
  notes TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for recurring expenses
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_organisation ON recurring_expenses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_payments_recurring ON recurring_expense_payments(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_payments_date ON recurring_expense_payments(payment_date);

-- Create trigger for recurring_expenses updated_at
CREATE OR REPLACE FUNCTION update_recurring_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recurring_expenses_updated_at ON recurring_expenses;
CREATE TRIGGER trigger_recurring_expenses_updated_at
BEFORE UPDATE ON recurring_expenses
FOR EACH ROW
EXECUTE FUNCTION update_recurring_expenses_updated_at();

-- Add comments for recurring expenses
COMMENT ON TABLE recurring_expenses IS 'Tracks recurring expenses that need to be paid regularly';
COMMENT ON COLUMN recurring_expenses.recurrence_type IS 'How often: weekly, monthly, or yearly';
COMMENT ON COLUMN recurring_expenses.recurrence_frequency IS 'Every X weeks/months/years (e.g., 2 for bi-weekly)';

COMMENT ON TABLE recurring_expense_payments IS 'Tracks individual payments made for recurring expenses';
COMMENT ON COLUMN recurring_expense_payments.expense_id IS 'Link to the actual expense entry created';

-- Create recurring expenses summary view
CREATE OR REPLACE VIEW recurring_expenses_summary AS
SELECT
  re.id,
  re.organisation_id,
  re.expense_name,
  re.recurrence_type,
  re.recurrence_frequency,
  re.expense_amount,
  re.next_due_date,
  re.is_active,
  re.notes,
  re.created_at,
  re.updated_at,
  CASE
    WHEN re.next_due_date IS NULL THEN NULL
    WHEN re.next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN re.next_due_date = CURRENT_DATE THEN 'due_today'
    WHEN re.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'upcoming'
  END as due_status,
  CASE
    WHEN re.next_due_date IS NULL THEN NULL
    ELSE re.next_due_date - CURRENT_DATE
  END as days_until_due,
  COUNT(rep.id) as total_payments,
  COALESCE(SUM(rep.amount), 0) as total_paid,
  MAX(rep.payment_date) as last_payment_date
FROM recurring_expenses re
LEFT JOIN recurring_expense_payments rep ON re.id = rep.recurring_expense_id
GROUP BY re.id
ORDER BY
  CASE
    WHEN re.next_due_date IS NULL THEN 3
    WHEN re.next_due_date < CURRENT_DATE THEN 1
    WHEN re.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 2
    ELSE 3
  END,
  re.next_due_date ASC NULLS LAST,
  re.created_at DESC;

COMMENT ON VIEW recurring_expenses_summary IS 'Enhanced view of recurring expenses with payment stats and due status';

-- ============================================
-- PART 3: BILL NUMBER HANDLING
-- ============================================

-- Add bill_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'bill_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN bill_number VARCHAR(100);
    RAISE NOTICE 'Created bill_number column';
  ELSE
    RAISE NOTICE 'bill_number column already exists';
  END IF;
END $$;

-- Set bill numbers to 'NA' for existing orders without one
UPDATE orders
SET bill_number = 'NA'
WHERE bill_number IS NULL OR bill_number = '';

-- Log how many orders were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM orders
  WHERE bill_number = 'NA';

  RAISE NOTICE 'Set bill_number to NA for % existing orders', updated_count;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check schemes table
SELECT COUNT(*) as schemes_count FROM schemes;

-- Check recurring expenses tables
SELECT COUNT(*) as recurring_expenses_count FROM recurring_expenses;
SELECT COUNT(*) as recurring_expense_payments_count FROM recurring_expense_payments;

-- Check bill numbers
SELECT
  COUNT(*) as total_orders,
  COUNT(CASE WHEN bill_number IS NOT NULL AND bill_number != '' THEN 1 END) as orders_with_bill_number,
  COUNT(CASE WHEN bill_number = 'NA' THEN 1 END) as orders_with_na,
  COUNT(CASE WHEN bill_number IS NULL OR bill_number = '' THEN 1 END) as orders_without_bill_number
FROM orders;

-- Show sample of bill numbers
SELECT bill_number, order_date, created_at
FROM orders
ORDER BY order_date DESC, created_at DESC
LIMIT 10;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All changes have been applied successfully!
-- ============================================
