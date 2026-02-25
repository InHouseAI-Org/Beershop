const db = require('../models/data');

const getAllSales = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const sales = await db.getSalesByOrganisationId(organisationId);
    res.json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await db.getSaleById(id);

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check if sale belongs to user's organisation
    if (sale.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createSale = async (req, res) => {
  try {
    // Note: openingStock from frontend is ignored - we calculate it from inventory
    const {
      date, closingStock, sale, cashCollected, upi, miscellaneous, miscellaneousType,
      miscellaneousCash, miscellaneousUPI,
      galaBalanceToday, credit, creditTaken, dailyExpenses, remarks
    } = req.body;

    console.log('=== CREATE SALE REQUEST ===');
    console.log('Closing Stock:', closingStock);
    console.log('Sale:', sale);
    console.log('Credit:', credit);

    const organisationId = req.user.organisationId;
    const userId = req.user.role === 'user' ? req.user.id : req.body.userId;

    // Auto-fetch opening stock from inventory table
    console.log('Fetching inventory for opening stock...');
    const inventory = await db.getInventoryByOrganisationId(organisationId);

    // Check if there were any orders on this date
    const orders = await db.getOrdersByOrganisationId(organisationId);

    // Parse the sale date to compare with order dates
    let saleDate;
    if (date) {
      const parsedDate = new Date(date);
      const year = parsedDate.getFullYear();
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const day = String(parsedDate.getDate()).padStart(2, '0');
      saleDate = `${year}-${month}-${day}`;
    } else {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      saleDate = `${year}-${month}-${day}`;
    }

    // Find orders placed on the same date
    const ordersOnSameDate = orders.filter(order => {
      if (!order.order_date) return false;
      const orderDate = new Date(order.order_date);
      const year = orderDate.getFullYear();
      const month = String(orderDate.getMonth() + 1).padStart(2, '0');
      const day = String(orderDate.getDate()).padStart(2, '0');
      const orderDateStr = `${year}-${month}-${day}`;
      return orderDateStr === saleDate;
    });

    console.log(`Found ${ordersOnSameDate.length} orders on date ${saleDate}`);

    // Calculate opening stock: current inventory minus orders placed on same day
    const openingStock = inventory.map(item => {
      let openingQty = item.qty || 0;

      // Subtract quantities from orders placed on the same date
      ordersOnSameDate.forEach(order => {
        if (order.order_data && Array.isArray(order.order_data)) {
          order.order_data.forEach(orderItem => {
            if (orderItem.product_id === item.product_id) {
              openingQty -= parseFloat(orderItem.qty || 0);
            }
          });
        }
      });

      return {
        product_id: item.product_id,
        opening_stock: openingQty
      };
    });

    console.log('Opening Stock (inventory - same day orders):', openingStock);

    // For regular users, always check for duplicates
    if (req.user.role === 'user') {
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const existingSales = await db.getSalesByOrganisationId(organisationId);

      // Parse input date and normalize to YYYY-MM-DD format in local time
      let inputDate;
      if (date) {
        const parsedDate = new Date(date);
        // Convert to local date string
        const year = parsedDate.getFullYear();
        const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const day = String(parsedDate.getDate()).padStart(2, '0');
        inputDate = `${year}-${month}-${day}`;
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        inputDate = `${year}-${month}-${day}`;
      }

      const duplicateSale = existingSales.find(s => {
        if (!s.date || s.user_id !== userId) return false;

        // Parse database date to local date string
        const dbDate = new Date(s.date);
        const year = dbDate.getFullYear();
        const month = String(dbDate.getMonth() + 1).padStart(2, '0');
        const day = String(dbDate.getDate()).padStart(2, '0');
        const saleDate = `${year}-${month}-${day}`;

        return saleDate === inputDate;
      });

      if (duplicateSale) {
        console.log(`Duplicate sale detected for user ${userId} on date ${inputDate}`);
        return res.status(400).json({
          error: 'Sale already exists for this date. You can only submit one sale report per day. | इस तारीख के लिए बिक्री पहले से मौजूद है। आप प्रति दिन केवल एक बिक्री रिपोर्ट सबमिट कर सकते हैं।'
        });
      }
    }

    // Set status based on user role: 'pending' for users, 'approved' for admins
    const status = req.user.role === 'user' ? 'pending' : 'approved';

    const newSale = await db.createSale({
      organisationId,
      userId,
      date,
      openingStock,
      closingStock,
      sale,
      cashCollected: cashCollected || 0,
      upi: upi || 0,
      miscellaneous: miscellaneous || 0,
      miscellaneousType: miscellaneousType || 'cash',
      miscellaneousCash: miscellaneousCash || 0,
      miscellaneousUPI: miscellaneousUPI || 0,
      galaBalanceToday: galaBalanceToday || 0,
      credit,
      remarks,
      status
    });

    // Only update inventory and credit for approved sales (admin-created)
    // Pending sales will be processed after admin approval
    if (status === 'approved') {
      // Update inventory: inventory_new = inventory_old - sale
      console.log('Updating inventory after sale...');
    if (Array.isArray(sale) && sale.length > 0) {
      for (const saleItem of sale) {
        if (saleItem.product_id && saleItem.sale) {
          const saleQty = parseFloat(saleItem.sale);
          await db.decrementInventory(organisationId, saleItem.product_id, saleQty);
          console.log(`Decreased inventory for product ${saleItem.product_id} by ${saleQty}`);
        }
      }
    }

    // Update credit holder outstanding: add credit given to outstanding amount
    console.log('Updating credit holder outstanding amounts...');
    console.log('Credit array:', credit);
    console.log('Credit is array?', Array.isArray(credit));
    console.log('Credit length:', credit?.length);

    if (Array.isArray(credit) && credit.length > 0) {
      console.log('Processing credit entries...');
      for (const creditItem of credit) {
        console.log('Processing credit item:', creditItem);
        if (creditItem.credit_holder_id && creditItem.creditgiven) {
          const creditAmount = parseFloat(creditItem.creditgiven);
          console.log(`Processing credit: ${creditAmount} for holder ${creditItem.credit_holder_id}`);

          // Get current outstanding before incrementing
          const creditHolder = await db.getCreditHolderById(creditItem.credit_holder_id);
          const previousOutstanding = parseFloat(creditHolder.amount_payable || 0);
          console.log(`Previous outstanding: ${previousOutstanding}`);

          // Increment outstanding
          await db.incrementCreditHolderOutstanding(creditItem.credit_holder_id, creditAmount);
          const newOutstanding = previousOutstanding + creditAmount;
          console.log(`Added ${creditAmount} to credit holder ${creditItem.credit_holder_id} outstanding`);
          console.log(`New outstanding: ${newOutstanding}`);

          // Record transaction history
          console.log('Creating credit collection history entry...');
          const historyEntry = await db.createCreditCollectionHistory({
            organisationId,
            creditHolderId: creditItem.credit_holder_id,
            amountCollected: creditAmount,
            previousOutstanding: previousOutstanding,
            newOutstanding: newOutstanding,
            collectedBy: req.user.id,
            notes: null,
            transactionType: 'given',
            saleId: newSale.id
          });
          console.log('Created history entry:', historyEntry);
        } else {
          console.log('Skipping credit item - missing credit_holder_id or creditgiven');
        }
      }
    } else {
      console.log('No credit to process (not array or empty)');
    }

    // Process credit taken (collected on shop)
    console.log('Processing credit taken entries...');
    if (Array.isArray(creditTaken) && creditTaken.length > 0) {
      for (const takenItem of creditTaken) {
        if (takenItem.creditHolderId && takenItem.amount && takenItem.collectedIn) {
          const takenAmount = parseFloat(takenItem.amount);
          console.log(`Processing credit taken: ${takenAmount} from holder ${takenItem.creditHolderId}`);

          // Get current outstanding before decrementing
          const creditHolder = await db.getCreditHolderById(takenItem.creditHolderId);
          const previousOutstanding = parseFloat(creditHolder.amount_payable || 0);

          // Decrement outstanding (collecting credit)
          await db.decrementCreditHolderOutstanding(takenItem.creditHolderId, takenAmount);
          const newOutstanding = Math.max(0, previousOutstanding - takenAmount);
          console.log(`Reduced ${takenAmount} from credit holder ${takenItem.creditHolderId} outstanding`);

          // Record transaction history with collection_type='collected_on_shop'
          await db.createCreditCollectionHistory({
            organisationId,
            creditHolderId: takenItem.creditHolderId,
            amountCollected: takenAmount,
            previousOutstanding: previousOutstanding,
            newOutstanding: newOutstanding,
            collectedBy: req.user.id,
            notes: 'Collected on shop during sales',
            transactionType: 'collected',
            saleId: newSale.id,
            collectedIn: takenItem.collectedIn, // 'cash_balance' or 'bank_balance'
            collectionType: 'collected_on_shop'
          });
          console.log(`Recorded credit taken in history as 'collected_on_shop'`);
        }
      }
    }

    // Save daily expenses
    console.log('Processing daily expenses...');
    if (Array.isArray(dailyExpenses) && dailyExpenses.length > 0) {
      for (const expense of dailyExpenses) {
        if (expense.name && expense.amount) {
          await db.createDailyExpense({
            organisationId,
            saleId: newSale.id,
            name: expense.name,
            description: expense.description || null,
            amount: parseFloat(expense.amount),
            expenseDate: date || new Date()
          });
          console.log(`Created expense: ${expense.name} - ₹${expense.amount}`);
        }
      }
    }
    } else {
      console.log('Sale created with pending status - waiting for admin approval');
    }

    res.status(201).json(newSale);
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, openingStock, closingStock, sale, cashCollected, upi, credit, remarks } = req.body;

    const existingSale = await db.getSaleById(id);

    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check if sale belongs to user's organisation
    if (existingSale.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Users can only update their own sales
    if (req.user.role === 'user' && existingSale.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Handle inventory adjustments if sale data changed
    if (sale !== undefined && Array.isArray(sale)) {
      const oldSale = existingSale.sale || [];
      console.log('Adjusting inventory for sale update...');

      // First, reverse the old sale (add back to inventory)
      for (const oldItem of oldSale) {
        if (oldItem.product_id && oldItem.sale) {
          const oldSaleQty = parseFloat(oldItem.sale);
          await db.incrementInventory(existingSale.organisation_id, oldItem.product_id, oldSaleQty);
          console.log(`Added back ${oldSaleQty} to inventory for product ${oldItem.product_id}`);
        }
      }

      // Then, apply the new sale (subtract from inventory)
      for (const newItem of sale) {
        if (newItem.product_id && newItem.sale) {
          const newSaleQty = parseFloat(newItem.sale);
          await db.decrementInventory(existingSale.organisation_id, newItem.product_id, newSaleQty);
          console.log(`Decreased inventory for product ${newItem.product_id} by ${newSaleQty}`);
        }
      }
    }

    // Handle credit holder adjustments if credit data changed
    if (credit !== undefined && Array.isArray(credit)) {
      const oldCredit = existingSale.credit || [];
      console.log('Adjusting credit holder amounts for sale update...');

      // First, reverse the old credit (subtract from credit holder outstanding)
      for (const oldItem of oldCredit) {
        if (oldItem.credit_holder_id && oldItem.creditgiven) {
          const oldCreditAmount = parseFloat(oldItem.creditgiven);
          await db.incrementCreditHolderOutstanding(oldItem.credit_holder_id, -oldCreditAmount);
          console.log(`Subtracted ${oldCreditAmount} from credit holder ${oldItem.credit_holder_id}`);
        }
      }

      // Then, apply the new credit (add to credit holder outstanding)
      for (const newItem of credit) {
        if (newItem.credit_holder_id && newItem.creditgiven) {
          const newCreditAmount = parseFloat(newItem.creditgiven);
          await db.incrementCreditHolderOutstanding(newItem.credit_holder_id, newCreditAmount);
          console.log(`Added ${newCreditAmount} to credit holder ${newItem.credit_holder_id}`);
        }
      }
    }

    const updates = {};
    if (date !== undefined) updates.date = date;
    if (openingStock !== undefined) updates.openingStock = openingStock;
    if (closingStock !== undefined) updates.closingStock = closingStock;
    if (sale !== undefined) updates.sale = sale;
    if (cashCollected !== undefined) updates.cashCollected = cashCollected;
    if (upi !== undefined) updates.upi = upi;
    if (credit !== undefined) updates.credit = credit;
    if (remarks !== undefined) updates.remarks = remarks;

    const updatedSale = await db.updateSale(id, updates);
    res.json(updatedSale);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const approveSale = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, openingStock, closingStock, sale, cashCollected, upi, credit, remarks } = req.body;

    console.log('=== APPROVE SALE REQUEST ===');
    console.log('Sale ID:', id);
    console.log('Updated data:', { date, cashCollected, upi, credit, remarks });

    const existingSale = await db.getSaleById(id);

    if (!existingSale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    // Check if sale belongs to user's organisation
    if (existingSale.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only admins can approve sales
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve sales' });
    }

    // Check if sale is already approved
    if (existingSale.status === 'approved') {
      return res.status(400).json({ error: 'Sale is already approved' });
    }

    const organisationId = req.user.organisationId;

    // If date is being changed, check for conflicts with other sales by the same user
    if (date !== undefined) {
      // Parse existing date
      const existingDate = new Date(existingSale.date);
      const existingYear = existingDate.getFullYear();
      const existingMonth = String(existingDate.getMonth() + 1).padStart(2, '0');
      const existingDay = String(existingDate.getDate()).padStart(2, '0');
      const existingDateStr = `${existingYear}-${existingMonth}-${existingDay}`;

      // Parse the new date
      const newDate = new Date(date);
      const newYear = newDate.getFullYear();
      const newMonth = String(newDate.getMonth() + 1).padStart(2, '0');
      const newDay = String(newDate.getDate()).padStart(2, '0');
      const newDateStr = `${newYear}-${newMonth}-${newDay}`;

      // Only check if date actually changed
      if (existingDateStr !== newDateStr) {
        const allSales = await db.getSalesByOrganisationId(organisationId);

        // Check if another sale exists for this user on the new date (excluding the current sale)
        const conflictingSale = allSales.find(s => {
          if (s.id === id) return false; // Exclude current sale
          if (s.user_id !== existingSale.user_id) return false; // Only check same user

          const dbDate = new Date(s.date);
          const dbYear = dbDate.getFullYear();
          const dbMonth = String(dbDate.getMonth() + 1).padStart(2, '0');
          const dbDay = String(dbDate.getDate()).padStart(2, '0');
          const dbDateStr = `${dbYear}-${dbMonth}-${dbDay}`;

          return dbDateStr === newDateStr;
        });

        if (conflictingSale) {
          return res.status(400).json({
            error: 'Cannot change date: Another sale already exists for this user on the selected date. | तारीख बदल नहीं सकते: इस उपयोगकर्ता के लिए चयनित तारीख पर पहले से बिक्री मौजूद है।'
          });
        }
      }
    }

    // Update the sale with admin's changes (if any) and set status to approved
    const updates = { status: 'approved' };
    if (date !== undefined) updates.date = date;
    if (openingStock !== undefined) updates.openingStock = openingStock;
    if (closingStock !== undefined) updates.closingStock = closingStock;
    if (sale !== undefined) updates.sale = sale;
    if (cashCollected !== undefined) updates.cashCollected = cashCollected;
    if (upi !== undefined) updates.upi = upi;
    if (credit !== undefined) updates.credit = credit;
    if (remarks !== undefined) updates.remarks = remarks;

    const updatedSale = await db.updateSale(id, updates);

    // Use the updated sale data for inventory and credit processing
    const finalSale = updates.sale || existingSale.sale;
    const finalCredit = updates.credit || existingSale.credit;

    // Update inventory: inventory_new = inventory_old - sale
    console.log('Updating inventory after approval...');
    if (Array.isArray(finalSale) && finalSale.length > 0) {
      for (const saleItem of finalSale) {
        if (saleItem.product_id && saleItem.sale) {
          const saleQty = parseFloat(saleItem.sale);
          await db.decrementInventory(organisationId, saleItem.product_id, saleQty);
          console.log(`Decreased inventory for product ${saleItem.product_id} by ${saleQty}`);
        }
      }
    }

    // Update credit holder outstanding: add credit given to outstanding amount
    console.log('Updating credit holder outstanding amounts...');
    if (Array.isArray(finalCredit) && finalCredit.length > 0) {
      for (const creditItem of finalCredit) {
        if (creditItem.credit_holder_id && creditItem.creditgiven) {
          const creditAmount = parseFloat(creditItem.creditgiven);

          // Get current outstanding before incrementing
          const creditHolder = await db.getCreditHolderById(creditItem.credit_holder_id);
          const previousOutstanding = parseFloat(creditHolder.amount_payable || 0);

          // Increment outstanding
          await db.incrementCreditHolderOutstanding(creditItem.credit_holder_id, creditAmount);
          const newOutstanding = previousOutstanding + creditAmount;
          console.log(`Added ${creditAmount} to credit holder ${creditItem.credit_holder_id} outstanding`);

          // Record transaction history
          await db.createCreditCollectionHistory({
            organisationId,
            creditHolderId: creditItem.credit_holder_id,
            amountCollected: creditAmount,
            previousOutstanding: previousOutstanding,
            newOutstanding: newOutstanding,
            collectedBy: req.user.id,
            notes: 'Approved from pending sale',
            transactionType: 'given',
            saleId: updatedSale.id
          });
        }
      }
    }

    res.json({ message: 'Sale approved successfully', sale: updatedSale });
  } catch (error) {
    console.error('Error approving sale:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteSale = async (req, res) => {
  // Sales deletion is disabled - sales cannot be deleted, only updated
  return res.status(403).json({
    error: 'Sales reports cannot be deleted. Please contact support if you need to make corrections.'
  });
};

module.exports = { getAllSales, getSale, createSale, updateSale, deleteSale, approveSale };
