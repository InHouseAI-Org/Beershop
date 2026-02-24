require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admins');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const creditHolderRoutes = require('./routes/creditHolders');
const distributorRoutes = require('./routes/distributors');
const orderRoutes = require('./routes/orders');
const salesRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const balanceRoutes = require('./routes/balances');
const expenseRoutes = require('./routes/expenses');
const balanceTransferRoutes = require('./routes/balanceTransfers');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/credit-holders', creditHolderRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/balance-transfers', balanceTransferRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Debug endpoint (remove after troubleshooting)
app.get('/api/debug', async (req, res) => {
  const db = require('./models/data');
  try {
    const superAdmin = await db.getSuperAdmin();
    res.json({
      envVars: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      },
      superAdminExists: !!superAdmin,
      superAdminUsername: superAdmin ? superAdmin.username : null
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      envVars: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        hasJwtSecret: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV
      }
    });
  }
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Only start server if not in serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Local network access: http://192.168.1.36:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
