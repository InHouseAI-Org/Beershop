-- ============================================
-- VERIFY AND ADD MISSING INDEXES FOR PERFORMANCE
-- Run this in Neon SQL Editor to check and create missing indexes
-- ============================================

-- First, let's check which indexes currently exist
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- CREATE MISSING INDEXES (IF NOT EXISTS)
-- These are critical for organisation_id filtering
-- ============================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_organisation_id ON products(organisation_id);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_organisation_id ON inventory(organisation_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Credit Holders indexes
CREATE INDEX IF NOT EXISTS idx_credit_holders_organisation_id ON credit_holders(organisation_id);

-- Distributors indexes
CREATE INDEX IF NOT EXISTS idx_distributors_organisation_id ON distributors(organisation_id);

-- Sales indexes (CRITICAL - sales table is queried heavily)
CREATE INDEX IF NOT EXISTS idx_sales_organisation_id ON sales(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Composite index for common query pattern: organisation + status
CREATE INDEX IF NOT EXISTS idx_sales_org_status ON sales(organisation_id, status);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_organisation_id ON orders(organisation_id);
CREATE INDEX IF NOT EXISTS idx_orders_distributor_id ON orders(distributor_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);

-- Daily expenses indexes
CREATE INDEX IF NOT EXISTS idx_daily_expenses_organisation_id ON daily_expenses(organisation_id);
CREATE INDEX IF NOT EXISTS idx_daily_expenses_sale_id ON daily_expenses(sale_id);

-- Credit collection history indexes
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_organisation_id ON credit_collection_history(organisation_id);
CREATE INDEX IF NOT EXISTS idx_credit_collection_history_credit_holder_id ON credit_collection_history(credit_holder_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_organisation_id ON users(organisation_id);

-- ============================================
-- ADDITIONAL PERFORMANCE OPTIMIZATIONS
-- ============================================

-- Analyze tables to update statistics (helps query planner)
ANALYZE organisations;
ANALYZE products;
ANALYZE inventory;
ANALYZE credit_holders;
ANALYZE distributors;
ANALYZE sales;
ANALYZE orders;
ANALYZE daily_expenses;
ANALYZE credit_collection_history;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('products', 'inventory', 'credit_holders', 'distributors', 'sales', 'orders', 'daily_expenses', 'credit_collection_history')
ORDER BY tablename, indexname;

-- ============================================
-- CHECK TABLE SIZES AND ROWS
-- ============================================

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
