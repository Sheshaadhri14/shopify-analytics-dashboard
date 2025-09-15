// src/controllers/insightsController.js
const { sequelize } = require("../config/database");

// Helper: safe parse integer
function r0(row, key, def = 0) {
  return row && row[key] !== undefined ? row[key] : def;
}

/* ---------------- Orders Insights ---------------- */
exports.ordersInsights = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Totals
    const totalsQ = `
      SELECT 
        COUNT(*)::int AS total_orders,
        COALESCE(SUM(total_amount),0)::float AS total_revenue,
        COALESCE(AVG(total_amount),0)::float AS avg_order_value
      FROM orders
      WHERE tenant_id = $1
    `;
    const [totals] = await sequelize.query(totalsQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    // Orders by status
    const statusQ = `
      SELECT financial_status, COUNT(*)::int AS count
      FROM orders
      WHERE tenant_id = $1
      GROUP BY financial_status
    `;
    const status = await sequelize.query(statusQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    // Orders trend last 30 days
    const trendQ = `
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS orders
      FROM orders
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `;
    const trend = await sequelize.query(trendQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    // Unique customers (use customer_shopify_id from orders)
    const uniqueQ = `
      SELECT COUNT(DISTINCT customer_shopify_id)::int AS unique_customers
      FROM orders
      WHERE tenant_id = $1
    `;
    const [unique] = await sequelize.query(uniqueQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    return res.json({
      total_orders: r0(totals, "total_orders", 0),
      total_revenue: parseFloat(r0(totals, "total_revenue", 0)),
      avg_order_value: parseFloat(r0(totals, "avg_order_value", 0)),
      unique_customers: r0(unique, "unique_customers", 0),
      orders_by_status: status,
      orders_trend: trend,
    });
  } catch (err) {
    console.error("Error in ordersInsights:", err);
    return res.status(500).json({ error: "Failed to fetch order insights" });
  }
};

/* ---------------- Customers Insights ---------------- */
exports.customersInsights = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const totalQ = `SELECT COUNT(*)::int AS total_customers FROM customers WHERE tenant_id = $1`;
    const [total] = await sequelize.query(totalQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const newMonthQ = `
      SELECT COUNT(*)::int AS new_customers_month
      FROM customers
      WHERE tenant_id = $1
        AND created_at >= date_trunc('month', now())
    `;
    const [newMonth] = await sequelize.query(newMonthQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const newWeekQ = `
      SELECT COUNT(*)::int AS new_customers_week
      FROM customers
      WHERE tenant_id = $1
        AND created_at >= date_trunc('week', now())
    `;
    const [newWeek] = await sequelize.query(newWeekQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    // Active = customers who have orders in last 90 days
    const activeQ = `
      SELECT COUNT(DISTINCT c.id)::int AS active_customers
      FROM customers c
      JOIN orders o ON o.customer_shopify_id = c.shopify_customer_id AND o.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1
        AND o.created_at >= NOW() - INTERVAL '90 days'
    `;
    const [active] = await sequelize.query(activeQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const activeCount = parseInt(active.active_customers || 0, 10);
    const totalCount = parseInt(total.total_customers || 0, 10);
    const inactiveCount = Math.max(0, totalCount - activeCount);

    const topQ = `
      SELECT c.id, c.email, COALESCE(SUM(o.total_amount),0)::float AS total_spent
      FROM customers c
      LEFT JOIN orders o ON o.customer_shopify_id = c.shopify_customer_id AND o.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1
      GROUP BY c.id, c.email
      ORDER BY total_spent DESC
      LIMIT 10
    `;
    const top = await sequelize.query(topQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    return res.json({
      total_customers: totalCount,
      new_customers_month: parseInt(newMonth.new_customers_month || 0, 10),
      new_customers_week: parseInt(newWeek.new_customers_week || 0, 10),
      active_customers: activeCount,
      inactive_customers: inactiveCount,
      top_customers: top,
    });
  } catch (err) {
    console.error("Error in customersInsights:", err);
    return res.status(500).json({ error: "Failed to fetch customer insights" });
  }
};

/* ---------------- Products Insights ---------------- */
exports.productsInsights = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const totalsQ = `
      SELECT COUNT(*)::int AS total_products,
             COALESCE(AVG(price),0)::float AS avg_price
      FROM products
      WHERE tenant_id = $1
    `;
    const [totals] = await sequelize.query(totalsQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    // Top-selling products (use line_items JSONB from orders)
    const topSalesQ = `
      SELECT p.id, p.title,
       COALESCE(SUM((li->>'quantity')::int),0) AS total_sales
FROM products p
LEFT JOIN orders o ON o.tenant_id = p.tenant_id
LEFT JOIN LATERAL jsonb_array_elements(o.line_items) AS li ON TRUE
WHERE p.tenant_id = $1
GROUP BY p.id, p.title
ORDER BY total_sales DESC
LIMIT 10;

    `;
    const topSales = await sequelize.query(topSalesQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const lowInvQ = `
      SELECT id, title, inventory AS inventory_quantity
      FROM products
      WHERE tenant_id = $1
        AND inventory <= 5
      ORDER BY inventory ASC
      LIMIT 20
    `;
    const lowInv = await sequelize.query(lowInvQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    return res.json({
      total_products: parseInt(totals.total_products || 0, 10),
      avg_price: parseFloat(totals.avg_price || 0),
      top_products: topSales,
      low_inventory_count: lowInv.length,
      low_inventory_products: lowInv,
    });
  } catch (err) {
    console.error("Error in productsInsights:", err);
    return res.status(500).json({ error: "Failed to fetch product insights" });
  }
};

/* ---------------- Events Insights ---------------- */
exports.eventsInsights = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const totalQ = `SELECT COUNT(*)::int AS total_events FROM events WHERE tenant_id = $1`;
    const [total] = await sequelize.query(totalQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const byTypeQ = `
      SELECT event_type, COUNT(*)::int AS count
      FROM events
      WHERE tenant_id = $1
      GROUP BY event_type
      ORDER BY count DESC
    `;
    const byType = await sequelize.query(byTypeQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const last24Q = `
      SELECT COUNT(*)::int AS events_24h
      FROM events
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '24 hours'
    `;
    const [last24] = await sequelize.query(last24Q, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const last7Q = `
      SELECT COUNT(*)::int AS events_7d
      FROM events
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
    `;
    const [last7] = await sequelize.query(last7Q, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    const recentQ = `
      SELECT id, event_type, created_at
      FROM events
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const recent = await sequelize.query(recentQ, { bind: [tenantId], type: sequelize.QueryTypes.SELECT });

    return res.json({
      total_events: parseInt(total.total_events || 0, 10),
      events_by_type: byType,
      events_24h: parseInt(last24.events_24h || 0, 10),
      events_7d: parseInt(last7.events_7d || 0, 10),
      recent_events: recent,
    });
  } catch (err) {
    console.error("Error in eventsInsights:", err);
    return res.status(500).json({ error: "Failed to fetch events insights" });
  }
};
