
const { sequelize } = require("../config/database");
const axios = require("axios");
require("dotenv").config();
const crypto = require("crypto");

const API_VERSION = "2025-01"; // pick latest stable

// Config (tweak to scale)
const CONFIG = {
  customersPerTenant: 30,      // create N customers via Admin API
  productsPerTenant: 12,       // create N products (with 1 variant each)
  liveOrdersPerTenant: 30,     // create N real orders via Admin API (throttled)
  historyOrdersPerTenant: 600, // number of historical orders to insert into DB over last 6 months
  apiDelayMs: 800,             // delay between API calls to avoid rate limits (adjust 600-1500)
  orderDelayMs: 1200,          // delay between order creations
};

// Utility helpers
function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function money(amount) {
  return parseFloat(Number(amount).toFixed(2));
}

// Shopify REST helpers (no need to change ShopifyService file; we use axios directly)
function shopifyBase(storeDomain) {
  return `https://${storeDomain}/admin/api/${API_VERSION}`;
}
function shopifyHeaders(accessToken) {
  return {
    "X-Shopify-Access-Token": accessToken,
    "Content-Type": "application/json",
  };
}

// Create product payload helper
function productPayload(index, tenantId) {
  const price = money(Math.random() * 120 + 8);
  return {
    product: {
      title: `Tenant${tenantId} - Sample Product ${index}`,
      body_html: `<strong>Sample product ${index} for tenant ${tenantId}</strong>`,
      vendor: `Tenant ${tenantId}`,
      tags: ["seeded", `tenant:${tenantId}`],
      variants: [
        {
          option1: "Default",
          price: price.toString(),
          sku: `T${tenantId}-P${index}`,
          inventory_management: "shopify",
          inventory_quantity: randomInt(5, 200),
        },
      ],
    },
  };
}

// Create customer payload
function customerPayload(i, tenantId) {
  const first = ["Alex", "Sam", "Priya", "Ravi", "Maya", "Chris", "Taylor"][i % 7];
  const last = ["Kumar", "Sharma", "Patel", "Singh", "Gupta", "Lee"][i % 6];
  const email = `seed+${tenantId}.${i}@example.com`;
  return {
    customer: {
      first_name: first,
      last_name: last,
      email,
      verified_email: true,
      tags: `seeded,tenant:${tenantId}`,
      addresses: [
        {
          address1: `${randomInt(10, 999)} Main St`,
          city: ["Bengaluru", "Mumbai", "Delhi", "Chennai", "Hyderabad"][i % 5],
          province: "KA",
          country: "India",
          zip: "560001",
        },
      ],
    },
  };
}

// Create order payload (Admin API)
function orderPayload(customerId, variantId, qty = 1, tenantId) {
  const price = money(Math.random() * 120 + 5);
  const subtotal = money(price * qty);
  const shipping = money([0, 30, 50][Math.floor(Math.random() * 3)]);
  const total = money(subtotal + shipping);
  const discountApplied = Math.random() < 0.15;
  return {
    order: {
      customer: { id: customerId },
      line_items: [{ variant_id: variantId, quantity: qty }],
      financial_status: "paid",
      tags: `seeded,tenant:${tenantId}`,
      total_price: total.toString(),
      subtotal_price: subtotal.toString(),
      shipping_lines: [{ title: "Standard", price: shipping.toString() }],
      transactions: [{ kind: "sale", status: "success", amount: total.toString() }],
      send_receipt: false,
      send_fulfillment_receipt: false,
    },
  };
}

// Fulfill order via fulfillment endpoint (Admin API)
async function createFulfillment(storeDomain, accessToken, orderId) {
  try {
    const url = `${shopifyBase(storeDomain)}/orders/${orderId}/fulfillments.json`;
    const body = { fulfillment: { location_id: null, tracking_number: null, notify_customer: false } };
    const res = await axios.post(url, body, { headers: shopifyHeaders(accessToken) });
    return res.data;
  } catch (err) {
    // non-fatal
    return null;
  }
}

// Create a price rule + discount code (simple fixed amount or percentage)
async function createDiscount(storeDomain, accessToken, tenantId, idx) {
  try {
    // price rule
    const prUrl = `${shopifyBase(storeDomain)}/price_rules.json`;
    const prBody = {
      price_rule: {
        title: `SeedRule-T${tenantId}-${idx}`,
        target_type: "line_item",
        target_selection: "all",
        allocation_method: "across",
        value_type: Math.random() < 0.5 ? "percentage" : "fixed_amount",
        value: Math.random() < 0.5 ? "-10.00" : "-5.00",
        customer_selection: "all",
        starts_at: new Date().toISOString(),
      },
    };
    const prRes = await axios.post(prUrl, prBody, { headers: shopifyHeaders(accessToken) });
    const prId = prRes.data.price_rule.id;

    // discount code
    const dcUrl = `${shopifyBase(storeDomain)}/price_rules/${prId}/discount_codes.json`;
    const code = `SEED${tenantId}${idx}${randomInt(10,99)}`;
    const dcRes = await axios.post(dcUrl, { discount_code: { code } }, { headers: shopifyHeaders(accessToken) });

    return { price_rule: prRes.data.price_rule, discount_code: dcRes.data.discount_code };
  } catch (err) {
    return null;
  }
}

// Insert checkout events into custom_events to simulate started/abandoned
async function insertCheckoutEventsDirect(tenantId, branchId, checkoutId, type, payload) {
  try {
    await sequelize.query(
      `INSERT INTO custom_events (tenant_id, branch_id, event_type, shopify_resource_id, payload, created_at)
       VALUES (:tenant_id, :branch_id, :event_type, :resource_id, :payload::jsonb, :created_at)`,
      {
        replacements: {
          tenant_id: tenantId,
          branch_id: branchId || null,
          event_type: type,
          resource_id: checkoutId,
          payload: JSON.stringify(payload || {}),
          created_at: new Date().toISOString(),
        },
      }
    );
  } catch (e) {
    console.error("custom_event insert failed", e.message);
  }
}

// Main per-tenant seeding
async function seedTenant(tenant) {
  const storeDomain = tenant.store_domain;
  const accessToken = tenant.access_token;
  const tId = tenant.tenant_id;

  console.log(`\n=== Seeding tenant ${tId} - ${tenant.display_name} (${storeDomain}) ===`);

  // 1) Create customers
  const createdCustomers = [];
  for (let i = 0; i < CONFIG.customersPerTenant; i++) {
    try {
      const resp = await axios.post(`${shopifyBase(storeDomain)}/customers.json`, customerPayload(i, tId), {
        headers: shopifyHeaders(accessToken),
      });
      createdCustomers.push(resp.data.customer);
      console.log(`  + customer created: ${resp.data.customer.email}`);
    } catch (err) {
      console.warn("  - customer create failed", err.response?.data || err.message);
    }
    await wait(CONFIG.apiDelayMs);
  }

  // 2) Create products
  const createdProducts = [];
  for (let i = 0; i < CONFIG.productsPerTenant; i++) {
    try {
      const resp = await axios.post(`${shopifyBase(storeDomain)}/products.json`, productPayload(i, tId), {
        headers: shopifyHeaders(accessToken),
      });
      createdProducts.push(resp.data.product);
      console.log(`  + product created: ${resp.data.product.title}`);
    } catch (err) {
      console.warn("  - product create failed", err.response?.data || err.message);
    }
    await wait(CONFIG.apiDelayMs);
  }

  // 3) Create discount(s)
  const discounts = [];
  for (let d = 0; d < 2; d++) {
    const dres = await createDiscount(storeDomain, accessToken, tId, d);
    if (dres) {
      discounts.push(dres);
      console.log("  + discount created:", dres.discount_code.code);
    }
    await wait(CONFIG.apiDelayMs);
  }

  // 4) Create live orders (Admin API) from created customers & products
  const createdOrders = [];
  try {
    if (createdCustomers.length && createdProducts.length) {
      for (let i = 0; i < CONFIG.liveOrdersPerTenant; i++) {
        const cust = createdCustomers[randomInt(0, createdCustomers.length - 1)];
        const prod = createdProducts[randomInt(0, createdProducts.length - 1)];
        const variantId = prod.variants?.[0]?.id;
        if (!variantId) continue;

        const quantity = randomInt(1, 3);
        const orderBody = orderPayload(cust.id, variantId, quantity, tId);

        try {
          const orderRes = await axios.post(`${shopifyBase(storeDomain)}/orders.json`, orderBody, {
            headers: shopifyHeaders(accessToken),
          });
          const order = orderRes.data.order;
          createdOrders.push(order);
          console.log(`  + order created: ${order.id} total ${order.total_price}`);

          // create fulfillment (best-effort)
          await wait(200); // small pause
          try {
            await axios.post(`${shopifyBase(storeDomain)}/orders/${order.id}/fulfillments.json`,
              { fulfillment: { location_id: null, notify_customer: false } },
              { headers: shopifyHeaders(accessToken) }
            );
            console.log(`    → fulfillment created for order ${order.id}`);
          } catch (_) {
            // OK if not possible in dev stores or missing location
          }
        } catch (err) {
          console.warn("  - order create failed", err.response?.data || err.message);
        }

        await wait(CONFIG.orderDelayMs);
      }
    }
  } catch (err) {
    console.warn("orders creation block failed", err.message);
  }

  // 5) Create some draft orders (optional) — helpful to test manual conversions
  for (let i = 0; i < 3; i++) {
    try {
      const line_item = createdProducts.length ? [{ variant_id: createdProducts[0].variants[0].id, quantity: 1 }] : [];
      await axios.post(`${shopifyBase(storeDomain)}/draft_orders.json`, {
        draft_order: {
          line_items: line_item,
          note: `Draft order seeded for tenant ${tId}`,
          use_customer_default_address: true,
        },
      }, { headers: shopifyHeaders(accessToken) });
      console.log(`  + draft order created`);
    } catch (err) {
      // ignore
    }
    await wait(CONFIG.apiDelayMs);
  }

  // 6) Insert checkout_started / checkout_abandoned events into custom_events for analytics
  // We'll simulate checkouts for a subset of createdCustomers
  for (let i = 0; i < Math.min(10, createdCustomers.length); i++) {
    const c = createdCustomers[i];
    const checkoutId = Number(String(Date.now()).slice(0, 12)) + i;
    const checkoutPayload = {
      checkout_id: checkoutId,
      customer_id: c.id,
      email: c.email,
      line_items_count: randomInt(1, 3),
      total_price: money(randomInt(20, 300)),
      created_at: new Date().toISOString(),
    };

    // insert started
    await insertCheckoutEventsDirect(tId, null, checkoutId, "checkout_started", checkoutPayload);
    // randomly mark some as abandoned after X-10 minutes
    if (Math.random() < 0.45) {
      await wait(200); // create some time diff
      checkoutPayload.abandoned_at = new Date().toISOString();
      await insertCheckoutEventsDirect(tId, null, checkoutId, "checkout_abandoned", checkoutPayload);
      console.log(`  + simulated checkout_abandoned for checkout ${checkoutId}`);
    } else {
      console.log(`  + simulated checkout_started for checkout ${checkoutId}`);
    }
  }

  // 7) End of tenant
  console.log(`=== done tenant ${tId} — customers: ${createdCustomers.length}, products: ${createdProducts.length}, orders: ${createdOrders.length} ===`);
  return { createdCustomers, createdProducts, createdOrders, discounts };
}

// Insert history orders directly into your DB to create 6 months of signal
async function seedTenantHistory(tenant) {
  const tenantId = tenant.tenant_id;
  const now = new Date();
  const count = CONFIG.historyOrdersPerTenant;

  console.log(`\n+++ Backfilling ${count} historical orders directly into DB for tenant ${tenantId} (6 months) +++`);

  for (let i = 0; i < count; i++) {
    const daysBack = randomInt(0, 180);
    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - daysBack);
    const orderIdFake = 10_000_000_000 + tenantId * 1_000_000 + i;
    const amount = money(Math.random() * 300 + 5);

    try {
      await sequelize.query(
        `INSERT INTO orders (tenant_id, shopify_order_id, total_amount, financial_status, line_items, metadata, created_at, updated_at)
         VALUES (:tenant_id, :order_id, :total, 'paid', '[]'::jsonb, '{}'::jsonb, :created_at, :created_at)
         ON CONFLICT DO NOTHING;`,
        {
          replacements: {
            tenant_id: tenantId,
            order_id: orderIdFake,
            total: amount,
            created_at: createdAt.toISOString(),
          },
        }
      );
    } catch (err) {
      console.warn("  - history insert failed (ignored):", err.message);
    }

    // Light batching / throttle to avoid hammering DB
    if (i % 50 === 0) await wait(50);
  }

  console.log(`+++ Done backfill for tenant ${tenantId} +++`);
}

// Runner — loop tenants and seed
async function runAll() {
  try {
    console.log("Connecting DB...");
    // Note: sequelize exported as { sequelize } in your config. We already import the instance
    // Ensure the connection is alive
    await sequelize.authenticate?.() || Promise.resolve();
  } catch (e) {
    console.error("DB connection failed:", e.message || e);
    process.exit(1);
  }

  try {
    // Get tenants from DB
    const [tenants] = await sequelize.query("SELECT * FROM tenants ORDER BY tenant_id", { raw: true });
    if (!tenants || tenants.length === 0) {
      console.error("No tenants found in tenants table. Seed the tenants first.");
      process.exit(1);
    }

    for (const tenant of tenants) {
      // Respect low-volume dev stores — optionally skip heavy tenants if needed
      await seedTenant(tenant);
      await seedTenantHistory(tenant);
      // small pause between tenants
      await wait(1500);
    }

    console.log("\nALL TENANTS SEEDED ✅");
    console.log("Now validate via queries and dashboards, and optionally run storefront test orders in test-mode for extra realism.");
  } catch (err) {
    console.error("Seeding failed:", err.response?.data || err.message || err);
  } finally {
    await sequelize.close();
  }
}

// Start
runAll();
