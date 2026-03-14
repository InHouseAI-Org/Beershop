const db = require('../models/data');

const getAllDistributors = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const distributors = await db.getDistributorsByOrganisationId(organisationId);
    res.json(distributors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDistributor = async (req, res) => {
  try {
    const { id } = req.params;
    const distributor = await db.getDistributorById(id);

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Check if distributor belongs to user's organisation
    if (distributor.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(distributor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createDistributor = async (req, res) => {
  try {
    const { name, amountOutstanding } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Please provide name' });
    }

    const organisationId = req.user.organisationId;

    // Check for duplicate distributor name in same organization
    const existingDistributors = await db.getDistributorsByOrganisationId(organisationId);
    const duplicate = existingDistributors.find(
      d => d.name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (duplicate) {
      return res.status(409).json({
        error: 'A distributor with this name already exists in your organization | इस नाम का वितरक पहले से मौजूद है'
      });
    }

    const newDistributor = await db.createDistributor({
      organisationId,
      name,
      amountOutstanding: amountOutstanding || 0
    });

    res.status(201).json(newDistributor);
  } catch (error) {
    console.error(error);
    // Check for database unique constraint violation
    if (error.code === '23505' && error.constraint === 'unique_distributor_name_per_org') {
      return res.status(409).json({
        error: 'A distributor with this name already exists in your organization | इस नाम का वितरक पहले से मौजूद है'
      });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const updateDistributor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const distributor = await db.getDistributorById(id);

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Check if distributor belongs to user's organisation
    if (distributor.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for duplicate name if name is being updated
    if (name !== undefined && name.toLowerCase().trim() !== distributor.name.toLowerCase().trim()) {
      const existingDistributors = await db.getDistributorsByOrganisationId(req.user.organisationId);
      const duplicate = existingDistributors.find(
        d => d.id !== id && d.name.toLowerCase().trim() === name.toLowerCase().trim()
      );

      if (duplicate) {
        return res.status(409).json({
          error: 'A distributor with this name already exists in your organization | इस नाम का वितरक पहले से मौजूद है'
        });
      }
    }

    // Only allow updating name - amountOutstanding is automatically managed
    const updates = {};
    if (name !== undefined) updates.name = name;

    const updatedDistributor = await db.updateDistributor(id, updates);
    res.json(updatedDistributor);
  } catch (error) {
    console.error(error);
    // Check for database unique constraint violation
    if (error.code === '23505' && error.constraint === 'unique_distributor_name_per_org') {
      return res.status(409).json({
        error: 'A distributor with this name already exists in your organization | इस नाम का वितरक पहले से मौजूद है'
      });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteDistributor = async (req, res) => {
  try {
    const { id } = req.params;

    const distributor = await db.getDistributorById(id);

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Check if distributor belongs to user's organisation
    if (distributor.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.deleteDistributor(id);
    res.json({ message: 'Distributor deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const payDistributor = async (req, res) => {
  try {
    const { distributorId, amountPaid, paidFrom, paymentDate } = req.body;

    if (!distributorId || !amountPaid || !paidFrom) {
      return res.status(400).json({ error: 'Distributor ID, amount paid, and payment source are required' });
    }

    // Validate paidFrom enum
    const validPaidFrom = ['cash_balance', 'bank_balance', 'gala_balance'];
    if (!validPaidFrom.includes(paidFrom)) {
      return res.status(400).json({
        error: 'paidFrom must be one of: cash_balance, bank_balance, gala_balance'
      });
    }

    const amount = parseFloat(amountPaid);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount paid must be greater than 0' });
    }

    const distributor = await db.getDistributorById(distributorId);

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Check if distributor belongs to user's organisation
    if (distributor.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentOutstanding = parseFloat(distributor.amount_outstanding || 0);

    if (amount > currentOutstanding) {
      return res.status(400).json({
        error: `Amount paid (₹${amount.toFixed(2)}) cannot exceed outstanding (₹${currentOutstanding.toFixed(2)})`
      });
    }

    // Get current organisation balances to check if sufficient funds are available
    const orgBalances = await db.getOrganisationBalances(req.user.organisationId);
    if (!orgBalances) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Check if sufficient balance is available
    let currentBalance = 0;
    let balanceName = '';
    if (paidFrom === 'cash_balance') {
      currentBalance = parseFloat(orgBalances.cash_balance || 0);
      balanceName = 'Cash Balance';
    } else if (paidFrom === 'bank_balance') {
      currentBalance = parseFloat(orgBalances.bank_balance || 0);
      balanceName = 'Bank Balance';
    } else if (paidFrom === 'gala_balance') {
      currentBalance = parseFloat(orgBalances.gala_balance || 0);
      balanceName = 'Gala Balance';
    }

    if (amount > currentBalance) {
      return res.status(400).json({
        error: `Insufficient ${balanceName}. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${amount.toFixed(2)}`
      });
    }

    // IMPORTANT: Use NEW distributor_payments table, not old payment_history
    // The database trigger will automatically update distributor.amount_outstanding
    const pool = require('../config/database');
    const insertQuery = `
      INSERT INTO distributor_payments (
        organisation_id, distributor_id, payment_type, amount, payment_from, created_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    await pool.query(insertQuery, [
      req.user.organisationId,
      distributorId,
      'advance', // Treat as advance since no bill number specified in old API
      amount,
      paidFrom,
      req.user.id,
      'Migrated from old payment system'
    ]);

    // Deduct payment amount from the selected balance
    const balanceUpdate = {};
    if (paidFrom === 'cash_balance') {
      balanceUpdate.cashBalance = -amount;
    } else if (paidFrom === 'bank_balance') {
      balanceUpdate.bankBalance = -amount;
    } else if (paidFrom === 'gala_balance') {
      balanceUpdate.galaBalance = -amount;
    }
    await db.incrementOrganisationBalances(req.user.organisationId, balanceUpdate);

    // Trigger will auto-update distributor.amount_outstanding
    // Fetch updated distributor to get new outstanding
    const updatedDistributor = await db.getDistributorById(distributorId);
    const newOutstanding = parseFloat(updatedDistributor.amount_outstanding || 0);

    res.json({
      message: 'Payment recorded successfully',
      distributor: updatedDistributor,
      amountPaid: amount,
      previousOutstanding: currentOutstanding,
      newOutstanding: newOutstanding,
      paidFrom: paidFrom,
      newBalance: currentBalance - amount
    });
  } catch (error) {
    console.error('Error recording distributor payment:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDistributorPaymentHistory = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const history = await db.getDistributorPaymentHistoryByOrganisation(organisationId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching distributor payment history:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getDistributorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const distributor = await db.getDistributorById(id);

    if (!distributor) {
      return res.status(404).json({ error: 'Distributor not found' });
    }

    // Check if distributor belongs to user's organisation
    if (distributor.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await db.getDistributorPaymentHistoryByDistributor(id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching distributor history:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllDistributors, getDistributor, createDistributor, updateDistributor, deleteDistributor, payDistributor, getDistributorPaymentHistory, getDistributorHistory };
