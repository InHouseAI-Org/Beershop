-- ============================================
-- ADD OPENING BALANCE COLUMNS TO ORGANISATIONS
-- ============================================
-- This migration adds the opening balance columns that are required
-- for the balance ledger system to work properly.

-- Add opening balance columns to organisations table
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS cash_opening_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_opening_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gala_opening_balance NUMERIC DEFAULT 0;

-- Set initial opening balances equal to current balances
-- (so existing data remains consistent)
UPDATE organisations
SET
  cash_opening_balance = COALESCE(cash_balance, 0),
  bank_opening_balance = COALESCE(bank_balance, 0),
  gala_opening_balance = COALESCE(gala_balance, 0)
WHERE cash_opening_balance = 0
  AND bank_opening_balance = 0
  AND gala_opening_balance = 0;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organisations'
AND column_name LIKE '%opening_balance%'
ORDER BY column_name;
