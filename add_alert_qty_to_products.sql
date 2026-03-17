-- Add alert_qty column to products table
-- This column stores the minimum quantity threshold for inventory alerts

ALTER TABLE products
ADD COLUMN IF NOT EXISTS alert_qty DECIMAL(10, 2) DEFAULT 0;

-- Add comment to the column
COMMENT ON COLUMN products.alert_qty IS 'Minimum quantity threshold - alert when inventory goes below this value';
