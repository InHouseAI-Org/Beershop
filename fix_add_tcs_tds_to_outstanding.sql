-- ============================================
-- FIX: Add TCS and TDS to Distributor Outstanding Calculation
-- ============================================
-- TCS (Tax Collected at Source) and TDS (Tax Deducted at Source)
-- should be included in the distributor outstanding balance
-- ============================================

BEGIN;

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_update_outstanding_on_payment ON distributor_payments;
DROP TRIGGER IF EXISTS trigger_update_outstanding_on_order ON orders;

-- Update the function to include TCS and TDS in the calculation
CREATE OR REPLACE FUNCTION update_distributor_outstanding()
RETURNS TRIGGER AS $$
DECLARE
  target_distributor_id UUID;
BEGIN
  -- Get the distributor_id from either NEW or OLD record
  target_distributor_id := COALESCE(NEW.distributor_id, OLD.distributor_id);

  IF target_distributor_id IS NULL THEN
    RAISE WARNING 'update_distributor_outstanding: No distributor_id found';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Recalculate total outstanding for the distributor
  UPDATE distributors
  SET amount_outstanding = (
    -- Opening balance (initial debt from previous system or starting balance)
    SELECT COALESCE(d.opening_balance, 0)
    FROM distributors d
    WHERE d.id = target_distributor_id
  ) + (
    -- Total from orders (debits) - NOW INCLUDING TCS AND TDS
    SELECT COALESCE(SUM(
      (
        SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
        FROM jsonb_array_elements(o.order_data) as item
      ) + COALESCE(o.tax, 0)
        + COALESCE(o.misc, 0)
        + COALESCE(o.tcs, 0)   -- Tax Collected at Source (added)
        + COALESCE(o.tds, 0)   -- Tax Deducted at Source (added)
        - COALESCE(o.discount, 0)
        - COALESCE(o.scheme, 0)
    ), 0)
    FROM orders o
    WHERE o.distributor_id = target_distributor_id
  ) - (
    -- Total payments (credits)
    SELECT COALESCE(SUM(amount), 0)
    FROM distributor_payments dp
    WHERE dp.distributor_id = target_distributor_id
  )
  WHERE id = target_distributor_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_distributor_outstanding() IS 'Auto-updates distributor amount_outstanding including opening balance, TCS, and TDS';

-- Recreate triggers
CREATE TRIGGER trigger_update_outstanding_on_payment
AFTER INSERT OR UPDATE OR DELETE ON distributor_payments
FOR EACH ROW
EXECUTE FUNCTION update_distributor_outstanding();

CREATE TRIGGER trigger_update_outstanding_on_order
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_distributor_outstanding();

-- Force recalculation for all distributors to fix any incorrect balances
DO $$
DECLARE
  dist RECORD;
  calculated_outstanding DECIMAL(10, 2);
BEGIN
  RAISE NOTICE 'Starting recalculation of all distributor outstanding balances...';

  FOR dist IN SELECT id, name, opening_balance FROM distributors LOOP
    -- Calculate correct outstanding including opening balance, TCS, and TDS
    SELECT
      COALESCE(dist.opening_balance, 0) +
      COALESCE(SUM(
        (
          SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
          FROM jsonb_array_elements(o.order_data) as item
        ) + COALESCE(o.tax, 0)
          + COALESCE(o.misc, 0)
          + COALESCE(o.tcs, 0)   -- TCS added
          + COALESCE(o.tds, 0)   -- TDS added
          - COALESCE(o.discount, 0)
          - COALESCE(o.scheme, 0)
      ), 0) -
      (
        SELECT COALESCE(SUM(amount), 0)
        FROM distributor_payments dp
        WHERE dp.distributor_id = dist.id
      )
    INTO calculated_outstanding
    FROM orders o
    WHERE o.distributor_id = dist.id;

    -- Update the distributor
    UPDATE distributors
    SET amount_outstanding = calculated_outstanding
    WHERE id = dist.id;

    RAISE NOTICE 'Updated % - Outstanding: %', dist.name, calculated_outstanding;
  END LOOP;

  RAISE NOTICE 'Recalculation complete for all distributors';
END $$;

COMMIT;

-- Verification query to check the results
SELECT
  d.name,
  d.opening_balance,
  d.amount_outstanding as current_outstanding,
  (
    SELECT COALESCE(SUM(
      (
        SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
        FROM jsonb_array_elements(o.order_data) as item
      ) + COALESCE(o.tax, 0)
        + COALESCE(o.misc, 0)
        + COALESCE(o.tcs, 0)
        + COALESCE(o.tds, 0)
        - COALESCE(o.discount, 0)
        - COALESCE(o.scheme, 0)
    ), 0)
    FROM orders o
    WHERE o.distributor_id = d.id
  ) as total_orders_with_tcs_tds,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM distributor_payments dp
    WHERE dp.distributor_id = d.id
  ) as total_payments,
  COALESCE(d.opening_balance, 0) + (
    SELECT COALESCE(SUM(
      (
        SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
        FROM jsonb_array_elements(o.order_data) as item
      ) + COALESCE(o.tax, 0)
        + COALESCE(o.misc, 0)
        + COALESCE(o.tcs, 0)
        + COALESCE(o.tds, 0)
        - COALESCE(o.discount, 0)
        - COALESCE(o.scheme, 0)
    ), 0)
    FROM orders o
    WHERE o.distributor_id = d.id
  ) - (
    SELECT COALESCE(SUM(amount), 0)
    FROM distributor_payments dp
    WHERE dp.distributor_id = d.id
  ) as calculated_outstanding
FROM distributors d
ORDER BY d.name;
