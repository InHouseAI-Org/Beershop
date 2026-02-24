# Sales Approval Workflow - Implementation Steps

## 🎯 Overview
User-submitted sales now require admin approval before affecting inventory and credit holders.

## 📋 Steps to Complete Implementation

### Step 1: Apply Database Migration
Run the SQL migration in your Neon SQL Editor:

```bash
# The file is located at:
/Users/manavbathija/Desktop/Beershop/add_sales_status.sql
```

**Instructions:**
1. Open your Neon console
2. Navigate to SQL Editor
3. Copy and paste the contents of `add_sales_status.sql`
4. Execute the SQL
5. Verify the migration succeeded

### Step 2: Restart Backend Server
```bash
cd /Users/manavbathija/Desktop/Beershop/backend
npm restart
# OR if using nodemon:
# It should auto-restart
```

### Step 3: Restart Frontend Server
```bash
cd /Users/manavbathija/Desktop/Beershop/frontend
npm restart
```

## ✅ Testing the Workflow

### Test 1: User Submission
1. Login as a regular user (not admin)
2. Submit a sale
3. Verify you see success message
4. Note: Inventory should NOT be affected yet

### Test 2: Admin Approval
1. Login as admin
2. Navigate to Sales Report tab
3. You should see "Pending Sales Approvals" section at the top
4. Click "Review & Approve" on a pending sale
5. Edit values if needed (Cash, UPI, Remarks)
6. Click "Approve Sale"
7. Verify inventory is now updated
8. Verify credit holders are updated (if credit was given)

### Test 3: Balance Allocation
1. As admin, check the approved sales
2. Pending sales should show "Pending" badge in Balances column
3. Approved sales should show "Allocate" button
4. Only approved sales can have balances allocated

## 🔧 Features Implemented

### Backend
- ✅ `status` field added to sales table
- ✅ User sales created with 'pending' status
- ✅ Admin sales created with 'approved' status
- ✅ Approval endpoint: `POST /sales/:id/approve`
- ✅ Inventory/credit updates only for approved sales

### Frontend
- ✅ Pending sales section with yellow highlight
- ✅ Approval modal with edit capability
- ✅ Balance allocation restricted to approved sales
- ✅ Status badges showing pending/approved/allocated

## 📊 Files Modified

### Backend Files
1. `backend/src/models/data.js` - Added status field to createSale
2. `backend/src/controllers/salesController.js` - Added approval logic
3. `backend/src/routes/sales.js` - Added approval route

### Frontend Files
1. `frontend/src/components/admin/SalesReportTab.js` - Added approval UI

### Database
1. `add_sales_status.sql` - Migration script

## 🔒 Security Notes
- Only admins can approve sales
- Approval is irreversible
- Pending sales cannot have balances allocated
- User-submitted sales don't affect inventory until approved

## 🐛 Troubleshooting

**Issue: Sales not showing as pending**
- Verify database migration ran successfully
- Check backend logs for errors
- Ensure user role is 'user' not 'admin'

**Issue: Cannot approve sales**
- Verify logged in as admin
- Check browser console for API errors
- Verify approval endpoint is accessible

**Issue: Inventory not updating after approval**
- Check backend logs
- Verify sale data has valid product IDs
- Check if inventory exists for products

## 📞 Support
If you encounter any issues, check:
1. Backend console logs
2. Frontend browser console
3. Database query logs in Neon
