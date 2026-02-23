-- Migration: Allow NULL values for qty column in inventory table
-- Run this with: psql -h localhost -U bs_user -d beershop -f allow_null_inventory_qty.sql

-- Allow NULL values for qty column in inventory table
ALTER TABLE inventory ALTER COLUMN qty DROP NOT NULL;
