-- Migration to remove daily_expenses column from sales table
-- Run this on your Neon database if you previously added the daily_expenses JSONB column

-- Remove daily_expenses column from sales table (if it exists)
ALTER TABLE sales DROP COLUMN IF EXISTS daily_expenses;

-- Verify the column was removed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'daily_expenses';

-- This should return no rows if the column was successfully removed
