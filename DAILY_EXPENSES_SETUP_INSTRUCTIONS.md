# Daily Expenses Database Setup Instructions

## Current Approach: Separate Table

The application now uses a **separate `daily_expenses` table** to store daily expenses (not a JSONB column in the sales table).

---

## If You Previously Added the daily_expenses Column

If you previously ran the migration to add `daily_expenses` as a JSONB column to the sales table, you need to remove it:

### Step 1: Access Neon Console
1. Go to https://console.neon.tech
2. Log in to your account
3. Select your project

### Step 2: Open SQL Editor
1. Click on "SQL Editor" in the left sidebar

### Step 3: Remove the Column
Copy and paste the following SQL:

```sql
-- Remove daily_expenses column from sales table (if it exists)
ALTER TABLE sales DROP COLUMN IF EXISTS daily_expenses;

-- Verify the column was removed
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name = 'daily_expenses';
```

### Step 4: Execute
1. Click "Run" (or press Ctrl/Cmd + Enter)
2. The verification query should return no rows (confirming removal)

---

## Ensure daily_expenses Table Exists

Your database should have a separate `daily_expenses` table. Verify it exists:

```sql
-- Check if daily_expenses table exists
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'daily_expenses';
```

If the table doesn't exist, create it:

```sql
-- Create daily_expenses table
CREATE TABLE daily_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add comment
COMMENT ON TABLE daily_expenses IS 'Daily expenses recorded with sales reports (deducted from gala balance)';

-- Create indexes
CREATE INDEX idx_daily_expenses_organisation_id ON daily_expenses(organisation_id);
CREATE INDEX idx_daily_expenses_sale_id ON daily_expenses(sale_id);
CREATE INDEX idx_daily_expenses_expense_date ON daily_expenses(expense_date);
```

---

## How Daily Expenses Work Now

### Storage
- Each expense is a **separate row** in the `daily_expenses` table
- Linked to sales via `sale_id` foreign key

### Data Structure
```
daily_expenses table:
- id: UUID (primary key)
- organisation_id: UUID (references organisations)
- sale_id: UUID (references sales)
- name: VARCHAR (e.g., "Transport", "Electricity")
- description: TEXT (optional details)
- amount: DECIMAL (expense amount)
- expense_date: DATE (date of expense)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Backend Behavior
- **Creating Sales**: Expenses are saved to `daily_expenses` table via `db.createDailyExpense()`
- **Fetching Sales**: Expenses are retrieved via `db.getDailyExpensesBySaleId(saleId)`
- **Approving Sales**: Existing expenses are checked to avoid duplicates

### Frontend Display
- AddSales form: Users enter expenses in a dynamic list
- SalesReportTab: Expenses are displayed in the detail modal
- Approval modal: Expenses are shown and included in cash calculation

---

## Correct Database Schema

Your `sales` table should NOT have a `daily_expenses` column.

Verify with:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'sales';
```

Expected columns in sales table:
- id, organisation_id, user_id, admin_id, date
- opening_stock, closing_stock, sale (JSONB)
- cash_collected, upi
- miscellaneous, miscellaneous_type, miscellaneous_cash, miscellaneous_upi
- gala_balance_today
- credit, credit_taken (JSONB)
- remarks, status
- created_at, updated_at

**Note**: `daily_expenses` should NOT be in this list!

---

## Troubleshooting

### Expenses Not Saving
1. Verify `daily_expenses` table exists
2. Check table has correct columns and indexes
3. Ensure sale_id foreign key constraint is valid

### Expenses Not Displaying
1. Check that `db.getDailyExpensesBySaleId()` function exists in backend
2. Verify expenses are being fetched in `salesController.js`
3. Check browser console for API errors

### Build Errors
1. Ensure no references to `sale.daily_expenses` column in frontend
2. All expense data should come from `sale.dailyExpenses` (array from API)

---

## Summary

✅ **Correct Setup**: Separate `daily_expenses` table
❌ **Incorrect**: `daily_expenses` JSONB column in sales table

If you have the column, remove it using the migration provided.
If you don't have the table, create it using the SQL provided.
