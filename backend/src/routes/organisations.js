const express = require('express');
const router = express.Router();
const db = require('../models/data');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get organisation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const organisation = await db.getOrganisationById(id);

    if (!organisation) {
      return res.status(404).json({ error: 'Organisation not found' });
    }

    // Users can only access their own organisation (except super admins)
    if (req.user.role !== 'superadmin' && req.user.organisationId !== id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(organisation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
