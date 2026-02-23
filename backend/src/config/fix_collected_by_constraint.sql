-- Fix the collected_by foreign key constraint issue
-- The collected_by field should accept both admin and user IDs

-- Drop the existing foreign key constraint
ALTER TABLE credit_collection_history
DROP CONSTRAINT IF EXISTS credit_collection_history_collected_by_fkey;

-- The collected_by column will still store UUIDs but without foreign key constraint
-- This allows it to reference either admins or users table
-- We handle the relationship in application logic instead

-- Similarly fix distributor_payment_history
ALTER TABLE distributor_payment_history
DROP CONSTRAINT IF EXISTS distributor_payment_history_paid_by_fkey;
