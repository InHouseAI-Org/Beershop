-- ============================================
-- Balance Ledger System - COMPLETE Migration
-- Includes opening balances + distributor payments
-- ============================================

-- STEP 1: Add opening balance columns to organisations table
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS cash_opening_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_opening_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gala_opening_balance DECIMAL(10, 2) DEFAULT 0;

-- STEP 2: Create balance_transactions table
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

-- STEP 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_balance_transactions_org_id ON balance_transactions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_account ON balance_transactions(account);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_date ON balance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference ON balance_transactions(reference_id, reference_table);

-- STEP 4: Create balance_ledger view for easy querying
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

-- STEP 5: Populate initial transactions from existing data

-- From sales table (daily cash allocations)
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

-- From sales table (daily UPI allocations to bank)
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
  reference_table
)
SELECT
  e.organisation_id,
  'expense' as transaction_type,
  e.expense_from as account,
  e.expense_amount as debit_amount,
  0 as credit_amount,
  e.date as transaction_date,
  CONCAT(e.expense_name, COALESCE(' - ' || e.description, '')) as description,
  e.id as reference_id,
  'expenses' as reference_table
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
  mi.account as account,
  0 as debit_amount,
  mi.amount as credit_amount,
  mi.transaction_date as transaction_date,
  mi.name as description,
  mi.description as notes,
  mi.id as reference_id,
  'miscellaneous_income' as reference_table,
  mi.created_by_username
FROM miscellaneous_income mi
ON CONFLICT DO NOTHING;

-- From distributor_payment_history table (payments made to distributors - DEBIT)
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
  dph.organisation_id,
  'distributor_payment' as transaction_type,
  dph.paid_from as account,
  dph.amount_paid as debit_amount,
  0 as credit_amount,
  CAST(dph.paid_at AS DATE) as transaction_date,
  CONCAT('Payment to ', d.name, ' - ₹', dph.amount_paid) as description,
  dph.notes as notes,
  dph.id as reference_id,
  'distributor_payment_history' as reference_table,
  a.username as created_by_username
FROM distributor_payment_history dph
LEFT JOIN distributors d ON dph.distributor_id = d.id
LEFT JOIN admins a ON dph.paid_by = a.id
WHERE dph.paid_from IS NOT NULL
ON CONFLICT DO NOTHING;

-- STEP 6: Show summary of what was created
SELECT
  '✅ Migration Complete!' as status,
  COUNT(*) as total_transactions
FROM balance_transactions;

-- STEP 7: Show breakdown by transaction type
SELECT
  transaction_type,
  account,
  COUNT(*) as count,
  ROUND(SUM(debit_amount)::numeric, 2) as total_debit,
  ROUND(SUM(credit_amount)::numeric, 2) as total_credit,
  ROUND(SUM(credit_amount - debit_amount)::numeric, 2) as net_change
FROM balance_transactions
GROUP BY transaction_type, account
ORDER BY transaction_type, account;

-- STEP 8: Show current vs calculated balance (for verification)
-- This helps you set the opening balance correctly
SELECT
  o.organisation_name,
  o.cash_balance as current_cash,
  o.bank_balance as current_bank,
  o.gala_balance as current_gala,
  ROUND(COALESCE(cash_txn.net, 0)::numeric, 2) as calculated_cash,
  ROUND(COALESCE(bank_txn.net, 0)::numeric, 2) as calculated_bank,
  ROUND(COALESCE(gala_txn.net, 0)::numeric, 2) as calculated_gala,
  ROUND((o.cash_balance - COALESCE(cash_txn.net, 0))::numeric, 2) as cash_opening_needed,
  ROUND((o.bank_balance - COALESCE(bank_txn.net, 0))::numeric, 2) as bank_opening_needed,
  ROUND((o.gala_balance - COALESCE(gala_txn.net, 0))::numeric, 2) as gala_opening_needed
FROM organisations o
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions
  WHERE account = 'cash_balance'
  GROUP BY organisation_id
) cash_txn ON o.id = cash_txn.organisation_id
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions
  WHERE account = 'bank_balance'
  GROUP BY organisation_id
) bank_txn ON o.id = bank_txn.organisation_id
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions
  WHERE account = 'gala_balance'
  GROUP BY organisation_id
) gala_txn ON o.id = gala_txn.organisation_id;

-- ============================================
-- IMPORTANT: Set your opening balances!
-- ============================================
-- After running this migration, you need to set the opening balances.
-- Use the output from STEP 8 above to determine the correct values.
--
-- Example: If your current cash balance is 50000 and calculated is 30000,
-- then your opening balance should be 20000 (50000 - 30000)
--
-- Run this query with YOUR organisation ID and values:
--
-- UPDATE organisations
-- SET
--   cash_opening_balance = 0,  -- Replace with your calculated value
--   bank_opening_balance = 0,  -- Replace with your calculated value
--   gala_opening_balance = 0   -- Replace with your calculated value
-- WHERE id = 'your-organisation-id-here';
-- ============================================
