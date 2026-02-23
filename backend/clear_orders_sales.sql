-- Clear all entries from orders and sales tables
-- WARNING: This will permanently delete all data from these tables!

BEGIN;

-- Delete all orders
DELETE FROM orders;
RAISE NOTICE 'Deleted all entries from orders table';

-- Delete all sales
DELETE FROM sales;
RAISE NOTICE 'Deleted all entries from sales table';

COMMIT;

-- Show counts to confirm
SELECT 'Orders count:' as info, COUNT(*) as count FROM orders
UNION ALL
SELECT 'Sales count:' as info, COUNT(*) as count FROM sales;
