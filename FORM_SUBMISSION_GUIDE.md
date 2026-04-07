# Form Submission Guide

## Overview

This guide explains how to implement standardized form submissions with:
- **Loading states** during processing
- **Browser alert dialogs** for errors and warnings
- **Navigation blocking** while forms are submitting
- **Prevention of multiple submissions**

## The `useFormSubmit` Hook

All forms and modals should use the `useFormSubmit` hook located at:
```
frontend/src/hooks/useFormSubmit.js
```

### Features

1. **Automatic Loading State** - Shows "Processing..." and disables buttons
2. **Navigation Blocking** - Prevents back button and page refresh during submission
3. **Browser Alerts** - Shows error/success messages in native browser alerts
4. **Submit Protection** - Prevents multiple simultaneous submissions

### Basic Usage

```javascript
import { useFormSubmit } from '../hooks/useFormSubmit';

const MyForm = () => {
  const { isSubmitting, handleSubmit, showError, showWarning, showSuccess } = useFormSubmit();

  const onSubmit = async () => {
    const success = await handleSubmit(async () => {
      // Your API call here
      await api.post('/endpoint', data);

      // Return data if needed
      return data;
    }, {
      successMessage: '✅ Success message here!\n\nसफलता संदेश यहाँ!',
      onSuccess: () => {
        // Do something after success (like navigate)
        navigate('/dashboard');
      },
      onError: (error) => {
        // Optional: handle error
        console.error(error);
      }
    });
  };

  return (
    <form>
      {/* Your form fields */}

      <button
        onClick={onSubmit}
        disabled={isSubmitting}
        style={{
          opacity: isSubmitting ? 0.6 : 1,
          cursor: isSubmitting ? 'not-allowed' : 'pointer'
        }}
      >
        {isSubmitting ? '⏳ Processing...' : 'Submit'}
      </button>
    </form>
  );
};
```

## Implementation Checklist for ALL Forms

### 1. Import the Hook
```javascript
import { useFormSubmit } from '../hooks/useFormSubmit';
```

### 2. Initialize the Hook
```javascript
const { isSubmitting, handleSubmit, showError, showWarning, showSuccess } = useFormSubmit();
```

### 3. Wrap Your Submit Function
```javascript
const handleMySubmit = async () => {
  await handleSubmit(async () => {
    // Your actual submission logic
    await api.post('/endpoint', payload);
  }, {
    successMessage: '✅ Success!\n\nसफलतापूर्वक!',
    onSuccess: () => {
      // Navigate or refresh data
    }
  });
};
```

### 4. Update Button States
```javascript
<button
  onClick={handleMySubmit}
  disabled={isSubmitting}
  style={{
    opacity: isSubmitting ? 0.6 : 1,
    cursor: isSubmitting ? 'not-allowed' : 'pointer'
  }}
>
  {isSubmitting ? '⏳ Processing... | प्रसंस्करण...' : 'Submit | सबमिट करें'}
</button>
```

### 5. Disable ALL Interactive Elements
When `isSubmitting` is true:
- Disable all buttons
- Disable form inputs (optional but recommended)
- Disable navigation buttons
- Show loading indicators

## Alert Dialog Standards

### Success Messages
```javascript
successMessage: '✅ Operation completed successfully!\n\nसफलतापूर्वक पूर्ण हुआ!'
```

### Error Messages
Errors are automatically shown with:
```
❌ Error message
त्रुटि: Error message
```

### Warning Messages
Use `showWarning()`:
```javascript
showWarning('⚠️ Please check your input!\n\nकृपया अपना इनपुट जांचें!');
```

### Info Messages
Use `showInfo()`:
```javascript
showInfo('ℹ️ Remember to save your work!\n\nअपना काम सहेजना याद रखें!');
```

## Complete Example: Add/Edit Form

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFormSubmit } from '../hooks/useFormSubmit';
import api from '../utils/api';

const MyFormModal = ({ item, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { isSubmitting, handleSubmit, showError, showWarning } = useFormSubmit();

  const [formData, setFormData] = useState({
    name: item?.name || '',
    amount: item?.amount || ''
  });

  const validateForm = () => {
    if (!formData.name) {
      showWarning('⚠️ Please enter a name!\n\nकृपया नाम दर्ज करें!');
      return false;
    }
    if (!formData.amount || formData.amount <= 0) {
      showWarning('⚠️ Please enter a valid amount!\n\nकृपया मान्य राशि दर्ज करें!');
      return false;
    }
    return true;
  };

  const handleFormSubmit = async () => {
    // Validate before submitting
    if (!validateForm()) return;

    const success = await handleSubmit(async () => {
      if (item) {
        // Update existing
        await api.put(`/endpoint/${item.id}`, formData);
      } else {
        // Create new
        await api.post('/endpoint', formData);
      }
    }, {
      successMessage: item
        ? '✅ Updated successfully!\n\nसफलतापूर्वक अपडेट किया गया!'
        : '✅ Created successfully!\n\nसफलतापूर्वक बनाया गया!',
      onSuccess: () => {
        onClose();
        onSuccess();
      }
    });
  };

  return (
    <div className="modal-overlay" onClick={isSubmitting ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{item ? 'Edit' : 'Add New'}</h2>

        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-group">
          <label>Amount</label>
          <input
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            disabled={isSubmitting}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleFormSubmit}
            className="btn btn-primary"
            disabled={isSubmitting}
            style={{
              opacity: isSubmitting ? 0.6 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? '⏳ Processing...' : item ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyFormModal;
```

## Files That Need Updates

### Pages
- [x] `/pages/AddSales.js` - ✅ Already updated
- [ ] `/pages/Login.js`
- [ ] `/pages/SuperAdminDashboard.js`

### Admin Components (All *Tab.js files)
- [ ] `/components/admin/UsersTab.js`
- [ ] `/components/admin/ProductsTab.js`
- [ ] `/components/admin/CreditHoldersTab.js`
- [ ] `/components/admin/DistributorsTab.js`
- [ ] `/components/admin/OrdersTab.js`
- [ ] `/components/admin/SalesReportTab.js`
- [ ] `/components/admin/InventoryTab.js`
- [ ] `/components/admin/BalanceTab.js`
- [ ] `/components/admin/BalanceTransfersTab.js`
- [ ] `/components/admin/ExpenseTab.js`
- [ ] `/components/admin/SchemesTab.js`
- [ ] `/components/admin/RecurringExpensesTab.js`
- [ ] `/components/admin/BalanceSheetTab.js`
- [ ] `/components/admin/BalanceLedgerTab.js`

### Modals
- [ ] `/components/admin/ProductMonthlyOrdersModal.js`

## Testing Checklist

For each form you update, test:

1. **Submit Flow**
   - [ ] Click submit button
   - [ ] See loading state ("Processing...")
   - [ ] Button becomes disabled
   - [ ] Try clicking back button (should show alert)
   - [ ] Try refreshing page (should show browser confirmation)
   - [ ] See success alert when done
   - [ ] Navigation or data refresh happens

2. **Error Handling**
   - [ ] Trigger an API error
   - [ ] See error alert with message
   - [ ] Loading state clears
   - [ ] Can try submitting again

3. **Multiple Submissions**
   - [ ] Click submit
   - [ ] Try clicking submit again immediately
   - [ ] Should see "operation in progress" warning

4. **Cancel/Navigation**
   - [ ] Click cancel when NOT submitting → should work
   - [ ] Click cancel when submitting → should be disabled

## Best Practices

1. **Always validate** before calling `handleSubmit()`
2. **Use bilingual messages** (English and Hindi)
3. **Show specific error messages** from API responses
4. **Disable all buttons** during submission
5. **Use appropriate emoji** for message types:
   - ✅ Success
   - ❌ Error
   - ⚠️ Warning
   - ℹ️ Info
   - ⏳ Processing

## Common Patterns

### Delete Confirmation
```javascript
const handleDelete = async () => {
  const confirmed = window.confirm(
    'Are you sure you want to delete this item?\n\nक्या आप सुनिश्चित हैं कि आप इस आइटम को हटाना चाहते हैं?'
  );

  if (!confirmed) return;

  await handleSubmit(async () => {
    await api.delete(`/endpoint/${itemId}`);
  }, {
    successMessage: '✅ Deleted successfully!\n\nसफलतापूर्वक हटाया गया!',
    onSuccess: () => {
      fetchData(); // Refresh list
    }
  });
};
```

### Form with Validation
```javascript
const handleFormSubmit = async () => {
  // Validate first
  if (!name) {
    showWarning('⚠️ Name is required!\n\nनाम आवश्यक है!');
    return;
  }

  // Then submit
  await handleSubmit(async () => {
    await api.post('/endpoint', { name, amount });
  }, {
    successMessage: '✅ Saved!\n\nसहेजा गया!',
    onSuccess: () => onClose()
  });
};
```

## Migration Priority

**High Priority** (User-facing submission forms):
1. AddSales.js ✅
2. Login.js
3. OrdersTab.js
4. SalesReportTab.js

**Medium Priority** (Admin management):
5. All other *Tab.js files

**Low Priority** (View-only or rare use):
6. Modals and minor forms
