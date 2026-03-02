require('dotenv').config();
const axios = require('axios');
const db = require('./src/models/data');

const BASE_URL = 'http://localhost:5001/api';

async function testAnalyticsEndpoint() {
  try {
    console.log('=== Testing Analytics Endpoint ===\n');

    // Step 1: Get specific product from database
    console.log('Step 1: Fetching specific product...');
    const productId = '69f7ce74-99fe-472b-8ad4-9f6bd3c90231';
    const testProduct = await db.getProductById(productId);

    if (!testProduct) {
      console.log('❌ Product not found');
      process.exit(1);
    }

    console.log('✅ Found product:', {
      id: testProduct.id,
      name: testProduct.product_name,
      organisation_id: testProduct.organisation_id
    });
    console.log('');

    const orgId = testProduct.organisation_id;

    // Step 2: Test analytics controller directly
    console.log('Step 2: Testing analytics controller directly...');
    const analyticsController = require('./src/controllers/analyticsController');

    const mockReq = {
      params: { productId: testProduct.id },
      user: { organisationId: orgId }
    };

    const mockRes = {
      json: (data) => {
        console.log('✅ Controller response:');
        console.log(JSON.stringify(data, null, 2));
        return data;
      },
      status: (code) => ({
        json: (data) => {
          console.log(`❌ Error response (${code}):`, data);
          return data;
        }
      })
    };

    await analyticsController.getProductMonthlyOrders(mockReq, mockRes);

    console.log('');

    // Step 5: Verify data structure
    console.log('Step 5: Done - check output above');
    const data = null;

    console.log('\n=== Test Complete ===');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during test:');
    console.error('Message:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testAnalyticsEndpoint();
