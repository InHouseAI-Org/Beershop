-- ============================================
-- CHECK CURRENT USERNAME CONSTRAINTS
-- Run this to see what constraints exist on the users table
-- ============================================

-- Check all unique constraints on users table
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'u';

-- Check if any duplicate usernames exist
SELECT
  username,
  COUNT(*) as count,
  STRING_AGG(organisation_id::TEXT, ', ') as org_ids,
  STRING_AGG(id::TEXT, ', ') as user_ids
FROM users
GROUP BY username
HAVING COUNT(*) > 1;

-- List all current usernames
SELECT
  u.id,
  u.username,
  o.organisation_name,
  u.organisation_id
FROM users u
JOIN organisations o ON u.organisation_id = o.id
ORDER BY u.username, o.organisation_name;
