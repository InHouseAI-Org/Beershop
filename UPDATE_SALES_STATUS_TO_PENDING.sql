-- ============================================
-- UPDATE SALES STATUS TO PENDING
-- ============================================
-- This script updates all sales records to 'pending' status
-- for organisation: cedb75d0-6f37-4078-b832-c8b01d926948
--
-- ⚠️ WARNING: THIS WILL UPDATE ALL SALES FOR THIS ORGANISATION
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THIS
-- ============================================

BEGIN;

-- Set the organisation ID
DO $$
DECLARE
  target_org UUID := 'cedb75d0-6f37-4078-b832-c8b01d926948';
  rows_affected INTEGER;
BEGIN
  RAISE NOTICE 'Updating sales status to pending for organisation: %', target_org;

  -- Update all sales to pending status
  UPDATE sales
  SET status = 'pending'
  WHERE organisation_id = target_org;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RAISE NOTICE 'Updated % sales records to pending status', rows_affected;

END $$;

-- Verify the changes
SELECT
  COUNT(*) as total_pending_sales,
  organisation_id
FROM sales
WHERE organisation_id = 'cedb75d0-6f37-4078-b832-c8b01d926948'
  AND status = 'pending'
GROUP BY organisation_id;

-- Review before committing
-- ROLLBACK; -- Uncomment to undo changes
COMMIT; -- Comment out if you want to review first
