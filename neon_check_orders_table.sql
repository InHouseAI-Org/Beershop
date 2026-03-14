-- ============================================
-- CHECK ORDERS TABLE STRUCTURE
-- ============================================

-- Check if orders table exists
SELECT 'orders table exists' as status
FROM information_schema.tables
WHERE table_name = 'orders';

-- Check all columns in orders table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Check specifically for bill_number column
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name = 'bill_number'
    )
    THEN 'bill_number column EXISTS'
    ELSE 'bill_number column DOES NOT EXIST - needs to be created'
  END as bill_number_status;
