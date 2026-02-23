const express = require('express');
const router = express.Router();
const { getAllDistributors, getDistributor, createDistributor, updateDistributor, deleteDistributor, payDistributor, getDistributorPaymentHistory, getDistributorHistory } = require('../controllers/distributorController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// History routes - must come before /:id route
router.get('/history/payments', getDistributorPaymentHistory);
router.get('/:id/history', getDistributorHistory);

router.get('/', getAllDistributors);
router.get('/:id', getDistributor);
router.post('/', createDistributor);
router.post('/pay', payDistributor);
router.put('/:id', updateDistributor);
router.delete('/:id', deleteDistributor);

module.exports = router;
