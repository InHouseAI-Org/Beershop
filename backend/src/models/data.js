const bcrypt = require('bcryptjs');
const pool = require('../config/database');

const dataHelpers = {
  // ==================== SUPER ADMIN ====================
  getSuperAdmin: async () => {
    const result = await pool.query('SELECT * FROM super_admins LIMIT 1');
    return result.rows[0];
  },

  // ==================== ORGANISATIONS ====================
  getAllOrganisations: async () => {
    const result = await pool.query('SELECT * FROM organisations ORDER BY created_at DESC');
    return result.rows;
  },

  getOrganisationById: async (id) => {
    const result = await pool.query('SELECT * FROM organisations WHERE id = $1', [id]);
    return result.rows[0];
  },

  createOrganisation: async (organisationData) => {
    const result = await pool.query(
      `INSERT INTO organisations (organisation_name, cash_balance, bank_balance, gala_balance)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        organisationData.organisationName,
        organisationData.initialCashBalance || 0,
        organisationData.initialBankBalance || 0,
        organisationData.initialGalaBalance || 0
      ]
    );
    return result.rows[0];
  },

  updateOrganisation: async (id, updates) => {
    const result = await pool.query(
      `UPDATE organisations
       SET organisation_name = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [updates.organisationName, id]
    );
    return result.rows[0] || null;
  },

  deleteOrganisation: async (id) => {
    const result = await pool.query('DELETE FROM organisations WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  // ==================== ADMINS ====================
  getAllAdmins: async () => {
    const result = await pool.query(`
      SELECT a.*, o.organisation_name
      FROM admins a
      LEFT JOIN organisations o ON a.organisation_id = o.id
      ORDER BY a.created_at DESC
    `);
    return result.rows;
  },

  getAdminById: async (id) => {
    const result = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    return result.rows[0];
  },

  getAdminByUsername: async (username) => {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
    return result.rows[0];
  },

  getAdminByOrganisationId: async (organisationId) => {
    const result = await pool.query('SELECT * FROM admins WHERE organisation_id = $1', [organisationId]);
    return result.rows[0];
  },

  createAdmin: async (adminData) => {
    const hashedPassword = bcrypt.hashSync(adminData.password, 10);

    const result = await pool.query(
      `INSERT INTO admins (organisation_id, username, password, email, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [adminData.organisationId, adminData.username, hashedPassword, adminData.email || null, 'admin']
    );

    return result.rows[0];
  },

  updateAdmin: async (id, updates) => {
    if (updates.password) {
      updates.password = bcrypt.hashSync(updates.password, 10);
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      let columnName = key;
      if (key === 'organisationId') columnName = 'organisation_id';

      fields.push(`${columnName} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE admins SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteAdmin: async (id) => {
    const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  // ==================== USERS ====================
  getAllUsers: async () => {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  },

  getUsersByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      'SELECT * FROM users WHERE organisation_id = $1 ORDER BY created_at DESC',
      [organisationId]
    );
    return result.rows;
  },

  getUserById: async (id) => {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  getUserByUsername: async (username) => {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },

  createUser: async (userData) => {
    const hashedPassword = bcrypt.hashSync(userData.password, 10);

    const result = await pool.query(
      `INSERT INTO users (organisation_id, username, password)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userData.organisationId, userData.username, hashedPassword]
    );

    return result.rows[0];
  },

  updateUser: async (id, updates) => {
    if (updates.password) {
      updates.password = bcrypt.hashSync(updates.password, 10);
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      let columnName = key;
      if (key === 'organisationId') columnName = 'organisation_id';

      fields.push(`${columnName} = $${paramCount}`);
      values.push(updates[key]);
      paramCount++;
    });

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteUser: async (id) => {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  // ==================== PRODUCTS ====================
  getProductsByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      'SELECT * FROM products WHERE organisation_id = $1 ORDER BY product_name',
      [organisationId]
    );
    return result.rows;
  },

  getProductById: async (id) => {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return result.rows[0];
  },

  createProduct: async (productData) => {
    const result = await pool.query(
      `INSERT INTO products (organisation_id, product_name, sale_price, average_buy_price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [productData.organisationId, productData.productName, productData.salePrice, productData.averageBuyPrice || 0]
    );
    return result.rows[0];
  },

  updateProduct: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.productName) {
      fields.push(`product_name = $${paramCount}`);
      values.push(updates.productName);
      paramCount++;
    }

    if (updates.salePrice !== undefined) {
      fields.push(`sale_price = $${paramCount}`);
      values.push(updates.salePrice);
      paramCount++;
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteProduct: async (id) => {
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  updateProductAverageBuyPrice: async (productId, newBuyPrice, quantity) => {
    // Get current product data
    const product = await pool.query('SELECT average_buy_price FROM products WHERE id = $1', [productId]);

    if (product.rows.length === 0) {
      return null;
    }

    const currentAvgPrice = parseFloat(product.rows[0].average_buy_price || 0);

    // Get total quantity ordered so far for this product
    const orderStats = await pool.query(
      `SELECT COALESCE(SUM((item->>'quantity')::integer), 0) as total_quantity
       FROM orders, jsonb_array_elements(order_data) as item
       WHERE organisation_id = (SELECT organisation_id FROM products WHERE id = $1)
       AND (item->>'product_id')::uuid = $1`,
      [productId]
    );

    const previousTotalQuantity = parseInt(orderStats.rows[0].total_quantity || 0);
    const newTotalQuantity = previousTotalQuantity + quantity;

    // Calculate new average: (old_avg * old_qty + new_price * new_qty) / total_qty
    let newAvgPrice;
    if (previousTotalQuantity === 0) {
      // First order for this product
      newAvgPrice = newBuyPrice;
    } else {
      newAvgPrice = ((currentAvgPrice * previousTotalQuantity) + (newBuyPrice * quantity)) / newTotalQuantity;
    }

    // Update the product with new average
    const result = await pool.query(
      'UPDATE products SET average_buy_price = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [newAvgPrice, productId]
    );

    return result.rows[0];
  },

  // ==================== INVENTORY ====================
  getInventoryByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      `SELECT i.*,
              p.product_name,
              p.sale_price,
              p.average_buy_price,
              (COALESCE(i.qty, 0) * COALESCE(p.sale_price, 0)) as inventory_value
       FROM inventory i
       JOIN products p ON i.product_id = p.id
       WHERE i.organisation_id = $1
       ORDER BY p.product_name`,
      [organisationId]
    );
    return result.rows;
  },

  getInventoryById: async (id) => {
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    return result.rows[0];
  },

  getInventoryByProductId: async (productId) => {
    const result = await pool.query('SELECT * FROM inventory WHERE product_id = $1', [productId]);
    return result.rows[0];
  },

  updateInventoryById: async (id, qty) => {
    const result = await pool.query(
      'UPDATE inventory SET qty = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [qty, id]
    );
    return result.rows[0];
  },

  upsertInventory: async (inventoryData) => {
    const result = await pool.query(
      `INSERT INTO inventory (organisation_id, product_id, qty)
       VALUES ($1, $2, $3)
       ON CONFLICT (organisation_id, product_id)
       DO UPDATE SET qty = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [inventoryData.organisationId, inventoryData.productId, inventoryData.qty]
    );
    return result.rows[0];
  },

  decrementInventory: async (organisationId, productId, qty) => {
    const result = await pool.query(
      `UPDATE inventory
       SET qty = qty - $1, updated_at = CURRENT_TIMESTAMP
       WHERE organisation_id = $2 AND product_id = $3
       RETURNING *`,
      [qty, organisationId, productId]
    );
    return result.rows[0];
  },

  incrementInventory: async (organisationId, productId, qty) => {
    const result = await pool.query(
      `UPDATE inventory
       SET qty = qty + $1, updated_at = CURRENT_TIMESTAMP
       WHERE organisation_id = $2 AND product_id = $3
       RETURNING *`,
      [qty, organisationId, productId]
    );
    return result.rows[0];
  },

  // ==================== CREDIT HOLDERS ====================
  getCreditHoldersByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      'SELECT * FROM credit_holders WHERE organisation_id = $1 ORDER BY name',
      [organisationId]
    );
    return result.rows;
  },

  getCreditHolderById: async (id) => {
    const result = await pool.query('SELECT * FROM credit_holders WHERE id = $1', [id]);
    return result.rows[0];
  },

  createCreditHolder: async (creditHolderData) => {
    const result = await pool.query(
      `INSERT INTO credit_holders (organisation_id, name, address, phone, amount_payable)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        creditHolderData.organisationId,
        creditHolderData.name,
        creditHolderData.address || null,
        creditHolderData.phone || null,
        creditHolderData.amountPayable || 0
      ]
    );
    return result.rows[0];
  },

  updateCreditHolder: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const fieldMap = {
      name: 'name',
      address: 'address',
      phone: 'phone',
      amountPayable: 'amount_payable'
    };

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE credit_holders SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteCreditHolder: async (id) => {
    const result = await pool.query('DELETE FROM credit_holders WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  incrementCreditHolderOutstanding: async (creditHolderId, amount) => {
    const result = await pool.query(
      `UPDATE credit_holders
       SET amount_payable = amount_payable + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [amount, creditHolderId]
    );
    return result.rows[0];
  },

  // ==================== DISTRIBUTORS ====================
  getDistributorsByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      'SELECT * FROM distributors WHERE organisation_id = $1 ORDER BY name',
      [organisationId]
    );
    return result.rows;
  },

  getDistributorById: async (id) => {
    const result = await pool.query('SELECT * FROM distributors WHERE id = $1', [id]);
    return result.rows[0];
  },

  createDistributor: async (distributorData) => {
    const result = await pool.query(
      `INSERT INTO distributors (organisation_id, name, amount_outstanding)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [distributorData.organisationId, distributorData.name, distributorData.amountOutstanding || 0]
    );
    return result.rows[0];
  },

  updateDistributor: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.amountOutstanding !== undefined) {
      fields.push(`amount_outstanding = $${paramCount}`);
      values.push(updates.amountOutstanding);
      paramCount++;
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE distributors SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteDistributor: async (id) => {
    const result = await pool.query('DELETE FROM distributors WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  incrementDistributorOutstanding: async (distributorId, amount) => {
    const result = await pool.query(
      `UPDATE distributors
       SET amount_outstanding = amount_outstanding + $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [amount, distributorId]
    );
    return result.rows[0];
  },

  // ==================== SALES ====================
  getSalesByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      `SELECT s.*, u.username
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.organisation_id = $1
       ORDER BY s.date DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getSaleById: async (id) => {
    const result = await pool.query('SELECT * FROM sales WHERE id = $1', [id]);
    return result.rows[0];
  },

  createSale: async (saleData) => {
    const openingStockJson = saleData.openingStock && (Array.isArray(saleData.openingStock) ? saleData.openingStock.length > 0 : true) ? JSON.stringify(saleData.openingStock) : null;
    const closingStockJson = saleData.closingStock && (Array.isArray(saleData.closingStock) ? saleData.closingStock.length > 0 : true) ? JSON.stringify(saleData.closingStock) : null;
    const saleJson = saleData.sale && (Array.isArray(saleData.sale) ? saleData.sale.length > 0 : true) ? JSON.stringify(saleData.sale) : null;
    const creditJson = saleData.credit && (Array.isArray(saleData.credit) ? saleData.credit.length > 0 : true) ? JSON.stringify(saleData.credit) : null;

    console.log('=== STORING TO DATABASE ===');
    console.log('Opening Stock JSON:', openingStockJson);
    console.log('Closing Stock JSON:', closingStockJson);
    console.log('Sale JSON:', saleJson);
    console.log('Credit JSON:', creditJson);

    const result = await pool.query(
      `INSERT INTO sales (organisation_id, user_id, date, opening_stock, closing_stock, sale, cash_collected, upi, miscellaneous, credit, remarks, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        saleData.organisationId,
        saleData.userId || null,
        saleData.date || new Date(),
        openingStockJson,
        closingStockJson,
        saleJson,
        saleData.cashCollected || 0,
        saleData.upi || 0,
        saleData.miscellaneous || 0,
        creditJson,
        saleData.remarks || null,
        saleData.status || 'approved'
      ]
    );

    console.log('=== STORED RESULT ===');
    console.log('Saved opening_stock:', result.rows[0].opening_stock);
    console.log('Saved closing_stock:', result.rows[0].closing_stock);
    console.log('Saved sale:', result.rows[0].sale);

    return result.rows[0];
  },

  updateSale: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const fieldMap = {
      date: 'date',
      cashCollected: 'cash_collected',
      upi: 'upi',
      remarks: 'remarks',
      status: 'status'
    };

    Object.keys(updates).forEach(key => {
      if (key === 'openingStock') {
        fields.push(`opening_stock = $${paramCount}`);
        values.push(JSON.stringify(updates.openingStock));
        paramCount++;
      } else if (key === 'closingStock') {
        fields.push(`closing_stock = $${paramCount}`);
        values.push(JSON.stringify(updates.closingStock));
        paramCount++;
      } else if (key === 'sale') {
        fields.push(`sale = $${paramCount}`);
        values.push(JSON.stringify(updates.sale));
        paramCount++;
      } else if (key === 'credit') {
        fields.push(`credit = $${paramCount}`);
        values.push(JSON.stringify(updates.credit));
        paramCount++;
      } else if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE sales SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteSale: async (id) => {
    const result = await pool.query('DELETE FROM sales WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  // ==================== ORDERS ====================
  getOrdersByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      `SELECT o.*, d.name as distributor_name
       FROM orders o
       JOIN distributors d ON o.distributor_id = d.id
       WHERE o.organisation_id = $1
       ORDER BY o.order_date DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getOrderById: async (id) => {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return result.rows[0];
  },

  createOrder: async (orderData) => {
    const result = await pool.query(
      `INSERT INTO orders (organisation_id, distributor_id, order_date, order_data, tax, misc, discount, scheme, payment_outstanding_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        orderData.organisationId,
        orderData.distributorId,
        orderData.orderDate || new Date(),
        orderData.orderData ? JSON.stringify(orderData.orderData) : null,
        orderData.tax || 0,
        orderData.misc || 0,
        orderData.discount || 0,
        orderData.scheme || 0,
        orderData.paymentOutstandingDate || null
      ]
    );
    return result.rows[0];
  },

  updateOrder: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const fieldMap = {
      distributorId: 'distributor_id',
      orderDate: 'order_date',
      tax: 'tax',
      misc: 'misc',
      discount: 'discount',
      scheme: 'scheme',
      paymentOutstandingDate: 'payment_outstanding_date'
    };

    Object.keys(updates).forEach(key => {
      if (key === 'orderData') {
        fields.push(`order_data = $${paramCount}`);
        values.push(JSON.stringify(updates.orderData));
        paramCount++;
      } else if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteOrder: async (id) => {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  },

  // ==================== CREDIT COLLECTION HISTORY ====================
  createCreditCollectionHistory: async (historyData) => {
    const result = await pool.query(
      `INSERT INTO credit_collection_history (
        organisation_id, credit_holder_id, amount_collected,
        previous_outstanding, new_outstanding, collected_by, notes,
        transaction_type, sale_id, collected_in
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        historyData.organisationId,
        historyData.creditHolderId,
        historyData.amountCollected,
        historyData.previousOutstanding,
        historyData.newOutstanding,
        historyData.collectedBy,
        historyData.notes || null,
        historyData.transactionType || 'collected',
        historyData.saleId || null,
        historyData.collectedIn || null
      ]
    );
    return result.rows[0];
  },

  getCreditCollectionHistoryByOrganisation: async (organisationId) => {
    const result = await pool.query(
      `SELECT cch.*,
              ch.name as credit_holder_name,
              COALESCE(a.username, u.username) as collected_by_name
       FROM credit_collection_history cch
       LEFT JOIN credit_holders ch ON cch.credit_holder_id = ch.id
       LEFT JOIN admins a ON cch.collected_by = a.id
       LEFT JOIN users u ON cch.collected_by = u.id
       WHERE cch.organisation_id = $1
       ORDER BY cch.collected_at DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getCreditCollectionHistoryByCreditHolder: async (creditHolderId) => {
    const result = await pool.query(
      `SELECT cch.*,
              COALESCE(a.username, u.username) as collected_by_name
       FROM credit_collection_history cch
       LEFT JOIN admins a ON cch.collected_by = a.id
       LEFT JOIN users u ON cch.collected_by = u.id
       WHERE cch.credit_holder_id = $1
       ORDER BY cch.collected_at DESC`,
      [creditHolderId]
    );
    return result.rows;
  },

  // ==================== DISTRIBUTOR PAYMENT HISTORY ====================
  createDistributorPaymentHistory: async (historyData) => {
    const result = await pool.query(
      `INSERT INTO distributor_payment_history (
        organisation_id, distributor_id, amount_paid,
        previous_outstanding, new_outstanding, paid_by, notes, paid_from
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        historyData.organisationId,
        historyData.distributorId,
        historyData.amountPaid,
        historyData.previousOutstanding,
        historyData.newOutstanding,
        historyData.paidBy,
        historyData.notes || null,
        historyData.paidFrom || null
      ]
    );
    return result.rows[0];
  },

  getDistributorPaymentHistoryByOrganisation: async (organisationId) => {
    const result = await pool.query(
      `SELECT dph.*, d.name as distributor_name, a.username as paid_by_name
       FROM distributor_payment_history dph
       LEFT JOIN distributors d ON dph.distributor_id = d.id
       LEFT JOIN admins a ON dph.paid_by = a.id
       WHERE dph.organisation_id = $1
       ORDER BY dph.paid_at DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getDistributorPaymentHistoryByDistributor: async (distributorId) => {
    const result = await pool.query(
      `SELECT dph.*, a.username as paid_by_name
       FROM distributor_payment_history dph
       LEFT JOIN admins a ON dph.paid_by = a.id
       WHERE dph.distributor_id = $1
       ORDER BY dph.paid_at DESC`,
      [distributorId]
    );
    return result.rows;
  },

  // ==================== BALANCES ====================
  createBalance: async (balanceData) => {
    const result = await pool.query(
      `INSERT INTO balances (
        organisation_id, sales_id, date,
        cash_balance, bank_balance, gala_balance
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (sales_id)
      DO UPDATE SET
        cash_balance = $4,
        bank_balance = $5,
        gala_balance = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        balanceData.organisationId,
        balanceData.salesId,
        balanceData.date,
        balanceData.cashBalance || 0,
        balanceData.bankBalance || 0,
        balanceData.galaBalance || 0
      ]
    );
    return result.rows[0];
  },

  getBalancesByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      `SELECT b.*, s.date as sales_date
       FROM balances b
       LEFT JOIN sales s ON b.sales_id = s.id
       WHERE b.organisation_id = $1
       ORDER BY b.date DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getBalanceBySalesId: async (salesId) => {
    const result = await pool.query(
      `SELECT * FROM balances WHERE sales_id = $1`,
      [salesId]
    );
    return result.rows[0];
  },

  getOrganisationBalances: async (organisationId) => {
    const result = await pool.query(
      `SELECT cash_balance, bank_balance, gala_balance
       FROM organisations
       WHERE id = $1`,
      [organisationId]
    );
    return result.rows[0];
  },

  updateOrganisationBalances: async (organisationId, balances) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (balances.cashBalance !== undefined) {
      fields.push(`cash_balance = $${paramCount}`);
      values.push(balances.cashBalance);
      paramCount++;
    }

    if (balances.bankBalance !== undefined) {
      fields.push(`bank_balance = $${paramCount}`);
      values.push(balances.bankBalance);
      paramCount++;
    }

    if (balances.galaBalance !== undefined) {
      fields.push(`gala_balance = $${paramCount}`);
      values.push(balances.galaBalance);
      paramCount++;
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(organisationId);

    const result = await pool.query(
      `UPDATE organisations SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  incrementOrganisationBalances: async (organisationId, balances) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (balances.cashBalance !== undefined) {
      fields.push(`cash_balance = cash_balance + $${paramCount}`);
      values.push(balances.cashBalance);
      paramCount++;
    }

    if (balances.bankBalance !== undefined) {
      fields.push(`bank_balance = bank_balance + $${paramCount}`);
      values.push(balances.bankBalance);
      paramCount++;
    }

    if (balances.galaBalance !== undefined) {
      fields.push(`gala_balance = gala_balance + $${paramCount}`);
      values.push(balances.galaBalance);
      paramCount++;
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(organisationId);

    const result = await pool.query(
      `UPDATE organisations SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  // ==================== EXPENSES ====================
  createExpense: async (expenseData) => {
    const result = await pool.query(
      `INSERT INTO expenses (
        organisation_id, expense_name, description,
        expense_from, expense_amount, date
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        expenseData.organisationId,
        expenseData.expenseName,
        expenseData.description || null,
        expenseData.expenseFrom,
        expenseData.expenseAmount,
        expenseData.date || new Date()
      ]
    );
    return result.rows[0];
  },

  getExpensesByOrganisationId: async (organisationId) => {
    const result = await pool.query(
      `SELECT * FROM expenses
       WHERE organisation_id = $1
       ORDER BY date DESC, created_at DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getExpenseById: async (id) => {
    const result = await pool.query(
      `SELECT * FROM expenses WHERE id = $1`,
      [id]
    );
    return result.rows[0];
  },

  updateExpense: async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;

    const fieldMap = {
      expenseName: 'expense_name',
      description: 'description',
      expenseFrom: 'expense_from',
      expenseAmount: 'expense_amount',
      date: 'date'
    };

    Object.keys(updates).forEach(key => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  },

  deleteExpense: async (id) => {
    const result = await pool.query(
      `DELETE FROM expenses WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rowCount > 0;
  },

  // ==================== BALANCE TRANSFERS ====================
  getAllBalanceTransfers: async (organisationId) => {
    const result = await pool.query(
      `SELECT bt.*,
              COALESCE(u.username, bt.created_by_username) as created_by_name
       FROM balance_transfers bt
       LEFT JOIN users u ON bt.created_by = u.id
       WHERE bt.organisation_id = $1
       ORDER BY bt.transaction_date DESC, bt.created_at DESC`,
      [organisationId]
    );
    return result.rows;
  },

  getBalanceTransferById: async (id) => {
    const result = await pool.query('SELECT * FROM balance_transfers WHERE id = $1', [id]);
    return result.rows[0];
  },

  createBalanceTransfer: async (transferData) => {
    const result = await pool.query(
      `INSERT INTO balance_transfers (organisation_id, name, description, amount, from_account, to_account, transaction_date, created_by, created_by_username)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        transferData.organisationId,
        transferData.name,
        transferData.description || null,
        transferData.amount,
        transferData.fromAccount,
        transferData.toAccount,
        transferData.transactionDate || new Date(),
        transferData.createdBy,
        transferData.createdByUsername || null
      ]
    );
    return result.rows[0];
  },

  deleteBalanceTransfer: async (id) => {
    const result = await pool.query(
      `DELETE FROM balance_transfers WHERE id = $1 RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
};

module.exports = dataHelpers;
