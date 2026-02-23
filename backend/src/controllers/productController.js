const db = require('../models/data');

const getAllProducts = async (req, res) => {
  try {
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID required' });
    }

    const products = await db.getProductsByOrganisationId(organisationId);
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db.getProductById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product belongs to user's organisation
    if (product.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { productName, salePrice, averageBuyPrice } = req.body;

    if (!productName || salePrice === undefined) {
      return res.status(400).json({ error: 'Please provide product name and sale price' });
    }

    const organisationId = req.user.organisationId;

    const newProduct = await db.createProduct({
      organisationId,
      productName,
      salePrice,
      averageBuyPrice: averageBuyPrice || 0
    });

    // Automatically create inventory entry with 0 qty
    await db.upsertInventory({
      organisationId,
      productId: newProduct.id,
      qty: 0
    });

    res.status(201).json(newProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productName, salePrice } = req.body;

    const product = await db.getProductById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product belongs to user's organisation
    if (product.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates = {};
    if (productName !== undefined) updates.productName = productName;
    if (salePrice !== undefined) updates.salePrice = salePrice;

    const updatedProduct = await db.updateProduct(id, updates);
    res.json(updatedProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await db.getProductById(id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product belongs to user's organisation
    if (product.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.deleteProduct(id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllProducts, getProduct, createProduct, updateProduct, deleteProduct };
