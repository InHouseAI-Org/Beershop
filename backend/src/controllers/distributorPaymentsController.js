const pool = require('../config/database');
const db = require('../models/data');

/**
 * Get distributor ledger (orders + payments)
 */
const getDistributorLedger = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // distributor ID
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Verify distributor belongs to organization
    const distributor = await db.getDistributorById(id);
    if (!distributor || distributor.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    const query = `
      SELECT * FROM distributor_ledger
      WHERE distributor_id = $1 AND organisation_id = $2
      ORDER BY transaction_date DESC, created_at DESC
    `;

    const result = await client.query(query, [id, organisationId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching distributor ledger:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get unpaid bills for a distributor
 */
const getUnpaidBills = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // distributor ID
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Verify distributor belongs to organization
    const distributor = await db.getDistributorById(id);
    if (!distributor || distributor.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Get all orders with bill numbers
    const ordersQuery = `
      SELECT
        o.id,
        o.order_date,
        o.bill_number,
        (
          SELECT COALESCE(SUM((item->>'total')::DECIMAL), 0)
          FROM jsonb_array_elements(o.order_data) as item
        ) + COALESCE(o.tax, 0) + COALESCE(o.misc, 0) - COALESCE(o.discount, 0) - COALESCE(o.scheme, 0) as total_amount,
        COALESCE(
          (SELECT SUM(amount) FROM distributor_payments WHERE order_id = o.id),
          0
        ) as paid_amount
      FROM orders o
      WHERE o.distributor_id = $1 AND o.organisation_id = $2
      ORDER BY o.order_date DESC
    `;

    const result = await client.query(ordersQuery, [id, organisationId]);

    // Calculate remaining amount for each order
    const bills = result.rows.map(row => ({
      ...row,
      remaining_amount: parseFloat(row.total_amount) - parseFloat(row.paid_amount),
      is_fully_paid: parseFloat(row.total_amount) - parseFloat(row.paid_amount) <= 0
    }));

    res.json(bills);
  } catch (error) {
    console.error('Error fetching unpaid bills:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Make payment towards a bill or advance
 */
const makePayment = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { distributorId, paymentType, amount, paymentFrom, billNumber, orderId, notes } = req.body;
    const organisationId = req.user.organisationId;
    const createdBy = req.user.id;

    // Validate required fields
    if (!distributorId || !paymentType || !amount || !paymentFrom) {
      return res.status(400).json({
        error: 'Distributor ID, payment type, amount, and payment source are required'
      });
    }

    // Validate payment type
    if (!['order_payment', 'advance'].includes(paymentType)) {
      return res.status(400).json({
        error: 'Payment type must be either "order_payment" or "advance"'
      });
    }

    // Validate payment source
    if (!['cash_balance', 'bank_balance', 'gala_balance'].includes(paymentFrom)) {
      return res.status(400).json({
        error: 'Payment source must be cash_balance, bank_balance, or gala_balance'
      });
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Verify distributor belongs to organization
    const distributor = await db.getDistributorById(distributorId);
    if (!distributor || distributor.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Check if sufficient balance available
    const orgBalances = await db.getOrganisationBalances(organisationId);
    let currentBalance = parseFloat(orgBalances[paymentFrom.replace('_balance', '_balance')] || 0);

    if (paymentAmount > currentBalance) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${paymentAmount.toFixed(2)}`
      });
    }

    // Insert payment record
    const insertQuery = `
      INSERT INTO distributor_payments (
        organisation_id, distributor_id, order_id, payment_type,
        amount, payment_from, bill_number, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      organisationId,
      distributorId,
      orderId || null,
      paymentType,
      paymentAmount,
      paymentFrom,
      billNumber || null,
      notes || null,
      createdBy
    ];

    const result = await client.query(insertQuery, values);

    // Deduct from organization balance
    const balanceUpdate = {};
    balanceUpdate[paymentFrom.replace('_balance', 'Balance')] = -paymentAmount;
    await db.incrementOrganisationBalances(organisationId, balanceUpdate);

    // The trigger will automatically update distributor.amount_outstanding

    // Get updated distributor
    const updatedDistributor = await db.getDistributorById(distributorId);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: result.rows[0],
      distributor: updatedDistributor,
      newBalance: currentBalance - paymentAmount
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error making payment:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

/**
 * Get all payments for a distributor
 */
const getPaymentHistory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params; // distributor ID
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    // Verify distributor belongs to organization
    const distributor = await db.getDistributorById(id);
    if (!distributor || distributor.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    const query = `
      SELECT
        dp.*,
        o.order_date,
        a.username as created_by_name
      FROM distributor_payments dp
      LEFT JOIN orders o ON dp.order_id = o.id
      LEFT JOIN admins a ON dp.created_by = a.id
      WHERE dp.distributor_id = $1 AND dp.organisation_id = $2
      ORDER BY dp.payment_date DESC, dp.created_at DESC
    `;

    const result = await client.query(query, [id, organisationId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

module.exports = {
  getDistributorLedger,
  getUnpaidBills,
  makePayment,
  getPaymentHistory
};
