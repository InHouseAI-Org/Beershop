const pool = require('../config/database');
const db = require('../models/data');
const { createTimer } = require('../utils/timing');

const getAllOrders = async (req, res) => {
  const timer = createTimer('GET /api/orders');
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const orders = await timer.measureDb(() => db.getOrdersByOrganisationId(organisationId));
    timer.finish();
    res.json(orders);
  } catch (error) {
    timer.finish();
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
    const { distributorId, orderData, tax, misc, discount, scheme, tcs, tds, paymentOutstandingDate, orderDate, remarks, billNumber } = req.body;

    if (!distributorId) {
      return res.status(400).json({ error: 'Please provide distributor ID' });
    }

    if (!billNumber || billNumber.trim() === '') {
      return res.status(400).json({ error: 'Bill number is required' });
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
      billNumber: billNumber.trim(),
      orderData,
      tax: tax || 0,
      misc: misc || 0,
      discount: discount || 0,
      scheme: scheme || 0,
      tcs: tcs || 0,
      tds: tds || 0,
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { distributorId, orderData, tax, misc, discount, scheme, tcs, tds, paymentOutstandingDate, orderDate, remarks, billNumber } = req.body;

    const order = await db.getOrderById(id);

    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order belongs to user's organisation
    if (order.organisation_id !== req.user.organisationId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate bill number if provided
    if (billNumber !== undefined) {
      if (!billNumber || billNumber.trim() === '') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Bill number is required' });
      }
    }

    // If order items are being changed, we need to:
    // 1. Revert old inventory changes (subtract old quantities that were added)
    // 2. Apply new inventory changes (add new quantities)
    if (orderData !== undefined && Array.isArray(orderData)) {
      console.log('Order items are being updated - adjusting inventory...');

      // Revert old inventory changes (subtract the old quantities that were added)
      if (order.order_data && Array.isArray(order.order_data)) {
        for (const oldItem of order.order_data) {
          if (oldItem.product_id && oldItem.qty) {
            const qty = parseFloat(oldItem.qty);
            await db.decrementInventory(req.user.organisationId, oldItem.product_id, qty);
            console.log(`Reverted inventory for product ${oldItem.product_id}: -${qty}`);
          }
        }
      }

      // Apply new inventory changes (add new quantities)
      for (const newItem of orderData) {
        if (newItem.product_id && newItem.qty) {
          const qty = parseFloat(newItem.qty);
          const orderTotal = parseFloat(newItem.total || 0);
          const buyPricePerUnit = qty > 0 ? orderTotal / qty : 0;

          await db.incrementInventory(req.user.organisationId, newItem.product_id, qty);
          console.log(`Applied new inventory for product ${newItem.product_id}: +${qty}`);

          // Update average buy price
          await db.updateProductAverageBuyPrice(newItem.product_id, buyPricePerUnit, qty);
          console.log(`Updated average buy price for product ${newItem.product_id} with new price ${buyPricePerUnit}`);
        }
      }
    }

    // Build updates object
    const updates = {};
    if (orderData !== undefined) updates.orderData = orderData;
    if (tax !== undefined) updates.tax = tax;
    if (misc !== undefined) updates.misc = misc;
    if (discount !== undefined) updates.discount = discount;
    if (scheme !== undefined) updates.scheme = scheme;
    if (tcs !== undefined) updates.tcs = tcs;
    if (tds !== undefined) updates.tds = tds;
    if (paymentOutstandingDate !== undefined) updates.paymentOutstandingDate = paymentOutstandingDate || null;
    if (orderDate !== undefined) updates.orderDate = orderDate;
    if (remarks !== undefined) updates.remarks = remarks;
    if (billNumber !== undefined) updates.billNumber = billNumber.trim();
    if (distributorId !== undefined) updates.distributorId = distributorId;

    const updatedOrder = await db.updateOrder(id, updates);

    await client.query('COMMIT');

    console.log('Order updated successfully with inventory adjustments');
    res.json(updatedOrder);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

const deleteOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const organisationId = req.user.organisationId;

    const order = await db.getOrderById(id);

    if (!order) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if order belongs to user's organisation
    if (order.organisation_id !== organisationId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log(`[Delete Order] Deleting order ID: ${id}, Bill: ${order.bill_number}`);

    // Check if any payments are associated with this order
    const paymentsQuery = 'SELECT * FROM distributor_payments WHERE order_id = $1';
    const paymentsResult = await client.query(paymentsQuery, [id]);

    if (paymentsResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot delete order with associated payments. Please delete the payments first.'
      });
    }

    // Revert inventory changes (subtract the quantities that were added)
    if (order.order_data && Array.isArray(order.order_data)) {
      console.log('[Delete Order] Reverting inventory changes...');
      for (const orderItem of order.order_data) {
        if (orderItem.product_id && orderItem.qty) {
          const qty = parseFloat(orderItem.qty);
          await db.decrementInventory(organisationId, orderItem.product_id, qty);
          console.log(`[Delete Order] Reverted inventory for product ${orderItem.product_id}: -${qty}`);
        }
      }
    }

    // Delete the order (trigger will automatically update distributor.amount_outstanding)
    await db.deleteOrder(id);

    console.log('[Delete Order] Order deleted successfully');

    await client.query('COMMIT');

    res.json({
      message: 'Order deleted successfully',
      orderId: id
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = { getAllOrders, getOrder, createOrder, updateOrder, deleteOrder };
