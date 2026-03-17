# Prepaid Expenses in Payment History - Update

## Overview
Prepaid expenses (advance payments) now appear in the Recurring Expense Payment History alongside regular payments.

---

## What Changed

### Backend (`recurringExpensesController.js`)

**Updated Function**: `getPaymentHistory`

**Before**: Only fetched regular payments from `recurring_expense_payments` table

**After**: Fetches and combines:
1. Regular payments from `recurring_expense_payments`
2. Prepaid expenses from `prepaid_expenses`

**Key Changes**:
- Added `type` field to differentiate: `'payment'` vs `'prepaid'`
- Fetches additional prepaid expense details:
  - `advance_periods` (number of periods paid)
  - `period_type` (weeks/months/years)
  - `amount_per_period`
  - `coverage_start_date` and `coverage_end_date`
  - `remaining_value` (current remaining amount)
  - `amortized_value` (amount already expensed)
- Combines both arrays and sorts by `payment_date` (most recent first)

---

### Frontend (`RecurringExpensesTab.js`)

**Updated Component**: Payment History Modal table

**New Table Structure**:
```
| Type | Date | Amount | Paid From | Details | Paid By |
```

**Visual Distinctions**:

1. **Type Badge**:
   - Regular Payment: Green badge "PAYMENT"
   - Prepaid: Orange badge "PREPAID"

2. **Row Highlighting**:
   - Prepaid rows have yellow/amber background (`#fff3cd`)
   - Regular payments have white background

3. **Amount Color**:
   - Regular payments: Red (`#dc3545`)
   - Prepaid: Orange (`#FF9800`)

4. **Details Column**:

   **For Regular Payments**:
   - Shows notes or "-"

   **For Prepaid Expenses**:
   - **Period covered**: "3 months"
   - **Coverage dates**: "Jan 15, 2026 - Apr 14, 2026"
   - **Remaining value**: "Remaining: ₹20,000.00"
   - **Notes** (if any)

---

## Example Display

### Payment History Table:

```
┌──────────┬────────────┬──────────┬───────┬──────────────────────────┬──────────┐
│ Type     │ Date       │ Amount   │ From  │ Details                  │ Paid By  │
├──────────┼────────────┼──────────┼───────┼──────────────────────────┼──────────┤
│ [PREPAID]│ Mar 15,    │ ₹30,000  │ Cash  │ 3 months                 │ admin    │
│  (orange)│ 2026       │ (orange) │       │ Mar 15, 2026 - Jun 14    │          │
│          │            │          │       │ Remaining: ₹20,000.00    │          │
│          │            │          │       │ Paid 3 months rent       │          │
├──────────┼────────────┼──────────┼───────┼──────────────────────────┼──────────┤
│ [PAYMENT]│ Mar 10,    │ ₹10,000  │ Bank  │ Monthly rent payment     │ admin    │
│  (green) │ 2026       │ (red)    │       │                          │          │
├──────────┼────────────┼──────────┼───────┼──────────────────────────┼──────────┤
│ [PAYMENT]│ Feb 10,    │ ₹10,000  │ Cash  │ Monthly rent payment     │ admin    │
│  (green) │ 2026       │ (red)    │       │                          │          │
└──────────┴────────────┴──────────┴───────┴──────────────────────────┴──────────┘
```

**Visual Highlights**:
- Prepaid row has yellow background
- Orange "PREPAID" badge vs green "PAYMENT" badge
- Orange amount for prepaid vs red amount for regular payments
- Detailed coverage information for prepaid expenses

---

## API Response Example

**Endpoint**: `GET /api/recurring-expenses/:id/payments`

**Response**:
```json
[
  {
    "id": "uuid-1",
    "type": "prepaid",
    "payment_date": "2026-03-15",
    "amount": "30000.00",
    "paid_from": "cash_balance",
    "advance_periods": 3,
    "period_type": "months",
    "amount_per_period": "10000.00",
    "coverage_start_date": "2026-03-15",
    "coverage_end_date": "2026-06-14",
    "remaining_value": "20000.00",
    "amortized_value": "10000.00",
    "notes": "Paid 3 months rent in advance",
    "created_by_name": "admin",
    "created_at": "2026-03-15T10:30:00Z"
  },
  {
    "id": "uuid-2",
    "type": "payment",
    "payment_date": "2026-03-10",
    "amount": "10000.00",
    "paid_from": "bank_balance",
    "notes": "Monthly rent payment",
    "created_by_name": "admin",
    "created_at": "2026-03-10T09:00:00Z"
  },
  {
    "id": "uuid-3",
    "type": "payment",
    "payment_date": "2026-02-10",
    "amount": "10000.00",
    "paid_from": "cash_balance",
    "notes": "Monthly rent payment",
    "created_by_name": "admin",
    "created_at": "2026-02-10T09:00:00Z"
  }
]
```

---

## User Experience Benefits

1. **Complete Payment History**: Users can see ALL payments (regular + prepaid) in one place

2. **Clear Differentiation**: Visual cues (colors, badges, backgrounds) make it easy to distinguish payment types

3. **Prepaid Tracking**: Users can see:
   - How much they prepaid
   - What period it covers
   - How much is remaining (as it amortizes)

4. **Financial Transparency**: Shows both immediate expenses and long-term prepaid commitments

---

## Files Modified

1. **Backend**:
   - `backend/src/controllers/recurringExpensesController.js` - Updated `getPaymentHistory` function

2. **Frontend**:
   - `frontend/src/components/admin/RecurringExpensesTab.js` - Updated Payment History Modal

---

## Testing Checklist

- [x] Backend returns combined payments + prepaid expenses
- [x] Results sorted by date (most recent first)
- [x] Type field correctly identifies 'payment' vs 'prepaid'
- [x] Prepaid expenses show all required fields
- [x] Frontend displays prepaid rows with yellow background
- [x] Badge colors correct (green for payment, orange for prepaid)
- [x] Amount colors correct (red for payment, orange for prepaid)
- [x] Details column shows coverage info for prepaid
- [x] Remaining value displays and updates as amortization occurs

---

**Updated**: March 17, 2026
