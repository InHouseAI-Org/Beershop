-- ============================================
-- PART 3: BILL NUMBER HANDLING ONLY
-- ============================================

BEGIN;

-- Set bill numbers to 'NA' for existing orders without one
UPDATE orders
SET bill_number = 'NA'
WHERE bill_number IS NULL OR bill_number = '';

-- Get count of updated orders
SELECT
  COUNT(*) as total_orders,
  COUNT(CASE WHEN bill_number = 'NA' THEN 1 END) as orders_with_na,
  COUNT(CASE WHEN bill_number IS NOT NULL AND bill_number != '' AND bill_number != 'NA' THEN 1 END) as orders_with_proper_bill_number
FROM orders;

COMMIT;

SELECT 'Bill number handling completed successfully!' as status;
