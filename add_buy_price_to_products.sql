-- ============================================
-- ADD BUY_PRICE COLUMN TO PRODUCTS TABLE
-- Run this script in Neon SQL Editor
-- ============================================

-- Add buy_price column to products table
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS buy_price DECIMAL(10, 2) DEFAULT 0;

COMMENT ON COLUMN products.buy_price IS
  'Standard buy/purchase price for the product (set by admin)';

-- Note: average_buy_price remains for tracking weighted average based on actual purchases
COMMENT ON COLUMN products.average_buy_price IS
  'Calculated average buy price based on actual order history (auto-updated)';

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Check the products table structure
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'products'
-- ORDER BY ordinal_position;
