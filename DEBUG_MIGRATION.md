# Debug Migration Failure

The complete migration failed. Let's run it in parts to identify the issue.

## Step-by-Step Debugging

### Step 1: Run Schemes Migration (Part 1)

Run the file: `neon_migration_part1_schemes.sql`

This will:
- Create the `schemes` table
- Create indexes
- Create trigger function
- Create `scheme_tracking` view

**If this fails**, check the error message. Common issues:
- `organisations` table doesn't exist
- `distributors` table doesn't exist
- `admins` table doesn't exist
- Permission issues

### Step 2: Run Recurring Expenses Migration (Part 2)

Run the file: `neon_migration_part2_recurring_expenses.sql`

This will:
- Create `recurring_expenses` table
- Create `recurring_expense_payments` table
- Create indexes
- Create trigger function
- Create `recurring_expenses_summary` view

**If this fails**, check the error message. Common issues:
- `organisations` table doesn't exist
- `expenses` table doesn't exist
- `admins` table doesn't exist

### Step 3: Run Bill Number Handling (Part 3)

Run the file: `neon_migration_part3_bill_numbers.sql`

This will:
- Update orders without bill numbers to set them to 'NA'

**If this fails**, check the error message. Common issues:
- `orders` table doesn't exist
- `bill_number` column doesn't exist on `orders` table

## Common Error Solutions

### Error: "relation does not exist"
This means a table is missing. Check which table is missing and verify your database schema.

Example:
```
ERROR: relation "organisations" does not exist
```

**Solution**: Make sure you have the base tables created. The migration assumes these tables exist:
- organisations
- distributors
- admins
- orders
- expenses

### Error: "column does not exist"
This means a column is missing from a table.

Example:
```
ERROR: column "bill_number" does not exist
```

**Solution**:
1. Check if the `orders` table has a `bill_number` column:
   ```sql
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'orders';
   ```

2. If missing, add it:
   ```sql
   ALTER TABLE orders ADD COLUMN bill_number VARCHAR(100);
   ```

### Error: "permission denied"
Your database user doesn't have sufficient permissions.

**Solution**: Make sure you're using a superuser account or an account with CREATE privileges.

## After Fixing

Once you identify and fix the issue:

1. **If Part 1 succeeded**: Skip it and run Parts 2 and 3
2. **If Part 1 and 2 succeeded**: Just run Part 3
3. **If all parts succeed individually**: The complete migration should work

## Still Having Issues?

Check the Neon console logs for the specific error message. The error will tell you exactly what failed and why.

Common things to check:
1. Do all referenced tables exist? (organisations, distributors, admins, orders, expenses)
2. Do all referenced columns exist?
3. Does your user have CREATE TABLE and CREATE VIEW permissions?
4. Is there enough space in your database?

## Need to Check Your Schema?

Run these queries to check what exists:

```sql
-- Check which tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check orders table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Check if bill_number column exists
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name = 'bill_number';
```
