const axios = require("axios");
const { sequelize } = require("../config/database");
const { QueryTypes } = require("sequelize");
require("dotenv").config();

// Shopify API version
const API_VERSION = "2025-01";

// Helper to create axios instance per store
function shopifyClient(storeDomain, accessToken) {
  return axios.create({
    baseURL: `https://${storeDomain}/admin/api/${API_VERSION}/`,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json",
    },
  });
}

async function syncBranches(tenant, client) {
  console.log(`\n🔹 Syncing branches for tenant ${tenant.store_domain}`);
  const shopifyBranches = await client
    .get("locations.json")
    .then(res => res.data.locations)
    .catch(err => {
      console.error("Error fetching Shopify locations:", err.response?.data || err.message);
      return [];
    });

  const dbBranches = await sequelize.query(
    "SELECT branch_id, name, shopify_branch_id FROM branches WHERE tenant_id = :tenant_id",
    { replacements: { tenant_id: tenant.tenant_id }, type: QueryTypes.SELECT }
  );

  for (const dbBranch of dbBranches) {
    const shopifyBranch = shopifyBranches.find(b => b.name === dbBranch.name);

    if (shopifyBranch) {
      if (!dbBranch.shopify_branch_id) {
        await sequelize.query(
          "UPDATE branches SET shopify_branch_id = :shopify_branch_id WHERE branch_id = :branch_id",
          { replacements: { shopify_branch_id: shopifyBranch.id, branch_id: dbBranch.branch_id } }
        );
        console.log(`   ✅ Updated branch ${dbBranch.name} with Shopify ID`);
      }
    } else {
      const newBranch = await client
        .post("locations.json", { location: { name: dbBranch.name } })
        .then(res => res.data.location)
        .catch(err => {
          console.error(`Error creating branch "${dbBranch.name}":`, err.response?.data || err.message);
          return null;
        });

      if (newBranch) {
        await sequelize.query(
          "UPDATE branches SET shopify_branch_id = :shopify_branch_id WHERE branch_id = :branch_id",
          { replacements: { shopify_branch_id: newBranch.id, branch_id: dbBranch.branch_id } }
        );
        console.log(`   ➕ Created branch ${dbBranch.name} in Shopify`);
      }
    }
  }
}

async function syncEvents(tenant, client) {
  console.log(`\n🔹 Syncing events for tenant ${tenant.store_domain}`);
  const branches = await sequelize.query(
    "SELECT branch_id, shopify_branch_id FROM branches WHERE tenant_id = :tenant_id",
    { replacements: { tenant_id: tenant.tenant_id }, type: QueryTypes.SELECT }
  );

  for (const branch of branches) {
    const unsyncedEvents = await sequelize.query(
      "SELECT * FROM custom_events WHERE branch_id = :branch_id AND synced_to_shopify IS FALSE",
      { replacements: { branch_id: branch.branch_id }, type: QueryTypes.SELECT }
    );

    for (const evt of unsyncedEvents) {
      const payload = {
        event: {
          event_type: evt.event_type,
          shopify_resource_id: evt.shopify_resource_id,
          payload: JSON.parse(evt.payload),
          created_at: evt.created_at,
        },
      };

      const shopifyEvent = await client
        .post("events.json", payload)
        .then(res => res.data.event)
        .catch(err => {
          console.error(`Error syncing event ${evt.event_type}:`, err.response?.data || err.message);
          return null;
        });

      if (shopifyEvent) {
        await sequelize.query(
          `UPDATE custom_events 
           SET shopify_event_id = :shopify_event_id, synced_to_shopify = TRUE 
           WHERE id = :id`,
          { replacements: { shopify_event_id: shopifyEvent.id, id: evt.id } }
        );
        console.log(`   ✅ Event ${evt.event_type} synced to Shopify`);
      }
    }
  }
}

async function syncOrders(tenant, client) {
  console.log(`\n🔹 Syncing orders for tenant ${tenant.store_domain}`);
  const branches = await sequelize.query(
    "SELECT branch_id, shopify_branch_id FROM branches WHERE tenant_id = :tenant_id",
    { replacements: { tenant_id: tenant.tenant_id }, type: QueryTypes.SELECT }
  );

  for (const branch of branches) {
    const unsyncedOrders = await sequelize.query(
      "SELECT * FROM orders WHERE branch_id = :branch_id AND synced_to_shopify IS FALSE",
      { replacements: { branch_id: branch.branch_id }, type: QueryTypes.SELECT }
    );

    for (const order of unsyncedOrders) {
      const payload = {
        order: {
          id: order.shopify_order_id,
          total_price: order.total_amount,
          financial_status: order.financial_status,
          line_items: JSON.parse(order.line_items),
          created_at: order.created_at,
        },
      };

      const shopifyOrder = await client
        .post("orders.json", payload)
        .then(res => res.data.order)
        .catch(err => {
          console.error(`Error syncing order ${order.shopify_order_id}:`, err.response?.data || err.message);
          return null;
        });

      if (shopifyOrder) {
        await sequelize.query(
          `UPDATE orders 
           SET shopify_order_id = :shopify_order_id, synced_to_shopify = TRUE 
           WHERE id = :id`,
          { replacements: { shopify_order_id: shopifyOrder.id, id: order.id } }
        );
        console.log(`   ✅ Order ${order.shopify_order_id} synced to Shopify`);
      }
    }
  }
}

async function main() {
  try {
    // Fetch tenants and access tokens from your tenants table
    const tenants = await sequelize.query(
      "SELECT tenant_id, store_domain, access_token FROM tenants ORDER BY tenant_id",
      { type: QueryTypes.SELECT }
    );

    for (const tenant of tenants) {
      const client = shopifyClient(tenant.store_domain, tenant.access_token);

      await syncBranches(tenant, client);
      await syncEvents(tenant, client);
      await syncOrders(tenant, client);
    }

    console.log("\n🌱 Shopify sync completed successfully!");
  } catch (err) {
    console.error("❌ Error during Shopify sync:", err);
  } finally {
    await sequelize.close();
  }
}

main();
