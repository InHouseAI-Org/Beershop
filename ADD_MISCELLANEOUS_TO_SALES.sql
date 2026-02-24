-- Add miscellaneous column to sales table
-- This migration adds a miscellaneous field to track extra sales (chakhna, bags, etc.)

ALTER TABLE sales
ADD COLUMN IF NOT EXISTS miscellaneous DECIMAL(10, 2) DEFAULT 0;

-- Add comment to explain the column
COMMENT ON COLUMN sales.miscellaneous IS 'Extra sales like chakhna, bags, etc.';
