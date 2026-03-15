-- ============================================
-- REVERT: Remove bill_number filter from trigger
-- Outstanding amounts should include ALL orders
-- Only the frontend UI should filter for display purposes
-- ============================================

-- Restore the original trigger function WITHOUT bill_number filter
CREATE OR REPLACE FUNCTION update_distributor_outstanding()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total outstanding for the distributor
  UPDATE distributors
  SET amount_outstanding = (
    -- Total from orders (debits) - ALL ORDERS, regardless of bill_number
    -- Use the pre-calculated 'total' field from each order item
    SELECT COALESCE(SUM(
      (
        SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
        FROM jsonb_array_elements(o.order_data) as item
      ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0)
    ), 0)
    FROM orders o
    WHERE o.distributor_id = COALESCE(NEW.distributor_id, OLD.distributor_id)
    -- NO FILTER ON bill_number - count all orders
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

COMMENT ON FUNCTION update_distributor_outstanding() IS 'Auto-updates distributor amount_outstanding based on ALL orders and payments';

-- Force recalculation for all distributors to fix incorrect balances
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
      -- NO FILTER - include all orders
    ) - (
      SELECT COALESCE(SUM(amount), 0)
      FROM distributor_payments dp
      WHERE dp.distributor_id = dist.id
    )
    WHERE id = dist.id;
  END LOOP;

  RAISE NOTICE 'Recalculated outstanding for all distributors (including ALL orders)';
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
  ) as total_all_orders,
  (
    SELECT COALESCE(SUM(amount), 0)
    FROM distributor_payments dp
    WHERE dp.distributor_id = d.id
  ) as total_payments,
  (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.distributor_id = d.id
      AND o.bill_number IS NULL
  ) as orders_without_bill_numbers
FROM distributors d
ORDER BY d.name;
