const db = require('../models/data');

const getAllInventory = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const inventory = await db.getInventoryByOrganisationId(organisationId);
    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getInventoryByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const inventory = await db.getInventoryByProductId(productId);

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    // Check if inventory belongs to user's organisation
    if (inventory.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(inventory);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { qty } = req.body;

    if (qty === undefined || qty === null) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    // First, get the existing inventory to check organisation
    const existingInventory = await db.getInventoryById(id);

    if (!existingInventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    // Check if inventory belongs to user's organisation
    if (existingInventory.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedInventory = await db.updateInventoryById(id, parseInt(qty));

    res.json(updatedInventory);
  } catch (error) {
    console.error(error);
    // Check if it's a validation error
    if (error.message && error.message.includes('cannot be negative')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const createInventory = async (req, res) => {
  try {
    const { productId, qty } = req.body;
    const organisationId = req.user.organisationId;

    if (!productId || qty === undefined || qty === null) {
      return res.status(400).json({ error: 'Product ID and quantity are required' });
    }

    // Verify product belongs to user's organisation
    const product = await db.getProductById(productId);
    if (!product || product.organisation_id !== organisationId) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Use upsert to create or update inventory
    const inventory = await db.upsertInventory({
      organisationId,
      productId,
      qty: parseInt(qty)
    });

    res.status(201).json(inventory);
  } catch (error) {
    console.error(error);
    if (error.message && error.message.includes('cannot be negative')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllInventory, getInventoryByProduct, updateInventory, createInventory };
