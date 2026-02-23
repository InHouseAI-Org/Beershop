const express = require('express');
const router = express.Router();
const { getAllAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/adminController');
const { authMiddleware, superAdminOnly } = require('../middleware/auth');

// All routes require authentication and super admin role
router.use(authMiddleware);
router.use(superAdminOnly);

router.get('/', getAllAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;
