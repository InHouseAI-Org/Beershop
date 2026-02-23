const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser, deleteUser, updateMyData, getMyData } = require('../controllers/userController');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// User routes (for regular users to manage their own data)
router.get('/me', authMiddleware, getMyData);
router.put('/me', authMiddleware, updateMyData);

// Admin routes (require admin or super admin role)
router.get('/', authMiddleware, adminOnly, getAllUsers);
router.post('/', authMiddleware, adminOnly, createUser);
router.put('/:id', authMiddleware, adminOnly, updateUser);
router.delete('/:id', authMiddleware, adminOnly, deleteUser);

module.exports = router;
