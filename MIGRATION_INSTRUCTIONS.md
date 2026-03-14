# Neon Database Migration Instructions

This guide will help you apply all the latest database changes to your Neon database.

## What's Included

This migration script includes:

1. **Schemes Tracking System**
   - Tracks distributor schemes with target quantities and values
   - Supports overall quantity targets or per-product targets
   - Automatically calculates scheme end dates and expiry status
   - Tracks achievement status and dates

2. **Recurring Expenses System**
   - Manages recurring expenses (weekly, monthly, yearly)
   - Tracks payment history for each recurring expense
   - Calculates due status and days until/overdue
   - Links to actual expense entries when paid

3. **Bill Number Handling**
   - Sets bill numbers to "NA" for existing orders without one
   - Future orders will have proper bill numbers when created

## Prerequisites

- Access to your Neon database console or a PostgreSQL client
- Database connection string from Neon

## Migration Steps

### Option 1: Using Neon Console (Recommended)

1. **Login to Neon Console**
   - Go to https://console.neon.tech
   - Select your project
   - Navigate to the SQL Editor

2. **Run the Migration Script**
   - Open the file `neon_complete_migration.sql`
   - Copy the entire contents
   - Paste into the Neon SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

3. **Verify the Migration**
   - The script includes verification queries at the end
   - Check the output to confirm:
     - Schemes table created
     - Recurring expenses tables created
     - Bill numbers generated for all orders

### Option 2: Using psql Command Line

1. **Connect to your Neon database**
   ```bash
   psql "postgresql://username:password@your-neon-host/dbname?sslmode=require"
   ```

2. **Run the migration script**
   ```bash
   \i /path/to/neon_complete_migration.sql
   ```

3. **Check the output for any errors**

### Option 3: Using a PostgreSQL Client (TablePlus, pgAdmin, etc.)

1. **Connect to your Neon database** using your client
2. **Open the SQL query window**
3. **Load and execute** `neon_complete_migration.sql`
4. **Review the results**

## What Happens During Migration

### 1. Schemes Tracking (Tables)
- Creates `schemes` table
- Creates `scheme_tracking` view
- Adds indexes for performance
- Sets up triggers for auto-updating timestamps

### 2. Recurring Expenses (Tables)
- Creates `recurring_expenses` table
- Creates `recurring_expense_payments` table
- Creates `recurring_expenses_summary` view
- Adds indexes and triggers

### 3. Bill Number Handling (Data)
- Finds all orders without a bill number
- Sets their bill_number to "NA"
- Logs how many orders were updated

## Verification

After running the migration, verify everything worked:

```sql
-- Check schemes table
SELECT COUNT(*) as schemes_count FROM schemes;

-- Check recurring expenses
SELECT COUNT(*) as recurring_expenses_count FROM recurring_expenses;

-- Check bill numbers
SELECT
  COUNT(*) as total_orders,
  COUNT(CASE WHEN bill_number IS NOT NULL AND bill_number != '' THEN 1 END) as orders_with_bill_number,
  COUNT(CASE WHEN bill_number = 'NA' THEN 1 END) as orders_with_na,
  COUNT(CASE WHEN bill_number IS NULL OR bill_number = '' THEN 1 END) as orders_without_bill_number
FROM orders;

-- View sample bill numbers
SELECT bill_number, order_date
FROM orders
ORDER BY order_date DESC
LIMIT 10;
```

## Rollback (If Needed)

If you need to rollback the migration:

```sql
BEGIN;

-- Drop schemes system
DROP VIEW IF EXISTS scheme_tracking CASCADE;
DROP TABLE IF EXISTS schemes CASCADE;

-- Drop recurring expenses system
DROP VIEW IF EXISTS recurring_expenses_summary CASCADE;
DROP TABLE IF EXISTS recurring_expense_payments CASCADE;
DROP TABLE IF EXISTS recurring_expenses CASCADE;

-- Drop trigger functions
DROP FUNCTION IF EXISTS update_schemes_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_recurring_expenses_updated_at() CASCADE;

-- Reset bill numbers to NULL if needed:
-- UPDATE orders SET bill_number = NULL WHERE bill_number = 'NA';

COMMIT;
```

## Troubleshooting

### Error: "relation already exists"
This means some tables already exist. This is normal if you've run parts of the migration before. The script uses `CREATE TABLE IF NOT EXISTS` so it will skip existing tables.

### Error: "column does not exist"
Make sure your base schema is up to date. The migration assumes you have the standard tables: `organisations`, `distributors`, `orders`, `expenses`, `admins`.

### Bill numbers not set to NA
Check that you have orders in the database:
```sql
SELECT COUNT(*) FROM orders;
```

If you have orders but bill numbers weren't set to NA, check which orders don't have bill numbers:
```sql
SELECT COUNT(*) FROM orders WHERE bill_number IS NULL OR bill_number = '';
SELECT COUNT(*) FROM orders WHERE bill_number = 'NA';
```

## Post-Migration

After successful migration:

1. **Test the Schemes feature** in the admin dashboard
2. **Test the Recurring Expenses feature**
3. **Verify Bill Numbers** appear in the Orders tab
4. **Check the Balance Sheet** tab to ensure all calculations work

## Need Help?

If you encounter any issues:
1. Check the Neon dashboard logs
2. Review the error messages from the SQL console
3. Verify your database connection
4. Ensure you have proper permissions

## Important Notes

- ⚠️ Always backup your database before running migrations
- ⚠️ The migration is wrapped in a transaction (BEGIN/COMMIT) so it will rollback if any part fails
- ✅ The script is idempotent - safe to run multiple times
- ✅ Existing orders without bill numbers will be set to "NA"
- ✅ New orders created after migration will have proper bill numbers when created
