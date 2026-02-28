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

    // Check if username already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Admins create users for their own organization
    const organisationId = req.user.organisationId;

    if (!organisationId) {
      return res.status(400).json({ error: 'Organisation ID is required' });
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

    // Check if username already exists (if updating username)
    if (username) {
      const existingUser = await db.getUserByUsername(username);
      if (existingUser && existingUser.id !== id) {
        return res.status(400).json({ error: 'Username already exists' });
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
