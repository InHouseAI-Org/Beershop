const db = require('../models/data');

// Create or update balance for a sales entry
const createBalance = async (req, res) => {
  try {
    const { salesId, date, cashBalance, bankBalance, galaBalance } = req.body;
    const organisationId = req.user.organisationId;

    if (!salesId || date === undefined) {
      return res.status(400).json({ error: 'Please provide salesId and date' });
    }

    // Validate that sum of balances doesn't exceed total collection
    const sales = await db.getSaleById(salesId);
    if (!sales) {
      return res.status(404).json({ error: 'Sales record not found' });
    }

    const totalCollection = parseFloat(sales.cash_collected || 0) + parseFloat(sales.upi || 0);
    const creditGiven = sales.credit ?
      (Array.isArray(sales.credit) ? sales.credit.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0) : 0) : 0;

    const maxAllowed = totalCollection - creditGiven;
    const totalBalances = parseFloat(cashBalance || 0) + parseFloat(bankBalance || 0) + parseFloat(galaBalance || 0);

    if (totalBalances > maxAllowed) {
      return res.status(400).json({
        error: `Total balances (${totalBalances}) cannot exceed total collection minus credit (${maxAllowed})`
      });
    }

    const balance = await db.createBalance({
      organisationId,
      salesId,
      date,
      cashBalance,
      bankBalance,
      galaBalance
    });

    // Increment organisation balances
    await db.incrementOrganisationBalances(organisationId, {
      cashBalance: parseFloat(cashBalance || 0),
      bankBalance: parseFloat(bankBalance || 0),
      galaBalance: parseFloat(galaBalance || 0)
    });

    res.status(201).json(balance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all balances for an organisation
const getBalances = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const balances = await db.getBalancesByOrganisationId(organisationId);
    res.json(balances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get balance for a specific sales entry
const getBalanceBySalesId = async (req, res) => {
  try {
    const { salesId } = req.params;
    const balance = await db.getBalanceBySalesId(salesId);

    if (!balance) {
      return res.status(404).json({ error: 'Balance not found' });
    }

    res.json(balance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get organisation balance summary
const getOrganisationBalances = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const organisation = await db.getOrganisationBalances(organisationId);

    if (!organisation) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    res.json({
      cashBalance: parseFloat(organisation.cash_balance || 0),
      bankBalance: parseFloat(organisation.bank_balance || 0),
      galaBalance: parseFloat(organisation.gala_balance || 0)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update organisation master balances
const updateOrganisationBalances = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;
    const { cashBalance, bankBalance, galaBalance } = req.body;

    const updated = await db.updateOrganisationBalances(organisationId, {
      cashBalance,
      bankBalance,
      galaBalance
    });

    if (!updated) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createBalance,
  getBalances,
  getBalanceBySalesId,
  getOrganisationBalances,
  updateOrganisationBalances
};
