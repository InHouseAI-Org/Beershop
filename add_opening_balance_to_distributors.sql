-- Add opening_balance column to distributors table
-- This stores the initial outstanding balance when a distributor was first added to the system

ALTER TABLE distributors
ADD COLUMN opening_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN distributors.opening_balance IS 'Initial outstanding balance when distributor was first added to the system';

-- Update existing distributors to have 0 opening balance (they started fresh in the system)
-- If any existing distributors need a different opening balance, update manually after running this migration
UPDATE distributors SET opening_balance = 0.00 WHERE opening_balance IS NULL;
