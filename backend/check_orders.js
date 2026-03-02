require('dotenv').config();
const db = require('./src/models/data');

async function checkOrders() {
  try {
    console.log('=== Checking Orders for Turbong 500 ===\n');

    const productId = '69f7ce74-99fe-472b-8ad4-9f6bd3c90231';
    const product = await db.getProductById(productId);
    console.log('Product:', product.product_name);
    console.log('Organisation ID:', product.organisation_id);

    // Get all orders for this organisation
    const orders = await db.getOrdersByOrganisationId(product.organisation_id);
    console.log('\nTotal orders for organisation:', orders.length);

    // Find orders that contain this product
    const ordersWithProduct = orders.filter(order => {
      if (Array.isArray(order.order_data)) {
        return order.order_data.some(item => item.product_id === productId);
      }
      return false;
    });

    console.log('Orders containing Turbong 500:', ordersWithProduct.length);

    if (ordersWithProduct.length > 0) {
      ordersWithProduct.forEach((order, index) => {
        console.log(`\nOrder ${index + 1}:`);
        console.log('Order Date:', order.order_date);
        console.log('Order Data:', JSON.stringify(order.order_data, null, 2));
      });
    } else {
      console.log('\n⚠️  No orders found for Turbong 500');
      console.log('\nLet me create a test order now...');

      // Get a distributor
      const distributors = await db.getDistributorsByOrganisationId(product.organisation_id);
      if (distributors.length === 0) {
        console.log('❌ No distributors found');
        process.exit(1);
      }

      const orderData = [{
        product_id: productId,
        qty: 100,
        buy_price: 80,
        total: 8000
      }];

      const newOrder = await db.createOrder({
        organisationId: product.organisation_id,
        distributorId: distributors[0].id,
        orderDate: '2026-02-15',
        orderData: orderData,
        tax: 0,
        misc: 0,
        discount: 0,
        scheme: 0,
        paymentOutstandingDate: null
      });

      console.log('\n✅ Created test order!');
      console.log('Order ID:', newOrder.id);
      console.log('Order Date:', newOrder.order_date);
      console.log('\n📊 Now the chart should show 100 units in Feb 2026!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

checkOrders();
