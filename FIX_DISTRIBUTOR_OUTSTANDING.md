# Fix: Distributor Outstanding Amount Not Updating

## Problem

When creating an order, the distributor's outstanding amount is not being updated automatically. This is because the database trigger that should handle this is either:

1. Not created in your database
2. Has a bug that prevents it from working correctly on DELETE operations

## Root Cause

The issue is in the `update_distributor_outstanding()` trigger function. The code at `/backend/src/controllers/orderController.js:101-102` indicates a database trigger should handle updates:

```javascript
// Note: Distributor outstanding is automatically updated by database trigger
// The trigger recalculates outstanding based on all orders and payments
```

However, there are TWO problems:
1. **Missing opening balance**: The trigger doesn't include the distributor's opening balance in the calculation
2. **Potential trigger bug**: The original trigger returns `NEW` even on DELETE operations (where NEW is NULL)

## Solution

I've created a fixed version of the trigger that:
- **Includes opening balance** in the outstanding calculation
- Properly handles INSERT, UPDATE, and DELETE operations
- Uses `COALESCE(NEW, OLD)` to return the correct record
- Includes error handling and logging
- Forces a recalculation of all distributor outstanding amounts with opening balance

## How to Apply the Fix

### Option 1: Using the Node.js Script (Recommended)

```bash
cd backend
node fix_distributor_trigger.js
```

This will:
1. Drop and recreate the trigger function with the fix
2. Recreate both triggers (on orders and distributor_payments tables)
3. Recalculate all distributor outstanding amounts to fix any incorrect data
4. Show verification results

### Option 2: Manually Run the SQL

If you prefer to run the SQL directly in your database:

```bash
# If using PostgreSQL locally
psql -U bs_user -d beershop -f fix_distributor_outstanding_trigger.sql

# Or if using a connection string
psql "your_connection_string" -f fix_distributor_outstanding_trigger.sql
```

## What This Fix Does

1. **Drops existing triggers** (if any) to ensure clean state
2. **Creates improved trigger function** that:
   - Handles INSERT: Uses NEW record
   - Handles UPDATE: Uses NEW record
   - Handles DELETE: Uses OLD record
   - Returns `COALESCE(NEW, OLD)` to work in all cases
3. **Recreates triggers** on both `orders` and `distributor_payments` tables
4. **Recalculates all outstanding amounts** to fix any existing incorrect data
5. **Shows verification query** results to confirm everything is correct

## How the Trigger Works

The trigger automatically updates `distributors.amount_outstanding` whenever:

- **An order is created**: Outstanding increases by the order total
- **An order is updated**: Outstanding is recalculated based on new values
- **An order is deleted**: Outstanding decreases by removing that order's amount
- **A payment is made**: Outstanding decreases by the payment amount
- **A payment is updated or deleted**: Outstanding is recalculated accordingly

The calculation formula is:
```
amount_outstanding = opening_balance + (Total of all orders) - (Total of all payments)
```

Where:
```
opening_balance = Initial debt/balance from distributor (set when creating distributor)
Order Total = SUM(order_items.total) + tax + misc - discount - scheme
```

## Verification

After applying the fix, the verification query at the end of the SQL script will show:
- Opening balance for the distributor
- Current outstanding amount in the database
- Total from all orders
- Total of all payments
- Calculated outstanding (should match current outstanding)

If everything is working correctly, `current_outstanding` should equal `calculated_outstanding` for all distributors.

The formula shown in the verification is:
```
calculated_outstanding = opening_balance + total_orders - total_payments
```

## Testing

To test that the fix works:

1. **Create a new order**:
   ```bash
   # The distributor's outstanding should increase automatically
   ```

2. **Make a payment**:
   ```bash
   # The distributor's outstanding should decrease automatically
   ```

3. **Check distributor outstanding amounts** in your frontend or database

## Database Connection Issues?

If you're having trouble connecting to the database, check:

1. **Database is running**:
   ```bash
   # Check if PostgreSQL is running
   pg_isready
   ```

2. **Credentials are correct** in `backend/.env`:
   ```
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=bs_user
   DB_PASSWORD=bs_password
   DB_NAME=beershop
   ```

3. **Database exists**:
   ```bash
   psql -U bs_user -l | grep beershop
   ```

## Alternative: Manual Update in Code

If you can't use database triggers for some reason, you can update the code to manually update outstanding amounts. However, this is **NOT recommended** as it's error-prone and doesn't handle all edge cases.

The trigger approach is far superior because it:
- Guarantees data consistency
- Works for all operations (including direct SQL updates)
- Handles deletions automatically
- Is atomic with the transaction

## Need Help?

If the fix doesn't work or you encounter errors:
1. Check the database logs for any trigger errors
2. Run the verification query manually to see the current state
3. Check if the triggers exist:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname LIKE '%outstanding%';
   ```
4. Check if the function exists:
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'update_distributor_outstanding';
   ```
