require('dotenv').config();
const pool = require('./src/config/database');

const TARGET_ORG_ID = '8cfe59cd-7eb5-45ac-b38a-b273f70f3dc2';

(async () => {
  try {
    console.log('Adding more products, credit holders, and distributors...\n');

    // 1. Add more products
    const productNames = [
      { name: 'Kingfisher Beer', price: 120 },
      { name: 'Tuborg Beer', price: 110 },
      { name: 'Budweiser', price: 150 },
      { name: 'Corona', price: 200 },
      { name: 'Heineken', price: 180 },
      { name: 'Carlsberg', price: 130 },
      { name: 'Bira White', price: 140 },
      { name: 'Bira Blonde', price: 140 },
      { name: 'Haywards 5000', price: 100 },
      { name: 'Royal Challenge', price: 250 }
    ];

    let productsAdded = 0;
    for (const product of productNames) {
      try {
        await pool.query(
          `INSERT INTO products (organisation_id, product_name, sale_price, average_buy_price)
           VALUES ($1, $2, $3, $4)`,
          [TARGET_ORG_ID, product.name, product.price, product.price * 0.6]
        );
        productsAdded++;
      } catch (err) {
        // Product might already exist
        console.log(`  Skipped ${product.name} (may already exist)`);
      }
    }
    console.log(`✓ Added ${productsAdded} products`);

    // 2. Add more distributors
    const distributorNames = [
      { name: 'AB InBev Distribution', contact: '9876543210' },
      { name: 'United Breweries Ltd', contact: '9876543211' },
      { name: 'Carlsberg India', contact: '9876543212' },
      { name: 'Bira Distributors', contact: '9876543213' },
      { name: 'SABMiller India', contact: '9876543214' },
      { name: 'Heineken India', contact: '9876543215' }
    ];

    let distributorsAdded = 0;
    for (const dist of distributorNames) {
      try {
        await pool.query(
          `INSERT INTO distributors (organisation_id, name, contact_info, amount_payable)
           VALUES ($1, $2, $3, $4)`,
          [TARGET_ORG_ID, dist.name, dist.contact, 0]
        );
        distributorsAdded++;
      } catch (err) {
        console.log(`  Skipped ${dist.name} (may already exist)`);
      }
    }
    console.log(`✓ Added ${distributorsAdded} distributors`);

    // 3. Add more credit holders
    const creditHolderNames = [
      { name: 'Raj Kumar', contact: '9876543220' },
      { name: 'Priya Sharma', contact: '9876543221' },
      { name: 'Amit Patel', contact: '9876543222' },
      { name: 'Sunita Desai', contact: '9876543223' },
      { name: 'Vikram Singh', contact: '9876543224' },
      { name: 'Neha Reddy', contact: '9876543225' },
      { name: 'Rohit Verma', contact: '9876543226' },
      { name: 'Anjali Gupta', contact: '9876543227' },
      { name: 'Sanjay Mehta', contact: '9876543228' },
      { name: 'Kavita Joshi', contact: '9876543229' }
    ];

    let creditHoldersAdded = 0;
    for (const holder of creditHolderNames) {
      try {
        await pool.query(
          `INSERT INTO credit_holders (organisation_id, name, contact_info, amount_payable)
           VALUES ($1, $2, $3, $4)`,
          [TARGET_ORG_ID, holder.name, holder.contact, 0]
        );
        creditHoldersAdded++;
      } catch (err) {
        console.log(`  Skipped ${holder.name} (may already exist)`);
      }
    }
    console.log(`✓ Added ${creditHoldersAdded} credit holders`);

    console.log('\n✅ Successfully added more entities!');
    await pool.end();
    process.exit(0);
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    await pool.end();
    process.exit(1);
  }
})();
