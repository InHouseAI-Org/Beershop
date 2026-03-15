-- ============================================
-- CHECK PAYMENT DATA STATUS
-- ============================================

-- Count records in both tables
SELECT 'distributor_payment_history' as table_name, COUNT(*) as record_count
FROM distributor_payment_history
UNION ALL
SELECT 'distributor_payments', COUNT(*)
FROM distributor_payments;

-- Show sample from old table
SELECT 'Sample from OLD table (distributor_payment_history):' as info;
SELECT
  id,
  distributor_id,
  amount_paid,
  paid_from,
  paid_at::DATE as payment_date,
  notes
FROM distributor_payment_history
ORDER BY paid_at DESC
LIMIT 3;

-- Show sample from new table (if any)
SELECT 'Sample from NEW table (distributor_payments):' as info;
SELECT
  id,
  distributor_id,
  amount,
  payment_from,
  payment_date,
  notes
FROM distributor_payments
ORDER BY payment_date DESC
LIMIT 3;

-- Check if ledger view exists
SELECT
  CASE WHEN EXISTS (
    SELECT 1
    FROM information_schema.views
    WHERE table_name = 'distributor_ledger'
  )
  THEN 'distributor_ledger view EXISTS'
  ELSE 'distributor_ledger view DOES NOT EXIST'
  END as ledger_view_status;
