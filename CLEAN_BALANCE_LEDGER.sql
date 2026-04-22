-- ============================================
-- CLEAN BALANCE LEDGER DATA
-- ============================================
-- This script deletes ONLY balance_transactions data
-- while preserving all source data (sales, expenses, transfers, etc.)
-- Run this before re-running the migration
-- ============================================

-- Show current count before deletion
SELECT 'Current balance_transactions count:', COUNT(*)
FROM balance_transactions;

-- Delete all balance_transactions (the ledger entries)
DELETE FROM balance_transactions;

-- Verify deletion
SELECT 'balance_transactions deleted. Count is now:', COUNT(*)
FROM balance_transactions;

-- ============================================
-- IMPORTANT NOTE
-- ============================================
-- Credit collections are NOT included in the migration
-- because they are already part of daily allocations.
-- When you allocate balances from sales, those amounts
-- already include any credit collections made.
-- ============================================

-- ============================================
-- READY FOR MIGRATION
-- ============================================
-- Now you can re-run NEON_BALANCE_LEDGER_MIGRATION.sql
-- which will recreate the ledger entries from your source data:
--   ✓ Daily allocations (cash, bank, gala) from sales
--   ✓ Expenses
--   ✓ Balance transfers
--   ✓ Miscellaneous income
--   ✓ Distributor payments
--   ✗ Credit collections (already in daily allocations)
-- ============================================
