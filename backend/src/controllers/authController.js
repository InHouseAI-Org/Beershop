const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/data');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }

    let user = null;
    let role = null;
    let organisationId = null;

    // Check if super admin
    const superAdmin = await db.getSuperAdmin();
    if (superAdmin && superAdmin.username === username) {
      user = superAdmin;
      role = 'superadmin';
    } else {
      // Check if regular admin
      const admin = await db.getAdminByUsername(username);
      if (admin) {
        user = admin;
        role = 'admin';
        organisationId = admin.organisation_id;
      } else {
        // Check if regular user
        const regularUser = await db.getUserByUsername(username);
        if (regularUser) {
          user = regularUser;
          role = 'user';
          organisationId = regularUser.organisation_id;
        }
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: role,
        organisationId: organisationId || null
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: role,
        organisationId: organisationId || null
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const verifyToken = (req, res) => {
  res.json({ user: req.user });
};

module.exports = { login, verifyToken };
