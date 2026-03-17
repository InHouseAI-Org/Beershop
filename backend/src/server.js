require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admins');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const creditHolderRoutes = require('./routes/creditHolders');
const distributorRoutes = require('./routes/distributors');
const distributorPaymentsRoutes = require('./routes/distributorPayments');
const orderRoutes = require('./routes/orders');
const salesRoutes = require('./routes/sales');
const salesDraftsRoutes = require('./routes/salesDrafts');
const inventoryRoutes = require('./routes/inventory');
const balanceRoutes = require('./routes/balances');
const expenseRoutes = require('./routes/expenses');
const balanceTransferRoutes = require('./routes/balanceTransfers');
const miscellaneousIncomeRoutes = require('./routes/miscellaneousIncome');
const analyticsRoutes = require('./routes/analytics');
const organisationRoutes = require('./routes/organisations');
const schemesRoutes = require('./routes/schemes');
const recurringExpensesRoutes = require('./routes/recurringExpenses');
const prepaidExpensesRoutes = require('./routes/prepaidExpenses');
const balanceSheetRoutes = require('./routes/balanceSheet');

const app = express();

// CORS configuration for mobile access
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Add request logging for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/credit-holders', creditHolderRoutes);
app.use('/api/distributors', distributorRoutes);
app.use('/api/distributor-payments', distributorPaymentsRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/sales-drafts', salesDraftsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/balances', balanceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/balance-transfers', balanceTransferRoutes);
app.use('/api/miscellaneous-income', miscellaneousIncomeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/organisations', organisationRoutes);
app.use('/api/schemes', schemesRoutes);
app.use('/api/recurring-expenses', recurringExpensesRoutes);
app.use('/api/prepaid-expenses', prepaidExpensesRoutes);
app.use('/api/balance-sheet', balanceSheetRoutes);

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

// Set up cron job for daily prepaid expense amortization
// Runs at midnight (00:00) every day
if (process.env.NODE_ENV !== 'production') {
  const pool = require('./config/database');

  cron.schedule('0 0 * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Running period-based prepaid expense amortization...`);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const today = new Date().toISOString().split('T')[0];

      // Get all prepaid expenses where next_amortization_date is today or earlier
      const prepaidExpensesQuery = `
        SELECT * FROM prepaid_expenses
        WHERE next_amortization_date <= $1
          AND coverage_end_date >= $1
          AND remaining_value > 0
      `;
      const prepaidExpensesResult = await client.query(prepaidExpensesQuery, [today]);

      let amortizedCount = 0;
      let totalAmortizedAmount = 0;

      for (const prepaidExpense of prepaidExpensesResult.rows) {
        // Calculate which period we're amortizing
        const amortizedSoFar = parseFloat(prepaidExpense.amortized_value);
        const amountPerPeriod = parseFloat(prepaidExpense.amount_per_period);
        const periodsAmortized = Math.floor(amortizedSoFar / amountPerPeriod);
        const currentPeriodNumber = periodsAmortized + 1;

        // Calculate period dates
        const periodStartDate = new Date(prepaidExpense.next_amortization_date);
        const periodEndDate = new Date(periodStartDate);

        const frequency = parseInt(prepaidExpense.recurrence_frequency);

        if (prepaidExpense.recurrence_type === 'weekly') {
          periodEndDate.setDate(periodEndDate.getDate() + (frequency * 7) - 1);
        } else if (prepaidExpense.recurrence_type === 'monthly') {
          periodEndDate.setMonth(periodEndDate.getMonth() + frequency);
          periodEndDate.setDate(periodEndDate.getDate() - 1);
        } else if (prepaidExpense.recurrence_type === 'yearly') {
          periodEndDate.setFullYear(periodEndDate.getFullYear() + frequency);
          periodEndDate.setDate(periodEndDate.getDate() - 1);
        }

        // Create amortization entry
        const amortizationQuery = `
          INSERT INTO prepaid_expense_amortizations (
            organisation_id,
            prepaid_expense_id,
            amortization_date,
            amount,
            period_number,
            period_start_date,
            period_end_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        await client.query(amortizationQuery, [
          prepaidExpense.organisation_id,
          prepaidExpense.id,
          today,
          amountPerPeriod,
          currentPeriodNumber,
          periodStartDate.toISOString().split('T')[0],
          periodEndDate.toISOString().split('T')[0]
        ]);

        // Calculate next amortization date
        const nextAmortDate = new Date(periodEndDate);
        nextAmortDate.setDate(nextAmortDate.getDate() + 1); // Day after this period ends

        // Update prepaid expense
        const newRemainingValue = parseFloat(prepaidExpense.remaining_value) - amountPerPeriod;
        const newAmortizedValue = parseFloat(prepaidExpense.amortized_value) + amountPerPeriod;

        const updateQuery = `
          UPDATE prepaid_expenses
          SET
            amortized_value = $1,
            remaining_value = $2,
            next_amortization_date = $3
          WHERE id = $4
        `;
        await client.query(updateQuery, [
          newAmortizedValue,
          Math.max(0, newRemainingValue), // Don't go negative
          nextAmortDate.toISOString().split('T')[0],
          prepaidExpense.id
        ]);

        amortizedCount++;
        totalAmortizedAmount += amountPerPeriod;
      }

      await client.query('COMMIT');
      console.log(`[${timestamp}] Amortization completed: ${amortizedCount} expenses, total ₹${totalAmortizedAmount.toFixed(2)}`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`[${timestamp}] Error running amortization:`, error);
    } finally {
      client.release();
    }
  });

  console.log('Prepaid expense amortization cron job scheduled (runs daily at midnight)');
}

// Only start server if not in serverless environment (Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Local network access: http://192.168.1.36:${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;
