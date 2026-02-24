-- ============================================
-- Add status field to sales table
-- ============================================

-- Add status column to sales table
ALTER TABLE sales
ADD COLUMN status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved'));

-- Add index for better performance
CREATE INDEX idx_sales_status ON sales(status);

-- Set existing sales to 'approved' (backward compatibility)
UPDATE sales SET status = 'approved' WHERE status IS NULL;

-- ============================================
-- Migration Complete! ✅
-- ============================================
--
-- Changes:
-- - Added 'status' column to sales table
-- - Default value: 'approved' for backward compatibility
-- - Allowed values: 'pending', 'approved'
-- - All existing sales set to 'approved'
-- ============================================
