const express = require('express');
const router = express.Router();
const { getAllSales, getSale, createSale, updateSale, deleteSale, approveSale } = require('../controllers/salesController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.get('/', getAllSales);
router.get('/:id', getSale);
router.post('/', createSale);
router.post('/:id/approve', approveSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

module.exports = router;
