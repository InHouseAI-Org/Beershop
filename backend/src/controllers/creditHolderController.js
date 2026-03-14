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

    // Check for duplicate credit holder name in same organization
    const existingHolders = await db.getCreditHoldersByOrganisationId(organisationId);
    const duplicate = existingHolders.find(
      h => h.name.toLowerCase().trim() === name.toLowerCase().trim()
    );

    if (duplicate) {
      return res.status(409).json({
        error: 'A credit holder with this name already exists in your organization | इस नाम का क्रेडिट धारक पहले से मौजूद है'
      });
    }

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
    // Check for database unique constraint violation
    if (error.code === '23505' && error.constraint === 'unique_credit_holder_name_per_org') {
      return res.status(409).json({
        error: 'A credit holder with this name already exists in your organization | इस नाम का क्रेडिट धारक पहले से मौजूद है'
      });
    }
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

    // Check for duplicate name if name is being updated
    if (name !== undefined && name.toLowerCase().trim() !== creditHolder.name.toLowerCase().trim()) {
      const existingHolders = await db.getCreditHoldersByOrganisationId(req.user.organisationId);
      const duplicate = existingHolders.find(
        h => h.id !== id && h.name.toLowerCase().trim() === name.toLowerCase().trim()
      );

      if (duplicate) {
        return res.status(409).json({
          error: 'A credit holder with this name already exists in your organization | इस नाम का क्रेडिट धारक पहले से मौजूद है'
        });
      }
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
    // Check for database unique constraint violation
    if (error.code === '23505' && error.constraint === 'unique_credit_holder_name_per_org') {
      return res.status(409).json({
        error: 'A credit holder with this name already exists in your organization | इस नाम का क्रेडिट धारक पहले से मौजूद है'
      });
    }
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
    const { creditHolderId, amountCollected, collectedIn } = req.body;

    if (!creditHolderId || !amountCollected || !collectedIn) {
      return res.status(400).json({ error: 'Credit holder ID, amount collected, and collection account are required' });
    }

    // Validate collectedIn enum
    const validCollectedIn = ['cash_balance', 'bank_balance', 'gala_balance'];
    if (!validCollectedIn.includes(collectedIn)) {
      return res.status(400).json({
        error: 'collectedIn must be one of: cash_balance, bank_balance, gala_balance'
      });
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

    // Add collected amount to the selected balance
    const balanceUpdate = {};
    if (collectedIn === 'cash_balance') {
      balanceUpdate.cashBalance = amount;
    } else if (collectedIn === 'bank_balance') {
      balanceUpdate.bankBalance = amount;
    } else if (collectedIn === 'gala_balance') {
      balanceUpdate.galaBalance = amount;
    }
    await db.incrementOrganisationBalances(req.user.organisationId, balanceUpdate);

    // Get the updated balance for confirmation
    const orgBalances = await db.getOrganisationBalances(req.user.organisationId);
    let newBalance = 0;
    if (collectedIn === 'cash_balance') {
      newBalance = parseFloat(orgBalances.cash_balance || 0);
    } else if (collectedIn === 'bank_balance') {
      newBalance = parseFloat(orgBalances.bank_balance || 0);
    } else if (collectedIn === 'gala_balance') {
      newBalance = parseFloat(orgBalances.gala_balance || 0);
    }

    // Save transaction history with collectedIn information
    await db.createCreditCollectionHistory({
      organisationId: req.user.organisationId,
      creditHolderId: creditHolderId,
      amountCollected: amount,
      previousOutstanding: currentPayable,
      newOutstanding: newPayable,
      collectedBy: req.user.id,
      notes: null,
      transactionType: 'collected',
      saleId: null,
      collectedIn: collectedIn
    });

    res.json({
      message: 'Credit collected successfully',
      creditHolder: updatedCreditHolder,
      amountCollected: amount,
      previousPayable: currentPayable,
      newPayable: newPayable,
      collectedIn: collectedIn,
      newBalance: newBalance
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
