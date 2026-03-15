-- ============================================
-- MIGRATE OLD PAYMENT DATA TO NEW STRUCTURE (SAFE VERSION)
-- ============================================
-- This version checks for existing data and handles errors gracefully
-- ============================================

-- First, let's check what exists
SELECT 'Checking existing tables...' as status;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payment_history')
    THEN 'distributor_payment_history EXISTS'
    ELSE 'distributor_payment_history DOES NOT EXIST'
  END as old_table_status;

SELECT
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payments')
    THEN 'distributor_payments EXISTS'
    ELSE 'distributor_payments DOES NOT EXIST'
  END as new_table_status;

-- Show record counts if tables exist
DO $$
DECLARE
  old_count INTEGER := 0;
  new_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payment_history') THEN
    EXECUTE 'SELECT COUNT(*) FROM distributor_payment_history' INTO old_count;
    RAISE NOTICE 'Old table (distributor_payment_history) has % records', old_count;
  ELSE
    RAISE NOTICE 'Old table (distributor_payment_history) does not exist';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payments') THEN
    EXECUTE 'SELECT COUNT(*) FROM distributor_payments' INTO new_count;
    RAISE NOTICE 'New table (distributor_payments) has % records', new_count;
  ELSE
    RAISE NOTICE 'New table (distributor_payments) does not exist';
  END IF;
END $$;

-- ============================================
-- Now run the migration
-- ============================================

BEGIN;

-- Create new table if it doesn't exist
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

-- Migrate data only if old table exists
DO $$
DECLARE
  migrated_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payment_history') THEN
    -- Insert data, handling potential conflicts
    WITH migrated AS (
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
        NULL as order_id,
        'order_payment' as payment_type,
        dph.amount_paid as amount,
        COALESCE(dph.paid_from, 'cash_balance') as payment_from,
        NULL as bill_number,
        dph.paid_at::DATE as payment_date,
        dph.notes,
        dph.paid_by as created_by,
        dph.paid_at as created_at
      FROM distributor_payment_history dph
      WHERE NOT EXISTS (
        SELECT 1 FROM distributor_payments dp WHERE dp.id = dph.id
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id
    )
    SELECT COUNT(*) INTO migrated_count FROM migrated;

    RAISE NOTICE 'Successfully migrated % payment records', migrated_count;
  ELSE
    RAISE NOTICE 'Old table does not exist - nothing to migrate';
  END IF;
END $$;

-- Create or replace the ledger view
CREATE OR REPLACE VIEW distributor_ledger AS
SELECT
  id,
  organisation_id,
  distributor_id,
  'order' as transaction_type,
  order_date as transaction_date,
  bill_number,
  NULL::UUID as payment_id,
  id as order_id,
  (
    SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
    FROM jsonb_array_elements(order_data) as item
  ) + COALESCE(tax, 0) + COALESCE(misc, 0) - COALESCE(discount, 0) - COALESCE(scheme, 0) as debit,
  0::DECIMAL as credit,
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
  0::DECIMAL as debit,
  amount as credit,
  notes,
  created_at
FROM distributor_payments

ORDER BY distributor_id, transaction_date DESC, created_at DESC;

COMMIT;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

SELECT 'Migration completed!' as status;

-- Show final counts
DO $$
DECLARE
  old_count INTEGER := 0;
  new_count INTEGER := 0;
  ledger_count INTEGER := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payment_history') THEN
    EXECUTE 'SELECT COUNT(*) FROM distributor_payment_history' INTO old_count;
  END IF;

  EXECUTE 'SELECT COUNT(*) FROM distributor_payments' INTO new_count;
  EXECUTE 'SELECT COUNT(*) FROM distributor_ledger' INTO ledger_count;

  RAISE NOTICE '';
  RAISE NOTICE '=== FINAL STATUS ===';
  RAISE NOTICE 'Old table records: %', old_count;
  RAISE NOTICE 'New table records: %', new_count;
  RAISE NOTICE 'Ledger entries: %', ledger_count;
  RAISE NOTICE '';

  IF new_count > 0 THEN
    RAISE NOTICE 'SUCCESS: Payment data is now available!';
  ELSIF old_count = 0 THEN
    RAISE NOTICE 'INFO: No old payment data found to migrate';
  ELSE
    RAISE WARNING 'ISSUE: Old data exists but was not migrated - check for errors above';
  END IF;
END $$;

-- Show sample data
SELECT 'Sample from distributor_payments (most recent 3):' as info;
SELECT
  payment_date,
  distributor_id,
  amount,
  payment_from,
  notes
FROM distributor_payments
ORDER BY payment_date DESC, created_at DESC
LIMIT 3;
