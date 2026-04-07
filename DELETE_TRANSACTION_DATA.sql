-- ============================================
-- DELETE TRANSACTION DATA FOR SPECIFIC ORGANISATIONS
-- ============================================
-- This script deletes all transactional data while preserving:
-- - inventory
-- - organisations
-- - admins
-- - distributors
--
-- Organisations to clean:
-- - 1c934544-d04c-4256-89e8-3bf304ccd5ef
-- - 88cb6b19-53f6-4cb5-8d34-1f63acefd8be
--
-- ⚠️ WARNING: THIS WILL DELETE ALL TRANSACTION DATA
-- ⚠️ BACKUP YOUR DATABASE BEFORE RUNNING THIS
-- ============================================

BEGIN;

-- Set the organisation IDs
DO $$
DECLARE
  org1 UUID := '1c934544-d04c-4256-89e8-3bf304ccd5ef';
  org2 UUID := '88cb6b19-53f6-4cb5-8d34-1f63acefd8be';
BEGIN
  RAISE NOTICE 'Deleting transaction data for organisations: %, %', org1, org2;

  -- 1. Delete balance_transactions (NEW - ledger entries)
  DELETE FROM balance_transactions
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted balance_transactions';

  -- 2. Delete credit_collection_history
  DELETE FROM credit_collection_history
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted credit_collection_history';

  -- 3. Delete credit_holders
  DELETE FROM credit_holders
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted credit_holders';

  -- 4. Delete distributor_payments
  DELETE FROM distributor_payments
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted distributor_payments';

  -- 5. Delete miscellaneous_income
  DELETE FROM miscellaneous_income
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted miscellaneous_income';

  -- 6. Delete balance_transfers
  DELETE FROM balance_transfers
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted balance_transfers';

  -- 7. Delete expenses
  DELETE FROM expenses
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted expenses';

  -- 8. Delete balances (daily balance allocations)
  DELETE FROM balances
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted balances';

  -- 9. Delete sales
  DELETE FROM sales
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted sales';

  -- 10. Delete orders
  DELETE FROM orders
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted orders';

  -- 11. Delete users (sales users)
  DELETE FROM users
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Deleted users';

  -- 12. Reset organisation balances to zero
  UPDATE organisations
  SET
    cash_balance = 0,
    bank_balance = 0,
    gala_balance = 0,
    cash_opening_balance = 0,
    bank_opening_balance = 0,
    gala_opening_balance = 0
  WHERE id IN (org1, org2);
  RAISE NOTICE 'Reset organisation balances to zero';

  -- 13. Reset distributor outstanding amounts
  UPDATE distributors
  SET
    amount_outstanding = 0,
    opening_balance = 0
  WHERE organisation_id IN (org1, org2);
  RAISE NOTICE 'Reset distributor balances to zero';

END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Show remaining data counts
SELECT
  '1. balance_transactions' as table_name,
  COUNT(*) as remaining_count
FROM balance_transactions
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '2. credit_collection_history',
  COUNT(*)
FROM credit_collection_history
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '3. credit_holders',
  COUNT(*)
FROM credit_holders
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '4. distributor_payments',
  COUNT(*)
FROM distributor_payments
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '5. miscellaneous_income',
  COUNT(*)
FROM miscellaneous_income
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '6. balance_transfers',
  COUNT(*)
FROM balance_transfers
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '7. expenses',
  COUNT(*)
FROM expenses
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '8. balances',
  COUNT(*)
FROM balances
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '9. sales',
  COUNT(*)
FROM sales
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '10. orders',
  COUNT(*)
FROM orders
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  '11. users',
  COUNT(*)
FROM users
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be');

-- Show preserved data counts
SELECT
  'PRESERVED: inventory' as table_name,
  COUNT(*) as count
FROM inventory
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  'PRESERVED: distributors',
  COUNT(*)
FROM distributors
WHERE organisation_id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  'PRESERVED: organisations',
  COUNT(*)
FROM organisations
WHERE id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be')

UNION ALL

SELECT
  'PRESERVED: admins (all)',
  COUNT(*)
FROM admins;

-- Show organisation balances (should be zero)
SELECT
  id,
  organisation_name,
  cash_balance,
  bank_balance,
  gala_balance,
  cash_opening_balance,
  bank_opening_balance,
  gala_opening_balance
FROM organisations
WHERE id IN ('1c934544-d04c-4256-89e8-3bf304ccd5ef', '88cb6b19-53f6-4cb5-8d34-1f63acefd8be');

-- ============================================
-- CLEANUP COMPLETE
-- ============================================
