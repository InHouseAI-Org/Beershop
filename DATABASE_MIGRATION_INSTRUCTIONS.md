# Database Migration Instructions - Add credit_taken Column

## Issue
Your deployed database is missing the `credit_taken` column in the `sales` table, causing sales creation to fail with the error:
```
Error: column "credit_taken" of relation "sales" does not exist
```

## Solution
You need to run a migration to add this column to your Neon database.

---

## Option 1: Using Neon Console (Recommended)

### Step 1: Access Neon Console
1. Go to https://console.neon.tech
2. Log in to your account
3. Select your project (the one used for your backend)

### Step 2: Open SQL Editor
1. Click on "SQL Editor" in the left sidebar
2. You'll see a query editor where you can run SQL commands

### Step 3: Run the Migration
Copy and paste the following SQL into the editor:

```sql
-- Add credit_taken column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_taken JSONB;

-- Add comment for documentation
COMMENT ON COLUMN sales.credit_taken IS 'Credit collected on shop during sales (array of {creditHolderId, amount, collectedIn})';

-- Verify the column was added (optional)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'credit_taken';
```

### Step 4: Execute
1. Click the "Run" button (or press Ctrl/Cmd + Enter)
2. You should see a success message
3. The verification query should show the new column

### Step 5: Test
1. Go to your deployed application
2. Try creating a new sale
3. It should now work without errors

---

## Option 2: Using psql Command Line

If you prefer using the command line:

### Step 1: Get Connection String
1. Go to your Neon dashboard
2. Copy the connection string (it looks like: `postgresql://user:pass@host/database`)

### Step 2: Connect to Database
```bash
psql "postgresql://your-connection-string-here"
```

### Step 3: Run Migration
Once connected, paste and run:
```sql
ALTER TABLE sales ADD COLUMN IF NOT EXISTS credit_taken JSONB;
COMMENT ON COLUMN sales.credit_taken IS 'Credit collected on shop during sales (array of {creditHolderId, amount, collectedIn})';
```

### Step 4: Verify
```sql
\d sales
```
This will show all columns in the sales table, including the new `credit_taken` column.

---

## Option 3: Using a Database Client (e.g., pgAdmin, DBeaver)

### Step 1: Connect to Neon Database
1. Open your database client (pgAdmin, DBeaver, TablePlus, etc.)
2. Create a new connection using your Neon credentials:
   - Host: Your Neon hostname
   - Port: 5432
   - Database: Your database name
   - User: Your database user
   - Password: Your database password
   - **Important**: Enable SSL connection

### Step 2: Execute Migration
1. Open a SQL query window
2. Paste the migration SQL from the file `ADD_CREDIT_TAKEN_COLUMN.sql`
3. Execute it

---

## What This Migration Does

The migration adds a new column called `credit_taken` to the `sales` table. This column:
- Stores data in JSONB format (flexible JSON structure)
- Allows NULL values (optional field)
- Stores information about credit collected during sales

**Data Structure Example:**
```json
[
  {
    "creditHolderId": "uuid-here",
    "amount": 500,
    "collectedIn": "cash_balance"
  },
  {
    "creditHolderId": "another-uuid",
    "amount": 300,
    "collectedIn": "bank_balance"
  }
]
```

---

## Troubleshooting

### Error: "relation 'sales' does not exist"
- This means the sales table itself doesn't exist
- You need to run the full migration: `NEON_FINAL_MIGRATION_WITH_YOUR_DATA.sql`

### Error: "column already exists"
- The migration is safe to run multiple times
- The `IF NOT EXISTS` clause prevents errors if the column already exists

### Migration Completed Successfully
After running the migration:
1. Your application should work normally
2. Sales can now track credit collected during shop sales
3. No data loss - existing sales records remain intact

---

## For Future Reference

The main migration file `NEON_FINAL_MIGRATION_WITH_YOUR_DATA.sql` has been updated to include this column. If you ever need to:
- Set up a new database from scratch
- Reset your database
- Create a test/development database

Use the updated migration file, and the `credit_taken` column will be included automatically.

---

## Need Help?

If you encounter any issues:
1. Check the Neon dashboard logs
2. Verify you're connected to the correct database
3. Ensure your database user has ALTER TABLE permissions
4. Check that SSL is enabled for the connection

The migration is non-destructive and safe to run on your production database.
