const express = require('express');
const router = express.Router();
const { getAllCreditHolders, getCreditHolder, createCreditHolder, updateCreditHolder, deleteCreditHolder, collectCredit, getCreditCollectionHistory, getCreditHolderHistory } = require('../controllers/creditHolderController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// History route (admin only) - must come before /:id route
router.get('/history/collections', adminOnly, getCreditCollectionHistory);

// GET routes are accessible to all authenticated users (needed for sales form)
router.get('/', getAllCreditHolders);
router.get('/:id/history', getCreditHolderHistory);
router.get('/:id', getCreditHolder);

// Write operations require admin role
router.post('/', adminOnly, createCreditHolder);
router.post('/collect', adminOnly, collectCredit);
router.put('/:id', adminOnly, updateCreditHolder);
router.delete('/:id', adminOnly, deleteCreditHolder);

module.exports = router;
