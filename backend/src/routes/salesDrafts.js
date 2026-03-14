const express = require('express');
const router = express.Router();
const { saveSalesDraft, getSalesDraft, deleteSalesDraft } = require('../controllers/salesDraftsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Save or update draft
router.post('/', saveSalesDraft);

// Get current user's draft
router.get('/', getSalesDraft);

// Delete current user's draft
router.delete('/', deleteSalesDraft);

module.exports = router;
