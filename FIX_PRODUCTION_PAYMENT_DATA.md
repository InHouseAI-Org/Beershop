# Fix Production Payment Data Issue

## 🔴 Problem

After deploying the new code, the production app shows:
- Outstanding bills: "None found"
- Payment history: "None found"
- Ledger: "None found"

Even though there is historical payment data in the database.

## 🔍 Root Cause

The new code expects:
1. A `distributor_payments` table (with new structure and field names)
2. A `distributor_ledger` view

But the production database has:
1. Old `distributor_payment_history` table (with different field names)
2. No `distributor_payments` table
3. No `distributor_ledger` view

### Field Name Mapping

**Old table** (`distributor_payment_history`):
- `amount_paid` → now `amount`
- `paid_from` → now `payment_from`
- `paid_at` → now `payment_date`
- `paid_by` → now `created_by`

**New table** (`distributor_payments`) adds:
- `order_id` - link to specific order
- `payment_type` - 'order_payment' or 'advance'
- `bill_number` - bill/invoice number

## ✅ Solution

Run the migration script: **`neon_migrate_payment_data.sql`**

This script will:
1. ✅ Create the new `distributor_payments` table
2. ✅ Migrate ALL existing payment data from `distributor_payment_history`
3. ✅ Create the `distributor_ledger` view for orders and payments
4. ✅ Keep the old table for backup (doesn't delete it)

## 📋 Steps to Fix

### 1. Run the Migration

In your Neon SQL console:

1. Open `neon_migrate_payment_data.sql`
2. Copy the entire contents
3. Paste into Neon SQL Editor
4. Click "Run"

### 2. Verify the Migration

Check the output shows:
```
Old Table (distributor_payment_history): [X records]
New Table (distributor_payments): [X records]
```

Both counts should match!

### 3. Test in Production

After running the migration:
1. Refresh your production app
2. Check Distributors tab
3. Click on a distributor
4. You should now see:
   - Outstanding Bills (if any)
   - Payment History (all migrated payments)
   - Complete Ledger (orders + payments)

## 🔒 What Happens to Old Data?

- ✅ **Old table preserved**: `distributor_payment_history` remains intact
- ✅ **Data migrated**: All payments copied to new `distributor_payments` table
- ✅ **No duplicates**: Script checks and won't duplicate if run multiple times
- ✅ **Backward compatible**: Old data still accessible if needed

## 📊 Data Migration Details

For each old payment record, the migration:

```sql
Old Field              → New Field            | Default if Missing
--------------------------------------------------------------------
id                     → id                   | (preserved)
organisation_id        → organisation_id      | (preserved)
distributor_id         → distributor_id       | (preserved)
amount_paid            → amount               | (preserved)
paid_from              → payment_from         | 'cash_balance'
paid_at (timestamp)    → payment_date (date)  | (converted)
paid_by                → created_by           | (preserved)
notes                  → notes                | (preserved)
(none)                 → order_id             | NULL
(none)                 → payment_type         | 'order_payment'
(none)                 → bill_number          | NULL
paid_at                → created_at           | (preserved)
```

## 🚨 Important Notes

1. **Run once per database**: This migration is safe to run multiple times (it checks for duplicates)

2. **Old table not deleted**: Keep `distributor_payment_history` for backup

3. **New payments**: After migration, all new payments will use the new `distributor_payments` table

4. **View refreshes**: The `distributor_ledger` view combines:
   - Orders (as debits)
   - Payments (as credits)
   - Sorted by date

## 🔧 Troubleshooting

### Issue: "Table distributor_payment_history does not exist"

This means the old table has a different name or doesn't exist. Check:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%payment%'
AND table_schema = 'public';
```

### Issue: "Migration shows 0 records"

The old table is empty or has a different name. Verify:
```sql
SELECT COUNT(*) FROM distributor_payment_history;
```

### Issue: "Still showing 'None found'"

1. Check if migration succeeded:
   ```sql
   SELECT COUNT(*) FROM distributor_payments;
   ```

2. Check if view was created:
   ```sql
   SELECT * FROM distributor_ledger LIMIT 5;
   ```

3. Refresh your browser/app completely

## ✨ After Migration

Your production app should now show:
- ✅ All historical payment data
- ✅ Outstanding bills per order
- ✅ Complete payment history
- ✅ Full distributor ledger with orders and payments

The migration preserves all existing data while making it compatible with the new code structure!
