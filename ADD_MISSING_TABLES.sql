-- ============================================
-- MIGRATION: Add Missing Tables & Columns
-- This script is SAFE - it won't delete existing data
-- Run this in Neon SQL Editor
-- ============================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ADD MISSING COLUMNS TO organisations
-- ============================================

-- Add balance columns to organisations table (if they don't exist)
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS cash_balance DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS bank_balance DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS gala_balance DECIMAL(10, 2) DEFAULT 0;

-- Rename 'name' column to 'organisation_name' if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organisations' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'organisations' AND column_name = 'organisation_name'
    ) THEN
        ALTER TABLE organisations RENAME COLUMN name TO organisation_name;
    END IF;
END $$;

-- ============================================
-- 2. ADD MISSING COLUMNS TO admins
-- ============================================

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

ALTER TABLE admins
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'admin';

-- ============================================
-- 3. ADD MISSING COLUMNS TO super_admins
-- ============================================

ALTER TABLE super_admins
ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'superadmin';

-- ============================================
-- 4. CREATE balances TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sales_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cash_balance DECIMAL(10, 2) DEFAULT 0,
  bank_balance DECIMAL(10, 2) DEFAULT 0,
  gala_balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sales_id)
);

-- ============================================
-- 5. CREATE expenses TABLE (if not exists)
-- ============================================

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  expense_name VARCHAR(255) NOT NULL,
  description TEXT,
  expense_from VARCHAR(20) NOT NULL CHECK (expense_from IN ('cash_balance', 'bank_balance', 'gala_balance')),
  expense_amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. ADD collected_in COLUMN to credit_collection_history
-- ============================================

ALTER TABLE credit_collection_history
ADD COLUMN IF NOT EXISTS collected_in VARCHAR(20) CHECK (collected_in IN ('cash_balance', 'bank_balance', 'gala_balance'));

-- ============================================
-- 7. ADD paid_from COLUMN to distributor_payment_history
-- ============================================

ALTER TABLE distributor_payment_history
ADD COLUMN IF NOT EXISTS paid_from VARCHAR(20) CHECK (paid_from IN ('cash_balance', 'bank_balance', 'gala_balance'));

-- ============================================
-- 8. ADD discount & scheme COLUMNS to orders
-- ============================================

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS scheme DECIMAL(10, 2) DEFAULT 0;

-- ============================================
-- 9. CREATE INDEXES (if not exists)
-- ============================================

-- Balances indexes
CREATE INDEX IF NOT EXISTS idx_balances_organisation_id ON balances(organisation_id);
CREATE INDEX IF NOT EXISTS idx_balances_sales_id ON balances(sales_id);
CREATE INDEX IF NOT EXISTS idx_balances_date ON balances(date);

-- Expenses indexes
CREATE INDEX IF NOT EXISTS idx_expenses_organisation_id ON expenses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_from ON expenses(expense_from);

-- Credit collection history indexes
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_collected_in ON credit_collection_history(collected_in);

-- Distributor payment history indexes
CREATE INDEX IF NOT EXISTS idx_distributor_payment_history_paid_from ON distributor_payment_history(paid_from);

-- ============================================
-- DONE! Missing tables and columns added ✅
-- ============================================
--
-- What was added:
-- ✅ cash_balance, bank_balance, gala_balance to organisations
-- ✅ balances table (for daily balance allocation)
-- ✅ expenses table (for expense tracking)
-- ✅ collected_in column to credit_collection_history
-- ✅ paid_from column to distributor_payment_history
-- ✅ discount & scheme columns to orders
-- ✅ All necessary indexes
--
-- Your existing data is safe! No data was deleted.
-- ============================================
