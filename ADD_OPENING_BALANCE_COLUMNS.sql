-- Add opening balance columns to organisations table
-- Run this migration if you're getting "column does not exist" errors

ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS cash_opening_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_opening_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS gala_opening_balance NUMERIC DEFAULT 0;

-- Verify the columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'organisations'
AND column_name LIKE '%opening_balance%';
