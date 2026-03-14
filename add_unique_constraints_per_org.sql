-- ============================================
-- ADD UNIQUE CONSTRAINTS FOR NAMES WITHIN ORGANIZATION
-- Run this script in Neon SQL Editor
-- ============================================

-- 1. Add unique constraint for product names within organization
-- This ensures no two products can have the same name in one organization
ALTER TABLE products
  ADD CONSTRAINT unique_product_name_per_org
  UNIQUE (organisation_id, product_name);

COMMENT ON CONSTRAINT unique_product_name_per_org ON products IS
  'Ensures product names are unique within each organization';

-- 2. Add unique constraint for credit holder names within organization
-- This ensures no two credit holders can have the same name in one organization
ALTER TABLE credit_holders
  ADD CONSTRAINT unique_credit_holder_name_per_org
  UNIQUE (organisation_id, name);

COMMENT ON CONSTRAINT unique_credit_holder_name_per_org ON credit_holders IS
  'Ensures credit holder names are unique within each organization';

-- 3. Add unique constraint for distributor names within organization
-- This ensures no two distributors can have the same name in one organization
ALTER TABLE distributors
  ADD CONSTRAINT unique_distributor_name_per_org
  UNIQUE (organisation_id, name);

COMMENT ON CONSTRAINT unique_distributor_name_per_org ON distributors IS
  'Ensures distributor names are unique within each organization';

-- 4. Update users table to allow same username across different organizations
-- First, remove the global unique constraint on username
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;

-- Then add a composite unique constraint for username per organization
ALTER TABLE users
  ADD CONSTRAINT unique_username_per_org
  UNIQUE (organisation_id, username);

COMMENT ON CONSTRAINT unique_username_per_org ON users IS
  'Ensures usernames are unique within each organization (different orgs can have same usernames)';

-- ============================================
-- VERIFICATION QUERIES (run these to check)
-- ============================================

-- Check constraints on products
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'products'::regclass AND contype = 'u';

-- Check constraints on credit_holders
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'credit_holders'::regclass AND contype = 'u';

-- Check constraints on distributors
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'distributors'::regclass AND contype = 'u';

-- Check constraints on users
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'users'::regclass AND contype = 'u';
