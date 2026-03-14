-- ============================================
-- PART 3: BILL NUMBER HANDLING (FIXED)
-- ============================================
-- This version checks if bill_number column exists
-- and creates it if it doesn't
-- ============================================

BEGIN;

-- Add bill_number column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
    AND column_name = 'bill_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN bill_number VARCHAR(100);
    RAISE NOTICE 'Created bill_number column';
  ELSE
    RAISE NOTICE 'bill_number column already exists';
  END IF;
END $$;

-- Set bill numbers to 'NA' for existing orders without one
UPDATE orders
SET bill_number = 'NA'
WHERE bill_number IS NULL OR bill_number = '';

COMMIT;

-- Get count of updated orders
SELECT
  COUNT(*) as total_orders,
  COUNT(CASE WHEN bill_number = 'NA' THEN 1 END) as orders_with_na,
  COUNT(CASE WHEN bill_number IS NOT NULL AND bill_number != '' AND bill_number != 'NA' THEN 1 END) as orders_with_proper_bill_number,
  COUNT(CASE WHEN bill_number IS NULL OR bill_number = '' THEN 1 END) as orders_without_bill_number
FROM orders;

SELECT 'Bill number handling completed successfully!' as status;
