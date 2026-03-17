-- ============================================
-- UPDATE PREPAID EXPENSES FOR PERIOD-BASED AMORTIZATION
-- This updates the schema to support period-based amortization
-- instead of daily amortization
-- ============================================

-- Add new columns to track period-based amortization
ALTER TABLE prepaid_expenses
  ADD COLUMN IF NOT EXISTS next_amortization_date DATE,
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS recurrence_frequency INTEGER;

-- Add comments
COMMENT ON COLUMN prepaid_expenses.next_amortization_date IS 'Next date when amortization should occur (based on recurrence cycle)';
COMMENT ON COLUMN prepaid_expenses.recurrence_type IS 'Copied from recurring_expenses: weekly, monthly, or yearly';
COMMENT ON COLUMN prepaid_expenses.recurrence_frequency IS 'Copied from recurring_expenses: e.g., 1 for monthly, 2 for bi-weekly';

-- Update prepaid_expense_amortizations to track which period
ALTER TABLE prepaid_expense_amortizations
  ADD COLUMN IF NOT EXISTS period_number INTEGER,
  ADD COLUMN IF NOT EXISTS period_start_date DATE,
  ADD COLUMN IF NOT EXISTS period_end_date DATE;

COMMENT ON COLUMN prepaid_expense_amortizations.period_number IS 'Which period this amortization is for (1st, 2nd, 3rd, etc.)';
COMMENT ON COLUMN prepaid_expense_amortizations.period_start_date IS 'Start date of the period being amortized';
COMMENT ON COLUMN prepaid_expense_amortizations.period_end_date IS 'End date of the period being amortized';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check new columns added
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'prepaid_expenses'
-- ORDER BY ordinal_position;
