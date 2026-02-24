const db = require('../models/data');

const getAllAdmins = async (req, res) => {
  try {
    const admins = await db.getAllAdmins();
    const sanitizedAdmins = admins.map(admin => ({
      id: admin.id,
      username: admin.username,
      organisationId: admin.organisation_id,
      organisationName: admin.organisation_name,
      email: admin.email,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at
    }));

    res.json(sanitizedAdmins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { username, password, organisationName, email, initialCashBalance, initialBankBalance, initialGalaBalance } = req.body;

    if (!username || !password || !organisationName) {
      return res.status(400).json({ error: 'Please provide username, password, and organisation name' });
    }

    // Check if username already exists
    const existingAdmin = await db.getAdminByUsername(username);
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create organisation first with initial balances
    const organisation = await db.createOrganisation({
      organisationName,
      initialCashBalance: parseFloat(initialCashBalance) || 0,
      initialBankBalance: parseFloat(initialBankBalance) || 0,
      initialGalaBalance: parseFloat(initialGalaBalance) || 0
    });

    // Create admin with organisation_id
    const newAdmin = await db.createAdmin({
      username,
      password,
      organisationId: organisation.id,
      email
    });

    res.status(201).json({
      id: newAdmin.id,
      username: newAdmin.username,
      organisationId: newAdmin.organisation_id,
      organisationName: organisationName,
      email: newAdmin.email,
      createdAt: newAdmin.created_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password, email } = req.body;

    const updates = {};
    if (username) updates.username = username;
    if (password) updates.password = password;
    if (email !== undefined) updates.email = email;

    // Check if username already exists (if updating username)
    if (username) {
      const existingAdmin = await db.getAdminByUsername(username);
      if (existingAdmin && existingAdmin.id !== id) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    const updatedAdmin = await db.updateAdmin(id, updates);

    if (!updatedAdmin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Get organisation name
    const org = await db.getOrganisationById(updatedAdmin.organisation_id);

    res.json({
      id: updatedAdmin.id,
      username: updatedAdmin.username,
      organisationId: updatedAdmin.organisation_id,
      organisationName: org?.organisation_name,
      email: updatedAdmin.email,
      updatedAt: updatedAdmin.updated_at
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const success = await db.deleteAdmin(id);

    if (!success) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAllAdmins, createAdmin, updateAdmin, deleteAdmin };
