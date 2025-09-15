// controllers/shopifyWebhookController.js
const { Tenant, Customer, Product, Order, CustomEvent } = require("../models"); // Sequelize models
// const crypto = require("crypto"); // HMAC verification temporarily disabled

// --- Verify HMAC from Shopify (disabled for local testing) ---
// function verifyShopifyHmac(req) {
//   const hmacHeader = req.headers["x-shopify-hmac-sha256"];
//   if (!hmacHeader) return false;

//   try {
//     const generatedHash = crypto
//       .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
//       .update(req.rawBody, "utf8")
//       .digest("base64");

//     return crypto.timingSafeEqual(
//       Buffer.from(generatedHash, "base64"),
//       Buffer.from(hmacHeader, "base64")
//     );
//   } catch (err) {
//     console.error("HMAC verification error:", err);
//     return false;
//   }
// }

exports.handleWebhook = async (req, res) => {
  try {
    const topic = req.headers["x-shopify-topic"];
    const shopDomain = req.headers["x-shopify-shop-domain"];
    let tenantId = req.headers["x-tenant-id"]; // optional custom header

    // --- Skip HMAC for testing ---
    // if (!verifyShopifyHmac(req)) return res.status(401).send("Unauthorized");

    // --- Parse body safely ---
    let payload;
    try {
      if (!req.rawBody) throw new Error("rawBody is undefined");
      payload = JSON.parse(req.rawBody.toString("utf8"));
    } catch (err) {
      console.error("❌ Failed to parse webhook payload", err);
      return res.status(400).send("Invalid JSON");
    }

    // --- Respond immediately ---
    res.status(200).send("OK");

    // --- Async processing ---
    setImmediate(async () => {
      console.log(`✅ Webhook received: ${topic} from ${shopDomain}`);

      // Find tenant if tenantId not provided
      if (!tenantId) {
        const tenant = await Tenant.findOne({ where: { store_domain: shopDomain } });
        tenantId = tenant ? tenant.tenant_id : null;
      }
      if (!tenantId) {
        console.error(`❌ No tenant found for shop: ${shopDomain}`);
        return;
      }

      // Socket emitter
      const emitWebhook = req.app.get("emitWebhook");

      try {
        switch (topic) {
          // -------------------- CUSTOMERS --------------------
          case "customers/create":
          case "customers/update":
            await Customer.upsert({
              tenant_id: tenantId,
              shopify_customer_id: payload.id,
              data: payload,
              updated_at: new Date(),
              created_at: new Date(),
            });
            break;

          case "customers/delete":
            await Customer.destroy({ where: { tenant_id: tenantId, shopify_customer_id: payload.id } });
            await CustomEvent.create({
              tenant_id: tenantId,
              event_type: "customer_deleted",
              shopify_resource_id: payload.id,
              payload,
            });
            break;

          // -------------------- PRODUCTS --------------------
          case "products/create":
          case "products/update":
            await Product.upsert({
              tenant_id: tenantId,
              shopify_product_id: payload.id,
              data: payload,
              updated_at: new Date(),
              created_at: new Date(),
            });
            break;

          case "products/delete":
            await Product.destroy({ where: { tenant_id: tenantId, shopify_product_id: payload.id } });
            await CustomEvent.create({
              tenant_id: tenantId,
              event_type: "product_deleted",
              shopify_resource_id: payload.id,
              payload,
            });
            break;

          // -------------------- ORDERS --------------------
          case "orders/create":
          case "orders/updated":
            await Order.upsert({
              tenant_id: tenantId,
              shopify_order_id: payload.id,
              data: payload,
              updated_at: new Date(),
              created_at: new Date(),
            });
            break;

          case "orders/cancelled":
          case "orders/fulfilled":
            await CustomEvent.create({
              tenant_id: tenantId,
              event_type: topic,
              shopify_resource_id: payload.id,
              payload,
            });
            break;

          // -------------------- CHECKOUTS --------------------
          case "checkouts/create":
            await CustomEvent.create({
              tenant_id: tenantId,
              event_type: "checkout_started",
              shopify_resource_id: payload.id,
              payload,
            });
            break;

          case "checkouts/update":
            if (payload.abandoned_checkout_url) {
              await CustomEvent.create({
                tenant_id: tenantId,
                event_type: "checkout_abandoned",
                shopify_resource_id: payload.id,
                payload,
              });
            }
            break;

          // -------------------- FALLBACK --------------------
          default:
            console.log(`⚠️ Unhandled webhook: ${topic}`);
            await CustomEvent.create({
              tenant_id: tenantId,
              event_type: topic,
              shopify_resource_id: payload.id || null,
              payload,
            });
        }

        // Emit event to frontend
        if (emitWebhook) emitWebhook(tenantId, topic, payload);

      } catch (dbErr) {
        console.error("❌ DB error in webhook:", dbErr);
      }
    });
  } catch (err) {
    console.error("❌ Webhook handling error:", err);
    res.status(500).json({ error: err.message });
  }
};
