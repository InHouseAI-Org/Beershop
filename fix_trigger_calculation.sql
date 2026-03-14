-- ============================================
-- FIX: Trigger uses wrong field name for order calculation
-- The trigger was looking for 'price' but orders store 'total'
-- ============================================

-- Drop and recreate the function with correct field names
CREATE OR REPLACE FUNCTION update_distributor_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total outstanding for the distributor
  UPDATE distributors
  SET amount_outstanding = (
    -- Total from orders (debits)
    -- Use the pre-calculated 'total' field from each order item
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

COMMENT ON FUNCTION update_distributor_outstanding() IS 'Auto-updates distributor amount_outstanding based on orders and payments (FIXED: uses total field)';

-- Force recalculation for all distributors
-- This will fix any incorrect outstanding balances
DO $$
DECLARE
  dist RECORD;
BEGIN
  FOR dist IN SELECT id FROM distributors LOOP
    UPDATE distributors
    SET amount_outstanding = (
      SELECT COALESCE(SUM(
        (
          SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
          FROM jsonb_array_elements(o.order_data) as item
        ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
      ), 0)
      FROM orders o
      WHERE o.distributor_id = dist.id
    ) - (
      SELECT COALESCE(SUM(amount), 0)
      FROM distributor_payments dp
      WHERE dp.distributor_id = dist.id
    )
    WHERE id = dist.id;
  END LOOP;

  RAISE NOTICE 'Recalculated outstanding for all distributors';
END $$;

-- Verify the fix
SELECT
  d.name,
  d.amount_outstanding as current_outstanding,
  (
    SELECT COALESCE(SUM(
      (
        SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
        FROM jsonb_array_elements(o.order_data) as item
      ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
    ), 0)
    FROM orders o
    WHERE o.distributor_id = d.id
  ) as total_orders,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM distributor_payments dp
    WHERE dp.distributor_id = d.id
  ) as total_payments
FROM distributors d
ORDER BY d.name;
