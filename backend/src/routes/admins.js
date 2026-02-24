const express = require('express');
const router = express.Router();
const {
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAllOrganisations,
  updateOrganisationBalances
} = require('../controllers/adminController');
const { authMiddleware, superAdminOnly } = require('../middleware/auth');

// All routes require authentication and super admin role
router.use(authMiddleware);
router.use(superAdminOnly);

// Admin management routes
router.get('/', getAllAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

// Organisation management routes
router.get('/organisations/all', getAllOrganisations);
router.put('/organisations/:id/balances', updateOrganisationBalances);

module.exports = router;
