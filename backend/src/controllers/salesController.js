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
    const { date, closingStock, sale, cashCollected, upi, credit, remarks } = req.body;

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

    const newSale = await db.createSale({
      organisationId,
      userId,
      date,
      openingStock,
      closingStock,
      sale,
      cashCollected: cashCollected || 0,
      upi: upi || 0,
      credit,
      remarks
    });

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

const deleteSale = async (req, res) => {
  // Sales deletion is disabled - sales cannot be deleted, only updated
  return res.status(403).json({
    error: 'Sales reports cannot be deleted. Please contact support if you need to make corrections.'
  });
};

module.exports = { getAllSales, getSale, createSale, updateSale, deleteSale };
