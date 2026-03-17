-- ============================================
-- CREATE PREPAID EXPENSES TABLE
-- For tracking advance payments on recurring expenses
-- ============================================

-- 1. Create prepaid_expenses table
CREATE TABLE IF NOT EXISTS prepaid_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,

  -- Payment details
  payment_date DATE NOT NULL,
  paid_from VARCHAR(20) NOT NULL CHECK (paid_from IN ('cash_balance', 'bank_balance', 'gala_balance')),

  -- Advance period details
  advance_periods INTEGER NOT NULL CHECK (advance_periods > 0),
  period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weeks', 'months', 'years')),

  -- Financial details
  amount_per_period DECIMAL(10, 2) NOT NULL CHECK (amount_per_period > 0),
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount > 0),

  -- Amortization tracking
  coverage_start_date DATE NOT NULL,
  coverage_end_date DATE NOT NULL,
  remaining_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amortized_value DECIMAL(10, 2) NOT NULL DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create prepaid_expense_amortizations table to track daily/periodic amortization
CREATE TABLE IF NOT EXISTS prepaid_expense_amortizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  prepaid_expense_id UUID NOT NULL REFERENCES prepaid_expenses(id) ON DELETE CASCADE,

  -- Amortization details
  amortization_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,

  -- Link to expense if created
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_prepaid_expenses_organisation ON prepaid_expenses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_expenses_recurring ON prepaid_expenses(recurring_expense_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_expenses_dates ON prepaid_expenses(coverage_start_date, coverage_end_date);
CREATE INDEX IF NOT EXISTS idx_prepaid_expense_amortizations_prepaid ON prepaid_expense_amortizations(prepaid_expense_id);
CREATE INDEX IF NOT EXISTS idx_prepaid_expense_amortizations_date ON prepaid_expense_amortizations(amortization_date);

-- 4. Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_prepaid_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prepaid_expenses_updated_at ON prepaid_expenses;
CREATE TRIGGER trigger_prepaid_expenses_updated_at
BEFORE UPDATE ON prepaid_expenses
FOR EACH ROW
EXECUTE FUNCTION update_prepaid_expenses_updated_at();

-- 5. Add comments for documentation
COMMENT ON TABLE prepaid_expenses IS 'Tracks advance payments made for recurring expenses';
COMMENT ON COLUMN prepaid_expenses.recurring_expense_id IS 'Which recurring expense this prepayment is for';
COMMENT ON COLUMN prepaid_expenses.payment_date IS 'Date when advance payment was made';
COMMENT ON COLUMN prepaid_expenses.paid_from IS 'Which balance the payment came from';
COMMENT ON COLUMN prepaid_expenses.advance_periods IS 'Number of periods paid in advance (e.g., 3 months, 2 weeks)';
COMMENT ON COLUMN prepaid_expenses.period_type IS 'Type of period: weeks, months, or years';
COMMENT ON COLUMN prepaid_expenses.amount_per_period IS 'Amount per period (week/month/year)';
COMMENT ON COLUMN prepaid_expenses.total_amount IS 'Total prepaid amount = amount_per_period × advance_periods';
COMMENT ON COLUMN prepaid_expenses.coverage_start_date IS 'Date from which prepayment coverage starts';
COMMENT ON COLUMN prepaid_expenses.coverage_end_date IS 'Date until which prepayment covers';
COMMENT ON COLUMN prepaid_expenses.remaining_value IS 'Current remaining value of prepayment (decreases over time)';
COMMENT ON COLUMN prepaid_expenses.amortized_value IS 'Amount already amortized/expensed';

COMMENT ON TABLE prepaid_expense_amortizations IS 'Tracks individual amortization entries as time passes';
COMMENT ON COLUMN prepaid_expense_amortizations.prepaid_expense_id IS 'Which prepaid expense this amortization is for';
COMMENT ON COLUMN prepaid_expense_amortizations.amortization_date IS 'Date when this portion was amortized';
COMMENT ON COLUMN prepaid_expense_amortizations.amount IS 'Amount amortized on this date';
COMMENT ON COLUMN prepaid_expense_amortizations.expense_id IS 'Link to expense entry if created';

-- 6. Create view for active prepaid expenses with remaining value
CREATE OR REPLACE VIEW active_prepaid_expenses AS
SELECT
  pe.id,
  pe.organisation_id,
  pe.recurring_expense_id,
  re.expense_name,
  pe.payment_date,
  pe.paid_from,
  pe.advance_periods,
  pe.period_type,
  pe.amount_per_period,
  pe.total_amount,
  pe.coverage_start_date,
  pe.coverage_end_date,
  pe.remaining_value,
  pe.amortized_value,
  pe.notes,
  pe.created_at,
  -- Calculate status
  CASE
    WHEN CURRENT_DATE < pe.coverage_start_date THEN 'future'
    WHEN CURRENT_DATE > pe.coverage_end_date THEN 'expired'
    WHEN pe.remaining_value <= 0 THEN 'fully_amortized'
    ELSE 'active'
  END as status,
  -- Days remaining in coverage
  CASE
    WHEN CURRENT_DATE > pe.coverage_end_date THEN 0
    ELSE pe.coverage_end_date - CURRENT_DATE
  END as days_remaining,
  -- Total days covered
  pe.coverage_end_date - pe.coverage_start_date as total_coverage_days,
  -- Percentage used
  CASE
    WHEN pe.total_amount > 0 THEN
      ROUND((pe.amortized_value / pe.total_amount) * 100, 2)
    ELSE 0
  END as percentage_used
FROM prepaid_expenses pe
JOIN recurring_expenses re ON pe.recurring_expense_id = re.id
ORDER BY pe.coverage_end_date ASC;

COMMENT ON VIEW active_prepaid_expenses IS 'Enhanced view of prepaid expenses with calculated fields';

-- 7. Function to calculate daily amortization amount
CREATE OR REPLACE FUNCTION calculate_daily_amortization(prepaid_expense_id_param UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
  total_amount_val DECIMAL(10, 2);
  total_days INTEGER;
  daily_amount DECIMAL(10, 2);
BEGIN
  SELECT
    total_amount,
    (coverage_end_date - coverage_start_date + 1)
  INTO total_amount_val, total_days
  FROM prepaid_expenses
  WHERE id = prepaid_expense_id_param;

  IF total_days > 0 THEN
    daily_amount := total_amount_val / total_days;
  ELSE
    daily_amount := 0;
  END IF;

  RETURN daily_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_daily_amortization IS 'Calculates daily amortization amount for a prepaid expense';

-- ============================================
-- VERIFICATION QUERIES (uncomment to run)
-- ============================================

-- Check table structure
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'prepaid_expenses' ORDER BY ordinal_position;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'prepaid_expense_amortizations' ORDER BY ordinal_position;

-- Check view
-- SELECT * FROM active_prepaid_expenses LIMIT 5;

-- Test daily amortization calculation
-- SELECT calculate_daily_amortization('some-uuid-here');
