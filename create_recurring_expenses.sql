-- ============================================
-- CREATE RECURRING EXPENSES TABLES
-- Run this script in your database
-- ============================================

-- 1. Create recurring_expenses table
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

-- 2. Create recurring_expense_payments table to track each payment
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

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_organisation ON recurring_expenses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_active ON recurring_expenses(is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_expenses_next_due ON recurring_expenses(next_due_date);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_payments_recurring ON recurring_expense_payments(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_payments_date ON recurring_expense_payments(payment_date);

-- 4. Create trigger to auto-update updated_at
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

-- 5. Add comments for documentation
COMMENT ON TABLE recurring_expenses IS 'Tracks recurring expenses that need to be paid regularly';
COMMENT ON COLUMN recurring_expenses.expense_name IS 'Name/description of the recurring expense';
COMMENT ON COLUMN recurring_expenses.recurrence_type IS 'How often: weekly, monthly, or yearly';
COMMENT ON COLUMN recurring_expenses.recurrence_frequency IS 'Every X weeks/months/years (e.g., 2 for bi-weekly)';
COMMENT ON COLUMN recurring_expenses.expense_amount IS 'Standard amount for this expense';
COMMENT ON COLUMN recurring_expenses.next_due_date IS 'Next scheduled payment date';
COMMENT ON COLUMN recurring_expenses.is_active IS 'Whether this recurring expense is still active';

COMMENT ON TABLE recurring_expense_payments IS 'Tracks individual payments made for recurring expenses';
COMMENT ON COLUMN recurring_expense_payments.recurring_expense_id IS 'Which recurring expense this payment is for';
COMMENT ON COLUMN recurring_expense_payments.expense_id IS 'Link to the actual expense entry created';
COMMENT ON COLUMN recurring_expense_payments.payment_date IS 'Date when this payment was made';
COMMENT ON COLUMN recurring_expense_payments.paid_from IS 'Which balance the payment came from';

-- 6. Create view for recurring expenses with payment stats
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
  -- Calculate next due status
  CASE
    WHEN re.next_due_date IS NULL THEN NULL
    WHEN re.next_due_date < CURRENT_DATE THEN 'overdue'
    WHEN re.next_due_date = CURRENT_DATE THEN 'due_today'
    WHEN re.next_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'upcoming'
  END as due_status,
  -- Days until/since due
  CASE
    WHEN re.next_due_date IS NULL THEN NULL
    ELSE re.next_due_date - CURRENT_DATE
  END as days_until_due,
  -- Payment statistics
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
-- VERIFICATION QUERIES (uncomment to run)
-- ============================================

-- Check table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'recurring_expenses' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'recurring_expense_payments' ORDER BY ordinal_position;

-- Check view
-- SELECT * FROM recurring_expenses_summary LIMIT 5;
