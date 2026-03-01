require('dotenv').config();
const pool = require('./src/config/database');

(async () => {
  try {
    console.log('Starting to seed dummy data...');

    // Get organisation ID, products, distributors
    const orgResult = await pool.query('SELECT id FROM organisations LIMIT 1');
    const organisationId = orgResult.rows[0].id;
    console.log('Organisation ID:', organisationId);

    const productsResult = await pool.query('SELECT id, product_name, sale_price FROM products WHERE organisation_id = $1', [organisationId]);
    const products = productsResult.rows;
    console.log('Products found:', products.length);

    const distributorsResult = await pool.query('SELECT id, name FROM distributors WHERE organisation_id = $1', [organisationId]);
    const distributors = distributorsResult.rows;
    console.log('Distributors found:', distributors.length);

    const creditHoldersResult = await pool.query('SELECT id, name FROM credit_holders WHERE organisation_id = $1', [organisationId]);
    const creditHolders = creditHoldersResult.rows;
    console.log('Credit holders found:', creditHolders.length);

    // Get user ID or admin ID for collected_by field
    let userId;
    const usersResult = await pool.query('SELECT id FROM users WHERE organisation_id = $1 LIMIT 1', [organisationId]);
    if (usersResult.rows.length > 0) {
      userId = usersResult.rows[0].id;
    } else {
      // Fall back to admin
      const adminResult = await pool.query('SELECT id FROM admins WHERE organisation_id = $1 LIMIT 1', [organisationId]);
      userId = adminResult.rows[0].id;
    }
    console.log('Using user/admin ID:', userId);

    // Generate data for the last 5 months
    const months = 5;
    const today = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const currentDate = new Date(today.getFullYear(), today.getMonth() - i, 15); // 15th of each month
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`\nGenerating data for ${dateStr}...`);

      // 1. Create distributor orders (2-3 per month)
      const ordersPerMonth = 2 + Math.floor(Math.random() * 2);
      for (let j = 0; j < ordersPerMonth; j++) {
        const distributor = distributors[Math.floor(Math.random() * distributors.length)];
        const orderDate = new Date(currentDate);
        orderDate.setDate(orderDate.getDate() + j * 5);

        const orderData = products.map(product => ({
          product_id: product.id,
          qty: (Math.floor(Math.random() * 20) + 5).toString(),
          buy_price: (parseFloat(product.sale_price) * 0.6).toFixed(2),
          total: ((Math.floor(Math.random() * 20) + 5) * parseFloat(product.sale_price) * 0.6).toFixed(2)
        }));

        await pool.query(
          `INSERT INTO orders (organisation_id, distributor_id, order_date, order_data)
           VALUES ($1, $2, $3, $4)`,
          [organisationId, distributor.id, orderDate, JSON.stringify(orderData)]
        );
      }
      console.log(`✓ Created ${ordersPerMonth} orders`);

      // 2. Create sales entries (3-4 per month)
      const salesPerMonth = 3 + Math.floor(Math.random() * 2);
      for (let k = 0; k < salesPerMonth; k++) {
        const saleDate = new Date(currentDate);
        saleDate.setDate(saleDate.getDate() + k * 7);

        const saleData = products.map(product => ({
          product_id: product.id,
          sale: Math.floor(Math.random() * 15) + 3 // 3-17 units
        }));

        const openingStock = products.map(product => ({
          product_id: product.id,
          opening_stock: Math.floor(Math.random() * 30) + 20
        }));

        const closingStock = products.map((product, idx) => ({
          product_id: product.id,
          closing_stock: openingStock[idx].opening_stock - saleData[idx].sale
        }));

        const creditData = creditHolders.length > 0 ? [{
          credit_holder_id: creditHolders[Math.floor(Math.random() * creditHolders.length)].id,
          creditgiven: Math.floor(Math.random() * 500) + 100
        }] : [];

        await pool.query(
          `INSERT INTO sales (
            organisation_id, date, opening_stock, closing_stock,
            sale, cash_collected, upi, credit, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            organisationId,
            saleDate,
            JSON.stringify(openingStock),
            JSON.stringify(closingStock),
            JSON.stringify(saleData),
            Math.floor(Math.random() * 3000) + 1000,
            Math.floor(Math.random() * 2000) + 500,
            JSON.stringify(creditData),
            'approved'
          ]
        );
      }
      console.log(`✓ Created ${salesPerMonth} sales`);

      // 3. Create credit collection history (if credit holders exist)
      if (creditHolders.length > 0) {
        const creditTransactions = 2 + Math.floor(Math.random() * 2);
        for (let m = 0; m < creditTransactions; m++) {
          const creditHolder = creditHolders[Math.floor(Math.random() * creditHolders.length)];
          const transactionDate = new Date(currentDate);
          transactionDate.setDate(transactionDate.getDate() + m * 10);

          const transactionType = Math.random() > 0.5 ? 'given' : 'collected';
          const amount = Math.floor(Math.random() * 500) + 100;

          await pool.query(
            `INSERT INTO credit_collection_history (
              organisation_id, credit_holder_id, amount_collected,
              previous_outstanding, new_outstanding, collected_by,
              transaction_type, collected_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              organisationId,
              creditHolder.id,
              amount,
              1000,
              transactionType === 'given' ? 1000 + amount : 1000 - amount,
              userId,
              transactionType,
              transactionDate
            ]
          );
        }
        console.log(`✓ Created ${creditTransactions} credit transactions`);
      }
    }

    console.log('\n✅ Successfully seeded dummy data for', months, 'months!');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
