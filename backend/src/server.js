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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Local network access: http://192.168.1.36:${PORT}`);
});
