const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/data');

const login = async (req, res) => {
  try {
    let { username, password } = req.body;

    // Trim username to handle leading/trailing spaces
    username = username?.trim();

    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username (after trim):', username);
    console.log('Password provided:', !!password);

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ error: 'Please provide username and password' });
    }

    // Check JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET is not configured!');
      return res.status(500).json({ error: 'Server configuration error. Please contact administrator.' });
    }

    let user = null;
    let role = null;
    let organisationId = null;

    // Check if super admin
    const superAdmin = await db.getSuperAdmin();
    console.log('Super admin from DB:', superAdmin ? { username: superAdmin.username, hasPassword: !!superAdmin.password } : null);

    if (superAdmin && superAdmin.username === username) {
      user = superAdmin;
      role = 'superadmin';
      console.log('User identified as superadmin');
    } else {
      // Check if regular admin
      const admin = await db.getAdminByUsername(username);
      if (admin) {
        user = admin;
        role = 'admin';
        organisationId = admin.organisation_id;
        console.log('User identified as admin');
      } else {
        // Check if regular user
        const regularUser = await db.getUserByUsername(username);
        if (regularUser) {
          user = regularUser;
          role = 'user';
          organisationId = regularUser.organisation_id;
          console.log('User identified as regular user');
        }
      }
    }

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    console.log('Comparing password...');
    console.log('Stored hash:', user.password);
    console.log('Password length:', password?.length);

    if (!user.password) {
      console.error('User has no password hash in database!');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch - returning 401');
      console.log('Username from DB:', JSON.stringify(user.username));
      console.log('Username from request:', JSON.stringify(username));
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
