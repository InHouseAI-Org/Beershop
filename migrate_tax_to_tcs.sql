-- ============================================
-- MIGRATE TAX COLUMN VALUES TO TCS COLUMN
-- ============================================
-- This migration moves all values from the tax column to the tcs column,
-- sets the tax column to 0, and populates the TCS ledger
-- ============================================

-- ============================================
-- STEP 1: Copy tax values to tcs column
-- ============================================
UPDATE orders
SET tcs = tax
WHERE tax IS NOT NULL AND tax != 0;

-- ============================================
-- STEP 2: Populate TCS ledger for migrated values
-- ============================================
INSERT INTO tcs_ledger (
  organisation_id,
  order_id,
  distributor_id,
  tcs_amount,
  order_date,
  bill_number,
  payment_status
)
SELECT
  o.organisation_id,
  o.id,
  o.distributor_id,
  o.tcs,
  o.order_date,
  o.bill_number,
  'pending'
FROM orders o
WHERE o.tcs > 0
  AND NOT EXISTS (
    SELECT 1 FROM tcs_ledger tl WHERE tl.order_id = o.id
  );

-- ============================================
-- STEP 3: Set tax column to 0 after copying
-- ============================================
UPDATE orders
SET tax = 0
WHERE tax IS NOT NULL AND tax != 0;

-- ============================================
-- STEP 3: Verify the migration
-- ============================================
-- Run this query to verify that all tax values have been moved to tcs
-- SELECT
--   COUNT(*) as total_orders,
--   COUNT(CASE WHEN tax != 0 THEN 1 END) as orders_with_tax,
--   COUNT(CASE WHEN tcs != 0 THEN 1 END) as orders_with_tcs,
--   SUM(tax) as total_tax,
--   SUM(tcs) as total_tcs
-- FROM orders;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All tax values have been moved to the tcs column
-- The tax column has been reset to 0
-- ============================================
