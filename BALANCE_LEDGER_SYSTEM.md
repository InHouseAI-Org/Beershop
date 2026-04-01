# Balance Ledger System Documentation

## Overview

The Balance Ledger System provides a comprehensive transaction tracking system for three separate balance accounts:
- **Cash Balance (नकद शेष)**
- **Bank Balance (बैंक शेष)**
- **Gala Balance (गला शेष)**

Similar to the distributor ledger, this system tracks all transactions that affect these balances, including opening balances, running balances, and provides detailed transaction history with date filtering.

---

## System Architecture

### Database Schema

#### 1. organisations Table - New Columns
```sql
ALTER TABLE organisations
ADD COLUMN cash_opening_balance DECIMAL(10, 2) DEFAULT 0;
ADD COLUMN bank_opening_balance DECIMAL(10, 2) DEFAULT 0;
ADD COLUMN gala_opening_balance DECIMAL(10, 2) DEFAULT 0;
```

**Purpose**: Store the initial balance when organization started tracking. These values are immutable and represent the historical starting point.

#### 2. balance_transactions Table (NEW)
```sql
CREATE TABLE balance_transactions (
  id UUID PRIMARY KEY,
  organisation_id UUID NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  account VARCHAR(50) NOT NULL,  -- cash_balance, bank_balance, gala_balance
  debit_amount DECIMAL(10, 2) DEFAULT 0,   -- Money going out
  credit_amount DECIMAL(10, 2) DEFAULT 0,  -- Money coming in
  transaction_date DATE NOT NULL,
  description TEXT,
  notes TEXT,
  reference_id UUID,           -- ID from source table
  reference_table VARCHAR(100), -- Name of source table
  created_by UUID,
  created_by_username VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Transaction Types**:
| Type | Debit/Credit | Source Table | Description |
|------|--------------|--------------|-------------|
| `expense` | Debit | expenses | Regular expenses |
| `daily_allocation` | Credit | sales | Daily sales allocation |
| `balance_transfer_debit` | Debit | balance_transfers | Transfer out |
| `balance_transfer_credit` | Credit | balance_transfers | Transfer in |
| `distributor_payment` | Credit | distributor_payments | Payment from distributor |
| `miscellaneous_income` | Credit | miscellaneous_income | Other income |
| `credit_collection` | Credit | credit_holder_payments | Credit holder payment |
| `prepaid_expense` | Debit | prepaid_expense_payments | Prepaid expense payment |
| `recurring_expense` | Debit | recurring_expense_payments | Recurring expense payment |

#### 3. balance_ledger View (NEW)
```sql
CREATE VIEW balance_ledger AS
SELECT
  id,
  organisation_id,
  transaction_type,
  account,
  transaction_date,
  description,
  notes,
  debit_amount,
  credit_amount,
  (credit_amount - debit_amount) as net_amount,
  reference_id,
  reference_table,
  created_by_username,
  created_at
FROM balance_transactions
ORDER BY transaction_date DESC, created_at DESC;
```

---

## Automatic Transaction Recording (Triggers)

The system automatically creates `balance_transactions` records when the following actions occur:

### 1. Expenses
**Trigger**: `trigger_expense_to_balance_transaction`
- Creates a **DEBIT** entry when expense is added
- Uses `expense_from` to determine which balance account

### 2. Balance Transfers
**Trigger**: `trigger_transfer_to_balance_transaction`
- Creates **TWO** entries:
  1. DEBIT entry for source account (money going out)
  2. CREDIT entry for destination account (money coming in)

### 3. Distributor Payments
**Trigger**: `trigger_distributor_payment_to_balance_transaction`
- Creates a **CREDIT** entry when payment received
- Uses `payment_from` to determine which balance account

### 4. Miscellaneous Income
**Trigger**: `trigger_misc_income_to_balance_transaction`
- Creates a **CREDIT** entry when income is recorded
- Uses `account` field to determine which balance

### 5. Credit Holder Payments
**Trigger**: `trigger_credit_payment_to_balance_transaction`
- Creates a **CREDIT** entry when credit holder pays
- Uses `collected_in` to determine which balance account

### 6. Prepaid Expenses
**Trigger**: `trigger_prepaid_payment_to_balance_transaction`
- Creates a **DEBIT** entry when prepaid expense paid
- Uses `paid_from` to determine which balance account

### 7. Recurring Expenses
**Trigger**: `trigger_recurring_payment_to_balance_transaction`
- Creates a **DEBIT** entry when recurring expense paid
- Uses `paid_from` to determine which balance account

---

## Backend API

### Routes
File: `/backend/src/routes/balanceLedger.js`

```javascript
GET /api/balance-ledger/:balanceType/ledger
  - Get complete ledger for cash/bank/gala
  - Query params: start_date, end_date (optional)
  - Response: {openingBalance, closingBalance, transactions[], totalTransactions}

GET /api/balance-ledger/:balanceType/summary
  - Get summary statistics
  - Query params: start_date, end_date (optional)
  - Response: {currentBalance, summary, breakdown[], dateRange}

GET /api/balance-ledger/transactions
  - Get all transactions across all balances
  - Query params: start_date, end_date, transaction_type, account
  - Response: {transactions[], totalTransactions, totals}
```

### Controller
File: `/backend/src/controllers/balanceLedgerController.js`

**Key Functions**:

#### 1. `getBalanceLedger(req, res)`
**Purpose**: Get complete transaction ledger with running balance

**Logic**:
```javascript
1. Validate balanceType (cash, bank, gala)
2. Get opening balance from organisations table
3. If start_date provided:
   - Calculate opening balance = stored_opening + SUM(all transactions before start_date)
4. Fetch all transactions in date range
5. Calculate running balance for each transaction:
   - running_balance = previous_balance + credit - debit
6. Return opening balance, closing balance, and transactions with running balances
```

**Response**:
```json
{
  "balanceType": "cash",
  "openingBalance": 50000.00,
  "closingBalance": 75000.00,
  "transactions": [
    {
      "id": "uuid",
      "transaction_type": "distributor_payment",
      "transaction_date": "2024-03-20",
      "description": "Payment from ABC Distributor",
      "debit_amount": 0,
      "credit_amount": 25000,
      "net_amount": 25000,
      "running_balance": 75000.00,
      "notes": "Bill #123"
    }
  ],
  "totalTransactions": 15,
  "dateRange": {
    "start": "2024-03-01",
    "end": "2024-03-31"
  }
}
```

#### 2. `getBalanceSummary(req, res)`
**Purpose**: Get statistical summary and breakdown by transaction type

**Response**:
```json
{
  "balanceType": "bank",
  "currentBalance": 100000.00,
  "openingBalance": 75000.00,
  "summary": {
    "totalTransactions": 45,
    "totalDebits": 50000.00,
    "totalCredits": 75000.00,
    "netChange": 25000.00
  },
  "breakdown": [
    {
      "transactionType": "distributor_payment",
      "count": 20,
      "totalDebits": 0,
      "totalCredits": 50000.00,
      "netAmount": 50000.00
    }
  ]
}
```

---

## Frontend Components

### File: `/frontend/src/components/admin/BalanceLedgerTab.js`

**Features**:
1. **Balance Type Selector**
   - Buttons to switch between Cash, Bank, and Gala
   - Active balance is highlighted

2. **Date Range Filter**
   - Start date and end date inputs
   - Apply and Clear buttons
   - Filters transactions within date range

3. **Balance Summary Cards**
   - Opening Balance (blue)
   - Closing Balance (green)
   - Net Change (green/red based on positive/negative)
   - Total Transactions (purple)

4. **Transactions Table**
   - Date, Type, Description, Debit, Credit, Running Balance, Notes
   - Color-coded rows:
     - Orange background for debits (expenses, transfers out)
     - Green background for credits (income, payments received)
   - Transaction type badges with color coding

**UI Translation**: All labels shown in English and Hindi

---

## Installation & Setup

### Step 1: Run Database Migration
```bash
psql -U your_username -d your_database -f create_balance_ledger_system.sql
```

This will:
- Add opening balance columns to organisations table
- Create balance_transactions table
- Create balance_ledger view
- Set up all triggers for automatic transaction recording
- Backfill all existing transactions into balance_transactions

### Step 2: Verify Database Setup
```sql
-- Check if tables and columns exist
SELECT column_name FROM information_schema.columns
WHERE table_name = 'organisations'
  AND column_name LIKE '%opening_balance';

-- Check balance_transactions table
SELECT COUNT(*) FROM balance_transactions;

-- Check transactions by type
SELECT transaction_type, COUNT(*) FROM balance_transactions
GROUP BY transaction_type;

-- Check transactions by account
SELECT account, COUNT(*) FROM balance_transactions
GROUP BY account;
```

### Step 3: Backend Already Integrated
The backend routes and controllers have been added to the server:
- Route: `/api/balance-ledger/*` registered in `backend/src/server.js:81`
- Controller: `backend/src/controllers/balanceLedgerController.js`

### Step 4: Frontend Already Integrated
The frontend component has been added to the Admin Dashboard:
- Component: `frontend/src/components/admin/BalanceLedgerTab.js`
- Route: `/admin/balance-ledger`
- Menu item: "Balance Ledger" in sidebar

### Step 5: Restart Backend Server
```bash
cd backend
npm install  # If needed
npm start
```

### Step 6: Restart Frontend
```bash
cd frontend
npm install  # If needed
npm start
```

---

## Testing Guide

### 1. Initial Setup Test
```sql
-- Set opening balances for testing
UPDATE organisations
SET
  cash_opening_balance = 100000,
  bank_opening_balance = 200000,
  gala_opening_balance = 50000
WHERE id = 'your-org-id';
```

### 2. Test Transaction Recording

#### Test Expense (Should create DEBIT entry)
```sql
INSERT INTO expenses (organisation_id, expense_name, expense_from, expense_amount, date)
VALUES ('your-org-id', 'Test Expense', 'cash_balance', 5000, CURRENT_DATE);

-- Verify
SELECT * FROM balance_transactions
WHERE reference_table = 'expenses'
ORDER BY created_at DESC LIMIT 1;
```

#### Test Balance Transfer (Should create 2 entries)
```sql
INSERT INTO balance_transfers (organisation_id, name, from_account, to_account, amount, transaction_date)
VALUES ('your-org-id', 'Test Transfer', 'cash_balance', 'bank_balance', 10000, CURRENT_DATE);

-- Verify (should see both debit and credit)
SELECT * FROM balance_transactions
WHERE reference_table = 'balance_transfers'
ORDER BY created_at DESC LIMIT 2;
```

#### Test Distributor Payment (Should create CREDIT entry)
```sql
INSERT INTO distributor_payments (
  organisation_id, distributor_id, payment_type, amount,
  payment_from, payment_date
)
VALUES (
  'your-org-id', 'some-distributor-id', 'advance', 15000,
  'bank_balance', CURRENT_DATE
);

-- Verify
SELECT * FROM balance_transactions
WHERE reference_table = 'distributor_payments'
ORDER BY created_at DESC LIMIT 1;
```

### 3. Test Frontend

1. **Navigate to Balance Ledger**
   - Login to admin dashboard
   - Click "Balance Ledger" in sidebar
   - Should see three balance type buttons

2. **Test Cash Balance Ledger**
   - Click "Cash Balance" button
   - Should see opening balance, closing balance, net change
   - Should see list of all cash transactions
   - Verify running balance calculations are correct

3. **Test Date Filtering**
   - Select start date and end date
   - Click "Apply"
   - Should see filtered transactions
   - Opening balance should adjust for transactions before start date
   - Click "Clear" to reset

4. **Test Bank and Gala Balances**
   - Switch to "Bank Balance" button
   - Verify different transactions appear
   - Switch to "Gala Balance"
   - Verify correct transactions

5. **Verify Transaction Colors**
   - Expenses should have orange background
   - Income/payments should have green background
   - Debits should be in red
   - Credits should be in green

### 4. Test API Endpoints

```bash
# Get cash ledger
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/balance-ledger/cash/ledger"

# Get bank ledger with date filter
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/balance-ledger/bank/ledger?start_date=2024-03-01&end_date=2024-03-31"

# Get balance summary
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/balance-ledger/gala/summary"

# Get all transactions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/balance-ledger/transactions?start_date=2024-03-01"
```

### 5. Verify Calculations

**Manual Verification**:
```sql
-- Calculate expected cash balance
SELECT
  (SELECT cash_opening_balance FROM organisations WHERE id = 'your-org-id')
  + COALESCE(SUM(credit_amount - debit_amount), 0) as calculated_balance,
  (SELECT cash_balance FROM organisations WHERE id = 'your-org-id') as actual_balance
FROM balance_transactions
WHERE organisation_id = 'your-org-id'
  AND account = 'cash_balance';

-- Should match!
```

---

## Troubleshooting

### Issue: No transactions showing in ledger
**Solution**:
1. Check if backfill script ran successfully
2. Verify triggers are created: `\d+ expenses` in psql
3. Check balance_transactions table: `SELECT COUNT(*) FROM balance_transactions;`
4. Run backfill queries manually from migration script

### Issue: Running balance is incorrect
**Solution**:
1. Verify opening_balance is set correctly
2. Check transactions are ordered by date: `ORDER BY transaction_date ASC`
3. Verify debit/credit amounts are in correct columns
4. Check for duplicate transactions

### Issue: Frontend shows "Failed to fetch"
**Solution**:
1. Check backend server is running
2. Verify auth token is valid
3. Check browser console for errors
4. Verify API route is registered in server.js

### Issue: Triggers not firing
**Solution**:
```sql
-- Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_name LIKE '%balance_transaction%';

-- Recreate triggers if missing
-- Run the trigger creation section from migration script
```

---

## Future Enhancements

1. **Daily Allocation from Sales**
   - Add trigger to automatically create credit entries when sales are recorded
   - Track which balance (cash/bank) received the sale amount

2. **Transaction Editing**
   - Add UI to manually edit/delete balance transactions
   - Add notes and attachments to transactions

3. **Export Functionality**
   - Export ledger to Excel/PDF
   - Generate printable statements

4. **Analytics Dashboard**
   - Charts showing balance trends over time
   - Transaction type breakdown pie charts
   - Month-over-month comparisons

5. **Reconciliation Tools**
   - Bank statement reconciliation
   - Mark transactions as reconciled
   - Identify discrepancies

---

## Important Notes

1. **Opening Balance is Immutable**: Once set, opening balance should not be changed. It represents the historical starting point.

2. **Current Balance Auto-Calculated**: The current balance (cash_balance, bank_balance, gala_balance) in organisations table is automatically updated by existing triggers when transactions occur.

3. **Transaction Recording is Automatic**: You don't need to manually create balance_transactions entries. They are created automatically via triggers when source records are inserted.

4. **Date Range Opening Balance**: When filtering by date range, the opening balance is dynamically calculated as: `stored_opening_balance + SUM(transactions before start_date)`

5. **Debit vs Credit**:
   - DEBIT = Money going OUT (expenses, transfers out)
   - CREDIT = Money coming IN (income, payments, transfers in)

6. **Transaction Integrity**: Each transaction references the source table and source record ID, maintaining full audit trail.

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the database logs for errors
3. Check backend console for API errors
4. Verify all migration scripts ran successfully

---

## Summary

The Balance Ledger System provides:
- Complete transaction history for Cash, Bank, and Gala balances
- Automatic transaction recording via database triggers
- Opening balance tracking
- Running balance calculations
- Date range filtering
- Transaction type categorization
- Bilingual UI (English/Hindi)
- Full audit trail with source references

All existing functionality (expenses, payments, transfers, etc.) continues to work as before, with the added benefit of centralized transaction tracking through the balance_transactions table.
