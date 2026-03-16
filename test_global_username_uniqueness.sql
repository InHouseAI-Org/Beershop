-- ============================================
-- TEST SCRIPT: Global Username Uniqueness
-- This script tests that usernames are globally unique
-- ============================================

-- Step 1: Check current state of username constraints
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'u';

-- Step 2: Check if any duplicate usernames exist (this should return no rows after migration)
SELECT
  username,
  COUNT(*) as count,
  STRING_AGG(organisation_id::TEXT, ', ') as org_ids,
  STRING_AGG(id::TEXT, ', ') as user_ids
FROM users
GROUP BY username
HAVING COUNT(*) > 1;

-- Step 3: List all usernames with their organization
SELECT
  u.id,
  u.username,
  o.organisation_name,
  u.organisation_id
FROM users u
JOIN organisations o ON u.organisation_id = o.id
ORDER BY u.username, o.organisation_name;

-- ============================================
-- INSTRUCTIONS FOR MANUAL TESTING
-- ============================================

-- After running the migration (make_usernames_globally_unique.sql):

-- Test 1: Try to create a user with an existing username (should fail)
-- This should return an error about duplicate key violation
-- Example:
-- INSERT INTO users (organisation_id, username, password)
-- VALUES ('some-org-id', 'existing_username', 'hashed_password');

-- Test 2: Try to update a user to have an existing username (should fail)
-- This should also return an error about duplicate key violation
-- Example:
-- UPDATE users SET username = 'existing_username' WHERE id = 'some-user-id';

-- Test 3: Create a user with a unique username (should succeed)
-- This should work fine
-- Example:
-- INSERT INTO users (organisation_id, username, password)
-- VALUES ('some-org-id', 'unique_new_username', 'hashed_password');
