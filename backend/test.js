const sequelize = require('./src/config/database');
const ShopifyService = require('./src/services/shopifyService');
require('dotenv').config();

async function testConnections() {
  try {
    // Test database
    console.log('🔍 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Test Shopify connections
    const stores = [
      { domain: process.env.SHOPIFY_STORE_1_DOMAIN, token: process.env.SHOPIFY_STORE_1_TOKEN, name: 'Store 1' },
      { domain: process.env.SHOPIFY_STORE_2_DOMAIN, token: process.env.SHOPIFY_STORE_2_TOKEN, name: 'Store 2' },
      { domain: process.env.SHOPIFY_STORE_3_DOMAIN, token: process.env.SHOPIFY_STORE_3_TOKEN, name: 'Store 3' }
    ];

    for (const store of stores) {
      if (store.domain && store.token) {
        console.log(`🔍 Testing ${store.name} connection...`);
        const shopify = new ShopifyService(store.domain, store.token);
        const result = await shopify.testConnection();
        
        if (result.success) {
          console.log(`✅ ${store.name}: ${result.shopName}`);
        } else {
          console.log(`❌ ${store.name}: ${result.error}`);
        }
      } else {
        console.log(`⚠️ ${store.name}: Missing credentials`);
      }
    }

  } catch (error) {
    console.error('❌ Connection test failed:', error);
  } finally {
    await sequelize.close();
  }
}

testConnections();