require('dotenv').config();
const pool = require('./src/config/database');

const TARGET_ORG_ID = '8cfe59cd-7eb5-45ac-b38a-b273f70f3dc2';

(async () => {
  try {
    console.log('Seeding more sales and orders with all products...\n');

    // Get all products, distributors, and credit holders
    const productsResult = await pool.query(
      'SELECT id, product_name, sale_price FROM products WHERE organisation_id = $1',
      [TARGET_ORG_ID]
    );
    const products = productsResult.rows;
    console.log('Total products:', products.length);

    const distributorsResult = await pool.query(
      'SELECT id, name FROM distributors WHERE organisation_id = $1',
      [TARGET_ORG_ID]
    );
    const distributors = distributorsResult.rows;
    console.log('Total distributors:', distributors.length);

    const creditHoldersResult = await pool.query(
      'SELECT id, name FROM credit_holders WHERE organisation_id = $1',
      [TARGET_ORG_ID]
    );
    const creditHolders = creditHoldersResult.rows;
    console.log('Total credit holders:', creditHolders.length);

    // Get admin ID
    const adminResult = await pool.query(
      'SELECT id FROM admins WHERE organisation_id = $1 LIMIT 1',
      [TARGET_ORG_ID]
    );
    const adminId = adminResult.rows[0].id;

    // Generate more data for the last 3 months
    const months = 3;
    const today = new Date();
    let totalOrders = 0;
    let totalSales = 0;

    for (let i = months - 1; i >= 0; i--) {
      const currentDate = new Date(today.getFullYear(), today.getMonth() - i, 15);
      const dateStr = currentDate.toISOString().split('T')[0];
      console.log(`\nGenerating data for ${dateStr}...`);

      // Create orders with random products (3-5 orders per month)
      const ordersPerMonth = 3 + Math.floor(Math.random() * 3);
      for (let j = 0; j < ordersPerMonth; j++) {
        const distributor = distributors[Math.floor(Math.random() * distributors.length)];
        const orderDate = new Date(currentDate);
        orderDate.setDate(orderDate.getDate() + j * 7);

        // Select 3-5 random products for each order
        const numProducts = 3 + Math.floor(Math.random() * 3);
        const selectedProducts = [];
        const usedProducts = new Set();

        while (selectedProducts.length < numProducts && selectedProducts.length < products.length) {
          const randomProduct = products[Math.floor(Math.random() * products.length)];
          if (!usedProducts.has(randomProduct.id)) {
            usedProducts.add(randomProduct.id);
            selectedProducts.push(randomProduct);
          }
        }

        const orderData = selectedProducts.map(product => {
          const qty = Math.floor(Math.random() * 20) + 5;
          const buyPrice = parseFloat(product.sale_price) * 0.6;
          return {
            product_id: product.id,
            qty: qty.toString(),
            buy_price: buyPrice.toFixed(2),
            total: (qty * buyPrice).toFixed(2)
          };
        });

        await pool.query(
          `INSERT INTO orders (organisation_id, distributor_id, order_date, order_data)
           VALUES ($1, $2, $3, $4)`,
          [TARGET_ORG_ID, distributor.id, orderDate, JSON.stringify(orderData)]
        );
        totalOrders++;
      }
      console.log(`✓ Created ${ordersPerMonth} orders`);

      // Create sales with random products (4-6 sales per month)
      const salesPerMonth = 4 + Math.floor(Math.random() * 3);
      for (let k = 0; k < salesPerMonth; k++) {
        const saleDate = new Date(currentDate);
        saleDate.setDate(saleDate.getDate() + k * 5);

        // Select 4-7 random products for each sale
        const numSaleProducts = 4 + Math.floor(Math.random() * 4);
        const selectedSaleProducts = [];
        const usedSaleProducts = new Set();

        while (selectedSaleProducts.length < numSaleProducts && selectedSaleProducts.length < products.length) {
          const randomProduct = products[Math.floor(Math.random() * products.length)];
          if (!usedSaleProducts.has(randomProduct.id)) {
            usedSaleProducts.add(randomProduct.id);
            selectedSaleProducts.push(randomProduct);
          }
        }

        const saleData = selectedSaleProducts.map(product => ({
          product_id: product.id,
          sale: Math.floor(Math.random() * 15) + 3
        }));

        const openingStock = selectedSaleProducts.map(product => ({
          product_id: product.id,
          opening_stock: Math.floor(Math.random() * 30) + 20
        }));

        const closingStock = selectedSaleProducts.map((product, idx) => ({
          product_id: product.id,
          closing_stock: openingStock[idx].opening_stock - saleData[idx].sale
        }));

        // Select 1-3 random credit holders for credit
        const numCreditHolders = Math.floor(Math.random() * 3) + 1;
        const creditData = [];
        if (creditHolders.length > 0) {
          for (let m = 0; m < Math.min(numCreditHolders, creditHolders.length); m++) {
            const holder = creditHolders[Math.floor(Math.random() * creditHolders.length)];
            if (!creditData.find(c => c.credit_holder_id === holder.id)) {
              creditData.push({
                credit_holder_id: holder.id,
                creditgiven: Math.floor(Math.random() * 500) + 100
              });
            }
          }
        }

        await pool.query(
          `INSERT INTO sales (
            organisation_id, date, opening_stock, closing_stock,
            sale, cash_collected, upi, credit, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            TARGET_ORG_ID,
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
        totalSales++;

        // Create credit collection history for the credit given
        for (const creditItem of creditData) {
          await pool.query(
            `INSERT INTO credit_collection_history (
              organisation_id, credit_holder_id, amount_collected,
              previous_outstanding, new_outstanding, collected_by,
              transaction_type, collected_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              TARGET_ORG_ID,
              creditItem.credit_holder_id,
              creditItem.creditgiven,
              1000,
              1000 + creditItem.creditgiven,
              adminId,
              'given',
              saleDate
            ]
          );
        }
      }
      console.log(`✓ Created ${salesPerMonth} sales`);
    }

    console.log(`\n✅ Successfully seeded ${totalOrders} orders and ${totalSales} sales with all products!`);
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
