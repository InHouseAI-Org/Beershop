-- ============================================
-- MIGRATE OLD PAYMENT DATA TO NEW STRUCTURE
-- ============================================
-- This script:
-- 1. Creates the new distributor_payments table
-- 2. Migrates data from old distributor_payment_history table
-- 3. Creates the distributor_ledger view
-- ============================================

BEGIN;

-- ============================================
-- PART 1: CREATE NEW DISTRIBUTOR_PAYMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS distributor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_type VARCHAR(20) NOT NULL DEFAULT 'order_payment' CHECK (payment_type IN ('order_payment', 'advance')),
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_from VARCHAR(20) NOT NULL CHECK (payment_from IN ('cash_balance', 'bank_balance', 'gala_balance')),
  bill_number VARCHAR(100),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES admins(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_distributor_payments_distributor ON distributor_payments(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payments_order ON distributor_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_distributor_payments_date ON distributor_payments(payment_date);

COMMENT ON TABLE distributor_payments IS 'Tracks all payments made to distributors including advances';

-- ============================================
-- PART 2: MIGRATE DATA FROM OLD TABLE
-- ============================================

-- Migrate data from distributor_payment_history to distributor_payments
INSERT INTO distributor_payments (
  id,
  organisation_id,
  distributor_id,
  order_id,
  payment_type,
  amount,
  payment_from,
  bill_number,
  payment_date,
  notes,
  created_by,
  created_at
)
SELECT
  dph.id,
  dph.organisation_id,
  dph.distributor_id,
  NULL as order_id,  -- Old data doesn't have order_id
  'order_payment' as payment_type,  -- Assume all old payments are order payments
  dph.amount_paid as amount,
  COALESCE(dph.paid_from, 'cash_balance') as payment_from,  -- Default to cash if null
  NULL as bill_number,  -- Old data doesn't have bill numbers
  dph.paid_at::DATE as payment_date,
  dph.notes,
  dph.paid_by as created_by,
  dph.paid_at as created_at
FROM distributor_payment_history dph
WHERE NOT EXISTS (
  -- Don't duplicate if already migrated
  SELECT 1 FROM distributor_payments dp WHERE dp.id = dph.id
);

-- Log migration results
DO $$
DECLARE
  old_count INTEGER;
  new_count INTEGER;
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count FROM distributor_payment_history;
  SELECT COUNT(*) INTO new_count FROM distributor_payments;
  migrated_count := new_count;

  RAISE NOTICE 'Old payments in distributor_payment_history: %', old_count;
  RAISE NOTICE 'Total payments in distributor_payments: %', new_count;
  RAISE NOTICE 'Migration completed successfully!';
END $$;

-- ============================================
-- PART 3: CREATE DISTRIBUTOR LEDGER VIEW
-- ============================================

CREATE OR REPLACE VIEW distributor_ledger AS
SELECT
  id,
  organisation_id,
  distributor_id,
  'order' as transaction_type,
  order_date as transaction_date,
  bill_number,
  NULL as payment_id,
  order_id,
  (
    SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
    FROM jsonb_array_elements(order_data) as item
  ) + COALESCE(tax, 0) + COALESCE(misc, 0) - COALESCE(discount, 0) - COALESCE(scheme, 0) as debit,
  0 as credit,
  remarks as notes,
  created_at
FROM orders
WHERE distributor_id IS NOT NULL

UNION ALL

SELECT
  id,
  organisation_id,
  distributor_id,
  'payment' as transaction_type,
  payment_date as transaction_date,
  bill_number,
  id as payment_id,
  order_id,
  0 as debit,
  amount as credit,
  notes,
  created_at
FROM distributor_payments

ORDER BY distributor_id, transaction_date DESC, created_at DESC;

COMMENT ON VIEW distributor_ledger IS 'Complete ledger view combining orders (debits) and payments (credits) for distributors';

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check migration results
SELECT 'Migration Summary:' as info;

SELECT
  'Old Table (distributor_payment_history):' as table_name,
  COUNT(*) as record_count
FROM distributor_payment_history
UNION ALL
SELECT
  'New Table (distributor_payments):',
  COUNT(*)
FROM distributor_payments;

-- Sample data comparison
SELECT 'Sample from distributor_payments (first 5):' as info;
SELECT
  id,
  distributor_id,
  amount,
  payment_from,
  payment_date,
  notes
FROM distributor_payments
ORDER BY payment_date DESC
LIMIT 5;

-- Check view
SELECT 'Ledger view created - sample (first 5):' as info;
SELECT
  distributor_id,
  transaction_type,
  transaction_date,
  debit,
  credit
FROM distributor_ledger
LIMIT 5;

SELECT 'Migration completed successfully!' as status;
