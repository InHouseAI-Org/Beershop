# Credit Given & Credit Taken Testing Guide

## Issue Summary
Credit given is showing as `null` in database and only one credit taken entry is being saved instead of multiple.

## Complete Flow Trace

### 1. FRONTEND - Add Sales Form

**State Management:**
- `creditEntries` - Array for credit given entries
- `creditTaken` - Array for credit taken entries

**Functions:**
- `addCreditEntry()` - Adds new credit given entry to state
- `updateCreditEntry(index, field, value)` - Updates credit given entry
- `addCreditTaken()` - Adds new credit taken entry to state
- `updateCreditTaken(index, field, value)` - Updates credit taken entry

**UI Location:**
- Credit Given: Line 900-993 in AddSales.js
- Credit Taken: Line 763-895 in AddSales.js

### 2. FRONTEND - Data Preparation (handleSubmit)

**Credit Given Preparation** (Lines 312-333):
```javascript
const creditData = [];
creditEntries.forEach(entry => {
  if (entry.creditHolderId && entry.amount) {
    const creditHolderId = parseInt(entry.creditHolderId);
    if (!isNaN(creditHolderId)) {
      creditData.push({
        credit_holder_id: creditHolderId,
        creditgiven: parseFloat(entry.amount)
      });
    }
  }
});
```

**Credit Taken Preparation** (Lines 339-357):
```javascript
const creditTakenData = creditTaken
  .filter(ct => ct.creditHolderId && ct.amount)
  .map(ct => ({
    creditHolderId: parseInt(ct.creditHolderId),
    amount: parseFloat(ct.amount),
    collectedIn: ct.collectedIn
  }))
  .filter(ct => ct !== null);
```

**Payload** (Lines 368-383):
```javascript
{
  credit: creditData.length > 0 ? creditData : null,
  creditTaken: creditTakenData.length > 0 ? creditTakenData : null,
  ...
}
```

### 3. BACKEND - Receive Data

**File:** `backend/src/controllers/salesController.js`
**Function:** `createSale` (Line 64)

**Extraction** (Lines 67-71):
```javascript
const {
  credit, creditTaken, dailyExpenses, ...
} = req.body;
```

**Console Logs Added** (Lines 73-78):
- Will show what backend receives

### 4. BACKEND - Save to Database

**File:** `backend/src/models/data.js`
**Function:** `createSale` (Line 543)

**Processing** (Lines 547-548):
```javascript
const creditJson = saleData.credit && ... ? JSON.stringify(saleData.credit) : null;
const creditTakenJson = saleData.creditTaken && ... ? JSON.stringify(saleData.creditTaken) : null;
```

**Database Insert** (Lines 557-580):
```sql
INSERT INTO sales (... credit, credit_taken, ...)
VALUES (... $14, $15, ...)
```

### 5. BACKEND - Retrieve Data

**File:** `backend/src/controllers/salesController.js`
**Function:** `getAllSales` (Lines 4-31)

Returns:
```javascript
{
  ...sale,
  creditTaken: sale.credit_taken || [],
  dailyExpenses: dailyExpenses || []
}
```

### 6. FRONTEND - Display in Approval Form

**File:** `frontend/src/components/admin/SalesReportTab.js`

**Load Data** (Lines 297-318):
```javascript
// Credit given from sale.credit
const creditEntriesData = [];
if (sale.credit && Array.isArray(sale.credit)) {
  sale.credit.forEach(item => {
    creditEntriesData.push({
      creditHolderId: item.credit_holder_id,
      amount: item.creditgiven || 0
    });
  });
}

// Credit taken from sale.credit_taken
const creditTakenData = [];
if (sale.creditTaken && Array.isArray(sale.creditTaken)) {
  sale.creditTaken.forEach(item => {
    creditTakenData.push({
      creditHolderId: item.creditHolderId,
      amount: item.amount || 0,
      collectedIn: item.collectedIn || 'cash_balance'
    });
  });
}
```

## Testing Steps

### Step 1: Clear Browser Console
1. Open Developer Tools (F12)
2. Go to Console tab
3. Clear all logs

### Step 2: Fill Add Sales Form
1. Go to Add Sales page
2. Add product sales (any products)
3. **Add 2 Credit Given entries:**
   - Click "+ Add Credit"
   - Select credit holder (e.g., Ajay)
   - Enter amount (e.g., 100)
   - Click "+ Add Credit" again
   - Select different credit holder (e.g., Rahul)
   - Enter amount (e.g., 200)
4. **Add 2 Credit Taken entries:**
   - Click "+ Add Credit Taken"
   - Select credit holder (e.g., Ajay)
   - Enter amount (e.g., 50)
   - Select "Cash" or "UPI"
   - Click "+ Add Credit Taken" again
   - Select different credit holder (e.g., Rahul)
   - Enter amount (e.g., 75)
   - Select payment method

### Step 3: Check Preview
1. Click "Preview & Submit"
2. **Verify in preview modal:**
   - Do you see "Credit Given" section with 2 entries?
   - Do you see "Credit Taken" section with 2 entries?
   - Are the names showing correctly?
   - Are the amounts correct?

### Step 4: Check Frontend Console Logs
Before clicking "Confirm & Submit", check console for:
```
=== PREPARING CREDIT GIVEN DATA ===
creditEntries: [{creditHolderId: "1", amount: "100"}, {creditHolderId: "2", amount: "200"}]
Processing credit entry: {creditHolderId: "1", amount: "100"}
Parsed creditHolderId: 1 isNaN: false
Added to creditData: {credit_holder_id: 1, creditgiven: 100}
Processing credit entry: {creditHolderId: "2", amount: "200"}
Parsed creditHolderId: 2 isNaN: false
Added to creditData: {credit_holder_id: 2, creditgiven: 200}
Final creditData: [{credit_holder_id: 1, creditgiven: 100}, {credit_holder_id: 2, creditgiven: 200}]

=== PREPARING CREDIT TAKEN DATA ===
creditTaken: [{creditHolderId: "1", amount: "50", collectedIn: "cash_balance"}, ...]
Final creditTakenData: [{creditHolderId: 1, amount: 50, collectedIn: "cash_balance"}, ...]

=== SUBMITTING PAYLOAD ===
{
  "credit": [
    {"credit_holder_id": 1, "creditgiven": 100},
    {"credit_holder_id": 2, "creditgiven": 200}
  ],
  "creditTaken": [
    {"creditHolderId": 1, "amount": 50, "collectedIn": "cash_balance"},
    {"creditHolderId": 2, "amount": 75, "collectedIn": "cash_balance"}
  ],
  ...
}
```

**Questions to answer from console:**
- Is creditEntries array populated with 2 entries?
- Is creditData array populated with 2 entries?
- Is creditTaken array populated with 2 entries?
- Is creditTakenData array populated with 2 entries?
- Does the final payload show both arrays correctly?

### Step 5: Submit and Check Backend Logs
1. Click "Confirm & Submit"
2. **Check terminal/backend logs** for:
```
=== CREATE SALE REQUEST ===
Credit (credit given): [ { credit_holder_id: 1, creditgiven: 100 }, { credit_holder_id: 2, creditgiven: 200 } ]
Credit Taken: [ { creditHolderId: 1, amount: 50, collectedIn: 'cash_balance' }, { creditHolderId: 2, amount: 75, collectedIn: 'cash_balance' } ]
```

**Questions to answer from backend:**
- Does backend receive credit array with 2 entries?
- Does backend receive creditTaken array with 2 entries?

### Step 6: Check Database
Run this command:
```bash
cd backend
node -e "require('dotenv').config(); const pool = require('./src/config/database'); pool.query('SELECT credit, credit_taken FROM sales ORDER BY created_at DESC LIMIT 1').then(r => {console.log('Credit:', r.rows[0].credit); console.log('Credit Taken:', r.rows[0].credit_taken); pool.end();})"
```

**Questions to answer from database:**
- Is credit column showing 2 entries?
- Is credit_taken column showing 2 entries?
- Or are they null/empty?

### Step 7: Check Approval Form
1. Go to Admin → Sales Report
2. Find the pending sale
3. Click to approve it
4. **Check approval modal:**
   - Are credit given entries showing with correct names?
   - Are credit taken entries showing with correct names?
   - Are the amounts correct?

## Report Results

Please provide:
1. Screenshot or copy-paste of **browser console** logs from Step 4
2. Screenshot or copy-paste of **backend terminal** logs from Step 5
3. Output from **database query** in Step 6
4. Screenshot of **approval form** showing the issue

This will help identify exactly where in the flow the data is being lost.
