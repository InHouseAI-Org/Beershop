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

    const newDistributor = await db.createDistributor({
      organisationId,
      name,
      amountOutstanding: amountOutstanding || 0
    });

    res.status(201).json(newDistributor);
  } catch (error) {
    console.error(error);
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

    // Only allow updating name - amountOutstanding is automatically managed
    const updates = {};
    if (name !== undefined) updates.name = name;

    const updatedDistributor = await db.updateDistributor(id, updates);
    res.json(updatedDistributor);
  } catch (error) {
    console.error(error);
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
    const { distributorId, amountPaid } = req.body;

    if (!distributorId || !amountPaid) {
      return res.status(400).json({ error: 'Distributor ID and amount paid are required' });
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

    // Calculate new outstanding amount
    const newOutstanding = currentOutstanding - amount;

    // Update distributor with new outstanding amount
    const updatedDistributor = await db.updateDistributor(distributorId, {
      amountOutstanding: newOutstanding
    });

    // Save transaction history
    await db.createDistributorPaymentHistory({
      organisationId: req.user.organisationId,
      distributorId: distributorId,
      amountPaid: amount,
      previousOutstanding: currentOutstanding,
      newOutstanding: newOutstanding,
      paidBy: req.user.id,
      notes: null
    });

    res.json({
      message: 'Payment recorded successfully',
      distributor: updatedDistributor,
      amountPaid: amount,
      previousOutstanding: currentOutstanding,
      newOutstanding: newOutstanding
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
