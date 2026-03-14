-- ============================================
-- ADD BILL NUMBER TRACKING AND ADVANCES SYSTEM
-- Run this script in your database
-- ============================================

-- 1. Add bill_number column to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS bill_number VARCHAR(100);

COMMENT ON COLUMN orders.bill_number IS 'Bill number from distributor invoice';

-- 2. Create distributor_payments table to track all payments
CREATE TABLE IF NOT EXISTS distributor_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES distributors(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('order_payment', 'advance')),
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
COMMENT ON COLUMN distributor_payments.payment_type IS 'Type: order_payment (against bill) or advance (prepayment)';
COMMENT ON COLUMN distributor_payments.bill_number IS 'Bill number this payment is for (if order_payment)';
COMMENT ON COLUMN distributor_payments.payment_from IS 'Which balance the payment came from';

-- 3. Create distributor_ledger view (combines orders and payments)
CREATE OR REPLACE VIEW distributor_ledger AS
SELECT
  o.organisation_id,
  o.distributor_id,
  o.id as transaction_id,
  'order' as transaction_type,
  o.order_date as transaction_date,
  o.bill_number,
  (
    SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
    FROM jsonb_array_elements(o.order_data) as item
  ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0) as debit_amount,
  0.00 as credit_amount,
  NULL as payment_from,
  NULL as notes,
  o.created_at
FROM orders o

UNION ALL

SELECT
  dp.organisation_id,
  dp.distributor_id,
  dp.id as transaction_id,
  dp.payment_type as transaction_type,
  dp.payment_date as transaction_date,
  dp.bill_number,
  0.00 as debit_amount,
  dp.amount as credit_amount,
  dp.payment_from,
  dp.notes,
  dp.created_at
FROM distributor_payments dp

ORDER BY transaction_date DESC, created_at DESC;

COMMENT ON VIEW distributor_ledger IS 'Complete ledger view showing orders (debits) and payments (credits) for distributors';

-- 4. Create function to update distributor outstanding balance
CREATE OR REPLACE FUNCTION update_distributor_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total outstanding for the distributor
  UPDATE distributors
  SET amount_outstanding = (
    -- Total from orders (debits)
    SELECT COALESCE(SUM(
      (
        SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
        FROM jsonb_array_elements(o.order_data) as item
      ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
    ), 0)
    FROM orders o
    WHERE o.distributor_id = COALESCE(NEW.distributor_id, OLD.distributor_id)
  ) - (
    -- Total payments (credits)
    SELECT COALESCE(SUM(amount), 0)
    FROM distributor_payments dp
    WHERE dp.distributor_id = COALESCE(NEW.distributor_id, OLD.distributor_id)
  )
  WHERE id = COALESCE(NEW.distributor_id, OLD.distributor_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create triggers to auto-update outstanding balance
DROP TRIGGER IF EXISTS trigger_update_outstanding_on_payment ON distributor_payments;
CREATE TRIGGER trigger_update_outstanding_on_payment
AFTER INSERT OR UPDATE OR DELETE ON distributor_payments
FOR EACH ROW
EXECUTE FUNCTION update_distributor_outstanding();

DROP TRIGGER IF EXISTS trigger_update_outstanding_on_order ON orders;
CREATE TRIGGER trigger_update_outstanding_on_order
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_distributor_outstanding();

COMMENT ON FUNCTION update_distributor_outstanding() IS 'Auto-updates distributor amount_outstanding based on orders and payments';

-- 6. Migrate existing distributor_payment_history to new system (if exists)
-- This preserves old payment records
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'distributor_payment_history') THEN
    INSERT INTO distributor_payments (
      organisation_id,
      distributor_id,
      payment_type,
      amount,
      payment_from,
      payment_date,
      notes,
      created_at
    )
    SELECT
      dph.organisation_id,
      dph.distributor_id,
      'order_payment' as payment_type,
      dph.amount_paid,
      COALESCE(dph.paid_from, 'cash_balance') as payment_from,
      CAST(dph.paid_at AS DATE) as payment_date,
      dph.notes,
      dph.paid_at as created_at
    FROM distributor_payment_history dph
    WHERE NOT EXISTS (
      -- Avoid duplicates if running migration multiple times
      SELECT 1 FROM distributor_payments dp2
      WHERE dp2.distributor_id = dph.distributor_id
      AND dp2.amount = dph.amount_paid
      AND CAST(dp2.payment_date AS DATE) = CAST(dph.paid_at AS DATE)
    );

    RAISE NOTICE 'Migrated existing payment history to new distributor_payments table';
  END IF;
END $$;

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_bill_number ON orders(bill_number);
CREATE INDEX IF NOT EXISTS idx_orders_distributor_date ON orders(distributor_id, order_date);

-- ============================================
-- VERIFICATION QUERIES (uncomment to run)
-- ============================================

-- Check new columns and tables
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'bill_number';
-- SELECT * FROM information_schema.tables WHERE table_name IN ('distributor_payments');
-- SELECT * FROM information_schema.views WHERE table_name = 'distributor_ledger';

-- Test ledger view
-- SELECT * FROM distributor_ledger WHERE distributor_id = 'YOUR_DISTRIBUTOR_ID' ORDER BY transaction_date DESC LIMIT 10;
