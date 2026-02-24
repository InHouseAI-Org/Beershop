-- Add created_by_username column to balance_transfers table
-- This allows us to store the username even for admins/superadmins who aren't in the users table

ALTER TABLE balance_transfers
ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(255);

-- Add comment
COMMENT ON COLUMN balance_transfers.created_by_username IS 'Username of the person who created this transfer (for admins/superadmins)';
