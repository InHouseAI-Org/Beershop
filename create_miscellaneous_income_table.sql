-- ============================================
-- CREATE MISCELLANEOUS INCOME TABLE
-- For tracking income from interest, dividends, or other sources
-- ============================================

-- Create miscellaneous_income table
CREATE TABLE IF NOT EXISTS miscellaneous_income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  account VARCHAR(50) NOT NULL CHECK (account IN ('cash_balance', 'bank_balance', 'gala_balance')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_by_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_misc_income_organisation ON miscellaneous_income(organisation_id);
CREATE INDEX IF NOT EXISTS idx_misc_income_transaction_date ON miscellaneous_income(transaction_date);
CREATE INDEX IF NOT EXISTS idx_misc_income_account ON miscellaneous_income(account);

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_misc_income_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_misc_income_updated_at ON miscellaneous_income;
CREATE TRIGGER trigger_misc_income_updated_at
BEFORE UPDATE ON miscellaneous_income
FOR EACH ROW
EXECUTE FUNCTION update_misc_income_updated_at();

-- Add comments for documentation
COMMENT ON TABLE miscellaneous_income IS 'Tracks miscellaneous income such as bank interest, dividends, etc.';
COMMENT ON COLUMN miscellaneous_income.name IS 'Name/title of the income source';
COMMENT ON COLUMN miscellaneous_income.description IS 'Detailed description of the income';
COMMENT ON COLUMN miscellaneous_income.amount IS 'Income amount (must be positive)';
COMMENT ON COLUMN miscellaneous_income.account IS 'Account to which income is added: cash_balance, bank_balance, or gala_balance';
COMMENT ON COLUMN miscellaneous_income.transaction_date IS 'Date when income was received';
COMMENT ON COLUMN miscellaneous_income.created_by_username IS 'Username of admin who created this record';

-- Verification query
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'miscellaneous_income'
ORDER BY ordinal_position;
