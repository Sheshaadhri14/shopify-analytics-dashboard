const sequelize = require('../../src/config/database');
require('dotenv').config();

async function seedTenants() {
  const t = await sequelize.transaction();

  try {
    const tenants = [
      { store_domain: process.env.SHOPIFY_STORE_1_DOMAIN, display_name: 'Store 1', access_token: process.env.SHOPIFY_STORE_1_TOKEN },
      { store_domain: process.env.SHOPIFY_STORE_2_DOMAIN, display_name: 'Store 2', access_token: process.env.SHOPIFY_STORE_2_TOKEN },
      { store_domain: process.env.SHOPIFY_STORE_3_DOMAIN, display_name: 'Store 3', access_token: process.env.SHOPIFY_STORE_3_TOKEN }
    ];

    for (const tenant of tenants) {
      if (!tenant.store_domain || !tenant.access_token) {
        console.error("⚠️ Skipping tenant:", tenant.display_name);
        continue;
      }
      await sequelize.query(`
        INSERT INTO tenants (store_domain, display_name, access_token)
        VALUES (:store_domain, :display_name, :access_token)
        ON CONFLICT (store_domain) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          access_token = EXCLUDED.access_token
      `, { replacements: tenant, transaction: t });
    }

    await t.commit();
    console.log('🎉 Tenants seeded');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await t.rollback();
  } finally {
    await sequelize.close();
  }
}

seedTenants();
