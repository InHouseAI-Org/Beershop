-- ============================================
-- Consolidated Migration for Neon Database
-- Run this entire script in Neon SQL Editor
-- ============================================

-- 1. Create balance_transfers table
-- This table tracks transactions between different balance accounts
CREATE TABLE IF NOT EXISTS balance_transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  from_account VARCHAR(50) NOT NULL CHECK (from_account IN ('cash_balance', 'bank_balance', 'gala_balance')),
  to_account VARCHAR(50) NOT NULL CHECK (to_account IN ('cash_balance', 'bank_balance', 'gala_balance')),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT different_accounts CHECK (from_account != to_account)
);

-- 3. Add created_by_username column to balance_transfers
-- This allows storing username for admins/superadmins who aren't in users table
ALTER TABLE balance_transfers
ADD COLUMN IF NOT EXISTS created_by_username VARCHAR(255);

COMMENT ON COLUMN balance_transfers.created_by_username IS 'Username of the person who created this transfer (for admins/superadmins)';

-- 4. Create indexes for balance_transfers table
CREATE INDEX IF NOT EXISTS idx_balance_transfers_organisation_id ON balance_transfers(organisation_id);
CREATE INDEX IF NOT EXISTS idx_balance_transfers_transaction_date ON balance_transfers(transaction_date);
CREATE INDEX IF NOT EXISTS idx_balance_transfers_created_by ON balance_transfers(created_by);

-- Add comment to table
COMMENT ON TABLE balance_transfers IS 'Records of money transfers between different balance accounts (cash, bank, gala)';

-- ============================================
-- Migration Complete!
-- ============================================
-- Summary of changes:
-- 1. Added 'miscellaneous' column to sales table
-- 2. Created 'balance_transfers' table with all necessary constraints
-- 3. Added 'created_by_username' column to balance_transfers
-- 4. Created indexes for better query performance
-- ============================================
