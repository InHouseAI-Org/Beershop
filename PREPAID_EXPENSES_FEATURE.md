# Prepaid Expenses Feature - Complete Documentation

## Overview
This feature allows users to **pay recurring expenses in advance** and track them as current assets on the balance sheet. The prepaid amount is automatically amortized (reduced) over time as the expense period progresses.

---

## How It Works

### 1. **Pay in Advance**
Admin pays for a recurring expense ahead of time for multiple periods (weeks/months/years).

**Example**:
- Recurring Expense: Office Rent - ₹10,000/month
- Pay in Advance: **3 months**
- Total Payment: ₹10,000 × 3 = **₹30,000**
- Coverage: January 1 - March 31

### 2. **Track as Asset**
The prepaid amount (₹30,000) appears on the **Balance Sheet** under **Current Assets**.

### 3. **Automatic Amortization**
Each day, a portion of the prepaid amount is "amortized" (moved from asset to expense):
- **Daily Amortization** = ₹30,000 / 90 days = ₹333.33/day
- **After 30 days**: Remaining Value = ₹20,000
- **After 60 days**: Remaining Value = ₹10,000
- **After 90 days**: Remaining Value = ₹0 (fully amortized)

---

## Database Schema

### Table: `prepaid_expenses`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `organisation_id` | UUID | Organization reference |
| `recurring_expense_id` | UUID | Which recurring expense |
| `payment_date` | DATE | When advance payment was made |
| `paid_from` | VARCHAR | Which balance (cash/bank/gala) |
| `advance_periods` | INTEGER | Number of periods paid (e.g., 3) |
| `period_type` | VARCHAR | Type: weeks/months/years |
| `amount_per_period` | DECIMAL | Amount per week/month/year |
| `total_amount` | DECIMAL | Total prepaid amount |
| `coverage_start_date` | DATE | Coverage starts from |
| `coverage_end_date` | DATE | Coverage ends on |
| `remaining_value` | DECIMAL | Current remaining value (asset) |
| `amortized_value` | DECIMAL | Amount already expensed |

### Table: `prepaid_expense_amortizations`

Tracks individual daily amortization entries:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `prepaid_expense_id` | UUID | Which prepaid expense |
| `amortization_date` | DATE | Date of amortization |
| `amount` | DECIMAL | Amount amortized that day |

---

## API Endpoints

### Base URL: `/api/prepaid-expenses`

All endpoints require **authentication** and **admin role**.

---

### 1. **Create Prepaid Expense** (Pay in Advance)

```http
POST /api/prepaid-expenses
```

**Request Body**:
```json
{
  "recurringExpenseId": "uuid-of-recurring-expense",
  "paymentDate": "2026-01-15",
  "paidFrom": "cash_balance",
  "advancePeriods": 3,
  "periodType": "months",
  "notes": "Paid 3 months rent in advance"
}
```

**Parameters**:
- `recurringExpenseId` (UUID, required): ID of the recurring expense
- `paymentDate` (DATE, required): Date of advance payment
- `paidFrom` (STRING, required): One of: `cash_balance`, `bank_balance`, `gala_balance`
- `advancePeriods` (INTEGER, required): Number of periods (e.g., 3 months)
- `periodType` (STRING, required): One of: `weeks`, `months`, `years`
  - Must match recurring expense type (weekly→weeks, monthly→months, yearly→years)
- `notes` (STRING, optional): Additional notes

**Validations**:
1. Recurring expense must exist and be active
2. Period type must match recurring expense type
3. Organization must have sufficient balance
4. `advancePeriods` must be > 0

**What Happens**:
1. Calculates `total_amount` = `amount_per_period` × `advancePeriods`
2. Deducts amount from specified balance
3. Calculates coverage dates
4. Creates prepaid expense record
5. Sets `remaining_value` = `total_amount`, `amortized_value` = 0

**Response** (201):
```json
{
  "message": "Prepaid expense created successfully",
  "prepaidExpense": {
    "id": "uuid",
    "organisation_id": "uuid",
    "recurring_expense_id": "uuid",
    "payment_date": "2026-01-15",
    "paid_from": "cash_balance",
    "advance_periods": 3,
    "period_type": "months",
    "amount_per_period": "10000.00",
    "total_amount": "30000.00",
    "coverage_start_date": "2026-01-15",
    "coverage_end_date": "2026-04-14",
    "remaining_value": "30000.00",
    "amortized_value": "0.00",
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

---

### 2. **Get All Prepaid Expenses**

```http
GET /api/prepaid-expenses
```

**Response** (200):
```json
[
  {
    "id": "uuid",
    "organisation_id": "uuid",
    "recurring_expense_id": "uuid",
    "expense_name": "Office Rent",
    "payment_date": "2026-01-15",
    "paid_from": "cash_balance",
    "advance_periods": 3,
    "period_type": "months",
    "amount_per_period": "10000.00",
    "total_amount": "30000.00",
    "coverage_start_date": "2026-01-15",
    "coverage_end_date": "2026-04-14",
    "remaining_value": "20000.00",
    "amortized_value": "10000.00",
    "status": "active",
    "days_remaining": 60,
    "total_coverage_days": 90,
    "percentage_used": "33.33"
  }
]
```

**Status Values**:
- `future`: Coverage hasn't started yet
- `active`: Currently being amortized
- `expired`: Coverage period has ended
- `fully_amortized`: Remaining value is 0

---

### 3. **Get Single Prepaid Expense**

```http
GET /api/prepaid-expenses/:id
```

**Response**: Same as single object from array above.

---

### 4. **Get Total Prepaid Value** (For Balance Sheet)

```http
GET /api/prepaid-expenses/total-value
```

**Response** (200):
```json
{
  "totalPrepaidValue": "50000.00"
}
```

This sum only includes:
- Active prepaid expenses
- Where `coverage_end_date >= today`
- Where `remaining_value > 0`

---

### 5. **Run Daily Amortization** (Manual Trigger)

```http
POST /api/prepaid-expenses/amortize/daily
```

**What It Does**:
1. Finds all prepaid expenses that need amortization today
2. Calculates daily amortization amount for each
3. Creates amortization entry
4. Updates `remaining_value` and `amortized_value`

**Response** (200):
```json
{
  "message": "Daily amortization completed successfully",
  "amortizedCount": 5,
  "totalAmortizedAmount": "1666.65",
  "date": "2026-01-16"
}
```

**Note**: In production, this should be triggered by a **cron job** that runs daily at midnight.

---

## Balance Sheet Integration

The `prepaidExpenses` value appears under **Current Assets**:

```json
{
  "assets": {
    "inventoryValue": 100000,
    "schemesToBeAvailed": 5000,
    "bankBalance": 50000,
    "cashBalance": 20000,
    "galaBalance": 10000,
    "creditToCollect": 15000,
    "prepaidExpenses": 30000,  ⬅️ NEW
    "total": 230000
  },
  "liabilities": {
    "amountPayable": 40000,
    "monthlyRecurring": 15000,
    "yearlyRecurring": 50000,
    "total": 105000
  },
  "netWorth": 125000
}
```

---

## Calculation Examples

### Example 1: Monthly Rent

**Setup**:
- Recurring Expense: Office Rent - ₹10,000/month
- Pay Advance: **3 months** on January 15, 2026
- Coverage: Jan 15 - Apr 14 (90 days)

**Calculations**:
```
Total Amount = ₹10,000 × 3 = ₹30,000
Daily Amortization = ₹30,000 / 90 days = ₹333.33/day
```

**Timeline**:
| Date | Days Passed | Amortized | Remaining Value |
|------|-------------|-----------|-----------------|
| Jan 15 | 0 | ₹0 | ₹30,000 |
| Jan 16 | 1 | ₹333.33 | ₹29,666.67 |
| Feb 15 | 31 | ₹10,333.23 | ₹19,666.77 |
| Mar 15 | 59 | ₹19,666.47 | ₹10,333.53 |
| Apr 14 | 90 | ₹30,000 | ₹0 |

---

### Example 2: Weekly Expense

**Setup**:
- Recurring Expense: Cleaning Service - ₹2,000/week
- Pay Advance: **4 weeks** on January 20, 2026
- Coverage: Jan 20 - Feb 16 (28 days)

**Calculations**:
```
Total Amount = ₹2,000 × 4 = ₹8,000
Daily Amortization = ₹8,000 / 28 days = ₹285.71/day
```

---

### Example 3: Yearly Expense

**Setup**:
- Recurring Expense: Annual License - ₹120,000/year
- Pay Advance: **1 year** on April 1, 2026
- Coverage: Apr 1, 2026 - Mar 31, 2027 (365 days)

**Calculations**:
```
Total Amount = ₹120,000 × 1 = ₹120,000
Daily Amortization = ₹120,000 / 365 days = ₹328.77/day
```

**After 6 months (182 days)**:
```
Amortized = ₹328.77 × 182 = ₹59,836.14
Remaining = ₹120,000 - ₹59,836.14 = ₹60,163.86
```

---

## Frontend UI Requirements

### 1. **Recurring Expenses Tab** - Add "Pay in Advance" Button

Each recurring expense should have a "Pay in Advance" button that opens a modal:

**Modal Fields**:
- Recurring Expense Name (read-only)
- Amount per [period] (read-only, e.g., "₹10,000/month")
- Payment Date (date picker, default: today)
- Pay From (dropdown: Cash Balance / Bank Balance / Gala Balance)
- Advance Periods (number input, min: 1)
- Period Type (auto-filled based on recurrence type, read-only)
- **Calculated Total** (display: amount_per_period × advance_periods)
- **Coverage Period** (display: start date - end date)
- Notes (optional textarea)

**Buttons**: "Pay in Advance" / "Cancel"

---

### 2. **Prepaid Expenses Tab** (New Tab)

Display all prepaid expenses with:
- Expense Name
- Total Amount
- Remaining Value
- Coverage Period
- Days Remaining
- Progress Bar (percentage used)
- Status (Active/Expired/Fully Amortized)

---

### 3. **Balance Sheet** - Show Prepaid Expenses

Add new row under Current Assets:
```
Current Assets:
- Inventory Value: ₹100,000
- Schemes to be Availed: ₹5,000
- Bank Balance: ₹50,000
- Cash Balance: ₹20,000
- Gala Balance: ₹10,000
- Credit to Collect: ₹15,000
- Prepaid Expenses: ₹30,000  ⬅️ NEW
Total Assets: ₹230,000
```

---

## Cron Job Setup (Automatic Amortization)

For automatic daily amortization, set up a cron job:

**Using node-cron** (in `server.js`):
```javascript
const cron = require('node-cron');
const prepaidExpensesController = require('./controllers/prepaidExpensesController');

// Run daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily prepaid expense amortization...');
  try {
    await prepaidExpensesController.runDailyAmortization(
      { user: { organisationId: null } }, // System user
      { json: (data) => console.log('Amortization result:', data) }
    );
  } catch (error) {
    console.error('Failed to run daily amortization:', error);
  }
});
```

**Or using external cron**:
```bash
# Add to crontab
0 0 * * * curl -X POST http://localhost:5001/api/prepaid-expenses/amortize/daily
```

---

## Key Features

✅ **Pay in advance** for any recurring expense
✅ **Multiple period types**: weeks, months, years
✅ **Automatic validation**: Ensures sufficient balance
✅ **Coverage calculation**: Auto-calculates start and end dates
✅ **Daily amortization**: Gradually reduces asset value
✅ **Balance sheet integration**: Shows as current asset
✅ **Tracking**: View all prepaid expenses and their status
✅ **Prevents double amortization**: Won't amortize same day twice

---

## Testing Checklist

- [ ] Run `create_prepaid_expenses.sql` migration
- [ ] Create a monthly recurring expense (₹10,000/month)
- [ ] Pay 3 months in advance via API
- [ ] Verify balance was deducted
- [ ] Check prepaid expense appears in `/api/prepaid-expenses`
- [ ] Verify `remaining_value` = `total_amount`
- [ ] Run `/api/prepaid-expenses/amortize/daily`
- [ ] Verify `remaining_value` decreased by daily amount
- [ ] Check balance sheet shows prepaid expenses
- [ ] Verify amortization doesn't run twice on same day
- [ ] Check status changes from `active` to `expired` after coverage ends

---

## Files Created/Modified

| File | Type | Description |
|------|------|-------------|
| `create_prepaid_expenses.sql` | SQL | Database schema and tables |
| `backend/src/controllers/prepaidExpensesController.js` | Controller | API logic |
| `backend/src/routes/prepaidExpenses.js` | Routes | API endpoints |
| `backend/src/server.js` | Config | Route registration |
| `backend/src/controllers/balanceSheetController.js` | Controller | Added prepaid expenses to assets |
| `PREPAID_EXPENSES_FEATURE.md` | Docs | This documentation |

---

**Created**: March 17, 2026
**Author**: Claude Code
**Version**: 1.0
