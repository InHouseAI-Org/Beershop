require('dotenv').config();
const db = require('./src/models/data');

async function createTestOrder() {
  try {
    console.log('Creating test order...\n');

    // Product ID from user
    const productId = '69f7ce74-99fe-472b-8ad4-9f6bd3c90231';

    // Get product details
    const product = await db.getProductById(productId);
    console.log('Product:', product.product_name);
    console.log('Organisation ID:', product.organisation_id);

    // Get distributors for this org
    const distributors = await db.getDistributorsByOrganisationId(product.organisation_id);
    if (distributors.length === 0) {
      console.log('❌ No distributors found');
      process.exit(1);
    }
    console.log('Using distributor:', distributors[0].name);

    // Create a test order
    const orderData = [
      {
        product_id: productId,
        qty: 50, // 50 units
        buy_price: 100,
        total: 5000
      }
    ];

    const newOrder = await db.createOrder({
      organisationId: product.organisation_id,
      distributorId: distributors[0].id,
      orderDate: '2026-02-15', // February 2026
      orderData: orderData,
      tax: 0,
      misc: 0,
      discount: 0,
      scheme: 0,
      paymentOutstandingDate: null
    });

    console.log('\n✅ Test order created successfully!');
    console.log('Order ID:', newOrder.id);
    console.log('Order Date:', newOrder.order_date);
    console.log('\nNow try the "View Orders" button again - you should see 50 units in February 2026!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestOrder();
