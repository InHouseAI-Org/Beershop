-- ============================================
-- BALANCE LEDGER SYSTEM - TESTING SCRIPT
-- Run this after installing the main migration
-- ============================================

-- Step 1: Verify tables and columns exist
\echo '=== Checking if opening balance columns exist ==='
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organisations'
  AND column_name LIKE '%opening_balance'
ORDER BY column_name;

\echo '\n=== Checking if balance_transactions table exists ==='
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'balance_transactions'
ORDER BY ordinal_position;

\echo '\n=== Checking if balance_ledger view exists ==='
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'balance_ledger';

-- Step 2: Check triggers
\echo '\n=== Checking if triggers are created ==='
SELECT
  trigger_name,
  event_object_table as table_name,
  action_timing,
  event_manipulation as event
FROM information_schema.triggers
WHERE trigger_name LIKE '%balance_transaction%'
ORDER BY trigger_name;

-- Step 3: Check existing data
\echo '\n=== Count of transactions by table ==='
SELECT
  reference_table,
  COUNT(*) as count,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount) as total_credits
FROM balance_transactions
GROUP BY reference_table
ORDER BY count DESC;

\echo '\n=== Count of transactions by account ==='
SELECT
  account,
  COUNT(*) as count,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount) as total_credits,
  SUM(credit_amount - debit_amount) as net_amount
FROM balance_transactions
GROUP BY account
ORDER BY account;

\echo '\n=== Count of transactions by type ==='
SELECT
  transaction_type,
  COUNT(*) as count,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount) as total_credits
FROM balance_transactions
GROUP BY transaction_type
ORDER BY count DESC;

-- Step 4: Verify balance calculations (sample for first org)
\echo '\n=== Verifying balance calculations for first organization ==='
SELECT
  o.organisation_name,
  o.cash_opening_balance,
  o.cash_balance as current_cash,
  (o.cash_opening_balance + COALESCE(SUM(
    CASE WHEN bt.account = 'cash_balance'
    THEN bt.credit_amount - bt.debit_amount
    ELSE 0 END
  ), 0)) as calculated_cash,
  o.bank_opening_balance,
  o.bank_balance as current_bank,
  (o.bank_opening_balance + COALESCE(SUM(
    CASE WHEN bt.account = 'bank_balance'
    THEN bt.credit_amount - bt.debit_amount
    ELSE 0 END
  ), 0)) as calculated_bank,
  o.gala_opening_balance,
  o.gala_balance as current_gala,
  (o.gala_opening_balance + COALESCE(SUM(
    CASE WHEN bt.account = 'gala_balance'
    THEN bt.credit_amount - bt.debit_amount
    ELSE 0 END
  ), 0)) as calculated_gala
FROM organisations o
LEFT JOIN balance_transactions bt ON bt.organisation_id = o.id
GROUP BY o.id, o.organisation_name, o.cash_opening_balance, o.cash_balance,
         o.bank_opening_balance, o.bank_balance, o.gala_opening_balance, o.gala_balance
LIMIT 1;

-- Step 5: Sample transactions
\echo '\n=== Sample of 10 most recent transactions ==='
SELECT
  transaction_date,
  transaction_type,
  account,
  description,
  debit_amount,
  credit_amount,
  (credit_amount - debit_amount) as net_amount,
  reference_table
FROM balance_transactions
ORDER BY transaction_date DESC, created_at DESC
LIMIT 10;

-- Step 6: Test date range query (last 30 days)
\echo '\n=== Transactions in last 30 days by account ==='
SELECT
  account,
  COUNT(*) as count,
  SUM(debit_amount) as debits,
  SUM(credit_amount) as credits,
  SUM(credit_amount - debit_amount) as net
FROM balance_transactions
WHERE transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY account
ORDER BY account;

-- Step 7: Check for orphaned transactions (references that don't exist)
\echo '\n=== Checking for orphaned transactions ==='
SELECT
  reference_table,
  COUNT(*) as orphaned_count
FROM balance_transactions bt
WHERE reference_table = 'expenses'
  AND NOT EXISTS (SELECT 1 FROM expenses e WHERE e.id = bt.reference_id)
UNION ALL
SELECT
  reference_table,
  COUNT(*) as orphaned_count
FROM balance_transactions bt
WHERE reference_table = 'balance_transfers'
  AND NOT EXISTS (SELECT 1 FROM balance_transfers b WHERE b.id = bt.reference_id)
UNION ALL
SELECT
  reference_table,
  COUNT(*) as orphaned_count
FROM balance_transactions bt
WHERE reference_table = 'distributor_payments'
  AND NOT EXISTS (SELECT 1 FROM distributor_payments d WHERE d.id = bt.reference_id);

-- Step 8: Summary report
\echo '\n=== SUMMARY REPORT ==='
SELECT
  'Total Transactions' as metric,
  COUNT(*)::text as value
FROM balance_transactions
UNION ALL
SELECT
  'Total Organizations',
  COUNT(DISTINCT organisation_id)::text
FROM balance_transactions
UNION ALL
SELECT
  'Date Range',
  MIN(transaction_date)::text || ' to ' || MAX(transaction_date)::text
FROM balance_transactions
UNION ALL
SELECT
  'Total Debits',
  '₹' || SUM(debit_amount)::text
FROM balance_transactions
UNION ALL
SELECT
  'Total Credits',
  '₹' || SUM(credit_amount)::text
FROM balance_transactions
UNION ALL
SELECT
  'Net Change',
  '₹' || SUM(credit_amount - debit_amount)::text
FROM balance_transactions;

\echo '\n=== Testing Complete! ==='
\echo 'Check the output above for any issues.'
\echo 'All counts should be > 0 if you have existing data.'
\echo 'Current balance should equal calculated balance.'
