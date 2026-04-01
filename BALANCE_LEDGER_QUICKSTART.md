# Balance Ledger System - Quick Start Guide

## What Was Built

A complete ledger system for tracking **Gala, Bank, and Cash** balances, similar to the distributor ledger. This system automatically records ALL transactions that affect these balances and provides a detailed transaction history view.

---

## Files Created

### Database
1. **`create_balance_ledger_system.sql`** - Main migration script
   - Creates `balance_transactions` table
   - Adds opening balance columns to `organisations`
   - Creates triggers for automatic transaction recording
   - Backfills existing transactions

2. **`test_balance_ledger.sql`** - Testing/verification script
   - Verifies installation
   - Checks data integrity
   - Validates calculations

### Backend
3. **`backend/src/routes/balanceLedger.js`** - API routes
4. **`backend/src/controllers/balanceLedgerController.js`** - Business logic

### Frontend
5. **`frontend/src/components/admin/BalanceLedgerTab.js`** - UI component

### Documentation
6. **`BALANCE_LEDGER_SYSTEM.md`** - Complete documentation
7. **`BALANCE_LEDGER_QUICKSTART.md`** - This file

### Modified Files
8. **`backend/src/server.js`** - Added route registration (lines 27, 81)
9. **`frontend/src/pages/AdminDashboard.js`** - Added tab and route (lines 19, 30, 167)

---

## Installation Steps

### 1. Run Database Migration
```bash
# Connect to your database
psql -U your_username -d beershop_db

# Run the migration
\i create_balance_ledger_system.sql

# Run the test script to verify
\i test_balance_ledger.sql
```

**Expected Output**:
- All columns, tables, and views created
- All triggers created
- Existing transactions backfilled
- Balance calculations verified

### 2. Set Opening Balances (IMPORTANT!)
```sql
-- Update with your actual opening balances
UPDATE organisations
SET
  cash_opening_balance = 0,  -- Your cash balance when you started tracking
  bank_opening_balance = 0,  -- Your bank balance when you started tracking
  gala_opening_balance = 0   -- Your gala balance when you started tracking
WHERE id = 'your-organisation-id';
```

**Note**: Opening balances represent the balance you had when you first started using the system. Set these to match your historical records.

### 3. Restart Backend
```bash
cd backend
npm start
```

Verify you see:
```
Server running on port 5000
```

### 4. Restart Frontend
```bash
cd frontend
npm start
```

Verify you see:
```
Compiled successfully!
```

### 5. Access the Ledger
1. Open browser to `http://localhost:3000`
2. Login to admin dashboard
3. Click **"Balance Ledger"** in the sidebar
4. You should see three buttons: Cash, Bank, Gala

---

## Quick Test

### Test in Browser
1. Go to Balance Ledger tab
2. Click "Cash Balance"
3. You should see:
   - Opening Balance card
   - Closing Balance card
   - Net Change card
   - Total Transactions card
   - Table with all transactions affecting cash

4. Test date filtering:
   - Select a date range
   - Click "Apply"
   - Transactions should filter
   - Opening balance should adjust

5. Switch to Bank and Gala to see their transactions

### Test in Database
```sql
-- See all your transactions
SELECT
  transaction_date,
  transaction_type,
  account,
  description,
  debit_amount,
  credit_amount
FROM balance_transactions
WHERE organisation_id = 'your-org-id'
ORDER BY transaction_date DESC
LIMIT 20;

-- Check balance calculation
SELECT
  account,
  SUM(credit_amount - debit_amount) as net_change
FROM balance_transactions
WHERE organisation_id = 'your-org-id'
GROUP BY account;
```

---

## How It Works

### Transaction Recording Flow

```
User Action → Source Table → Trigger → balance_transactions
```

**Examples**:

1. **Add Expense**:
   ```
   User creates expense → expenses table → trigger fires → balance_transactions (DEBIT)
   ```

2. **Distributor Payment**:
   ```
   User records payment → distributor_payments → trigger fires → balance_transactions (CREDIT)
   ```

3. **Balance Transfer**:
   ```
   User transfers money → balance_transfers → trigger fires → TWO entries:
   - balance_transactions (DEBIT from source)
   - balance_transactions (CREDIT to destination)
   ```

### What Gets Recorded Automatically

| Action | Transaction Type | Effect |
|--------|-----------------|--------|
| Add Expense | `expense` | DEBIT (reduces balance) |
| Transfer Money | `balance_transfer_debit/credit` | DEBIT source, CREDIT dest |
| Receive Payment from Distributor | `distributor_payment` | CREDIT (increases balance) |
| Add Misc Income | `miscellaneous_income` | CREDIT (increases balance) |
| Credit Holder Pays | `credit_collection` | CREDIT (increases balance) |
| Pay Prepaid Expense | `prepaid_expense` | DEBIT (reduces balance) |
| Pay Recurring Expense | `recurring_expense` | DEBIT (reduces balance) |

**You don't need to do anything special** - just use the system normally, and transactions are recorded automatically!

---

## Understanding the Ledger

### Opening Balance
- The balance you had when you started tracking
- Set once in `organisations` table
- Never changes
- Used as starting point for calculations

### Current Balance
- Your actual balance right now
- Stored in `organisations.cash_balance`, `bank_balance`, `gala_balance`
- Updated automatically by existing triggers when transactions occur

### Running Balance
- Shows balance after each transaction
- Calculated as: `previous_balance + credit - debit`
- Displayed in the ledger table

### Date Range Opening Balance
When you filter by date range, the opening balance is dynamically calculated:
```
Opening for Range = Stored Opening Balance + All Transactions Before Start Date
```

This ensures the ledger always balances correctly regardless of date range.

---

## Common Questions

### Q: Do I need to manually create transactions?
**A:** No! Transactions are created automatically via triggers when you perform actions like adding expenses, receiving payments, etc.

### Q: What if I have existing data?
**A:** The migration script automatically backfills all existing transactions from:
- expenses
- balance_transfers
- distributor_payments
- miscellaneous_income
- credit_holder_payments
- prepaid_expense_payments
- recurring_expense_payments

### Q: Can I edit or delete transactions?
**A:** Transactions in `balance_transactions` are automatically managed. To correct a transaction:
1. Edit/delete the source record (expense, payment, etc.)
2. The corresponding balance_transaction will be handled by triggers

### Q: Why do some transactions show in orange and some in green?
**A:**
- **Orange** = Money going OUT (debits: expenses, transfers out)
- **Green** = Money coming IN (credits: payments received, income)

### Q: What's the difference between debit and credit?
**A:**
- **Debit** = Reduces your balance (expenses, money sent out)
- **Credit** = Increases your balance (income, payments received)

### Q: How accurate is the running balance?
**A:** The running balance is calculated in real-time from the database and should always be accurate. It represents your actual balance after each transaction.

---

## Troubleshooting

### Issue: Ledger is empty
**Solutions**:
1. Check if migration ran: `SELECT COUNT(*) FROM balance_transactions;`
2. Verify triggers exist: Run `test_balance_ledger.sql`
3. Check if you have data in source tables (expenses, payments, etc.)

### Issue: Balance doesn't match
**Solutions**:
1. Verify opening balance is set correctly
2. Run test script: `\i test_balance_ledger.sql`
3. Check "Verifying balance calculations" section in output
4. Current balance should equal calculated balance

### Issue: Frontend shows error
**Solutions**:
1. Check backend is running: `http://localhost:5000/api/health`
2. Check browser console for errors (F12)
3. Verify you're logged in
4. Try refreshing the page

### Issue: Transactions not appearing after action
**Solutions**:
1. Refresh the ledger page
2. Check if trigger fired: `SELECT * FROM balance_transactions ORDER BY created_at DESC LIMIT 5;`
3. Verify the action actually completed (check source table)

---

## Next Steps

1. **Set Opening Balances** - Update organisations table with historical balances
2. **Review Existing Transactions** - Check that backfilled data looks correct
3. **Test New Transactions** - Create a test expense and verify it appears
4. **Train Users** - Show team how to use the new ledger view
5. **Monitor** - Check ledger regularly to ensure balances are tracking correctly

---

## API Endpoints (For Developers)

```bash
# Get cash ledger
GET /api/balance-ledger/cash/ledger
Query: ?start_date=2024-03-01&end_date=2024-03-31

# Get bank summary
GET /api/balance-ledger/bank/summary
Query: ?start_date=2024-03-01&end_date=2024-03-31

# Get all transactions
GET /api/balance-ledger/transactions
Query: ?start_date=2024-03-01&account=cash_balance&transaction_type=expense
```

---

## Key Features

- ✅ Automatic transaction recording via database triggers
- ✅ Opening balance tracking
- ✅ Running balance calculations
- ✅ Date range filtering
- ✅ Transaction type categorization
- ✅ Color-coded UI (debits/credits)
- ✅ Bilingual (English/Hindi)
- ✅ Full audit trail with source references
- ✅ Real-time balance updates
- ✅ Historical backfill of existing data

---

## Support

For detailed information, see **`BALANCE_LEDGER_SYSTEM.md`**

For technical issues:
1. Check test script output
2. Review database logs
3. Check backend console
4. Verify all files are in place

---

## Summary

You now have a complete ledger system that:
- Tracks Cash, Bank, and Gala balances
- Records every transaction automatically
- Shows opening/closing balances
- Calculates running balances
- Provides date filtering
- Maintains full audit trail

The system is ready to use! Just run the migration, set your opening balances, and start exploring the ledger in the admin dashboard.
