-- Migration: Add remarks column to orders table
-- Date: 2026-03-09

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Update existing orders to have empty remarks
UPDATE orders SET remarks = '' WHERE remarks IS NULL;
