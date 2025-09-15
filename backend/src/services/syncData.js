const sequelize = require('../config/database');
const ShopifyService = require('../services/shopifyService');
require('dotenv').config();

async function syncAllStores() {
  try {
    console.log('🚀 Starting sync process...');
    const [tenants] = await sequelize.query('SELECT * FROM tenants ORDER BY tenant_id');

    for (const tenant of tenants) {
      console.log(`\n🏪 Syncing → ${tenant.display_name} (${tenant.store_domain})`);
      const t = await sequelize.transaction();

      try {
        const shopify = new ShopifyService(tenant.store_domain, tenant.access_token);
        const connectionTest = await shopify.testConnection();
        if (!connectionTest.success) {
          console.error(`❌ Connection failed: ${connectionTest.error}`);
          await t.rollback();
          continue;
        }

        console.log(`✅ Connected: ${connectionTest.shopName}`);

        // Set tenant context
        await sequelize.query(`SELECT set_config('app.current_tenant', '${tenant.tenant_id}', true)`, { transaction: t });

        // Customers
        console.log('  📥 Customers...');
        const customers = await shopify.getCustomers();
        if (customers.length) {
          const values = customers.map(c => `(
            '${tenant.tenant_id}',
            '${c.id}',
            ${sequelize.escape(c.first_name || '')},
            ${sequelize.escape(c.last_name || '')},
            ${sequelize.escape(c.email || null)},
            ${sequelize.escape(c.phone || null)},
            '${c.created_at}',
            NOW()
          )`);
          await sequelize.query(`
            INSERT INTO customers (tenant_id, shopify_customer_id, first_name, last_name, email, phone, created_at, updated_at)
            VALUES ${values.join(',')}
            ON CONFLICT (tenant_id, shopify_customer_id) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              updated_at = NOW()
          `, { transaction: t });
        }

        // Products
        console.log('  📦 Products...');
        const products = await shopify.getProducts();
        if (products.length) {
          const values = products.map(p => {
            const v = p.variants?.[0] || {};
            return `(
              '${tenant.tenant_id}',
              '${p.id}',
              ${sequelize.escape(p.title || 'Untitled Product')},
              ${sequelize.escape(p.handle || '')},
              ${parseFloat(v.price) || 0},
              ${v.inventory_quantity || 0},
              '${p.created_at}',
              NOW()
            )`;
          });
          await sequelize.query(`
            INSERT INTO products (tenant_id, shopify_product_id, title, handle, price, inventory, created_at, updated_at)
            VALUES ${values.join(',')}
            ON CONFLICT (tenant_id, shopify_product_id) DO UPDATE SET
              title = EXCLUDED.title,
              handle = EXCLUDED.handle,
              price = EXCLUDED.price,
              inventory = EXCLUDED.inventory,
              updated_at = NOW()
          `, { transaction: t });
        }

        // Orders
        console.log('  🛒 Orders...');
        const orders = await shopify.getOrders();
        if (orders.length) {
          const values = orders.map(o => `(
            '${tenant.tenant_id}',
            '${o.id}',
            ${o.customer?.id || null},
            ${parseFloat(o.total_price) || 0},
            ${sequelize.escape(o.financial_status || 'unknown')},
            ${sequelize.escape(JSON.stringify(o.line_items || []))},
            '${o.created_at}',
            NOW()
          )`);
          await sequelize.query(`
            INSERT INTO orders (tenant_id, shopify_order_id, customer_shopify_id, total_amount, financial_status, line_items, created_at, updated_at)
            VALUES ${values.join(',')}
            ON CONFLICT (tenant_id, shopify_order_id) DO UPDATE SET
              total_amount = EXCLUDED.total_amount,
              financial_status = EXCLUDED.financial_status,
              line_items = EXCLUDED.line_items,
              updated_at = NOW()
          `, { transaction: t });
        }

        // Custom events placeholder
        console.log('  🎯 Custom Events...');
        // Example: track when sync happened
        await sequelize.query(`
          INSERT INTO custom_events (tenant_id, event_type, payload, created_at)
          VALUES (:tenant_id, 'sync_completed', '{"source":"manual_sync"}', NOW())
        `, { replacements: { tenant_id: tenant.tenant_id }, transaction: t });

        await t.commit();
        console.log(`✅ Completed sync for ${tenant.display_name}`);

      } catch (error) {
        console.error(`❌ Sync failed: ${error.message}`);
        await t.rollback();
      }
    }

    console.log('\n🎉 Sync finished!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await sequelize.close();
  }
}

syncAllStores();

