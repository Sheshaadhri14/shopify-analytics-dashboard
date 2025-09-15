// seedBranches.js (Shopify sync + history assignment)
const { sequelize } = require("../config/database");
const axios = require("axios");
const { faker } = require("@faker-js/faker");

const { QueryTypes } = require("sequelize");
require("dotenv").config();

// Event types for realism
const EXTRA_EVENTS = [
  "cart_updated",
  "checkout_started",
  "checkout_abandoned",
  "payment_failed",
  "return_initiated",
];

function randomDateWithinMonths(monthsBack = 6) {
  const now = new Date();
  const past = new Date();
  past.setMonth(now.getMonth() - monthsBack);
  return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
}

// Shopify helpers
function shopifyBase(storeDomain) {
  return `https://${storeDomain}/admin/api/2025-01`;
}
function shopifyHeaders(accessToken) {
  return {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };
}

function pickWeighted(branches) {
  const rand = Math.random();
  let sum = 0;
  for (const b of branches) {
    sum += b.weight || 1 / branches.length;
    if (rand <= sum) return b.id;
  }
  return branches[0].id;
}

async function seedBranches() {
  try {
    const tenants = await sequelize.query(
      "SELECT tenant_id, store_domain, access_token FROM tenants",
      { type: QueryTypes.SELECT }
    );

    for (const tenant of tenants) {
      console.log(`\n🌿 Syncing branches for tenant: ${tenant.store_domain} (id: ${tenant.tenant_id})`);

      // 1️⃣ Fetch locations from Shopify
      const shopifyRes = await axios.get(`${shopifyBase(tenant.store_domain)}/locations.json`, {
        headers: shopifyHeaders(tenant.access_token),
      });
      const locations = shopifyRes.data.locations || [];

      if (!locations.length) {
        console.warn(`No Shopify locations found for tenant ${tenant.tenant_id}`);
        continue;
      }

      // 2️⃣ Upsert Shopify locations as branches
      const branchIds = [];
      for (const loc of locations) {
        const [res] = await sequelize.query(
          `INSERT INTO branches (tenant_id, name, location, shopify_branch_id, metadata, created_at, updated_at)
           VALUES (:tenant_id, :name, :location, :shopify_branch_id, :metadata::jsonb, :now, :now)
           ON CONFLICT (tenant_id, shopify_branch_id)
           DO UPDATE SET name=EXCLUDED.name, location=EXCLUDED.location, metadata=EXCLUDED.metadata, updated_at=EXCLUDED.updated_at
           RETURNING branch_id`,
          {
            replacements: {
              tenant_id: tenant.tenant_id,
              name: loc.name,
              location: loc.address1 || loc.name,
              shopify_branch_id: loc.id,
              metadata: JSON.stringify({ shopify_location: loc }),
              now: new Date(),
            },
            type: QueryTypes.INSERT,
          }
        );
        branchIds.push({ id: res[0].branch_id, weight: 1 }); // default weight 1
        console.log(`   ✅ Branch synced: ${loc.name} → branch_id ${res[0].branch_id}`);
      }

      // 3️⃣ Assign existing orders without branch_id
      const orders = await sequelize.query(
        `SELECT id, shopify_order_id FROM orders WHERE tenant_id=:tenant_id AND branch_id IS NULL`,
        { replacements: { tenant_id: tenant.tenant_id }, type: QueryTypes.SELECT }
      );

      for (const order of orders) {
        try {
          const orderRes = await axios.get(`${shopifyBase(tenant.store_domain)}/orders/${order.shopify_order_id}.json`, {
            headers: shopifyHeaders(tenant.access_token),
          });
          const shopifyOrder = orderRes.data.order;
          const locationId = shopifyOrder?.location_id;

          let branchId = null;
          if (locationId) {
            const branch = await sequelize.query(
              `SELECT branch_id FROM branches WHERE tenant_id=:tenant_id AND shopify_branch_id=:location_id`,
              { replacements: { tenant_id: tenant.tenant_id, location_id }, type: QueryTypes.SELECT }
            );
            branchId = branch[0]?.branch_id;
          }

          // fallback: pick random branch if location_id not present
          if (!branchId) branchId = pickWeighted(branchIds);

          await sequelize.query(
            `UPDATE orders SET branch_id=:branch_id WHERE id=:order_id`,
            { replacements: { branch_id: branchId, order_id: order.id } }
          );
        } catch (err) {
          console.warn(`Order ${order.shopify_order_id} fetch failed: ${err.message}`);
        }
      }
      console.log(`   ✅ Assigned ${orders.length} existing orders`);

      // 4️⃣ Assign existing events without branch_id
      const events = await sequelize.query(
        `SELECT id, shopify_resource_id FROM custom_events WHERE tenant_id=:tenant_id AND branch_id IS NULL`,
        { replacements: { tenant_id: tenant.tenant_id }, type: QueryTypes.SELECT }
      );

      for (const evt of events) {
        // Randomly assign branch (could be improved if you know order->branch mapping)
        await sequelize.query(
          `UPDATE custom_events SET branch_id=:branch_id WHERE id=:id`,
          { replacements: { branch_id: pickWeighted(branchIds), id: evt.id } }
        );
      }
      console.log(`   ✅ Assigned ${events.length} existing events`);

      // 5️⃣ Optionally: generate new orders/events per branch with realistic branch linkage
      for (const b of branchIds) {
        const numOrders = faker.number.int({ min: 5, max: 15 });
        for (let i = 0; i < numOrders; i++) {
          const createdAt = randomDateWithinMonths(6);
          await sequelize.query(
            `INSERT INTO orders
             (tenant_id, branch_id, shopify_order_id, customer_shopify_id, total_amount, financial_status, line_items, created_at, metadata)
             VALUES (:tenant_id, :branch_id, :shopify_order_id, :customer_shopify_id, :total_amount, :financial_status, :line_items, :created_at, :metadata)`,
            {
              replacements: {
                tenant_id: tenant.tenant_id,
                branch_id: b.id,
                shopify_order_id: faker.number.int({ min: 100000, max: 999999 }),
                customer_shopify_id: faker.number.int({ min: 10000, max: 99999 }),
                total_amount: faker.commerce.price({ min: 20, max: 500 }),
                financial_status: faker.helpers.arrayElement(["paid", "pending", "refunded", "failed"]),
                line_items: JSON.stringify([{ product: faker.commerce.productName(), qty: faker.number.int({ min: 1, max: 3 }) }]),
                created_at: createdAt,
                metadata: JSON.stringify({ source: "branch_seed" }),
              },
            }
          );
        }

        const numEvents = faker.number.int({ min: 20, max: 50 });
        for (let i = 0; i < numEvents; i++) {
          const createdAt = randomDateWithinMonths(6);
          await sequelize.query(
            `INSERT INTO custom_events
             (tenant_id, branch_id, event_type, shopify_resource_id, payload, created_at)
             VALUES (:tenant_id, :branch_id, :event_type, :shopify_resource_id, :payload, :created_at)`,
            {
              replacements: {
                tenant_id: tenant.tenant_id,
                branch_id: b.id,
                event_type: faker.helpers.arrayElement(EXTRA_EVENTS),
                shopify_resource_id: faker.number.int({ min: 1000, max: 9999 }),
                payload: JSON.stringify({ info: faker.lorem.sentence() }),
                created_at: createdAt,
              },
            }
          );
        }
      }
      console.log(`   ➕ Generated new orders/events per branch`);
    }

    console.log("\n🌱 Branch sync completed successfully!");
  } catch (err) {
    console.error("❌ Error in seedBranches.js:", err);
  } finally {
    await sequelize.close();
  }
}

seedBranches();
