# Recurring Expenses (Remaining FY) - Detailed Calculation Explanation

## Overview
This document explains how the **Recurring Expenses (Remaining FY)** value is calculated in the Balance Sheet.

**File**: `backend/src/controllers/balanceSheetController.js` (lines 82-154)

---

## 🐛 Bug Fix Applied (March 17, 2026)

**Previous Bug**: The calculation was ignoring `next_due_date` and counting ALL recurring expenses in the remaining FY, even if they were due in the NEXT FY.

**Example of Bug**:
- Expense due on **April 1, 2026** (next FY)
- Current FY ends on **March 31, 2026**
- **Bug**: Was counting this expense in current FY ❌
- **Fixed**: Now correctly skips this expense ✓

**Fix Applied**:
1. ✅ Now validates `next_due_date` against FY end date
2. ✅ Skips expenses where `next_due_date > March 31st`
3. ✅ Skips expenses with null `next_due_date`
4. ✅ Calculates occurrences from `next_due_date` to FY end (not from today)
5. ✅ Uses `1 + Math.floor()` instead of `Math.ceil()` for more accurate counting

---

---

## Financial Year Definition

**Indian Financial Year**: April 1st to March 31st

- If current month is **April or later** (month >= 3): FY ends on March 31st of **next year**
- If current month is **January-March** (month < 3): FY ends on March 31st of **current year**

---

## Step-by-Step Calculation

### Step 1: Determine FY End Date (Lines 84-91)

```javascript
const today = new Date();

const fyEnd = new Date(
  today.getMonth() >= 3 ? today.getFullYear() + 1 : today.getFullYear(),
  2, // March (0-indexed, so 2 = March)
  31
);
```

**Examples**:
- Today: **December 15, 2025** → FY End: **March 31, 2026**
- Today: **February 10, 2026** → FY End: **March 31, 2026**
- Today: **April 5, 2026** → FY End: **March 31, 2027**

---

### Step 2: Calculate Remaining Time in FY (Lines 93-96)

```javascript
const remainingDays = Math.ceil((fyEnd - today) / (1000 * 60 * 60 * 24));
const remainingWeeks = remainingDays / 7;
const remainingMonths = remainingDays / 30.44; // Average days per month
```

**Example** (Today: January 15, 2026):
- FY End: March 31, 2026
- **remainingDays** = 75 days
- **remainingWeeks** = 75 / 7 = **10.71 weeks**
- **remainingMonths** = 75 / 30.44 = **2.46 months**

---

### Step 3: Fetch All Active Recurring Expenses (Lines 99-108)

Query fetches:
```sql
SELECT
  expense_amount,
  recurrence_type,      -- 'weekly', 'monthly', or 'yearly'
  recurrence_frequency  -- e.g., 1 = every week, 2 = every 2 weeks
FROM recurring_expenses
WHERE organisation_id = $1
  AND is_active = true
```

---

### Step 4: Calculate Occurrences for Each Expense (Lines 111-154)

For each recurring expense, the system:
1. **Checks if `next_due_date` is within the current FY** (before or on March 31st)
2. **Skips expenses** where `next_due_date` is after FY end or is null
3. **Calculates occurrences** from `next_due_date` to FY end

#### **Validation Checks** (Lines 118-126)

```javascript
// Skip if next_due_date is after FY end (expense is for next FY)
if (nextDueDate && nextDueDate > fyEnd) {
  return; // Skip this expense
}

// Skip if next_due_date is null (no due date set)
if (!nextDueDate) {
  return; // Skip this expense
}
```

**Example - Skipped Expenses**:
- Expense due on **April 1, 2026** (FY end is March 31, 2026) → **SKIPPED** ✓
- Expense with no `next_due_date` → **SKIPPED** ✓

---

#### **Weekly Expenses** (Lines 136-140)

```javascript
case 'weekly':
  // First occurrence is the next_due_date itself, then calculate additional occurrences
  occurrencesInRemainingPeriod = 1 + Math.floor(remainingWeeksFromDue / frequency);
  break;
```

**Formula**: `1 + Math.floor((fyEnd - next_due_date) / (7 days × frequency))`

**Example**:
- Expense: "Weekly Rent" - ₹10,000 every 1 week
- Next due: **January 20, 2026**
- FY end: **March 31, 2026**
- Days from due to FY end: 70 days
- Weeks: 70 / 7 = 10 weeks
- Occurrences: `1 + floor(10 / 1)` = **11 times** (Jan 20 + 10 more)
- **Total**: ₹10,000 × 11 = **₹110,000**

**Another Example**:
- Expense: "Bi-weekly Salary" - ₹5,000 every 2 weeks
- Next due: **January 20, 2026**
- Weeks from due: 10
- Occurrences: `1 + floor(10 / 2)` = **6 times** (Jan 20 + 5 more)
- **Total**: ₹5,000 × 6 = **₹30,000**

---

#### **Monthly Expenses** (Lines 141-144)

```javascript
case 'monthly':
  // First occurrence is the next_due_date itself, then calculate additional occurrences
  occurrencesInRemainingPeriod = 1 + Math.floor(remainingMonthsFromDue / frequency);
  break;
```

**Formula**: `1 + Math.floor((fyEnd - next_due_date) / (30.44 days × frequency))`

**Example**:
- Expense: "Electricity Bill" - ₹3,000 every 1 month
- Next due: **January 15, 2026**
- FY end: **March 31, 2026**
- Days from due: 75 days
- Months: 75 / 30.44 = 2.46 months
- Occurrences: `1 + floor(2.46 / 1)` = **3 times** (Jan 15, Feb 15, Mar 15)
- **Total**: ₹3,000 × 3 = **₹9,000**

**Another Example**:
- Expense: "Quarterly Insurance" - ₹12,000 every 3 months
- Next due: **January 15, 2026**
- Months from due: 2.46
- Occurrences: `1 + floor(2.46 / 3)` = **1 time** (only Jan 15)
- **Total**: ₹12,000 × 1 = **₹12,000**

---

#### **Yearly Expenses** (Lines 145-149)

```javascript
case 'yearly':
  // First occurrence is the next_due_date, check if there's another occurrence
  occurrencesInRemainingPeriod = 1 + (remainingMonthsFromDue >= (frequency * 12) ? 1 : 0);
  break;
```

**Formula**: `1 + (remainingMonthsFromDue >= (frequency × 12) ? 1 : 0)`

**Example 1**:
- Expense: "Annual License" - ₹50,000 every 1 year
- Next due: **January 15, 2026**
- FY end: **March 31, 2026**
- Months from due: 2.46
- Check: `2.46 >= 12` → **false** (no second occurrence)
- Occurrences: `1 + 0` = **1 time** (only Jan 15)
- **Total**: ₹50,000 × 1 = **₹50,000**

**Example 2** (next due is April 1, 2026 - next FY):
- Expense: "Annual License" - ₹50,000 every 1 year
- Next due: **April 1, 2026**
- FY end: **March 31, 2026**
- **SKIPPED** because `next_due_date > fyEnd`
- Occurrences: **0 times**
- **Total**: ₹50,000 × 0 = **₹0**

---

### Step 5: Sum All Recurring Expenses (Line 153)

```javascript
yearlyRecurring += amount * occurrencesInRemainingPeriod;
```

**Complete Example**:

Assuming today is **January 15, 2026**, FY ends **March 31, 2026** (75 days remaining):

| Expense Name | Amount | Type | Freq | Next Due | Calculation | Total |
|--------------|--------|------|------|----------|-------------|-------|
| Weekly Rent | ₹10,000 | weekly | 1 | Jan 20, 2026 | 1+floor(10/1)=11 | ₹110,000 |
| Bi-weekly Salary | ₹5,000 | weekly | 2 | Jan 20, 2026 | 1+floor(10/2)=6 | ₹30,000 |
| Electricity | ₹3,000 | monthly | 1 | Jan 15, 2026 | 1+floor(2.46/1)=3 | ₹9,000 |
| Quarterly Ins. | ₹12,000 | monthly | 3 | Jan 15, 2026 | 1+floor(2.46/3)=1 | ₹12,000 |
| Annual License | ₹50,000 | yearly | 1 | Jan 15, 2026 | 1+(2.46>=12?1:0)=1 | ₹50,000 |
| Future Expense | ₹20,000 | monthly | 1 | **Apr 1, 2026** | **SKIPPED** | ₹0 |
| No Due Date | ₹5,000 | weekly | 1 | **null** | **SKIPPED** | ₹0 |

**Total Recurring Expenses (Remaining FY)** = ₹110,000 + ₹30,000 + ₹9,000 + ₹12,000 + ₹50,000 = **₹211,000**

---

## How It Appears on Balance Sheet

The calculated value appears under **Liabilities** section:

```json
{
  "liabilities": {
    "amountPayable": 50000,           // Owed to distributors
    "monthlyRecurring": 15000,         // Recurring expenses due THIS month
    "yearlyRecurring": 161000,         // Recurring expenses for REMAINING FY ⬅️ OUR CALCULATION
    "total": 226000
  }
}
```

---

## Key Points

1. **Validates `next_due_date`**:
   - **SKIPS** expenses where `next_due_date > FY end` (belongs to next FY)
   - **SKIPS** expenses where `next_due_date` is null (no date set)
   - Only processes expenses due **within current FY**

2. **Uses `Math.floor()` for additional occurrences**:
   - Formula: `1 + Math.floor(remainingPeriod / frequency)`
   - The **1** counts the `next_due_date` itself
   - `Math.floor()` counts additional occurrences after that
   - More conservative than `Math.ceil()` to avoid overcounting

3. **Remaining period calculation**:
   - Calculates from **`next_due_date`** to **March 31st** (FY end)
   - NOT from today - uses actual due date as starting point

4. **Frequency multiplier**:
   - `frequency = 1` → every week/month/year
   - `frequency = 2` → every 2 weeks/months/years
   - `frequency = 3` → every 3 weeks/months/years (quarterly if monthly)

5. **Only active expenses**:
   - Query filters `is_active = true`
   - Deactivated expenses are excluded

---

## Code Location Summary

| What | File | Lines |
|------|------|-------|
| Full calculation | `backend/src/controllers/balanceSheetController.js` | 82-132 |
| FY end calculation | Same | 84-91 |
| Remaining time | Same | 93-96 |
| Fetch expenses query | Same | 99-108 |
| Weekly calculation | Same | 117-120 |
| Monthly calculation | Same | 121-124 |
| Yearly calculation | Same | 125-129 |
| Sum total | Same | 131 |
| Database schema | `create_recurring_expenses.sql` | All |

---

## Testing the Calculation

To verify the calculation manually:

1. **Check today's date**: e.g., January 15, 2026
2. **Calculate FY end**: March 31, 2026
3. **Calculate remaining days**: (March 31 - Jan 15) = 75 days
4. **Convert to weeks/months**: 75/7 = 10.71 weeks, 75/30.44 = 2.46 months
5. **For each expense**:
   - Divide remaining period by frequency
   - Round up with `Math.ceil()`
   - Multiply by expense amount
6. **Sum all expenses**

---

## Related Queries

### Monthly Recurring Expenses (Lines 67-80)

**Separate calculation** for expenses due **THIS MONTH ONLY** (not remaining FY):

```javascript
const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

const monthlyRecurringQuery = `
  SELECT COALESCE(SUM(re.expense_amount), 0) as monthly_recurring
  FROM recurring_expenses re
  WHERE re.organisation_id = $1
    AND re.is_active = true
    AND re.next_due_date >= $2  -- Start of current month
    AND re.next_due_date <= $3  -- End of current month
`;
```

This uses `next_due_date` to find expenses **due this month specifically**.

---

## Questions & Answers

**Q: Why use 30.44 days per month?**
A: Average days in a month accounting for leap years: 365.25 / 12 = 30.44

**Q: Why `Math.ceil()` instead of `Math.floor()`?**
A: To ensure conservative estimation - better to slightly overestimate liabilities than underestimate.

**Q: What if an expense has `next_due_date` in the past?**
A: The calculation doesn't use `next_due_date` for remaining FY - it only uses recurrence_type and frequency.

**Q: What if frequency is 0?**
A: Database constraint prevents this: `CHECK (recurrence_frequency > 0)`

**Q: Does this account for already-paid expenses?**
A: No - this shows **total expected recurring expenses** for remaining FY, regardless of payment status.

---

**Last Updated**: March 17, 2026
