const db = require('../models/data');

const getAllUsers = async (req, res) => {
  try {
    let users;

    // If the requester is a super admin, return all users
    if (req.user.role === 'superadmin') {
      users = await db.getAllUsers();
    } else if (req.user.role === 'admin' || req.user.role === 'user') {
      // If regular admin or user, return only users from their organization
      users = await db.getUsersByOrganisationId(req.user.organisationId);
    } else {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove passwords from response
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json(sanitizedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide username and password' });
    }

    // Admins create users for their own organization
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID is required' });
    }

    // Check if username already exists in the same organization
    const existingUsers = await db.getUsersByOrganisationId(organisationId);
    const duplicate = existingUsers.find(
      u => u.username.toLowerCase().trim() === username.toLowerCase().trim()
    );

    if (duplicate) {
      return res.status(409).json({
        error: 'A user with this username already exists in your organization | इस यूज़रनेम का उपयोगकर्ता पहले से मौजूद है'
      });
    }

    const newUser = await db.createUser({
      username,
      password,
      organisationId
    });

    // Don't send password back
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    // Check for database unique constraint violation
    if (error.code === '23505' && error.constraint === 'unique_username_per_org') {
      return res.status(409).json({
        error: 'A user with this username already exists in your organization | इस यूज़रनेम का उपयोगकर्ता पहले से मौजूद है'
      });
    }
    // Check if it's a validation error
    if (error.message && error.message.includes('Username cannot be empty')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    const user = await db.getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only update users from their organization
    if (req.user.role === 'admin' && user.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check for duplicate username in same organization if username is being updated
    if (username !== undefined && username.toLowerCase().trim() !== user.username.toLowerCase().trim()) {
      const existingUsers = await db.getUsersByOrganisationId(user.organisation_id);
      const duplicate = existingUsers.find(
        u => u.id !== id && u.username.toLowerCase().trim() === username.toLowerCase().trim()
      );

      if (duplicate) {
        return res.status(409).json({
          error: 'A user with this username already exists in your organization | इस यूज़रनेम का उपयोगकर्ता पहले से मौजूद है'
        });
      }
    }

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (password !== undefined) updates.password = password;

    const updatedUser = await db.updateUser(id, updates);

    // Don't send password back
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    // Check for database unique constraint violation
    if (error.code === '23505' && error.constraint === 'unique_username_per_org') {
      return res.status(409).json({
        error: 'A user with this username already exists in your organization | इस यूज़रनेम का उपयोगकर्ता पहले से मौजूद है'
      });
    }
    // Check if it's a validation error
    if (error.message && error.message.includes('Username cannot be empty')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await db.getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Regular admins can only delete users from their organization
    if (req.user.role === 'admin' && user.organisation_id !== req.user.organisationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const success = await db.deleteUser(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateMyData = async (req, res) => {
  try {
    // Users submit sales data - this will be moved to sales table
    // For now, just return success
    res.json({ message: 'Data submission will be implemented with sales table' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getMyData = async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't send password back
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser, updateMyData, getMyData };
