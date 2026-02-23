-- Delete all data from tables except users, super_admins, and admins
-- Deletes in correct order to respect foreign key constraints

BEGIN;

-- Delete child tables first
DELETE FROM credit_collection_history;
DELETE FROM distributor_payment_history;
DELETE FROM sales;
DELETE FROM orders;
DELETE FROM inventory;

-- Delete entity tables
DELETE FROM credit_holders;
DELETE FROM distributors;
DELETE FROM products;

-- Delete organisations (this will cascade if properly configured)
DELETE FROM organisations;

COMMIT;

-- Verify deletions
SELECT 'credit_collection_history' as table_name, COUNT(*) as remaining_rows FROM credit_collection_history
UNION ALL
SELECT 'distributor_payment_history', COUNT(*) FROM distributor_payment_history
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'inventory', COUNT(*) FROM inventory
UNION ALL
SELECT 'credit_holders', COUNT(*) FROM credit_holders
UNION ALL
SELECT 'distributors', COUNT(*) FROM distributors
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'organisations', COUNT(*) FROM organisations
UNION ALL
SELECT 'users (kept)', COUNT(*) FROM users
UNION ALL
SELECT 'admins (kept)', COUNT(*) FROM admins
UNION ALL
SELECT 'super_admins (kept)', COUNT(*) FROM super_admins;
