const db = require('../models/data');

const getAllOrders = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const orders = await db.getOrdersByOrganisationId(organisationId);
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await db.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order belongs to user's organisation
    if (order.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createOrder = async (req, res) => {
  try {
    const { distributorId, orderData, tax, misc, discount, scheme, paymentOutstandingDate, orderDate, remarks } = req.body;

    if (!distributorId) {
      return res.status(400).json({ error: 'Please provide distributor ID' });
    }

    const organisationId = req.user.organisationId;

    // Use the date provided from frontend, or default to today if not provided
    let orderDateString = orderDate;
    if (!orderDateString) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      orderDateString = `${year}-${month}-${day}`;
    }

    console.log(`Creating order with date: ${orderDateString}`);

    const newOrder = await db.createOrder({
      organisationId,
      distributorId,
      orderDate: orderDateString,
      orderData,
      tax: tax || 0,
      misc: misc || 0,
      discount: discount || 0,
      scheme: scheme || 0,
      paymentOutstandingDate: paymentOutstandingDate || null,
      remarks: remarks || ''
    });

    // Update inventory: inventory_new = inventory_old + order quantity
    // Also update average buy price for each product
    console.log('Updating inventory and average buy price after order...');
    if (Array.isArray(orderData) && orderData.length > 0) {
      for (const orderItem of orderData) {
        if (orderItem.product_id && orderItem.qty) {
          const orderQty = parseFloat(orderItem.qty);
          const orderTotal = parseFloat(orderItem.total || 0);
          const buyPricePerUnit = orderQty > 0 ? orderTotal / orderQty : 0;

          await db.incrementInventory(organisationId, orderItem.product_id, orderQty);
          console.log(`Increased inventory for product ${orderItem.product_id} by ${orderQty}`);

          // Update average buy price
          await db.updateProductAverageBuyPrice(orderItem.product_id, buyPricePerUnit, orderQty);
          console.log(`Updated average buy price for product ${orderItem.product_id} with new price ${buyPricePerUnit}`);
        }
      }
    }

    // Calculate total order amount and add to distributor outstanding
    // Total = order value + tax + misc - scheme - discount
    let totalAmount = 0;

    // Sum up all product costs from orderData
    if (Array.isArray(orderData) && orderData.length > 0) {
      orderData.forEach(item => {
        if (item.total) {
          totalAmount += parseFloat(item.total);
        }
      });
    }

    // Add tax and misc, subtract scheme and discount
    totalAmount += parseFloat(tax || 0);
    totalAmount += parseFloat(misc || 0);
    totalAmount -= parseFloat(scheme || 0);
    totalAmount -= parseFloat(discount || 0);

    console.log(`Adding ₹${totalAmount} to distributor ${distributorId} outstanding...`);
    await db.incrementDistributorOutstanding(distributorId, totalAmount);

    res.status(201).json(newOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId, orderData, tax, misc, discount, scheme, paymentOutstandingDate, orderDate, remarks } = req.body;

    const order = await db.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order belongs to user's organisation
    if (order.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prevent editing of distributor and order items
    if (distributorId !== undefined && distributorId !== order.distributor_id) {
      return res.status(400).json({ error: 'Distributor cannot be changed when editing an order' });
    }

    if (orderData !== undefined) {
      return res.status(400).json({ error: 'Order items cannot be changed when editing an order' });
    }

    // Update distributor outstanding if order total has changed
    // Total = order value + tax + misc - scheme - discount
    if (tax !== undefined || misc !== undefined || discount !== undefined || scheme !== undefined) {
      const oldOrderData = order.order_data || [];
      const oldTax = parseFloat(order.tax || 0);
      const oldMisc = parseFloat(order.misc || 0);
      const oldDiscount = parseFloat(order.discount || 0);
      const oldScheme = parseFloat(order.scheme || 0);

      // Calculate old total
      let oldTotal = 0;
      oldOrderData.forEach(item => {
        if (item.total) {
          oldTotal += parseFloat(item.total);
        }
      });
      oldTotal += oldTax + oldMisc - oldScheme - oldDiscount;

      // Calculate new total
      let newTotal = 0;
      oldOrderData.forEach(item => {
        if (item.total) {
          newTotal += parseFloat(item.total);
        }
      });
      newTotal += parseFloat(tax !== undefined ? (tax || 0) : oldTax);
      newTotal += parseFloat(misc !== undefined ? (misc || 0) : oldMisc);
      newTotal -= parseFloat(discount !== undefined ? (discount || 0) : oldDiscount);
      newTotal -= parseFloat(scheme !== undefined ? (scheme || 0) : oldScheme);

      // Calculate the difference
      const totalDifference = newTotal - oldTotal;

      if (totalDifference !== 0) {
        console.log(`Adjusting distributor ${order.distributor_id} outstanding by ₹${totalDifference.toFixed(2)}`);
        await db.incrementDistributorOutstanding(order.distributor_id, totalDifference);
      }
    }

    // Build updates object - only allow editing specific fields
    const updates = {};
    if (tax !== undefined) updates.tax = tax;
    if (misc !== undefined) updates.misc = misc;
    if (discount !== undefined) updates.discount = discount;
    if (scheme !== undefined) updates.scheme = scheme;
    if (paymentOutstandingDate !== undefined) updates.paymentOutstandingDate = paymentOutstandingDate || null;
    if (remarks !== undefined) updates.remarks = remarks;

    const updatedOrder = await db.updateOrder(id, updates);
    res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await db.getOrderById(id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order belongs to user's organisation
    if (order.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.deleteOrder(id);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllOrders, getOrder, createOrder, updateOrder, deleteOrder };
