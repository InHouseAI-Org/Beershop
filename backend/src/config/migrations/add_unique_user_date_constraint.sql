-- Migration: Add unique constraint to prevent duplicate sales for same user on same date
-- Run this with: psql -h localhost -U bs_user -d beershop -f add_unique_user_date_constraint.sql

-- Drop the constraint if it exists (for re-running the migration)
ALTER TABLE sales DROP CONSTRAINT IF EXISTS unique_user_date_sale;

-- Add unique constraint on user_id and date combination
-- This ensures a user can only have one sale per day
CREATE UNIQUE INDEX unique_user_date_sale ON sales (user_id, date) WHERE user_id IS NOT NULL;

-- Note: We use WHERE user_id IS NOT NULL because admin-created sales might not have a user_id
