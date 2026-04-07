# Balance Ledger Migration Guide

## Problem

The balance ledger feature (`/api/balance-ledger/cash/ledger`, etc.) is failing with:
```
error: relation "balance_transactions" does not exist
```

## Solution

The `balance_transactions` table needs to be created. This migration will:

1. ✅ Create the `balance_transactions` table
2. ✅ Create the `balance_ledger` view
3. ✅ Import all historical transaction data from existing tables
4. ✅ Set up indexes for performance

---

## How to Run the Migration

### Option 1: Automatic Script (Recommended)

```bash
# From the Beershop directory
./run_balance_ledger_migration.sh
```

The script will:
- Check if DATABASE_URL is set
- Show what will be migrated
- Ask for confirmation
- Run the migration
- Show success/failure status

### Option 2: Manual SQL Execution

If you prefer to run manually:

```bash
psql "$DATABASE_URL" -f create_balance_ledger_tables.sql
```

---

## What Gets Migrated

### Historical Data Import

The migration automatically imports existing transactions:

| Source Table | Transaction Type | Accounts Affected |
|-------------|------------------|-------------------|
| **sales** | `daily_allocation` | Cash (cash_collected)<br>Bank (upi) |
| **expenses** | `expense` | Based on `expense_from` field |
| **balance_transfers** | `balance_transfer_debit`<br>`balance_transfer_credit` | From/To accounts |
| **miscellaneous_income** | `miscellaneous_income` | Based on `income_to` field |

### Table Structure

```sql
balance_transactions (
  id UUID PRIMARY KEY,
  organisation_id UUID,
  transaction_type VARCHAR(50),     -- Type of transaction
  account VARCHAR(50),              -- cash_balance, bank_balance, gala_balance
  debit_amount DECIMAL(10, 2),      -- Money going out
  credit_amount DECIMAL(10, 2),     -- Money coming in
  transaction_date DATE,
  description TEXT,
  notes TEXT,
  reference_id UUID,                -- ID from source table
  reference_table VARCHAR(100),     -- Name of source table
  created_by_username VARCHAR(255),
  created_at TIMESTAMP
)
```

---

## After Migration

### Testing

Once migrated, test the balance ledger endpoints:

```bash
# View cash ledger
curl http://localhost:5001/api/balance-ledger/cash/ledger

# View bank ledger with date filter
curl "http://localhost:5001/api/balance-ledger/bank/ledger?start_date=2024-01-01&end_date=2024-12-31"

# View gala ledger
curl http://localhost:5001/api/balance-ledger/gala/ledger
```

### Frontend Access

The balance ledger will be available in:
- Admin Dashboard → Balance Ledger Tab
- Shows running balance with all transactions
- Supports date filtering
- Displays transaction details (type, description, reference)

---

## Troubleshooting

### Error: "DATABASE_URL not set"

Set your database connection string:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

### Error: "table already exists"

If the table exists but is empty/corrupt:
```sql
-- Drop and recreate
DROP TABLE IF EXISTS balance_transactions CASCADE;
-- Then run the migration again
```

### Verify Migration Success

```sql
-- Check table exists
SELECT COUNT(*) FROM balance_transactions;

-- Check data was imported
SELECT transaction_type, account, COUNT(*)
FROM balance_transactions
GROUP BY transaction_type, account
ORDER BY transaction_type, account;

-- View sample transactions
SELECT * FROM balance_ledger LIMIT 10;
```

### Expected Row Counts

After migration, you should see transactions equal to:
- Sales records × 2 (cash + upi entries)
- All expense records
- Balance transfer records × 2 (debit + credit per transfer)
- All miscellaneous income records

Example:
- 100 sales → ~200 transactions (cash + bank)
- 50 expenses → 50 transactions
- 20 transfers → 40 transactions
- 10 misc income → 10 transactions
- **Total: ~300 transactions**

---

## Future Transaction Recording

After this migration, new transactions will be recorded **automatically** whenever:

1. ✅ A new sale is approved (creates cash/bank entries)
2. ✅ An expense is created (creates debit entry)
3. ✅ A balance transfer occurs (creates debit + credit entries)
4. ✅ Miscellaneous income is added (creates credit entry)

This happens through the existing controllers - no additional code changes needed.

---

## Rollback

If you need to undo the migration:

```sql
-- Remove all balance ledger objects
DROP VIEW IF EXISTS balance_ledger CASCADE;
DROP TABLE IF EXISTS balance_transactions CASCADE;
```

**Note**: This will remove the balance ledger feature but won't affect any source data (sales, expenses, etc. remain intact).

---

## Need Help?

If you encounter issues:

1. Check the error message from the migration script
2. Verify DATABASE_URL is correct
3. Ensure you have write permissions to the database
4. Check if the database has sufficient disk space
5. Review the SQL file for any syntax issues

For database connection issues, refer to `NEON_SLOWNESS_SOLUTIONS.md`.
