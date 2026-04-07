-- ============================================
-- Balance Ledger System Migration
-- ============================================
-- This migration creates the balance_transactions table
-- and sets up the balance ledger system for tracking
-- cash, bank, and gala balance movements
-- ============================================

-- 1. Create balance_transactions table
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  account VARCHAR(50) NOT NULL,  -- cash_balance, bank_balance, gala_balance
  debit_amount DECIMAL(10, 2) DEFAULT 0,   -- Money going out
  credit_amount DECIMAL(10, 2) DEFAULT 0,  -- Money coming in
  transaction_date DATE NOT NULL,
  description TEXT,
  notes TEXT,
  reference_id UUID,           -- ID from source table
  reference_table VARCHAR(100), -- Name of source table
  created_by UUID,
  created_by_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_balance_transactions_org_id ON balance_transactions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_account ON balance_transactions(account);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_date ON balance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference ON balance_transactions(reference_id, reference_table);

-- 3. Create balance_ledger view for easy querying
CREATE OR REPLACE VIEW balance_ledger AS
SELECT
  id,
  organisation_id,
  transaction_type,
  account,
  transaction_date,
  description,
  notes,
  debit_amount,
  credit_amount,
  (credit_amount - debit_amount) as net_amount,
  reference_id,
  reference_table,
  created_by_username,
  created_at
FROM balance_transactions
ORDER BY transaction_date DESC, created_at DESC;

-- 4. Populate initial transactions from existing data

-- From sales table (daily allocations)
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  reference_id,
  reference_table,
  created_by_username
)
SELECT
  s.organisation_id,
  'daily_allocation' as transaction_type,
  'cash_balance' as account,
  0 as debit_amount,
  COALESCE(s.cash_collected, 0) as credit_amount,
  s.date as transaction_date,
  'Daily cash collection from sales' as description,
  s.id as reference_id,
  'sales' as reference_table,
  u.username as created_by_username
FROM sales s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'approved' AND s.cash_collected > 0
ON CONFLICT DO NOTHING;

-- From sales table (UPI allocations to bank)
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  reference_id,
  reference_table,
  created_by_username
)
SELECT
  s.organisation_id,
  'daily_allocation' as transaction_type,
  'bank_balance' as account,
  0 as debit_amount,
  COALESCE(s.upi, 0) as credit_amount,
  s.date as transaction_date,
  'Daily UPI collection from sales' as description,
  s.id as reference_id,
  'sales' as reference_table,
  u.username as created_by_username
FROM sales s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'approved' AND s.upi > 0
ON CONFLICT DO NOTHING;

-- From expenses table
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  reference_id,
  reference_table,
  created_by_username
)
SELECT
  e.organisation_id,
  'expense' as transaction_type,
  e.expense_from as account,
  e.expense_amount as debit_amount,
  0 as credit_amount,
  e.date as transaction_date,
  CONCAT(e.expense_category, COALESCE(' - ' || e.expense_details, '')) as description,
  e.id as reference_id,
  'expenses' as reference_table,
  e.created_by_username
FROM expenses e
ON CONFLICT DO NOTHING;

-- From balance_transfers table (debit entries)
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by_username
)
SELECT
  bt.organisation_id,
  'balance_transfer_debit' as transaction_type,
  bt.from_account as account,
  bt.amount as debit_amount,
  0 as credit_amount,
  bt.transaction_date,
  CONCAT('Transfer to ', REPLACE(bt.to_account, '_balance', ''), COALESCE(' - ' || bt.name, '')) as description,
  bt.description as notes,
  bt.id as reference_id,
  'balance_transfers' as reference_table,
  bt.created_by_username
FROM balance_transfers bt
ON CONFLICT DO NOTHING;

-- From balance_transfers table (credit entries)
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by_username
)
SELECT
  bt.organisation_id,
  'balance_transfer_credit' as transaction_type,
  bt.to_account as account,
  0 as debit_amount,
  bt.amount as credit_amount,
  bt.transaction_date,
  CONCAT('Transfer from ', REPLACE(bt.from_account, '_balance', ''), COALESCE(' - ' || bt.name, '')) as description,
  bt.description as notes,
  bt.id as reference_id,
  'balance_transfers' as reference_table,
  bt.created_by_username
FROM balance_transfers bt
ON CONFLICT DO NOTHING;

-- From miscellaneous_income table
INSERT INTO balance_transactions (
  organisation_id,
  transaction_type,
  account,
  debit_amount,
  credit_amount,
  transaction_date,
  description,
  notes,
  reference_id,
  reference_table,
  created_by_username
)
SELECT
  mi.organisation_id,
  'miscellaneous_income' as transaction_type,
  mi.income_to as account,
  0 as debit_amount,
  mi.amount as credit_amount,
  mi.income_date as transaction_date,
  mi.name as description,
  mi.description as notes,
  mi.id as reference_id,
  'miscellaneous_income' as reference_table,
  mi.created_by_username
FROM miscellaneous_income mi
ON CONFLICT DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Balance ledger system created successfully!';
  RAISE NOTICE 'Tables created: balance_transactions';
  RAISE NOTICE 'Views created: balance_ledger';
  RAISE NOTICE 'Historical data imported from: sales, expenses, balance_transfers, miscellaneous_income';
END $$;
