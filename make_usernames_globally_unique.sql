-- ============================================
-- MAKE USERNAMES GLOBALLY UNIQUE ACROSS ALL ORGANIZATIONS
-- Run this script in Neon SQL Editor
-- ============================================

-- IMPORTANT: Before running this migration, check for duplicate usernames
-- Run this query first to see if there are conflicts:
-- SELECT username, COUNT(*), STRING_AGG(organisation_id::TEXT, ', ') as org_ids
-- FROM users
-- GROUP BY username
-- HAVING COUNT(*) > 1;

-- If duplicates exist, you need to rename them first before applying this constraint
-- Example: Rename duplicate users to include org identifier
-- UPDATE users SET username = username || '_org2' WHERE id = <duplicate_user_id>;

-- Step 1: Remove the per-organization unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_username_per_org;

-- Step 2: Add global unique constraint on username
-- This will fail if duplicate usernames exist across organizations
ALTER TABLE users
  ADD CONSTRAINT users_username_key
  UNIQUE (username);

COMMENT ON CONSTRAINT users_username_key ON users IS
  'Ensures usernames are globally unique across all organizations';

-- ============================================
-- VERIFICATION QUERY (run this to check)
-- ============================================

-- Check constraints on users table
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'users'::regclass AND contype = 'u';

-- Verify no duplicate usernames exist
-- SELECT username, COUNT(*)
-- FROM users
-- GROUP BY username
-- HAVING COUNT(*) > 1;
