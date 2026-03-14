const express = require('express');
const router = express.Router();
const schemesController = require('../controllers/schemesController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(adminOnly);

// Get all schemes for organization
router.get('/', schemesController.getAllSchemes);

// Get scheme statistics for dashboard
router.get('/stats', schemesController.getSchemeStats);

// Get single scheme with progress
router.get('/:id', schemesController.getScheme);

// Create new scheme
router.post('/', schemesController.createScheme);

// Update scheme
router.put('/:id', schemesController.updateScheme);

// Close scheme manually
router.post('/:id/close', schemesController.closeScheme);

// Get scheme progress
router.get('/:id/progress', schemesController.getSchemeProgress);

module.exports = router;
