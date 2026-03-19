-- Increase payment_type column length to accommodate 'opening_balance_payment'

-- First, drop the view that depends on this column
DROP VIEW IF EXISTS distributor_ledger CASCADE;

-- Alter the column
ALTER TABLE distributor_payments
ALTER COLUMN payment_type TYPE VARCHAR(30);

-- Recreate the distributor_ledger view
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
