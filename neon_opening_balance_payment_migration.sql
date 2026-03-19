-- Migration: Add 'opening_balance_payment' payment type support
-- Date: 2026-03-19
-- Description: This migration adds support for the new payment type 'opening_balance_payment'
--              which allows payments against opening balance and unlogged orders

BEGIN;

-- Step 1: Drop the view that depends on payment_type column
DROP VIEW IF EXISTS distributor_ledger CASCADE;

-- Step 2: Increase payment_type column length from VARCHAR(20) to VARCHAR(30)
ALTER TABLE distributor_payments
ALTER COLUMN payment_type TYPE VARCHAR(30);

-- Step 3: Update the CHECK constraint to include 'opening_balance_payment'
ALTER TABLE distributor_payments
DROP CONSTRAINT IF EXISTS distributor_payments_payment_type_check;

ALTER TABLE distributor_payments
ADD CONSTRAINT distributor_payments_payment_type_check
CHECK (payment_type IN ('order_payment', 'advance', 'opening_balance_payment'));

-- Step 4: Recreate the distributor_ledger view
CREATE OR REPLACE VIEW distributor_ledger AS
SELECT
  'order' as transaction_type,
  o.id as order_id,
  NULL::uuid as payment_id,
  o.distributor_id,
  o.organisation_id,
  o.order_date as transaction_date,
  o.bill_number,
  (
    SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
    FROM jsonb_array_elements(o.order_data) as item
  ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0) as debit_amount,
  0 as credit_amount,
  NULL as notes,
  o.created_at
FROM orders o
WHERE o.bill_number IS NOT NULL

UNION ALL

SELECT
  dp.payment_type as transaction_type,
  dp.order_id,
  dp.id as payment_id,
  dp.distributor_id,
  dp.organisation_id,
  dp.payment_date as transaction_date,
  dp.bill_number,
  0 as debit_amount,
  dp.amount as credit_amount,
  dp.notes,
  dp.created_at
FROM distributor_payments dp;

COMMIT;

-- Verification queries (run these after migration to verify)
-- SELECT column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name = 'distributor_payments' AND column_name = 'payment_type';

-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_name = 'distributor_payments_payment_type_check';
