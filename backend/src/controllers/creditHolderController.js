const db = require('../models/data');

const getAllCreditHolders = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const creditHolders = await db.getCreditHoldersByOrganisationId(organisationId);
    res.json(creditHolders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCreditHolder = async (req, res) => {
  try {
    const { id } = req.params;
    const creditHolder = await db.getCreditHolderById(id);

    if (!creditHolder) {
      return res.status(404).json({ error: 'Credit holder not found' });
    }

    // Check if credit holder belongs to user's organisation
    if (creditHolder.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(creditHolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createCreditHolder = async (req, res) => {
  try {
    const { name, address, phone, amountPayable } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Please provide name' });
    }

    const organisationId = req.user.organisationId;

    const newCreditHolder = await db.createCreditHolder({
      organisationId,
      name,
      address,
      phone,
      amountPayable: amountPayable || 0
    });

    res.status(201).json(newCreditHolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateCreditHolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    const creditHolder = await db.getCreditHolderById(id);

    if (!creditHolder) {
      return res.status(404).json({ error: 'Credit holder not found' });
    }

    // Check if credit holder belongs to user's organisation
    if (creditHolder.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow updating name, address, phone - amountPayable is automatically managed
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;

    const updatedCreditHolder = await db.updateCreditHolder(id, updates);
    res.json(updatedCreditHolder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteCreditHolder = async (req, res) => {
  try {
    const { id } = req.params;

    const creditHolder = await db.getCreditHolderById(id);

    if (!creditHolder) {
      return res.status(404).json({ error: 'Credit holder not found' });
    }

    // Check if credit holder belongs to user's organisation
    if (creditHolder.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.deleteCreditHolder(id);
    res.json({ message: 'Credit holder deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const collectCredit = async (req, res) => {
  try {
    const { creditHolderId, amountCollected } = req.body;

    if (!creditHolderId || !amountCollected) {
      return res.status(400).json({ error: 'Credit holder ID and amount collected are required' });
    }

    const amount = parseFloat(amountCollected);
    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount collected must be greater than 0' });
    }

    const creditHolder = await db.getCreditHolderById(creditHolderId);

    if (!creditHolder) {
      return res.status(404).json({ error: 'Credit holder not found' });
    }

    // Check if credit holder belongs to user's organisation
    if (creditHolder.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const currentPayable = parseFloat(creditHolder.amount_payable || 0);

    if (amount > currentPayable) {
      return res.status(400).json({
        error: `Amount collected (₹${amount.toFixed(2)}) cannot exceed outstanding payable (₹${currentPayable.toFixed(2)})`
      });
    }

    // Calculate new amount payable
    const newPayable = currentPayable - amount;

    // Update credit holder with new amount payable
    const updatedCreditHolder = await db.updateCreditHolder(creditHolderId, {
      amountPayable: newPayable
    });

    // Save transaction history
    await db.createCreditCollectionHistory({
      organisationId: req.user.organisationId,
      creditHolderId: creditHolderId,
      amountCollected: amount,
      previousOutstanding: currentPayable,
      newOutstanding: newPayable,
      collectedBy: req.user.id,
      notes: null,
      transactionType: 'collected',
      saleId: null
    });

    res.json({
      message: 'Credit collected successfully',
      creditHolder: updatedCreditHolder,
      amountCollected: amount,
      previousPayable: currentPayable,
      newPayable: newPayable
    });
  } catch (error) {
    console.error('Error collecting credit:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCreditCollectionHistory = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const history = await db.getCreditCollectionHistoryByOrganisation(organisationId);
    res.json(history);
  } catch (error) {
    console.error('Error fetching credit collection history:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getCreditHolderHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const creditHolder = await db.getCreditHolderById(id);

    if (!creditHolder) {
      return res.status(404).json({ error: 'Credit holder not found' });
    }

    // Check if credit holder belongs to user's organisation
    if (creditHolder.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await db.getCreditCollectionHistoryByCreditHolder(id);
    res.json(history);
  } catch (error) {
    console.error('Error fetching credit holder history:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllCreditHolders, getCreditHolder, createCreditHolder, updateCreditHolder, deleteCreditHolder, collectCredit, getCreditCollectionHistory, getCreditHolderHistory };
