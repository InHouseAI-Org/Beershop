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
    const { distributorId, orderData, tax, misc, discount, scheme, paymentOutstandingDate, orderDate, remarks, billNumber } = req.body;

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
      billNumber: billNumber || null,
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

    // Note: Distributor outstanding is automatically updated by database trigger
    // The trigger recalculates outstanding based on all orders and payments

    res.status(201).json(newOrder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { distributorId, orderData, tax, misc, discount, scheme, paymentOutstandingDate, orderDate, remarks, billNumber } = req.body;

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

    // Note: Distributor outstanding is automatically updated by database trigger
    // The trigger recalculates outstanding based on all orders and payments

    // Build updates object - only allow editing specific fields
    const updates = {};
    if (tax !== undefined) updates.tax = tax;
    if (misc !== undefined) updates.misc = misc;
    if (discount !== undefined) updates.discount = discount;
    if (scheme !== undefined) updates.scheme = scheme;
    if (paymentOutstandingDate !== undefined) updates.paymentOutstandingDate = paymentOutstandingDate || null;
    if (remarks !== undefined) updates.remarks = remarks;
    if (billNumber !== undefined) updates.billNumber = billNumber || null;

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
