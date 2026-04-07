-- ============================================
-- BALANCE LEDGER SYSTEM - COMPLETE NEON MIGRATION
-- ============================================
-- This migration creates the complete balance ledger system
-- with opening balances and all transaction types
--
-- Run this entire file in Neon SQL Editor
-- ============================================

-- ============================================
-- STEP 1: Add opening balance columns
-- ============================================
ALTER TABLE organisations
ADD COLUMN IF NOT EXISTS cash_opening_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_opening_balance DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gala_opening_balance DECIMAL(10, 2) DEFAULT 0;

-- ============================================
-- STEP 2: Create balance_transactions table
-- ============================================
CREATE TABLE IF NOT EXISTS balance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  account VARCHAR(50) NOT NULL,
  debit_amount DECIMAL(10, 2) DEFAULT 0,
  credit_amount DECIMAL(10, 2) DEFAULT 0,
  transaction_date DATE NOT NULL,
  description TEXT,
  notes TEXT,
  reference_id UUID,
  reference_table VARCHAR(100),
  created_by UUID,
  created_by_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_balance_transactions_org_id ON balance_transactions(organisation_id);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_account ON balance_transactions(account);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_date ON balance_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_balance_transactions_reference ON balance_transactions(reference_id, reference_table);

-- ============================================
-- STEP 4: Create balance_ledger view
-- ============================================
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

-- ============================================
-- STEP 5: Import historical transactions
-- ============================================

-- 5.1: Balance Allocations - Cash
-- These are the ALLOCATED amounts from the "Allocate Balance" form
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, reference_id, reference_table, created_by_username
)
SELECT
  b.organisation_id,
  'daily_allocation',
  'cash_balance',
  0,
  COALESCE(b.cash_balance, 0),
  b.date,
  'Daily cash allocation from sales',
  b.sales_id,
  'balances',
  u.username
FROM balances b
LEFT JOIN sales s ON b.sales_id = s.id
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'approved' AND b.cash_balance > 0
ON CONFLICT DO NOTHING;

-- 5.2: Balance Allocations - Bank
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, reference_id, reference_table, created_by_username
)
SELECT
  b.organisation_id,
  'daily_allocation',
  'bank_balance',
  0,
  COALESCE(b.bank_balance, 0),
  b.date,
  'Daily bank allocation from sales',
  b.sales_id,
  'balances',
  u.username
FROM balances b
LEFT JOIN sales s ON b.sales_id = s.id
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'approved' AND b.bank_balance > 0
ON CONFLICT DO NOTHING;

-- 5.3: Balance Allocations - Gala
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, reference_id, reference_table, created_by_username
)
SELECT
  b.organisation_id,
  'daily_allocation',
  'gala_balance',
  0,
  COALESCE(b.gala_balance, 0),
  b.date,
  'Daily gala allocation from sales',
  b.sales_id,
  'balances',
  u.username
FROM balances b
LEFT JOIN sales s ON b.sales_id = s.id
LEFT JOIN users u ON s.user_id = u.id
WHERE s.status = 'approved' AND b.gala_balance > 0
ON CONFLICT DO NOTHING;

-- 5.4: Expenses
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, reference_id, reference_table
)
SELECT
  e.organisation_id,
  'expense',
  e.expense_from,
  e.expense_amount,
  0,
  e.date,
  CONCAT(e.expense_name, COALESCE(' - ' || e.description, '')),
  e.id,
  'expenses'
FROM expenses e
ON CONFLICT DO NOTHING;

-- 5.5: Balance Transfers - Debit (money going out)
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, notes, reference_id, reference_table, created_by_username
)
SELECT
  bt.organisation_id,
  'balance_transfer_debit',
  bt.from_account,
  bt.amount,
  0,
  bt.transaction_date,
  CONCAT('Transfer to ', REPLACE(bt.to_account, '_balance', ''), COALESCE(' - ' || bt.name, '')),
  bt.description,
  bt.id,
  'balance_transfers',
  bt.created_by_username
FROM balance_transfers bt
ON CONFLICT DO NOTHING;

-- 5.6: Balance Transfers - Credit (money coming in)
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, notes, reference_id, reference_table, created_by_username
)
SELECT
  bt.organisation_id,
  'balance_transfer_credit',
  bt.to_account,
  0,
  bt.amount,
  bt.transaction_date,
  CONCAT('Transfer from ', REPLACE(bt.from_account, '_balance', ''), COALESCE(' - ' || bt.name, '')),
  bt.description,
  bt.id,
  'balance_transfers',
  bt.created_by_username
FROM balance_transfers bt
ON CONFLICT DO NOTHING;

-- 5.7: Miscellaneous Income
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, notes, reference_id, reference_table, created_by_username
)
SELECT
  mi.organisation_id,
  'miscellaneous_income',
  mi.account,
  0,
  mi.amount,
  mi.transaction_date,
  mi.name,
  mi.description,
  mi.id,
  'miscellaneous_income',
  mi.created_by_username
FROM miscellaneous_income mi
ON CONFLICT DO NOTHING;

-- 5.8: Distributor Payments (money paid to distributors)
INSERT INTO balance_transactions (
  organisation_id, transaction_type, account,
  debit_amount, credit_amount, transaction_date,
  description, notes, reference_id, reference_table, created_by_username
)
SELECT
  dph.organisation_id,
  'distributor_payment',
  dph.paid_from,
  dph.amount_paid,
  0,
  CAST(dph.paid_at AS DATE),
  CONCAT('Payment to ', d.name, ' - ₹', dph.amount_paid),
  dph.notes,
  dph.id,
  'distributor_payment_history',
  a.username
FROM distributor_payment_history dph
LEFT JOIN distributors d ON dph.distributor_id = d.id
LEFT JOIN admins a ON dph.paid_by = a.id
WHERE dph.paid_from IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show total transactions imported
SELECT
  'Total Transactions Imported' as metric,
  COUNT(*) as value
FROM balance_transactions;

-- Show breakdown by transaction type
SELECT
  transaction_type as "Transaction Type",
  account as "Account",
  COUNT(*) as "Count",
  CONCAT('₹', TO_CHAR(SUM(debit_amount), 'FM999,999,990.00')) as "Total Debit",
  CONCAT('₹', TO_CHAR(SUM(credit_amount), 'FM999,999,990.00')) as "Total Credit",
  CONCAT('₹', TO_CHAR(SUM(credit_amount - debit_amount), 'FM999,999,990.00')) as "Net Change"
FROM balance_transactions
GROUP BY transaction_type, account
ORDER BY transaction_type, account;

-- ============================================
-- CALCULATE OPENING BALANCES
-- ============================================
-- This shows what your opening balances SHOULD be set to

SELECT
  o.id as "Organisation ID",
  o.organisation_name as "Organisation Name",
  '---CURRENT BALANCES---' as "Section",
  CONCAT('₹', TO_CHAR(o.cash_balance, 'FM999,999,990.00')) as "Current Cash",
  CONCAT('₹', TO_CHAR(o.bank_balance, 'FM999,999,990.00')) as "Current Bank",
  CONCAT('₹', TO_CHAR(o.gala_balance, 'FM999,999,990.00')) as "Current Gala"
FROM organisations o
UNION ALL
SELECT
  o.id,
  o.organisation_name,
  '---CALCULATED FROM TRANSACTIONS---',
  CONCAT('₹', TO_CHAR(COALESCE(cash_txn.net, 0), 'FM999,999,990.00')),
  CONCAT('₹', TO_CHAR(COALESCE(bank_txn.net, 0), 'FM999,999,990.00')),
  CONCAT('₹', TO_CHAR(COALESCE(gala_txn.net, 0), 'FM999,999,990.00'))
FROM organisations o
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions WHERE account = 'cash_balance'
  GROUP BY organisation_id
) cash_txn ON o.id = cash_txn.organisation_id
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions WHERE account = 'bank_balance'
  GROUP BY organisation_id
) bank_txn ON o.id = bank_txn.organisation_id
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions WHERE account = 'gala_balance'
  GROUP BY organisation_id
) gala_txn ON o.id = gala_txn.organisation_id
UNION ALL
SELECT
  o.id,
  o.organisation_name,
  '---OPENING BALANCE NEEDED---',
  CONCAT('₹', TO_CHAR(o.cash_balance - COALESCE(cash_txn.net, 0), 'FM999,999,990.00')),
  CONCAT('₹', TO_CHAR(o.bank_balance - COALESCE(bank_txn.net, 0), 'FM999,999,990.00')),
  CONCAT('₹', TO_CHAR(o.gala_balance - COALESCE(gala_txn.net, 0), 'FM999,999,990.00'))
FROM organisations o
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions WHERE account = 'cash_balance'
  GROUP BY organisation_id
) cash_txn ON o.id = cash_txn.organisation_id
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions WHERE account = 'bank_balance'
  GROUP BY organisation_id
) bank_txn ON o.id = bank_txn.organisation_id
LEFT JOIN (
  SELECT organisation_id, SUM(credit_amount - debit_amount) as net
  FROM balance_transactions WHERE account = 'gala_balance'
  GROUP BY organisation_id
) gala_txn ON o.id = gala_txn.organisation_id
ORDER BY "Organisation ID", "Section";

-- ============================================
-- NEXT STEPS: SET YOUR OPENING BALANCES
-- ============================================
-- Look at the output above and use the "OPENING BALANCE NEEDED" values
-- Then run this UPDATE query with your organisation ID and values:

/*
UPDATE organisations
SET
  cash_opening_balance = 0,  -- Replace with the "Cash" value from OPENING BALANCE NEEDED
  bank_opening_balance = 0,  -- Replace with the "Bank" value from OPENING BALANCE NEEDED
  gala_opening_balance = 0   -- Replace with the "Gala" value from OPENING BALANCE NEEDED
WHERE id = 'your-organisation-id-here';
*/

-- ============================================
-- MIGRATION COMPLETE!
-- ============================================
-- The balance ledger system is now active.
-- API endpoints available:
--   - GET /api/balance-ledger/cash/ledger
--   - GET /api/balance-ledger/bank/ledger
--   - GET /api/balance-ledger/gala/ledger
-- ============================================
