# Deploy Distributor Outstanding Fix to Production

This guide will help you deploy the distributor outstanding trigger fix to your production database.

## What This Fix Does

✅ Adds opening balance to outstanding amount calculations
✅ Creates database triggers to auto-update amounts when orders/payments change
✅ Recalculates all existing distributor outstanding amounts correctly

**Formula**: `Outstanding = Opening Balance + Total Orders - Total Payments`

---

## Option 1: Using Shell Script (Recommended if you have psql)

### Prerequisites
- `psql` command-line tool installed
- Production database connection string

### Steps

1. **Get your production database connection string**
   - From Neon dashboard, Railway, Supabase, or wherever your production DB is hosted
   - It should look like: `postgresql://user:password@host:5432/dbname?sslmode=require`

2. **Set the environment variable** (choose one):
   ```bash
   export DATABASE_URL="your-production-connection-string"
   # OR
   export NEON_DATABASE_URL="your-production-connection-string"
   # OR
   export PRODUCTION_DATABASE_URL="your-production-connection-string"
   ```

3. **Run the script**:
   ```bash
   bash push_to_production.sh
   ```

---

## Option 2: Using Node.js Script (If you don't have psql)

### Prerequisites
- Node.js installed
- Production database connection string

### Steps

1. **Get your production database connection string**

2. **Set the environment variable**:
   ```bash
   export NEON_DATABASE_URL="your-production-connection-string"
   ```

3. **Run the Node.js script**:
   ```bash
   node apply_neon_trigger_fix.js
   ```

---

## Option 3: Manual SQL Execution (Database GUI)

If you prefer to use a database GUI like pgAdmin, TablePlus, or your hosting provider's SQL console:

1. **Open the file**: `fix_distributor_outstanding_production.sql`
2. **Copy all contents**
3. **Paste and execute** in your production database SQL console

---

## Option 4: Add to Your Existing Migration Script

If you already have a migration system, add this to your `run_production_migrations.sh`:

```bash
echo "📝 Migration: Fixing distributor outstanding trigger..."
psql "$NEON_DATABASE_URL" -f fix_distributor_outstanding_production.sql
if [ $? -eq 0 ]; then
  echo "✅ Distributor outstanding fix completed"
else
  echo "❌ Distributor outstanding fix failed"
  exit 1
fi
echo ""
```

---

## Verification

After applying the fix, you should see output like:

```
✅ ABC:
   Opening: ₹0.00
   Orders:  ₹22200.00
   Payments: ₹3252.00
   Current: ₹18948.00
   Expected: ₹18948.00
```

All distributors should have `Current` matching `Expected`.

---

## Testing in Production

After deployment:

1. **Create a test order** for any distributor
2. **Check the distributor's outstanding amount** - it should increase automatically
3. **Make a test payment** - outstanding should decrease automatically

---

## Rollback (If Needed)

If something goes wrong, you can rollback by running:

```sql
DROP TRIGGER IF EXISTS trigger_update_outstanding_on_payment ON distributor_payments;
DROP TRIGGER IF EXISTS trigger_update_outstanding_on_order ON orders;
DROP FUNCTION IF EXISTS update_distributor_outstanding();
```

Then manually update distributor outstanding amounts as needed.

---

## Files Created

- `fix_distributor_outstanding_production.sql` - SQL migration file
- `push_to_production.sh` - Shell script for deployment
- `apply_neon_trigger_fix.js` - Node.js script for deployment

---

## Need Help?

If you encounter any issues:

1. **Check database connection**: Make sure your connection string is correct
2. **Check permissions**: Your database user needs CREATE TRIGGER and UPDATE permissions
3. **Check logs**: Look for any error messages in the output
4. **Test locally first**: The fix has already been applied to your local database successfully

---

## Summary

Choose the deployment method that works best for your setup:

- **Have psql?** → Use `push_to_production.sh`
- **No psql?** → Use `apply_neon_trigger_fix.js`
- **Prefer GUI?** → Copy/paste `fix_distributor_outstanding_production.sql`
- **Have existing migrations?** → Add to your migration script

All methods do the same thing - they just use different tools to connect to your database.
