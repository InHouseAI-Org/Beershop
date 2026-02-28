-- Migration to add credit_taken column to sales table
-- Run this on your Neon database

-- Add credit_taken column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_taken JSONB;

-- Add comment for documentation
COMMENT ON COLUMN sales.credit_taken IS 'Credit collected on shop during sales (array of {creditHolderId, amount, collectedIn})';

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'credit_taken';
