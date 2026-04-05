-- ============================================
-- DIAGNOSE NEON PERFORMANCE ISSUES
-- Run this in Neon SQL Editor
-- ============================================

-- 1. Check if indexes are being used
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM products WHERE organisation_id = (SELECT id FROM organisations LIMIT 1);

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sales WHERE organisation_id = (SELECT id FROM organisations LIMIT 1);

EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM credit_holders WHERE organisation_id = (SELECT id FROM organisations LIMIT 1);

-- 2. Check table sizes and row counts
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    (SELECT COUNT(*) FROM information_schema.tables t WHERE t.table_name = tablename) as exists
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'sales', 'credit_holders', 'distributors', 'orders')
ORDER BY tablename;

-- 3. Count rows in each table
SELECT 'products' as table_name, COUNT(*) as row_count FROM products
UNION ALL
SELECT 'sales', COUNT(*) FROM sales
UNION ALL
SELECT 'credit_holders', COUNT(*) FROM credit_holders
UNION ALL
SELECT 'distributors', COUNT(*) FROM distributors
UNION ALL
SELECT 'orders', COUNT(*) FROM orders;

-- 4. Check for sequential scans (bad - means no index usage)
SELECT
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as rows_read_sequentially,
    idx_scan as index_scans,
    idx_tup_fetch as rows_fetched_via_index,
    CASE
        WHEN seq_scan > 0 THEN ROUND(100.0 * seq_tup_read / seq_scan, 2)
        ELSE 0
    END as avg_rows_per_seq_scan
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('products', 'sales', 'credit_holders', 'distributors', 'orders')
ORDER BY seq_scan DESC;

-- 5. Check database statistics collection
SELECT
    schemaname,
    tablename,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
