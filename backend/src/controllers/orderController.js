// controllers/orderController.js
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ✅ Tenant check helper
function requireTenant(req, res) {
  if (!req.user || !req.user.tenantId) {
    res.status(403).json({ success: false, error: "No tenant selected. Please set current tenant." });
    return false;
  }
  return true;
}

// ✅ GET all orders for tenant (with consistent response)
exports.getOrders = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const [orders] = await sequelize.query(
      `SELECT * 
       FROM orders 
       WHERE tenant_id = :tenantId 
       ORDER BY created_at DESC`,
      {
        replacements: { tenantId: req.user.tenantId },
        type: QueryTypes.SELECT,
      }
    );

    res.json({ success: true, orders });
  } catch (err) {
    console.error("getOrders failed:", err);
    res.status(500).json({ success: false, error: "Failed to fetch orders" });
  }
};

// ✅ GET single order
exports.getOrderById = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { id } = req.params;
    const [orders] = await sequelize.query(
      `SELECT * 
       FROM orders 
       WHERE tenant_id = :tenantId 
         AND shopify_order_id = :id
       LIMIT 1`,
      {
        replacements: { tenantId: req.user.tenantId, id },
        type: QueryTypes.SELECT,
      }
    );

    if (!orders || orders.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, order: orders[0] });
  } catch (err) {
    console.error("getOrderById failed:", err);
    res.status(500).json({ success: false, error: "Failed to fetch order" });
  }
};

// ✅ CREATE order
exports.createOrder = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const {
      shopify_order_id,
      customer_shopify_id,
      total_amount,
      financial_status,
      line_items,
      metadata,
    } = req.body;

    const [rows] = await sequelize.query(
      `INSERT INTO orders
        (tenant_id, shopify_order_id, customer_shopify_id, total_amount, financial_status, line_items, metadata, created_at, updated_at)
       VALUES (:tenantId, :shopify_order_id, :customer_shopify_id, :total_amount, :financial_status, :line_items::jsonb, :metadata::jsonb, now(), now())
       RETURNING *`,
      {
        replacements: {
          tenantId: req.user.tenantId,
          shopify_order_id,
          customer_shopify_id,
          total_amount,
          financial_status,
          line_items: JSON.stringify(line_items || []),
          metadata: JSON.stringify(metadata || {}),
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ success: true, order: rows[0] });
  } catch (err) {
    console.error("createOrder failed:", err);
    res.status(500).json({ success: false, error: "Failed to create order" });
  }
};

// ✅ UPDATE order
exports.updateOrder = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { id } = req.params;
    const { total_amount, financial_status, line_items, metadata } = req.body;

    const [rows] = await sequelize.query(
      `UPDATE orders 
       SET total_amount = :total_amount,
           financial_status = :financial_status,
           line_items = :line_items::jsonb,
           metadata = :metadata::jsonb,
           updated_at = now()
       WHERE tenant_id = :tenantId 
         AND shopify_order_id = :id
       RETURNING *`,
      {
        replacements: {
          tenantId: req.user.tenantId,
          id,
          total_amount,
          financial_status,
          line_items: JSON.stringify(line_items || []),
          metadata: JSON.stringify(metadata || {}),
        },
        type: QueryTypes.UPDATE,
      }
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, order: rows[0] });
  } catch (err) {
    console.error("updateOrder failed:", err);
    res.status(500).json({ success: false, error: "Failed to update order" });
  }
};

// ✅ DELETE order
exports.deleteOrder = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { id } = req.params;

    const [rows] = await sequelize.query(
      `DELETE FROM orders 
       WHERE tenant_id = :tenantId 
         AND shopify_order_id = :id
       RETURNING *`,
      {
        replacements: { tenantId: req.user.tenantId, id },
        type: QueryTypes.DELETE,
      }
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error("deleteOrder failed:", err);
    res.status(500).json({ success: false, error: "Failed to delete order" });
  }
};
