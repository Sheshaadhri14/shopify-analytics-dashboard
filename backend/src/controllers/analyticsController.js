// controllers/analyticsController.js
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ---------------- Helper ----------------
function getTenantId(req) {
  return req.user?.tenantId || req.query.tenantId || req.headers["x-tenant-id"];
}

// ---------------- Overview ----------------
exports.overview = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });

    const totals = await sequelize.query(
      `
      SELECT 
        (SELECT COUNT(*) FROM customers WHERE tenant_id = :tenantId) AS customers,
        (SELECT COUNT(*) FROM orders WHERE tenant_id = :tenantId) AS orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE tenant_id = :tenantId) AS revenue
      `,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const stats = totals[0]; // SELECT returns array of rows

    res.json({
      customers: parseInt(stats.customers) || 0,
      orders: parseInt(stats.orders) || 0,
      revenue: parseFloat(stats.revenue) || 0,
    });
  } catch (err) {
    console.error("Overview error:", err);
    res.status(500).json({ error: "Failed to load overview" });
  }
};

// ---------------- Revenue Trends ----------------
exports.revenueTrends = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });

    const { start, end } = req.query;
    const replacements = { tenantId };
    let dateFilter = "";

    if (start && end) {
      dateFilter = "AND created_at BETWEEN :start AND :end";
      replacements.start = start;
      replacements.end = end;
    } else {
      dateFilter = "AND created_at >= NOW() - INTERVAL '6 months'";
    }

    const results = await sequelize.query(
      `
      SELECT  
  TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
  COALESCE(SUM(total_amount), 0) AS revenue,
  COUNT(*) AS orders
FROM orders
WHERE tenant_id = :tenantId ${dateFilter}
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month ASC

      `,
      { replacements, type: QueryTypes.SELECT }
    );

    res.json(results);
  } catch (err) {
    console.error("Revenue trends error:", err);
    res.status(500).json({ error: "Failed to load revenue trends" });
  }
};

// ---------------- Top Customers ----------------
exports.topCustomers = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });

    const results = await sequelize.query(
      `
      SELECT 
        c.first_name, 
        c.last_name, 
        SUM(o.total_amount) AS total_spent
      FROM orders o
      INNER JOIN customers c 
        ON o.customer_shopify_id = c.shopify_customer_id 
       AND o.tenant_id = c.tenant_id
      WHERE o.tenant_id = :tenantId
      GROUP BY c.first_name, c.last_name
      ORDER BY total_spent DESC
      LIMIT 5
      `,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    res.json(results);
  } catch (err) {
    console.error("Top customers error:", err);
    res.status(500).json({ error: "Failed to load top customers" });
  }
};

// ---------------- Branch Performance ----------------
exports.branchPerformance = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });

    const results = await sequelize.query(
      `
      SELECT 
        b.name, 
        COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM branches b
      LEFT JOIN orders o 
        ON b.branch_id = o.branch_id 
       AND b.tenant_id = o.tenant_id
      WHERE b.tenant_id = :tenantId
      GROUP BY b.name
      ORDER BY revenue DESC
      `,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    res.json(results);
  } catch (err) {
    console.error("Branch performance error:", err);
    res.status(500).json({ error: "Failed to load branch performance" });
  }
};

// ---------------- Checkout Abandonment ----------------
exports.abandonment = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "Tenant ID required" });

    const result = await sequelize.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'checkout_started') AS checkouts_started,
        COUNT(*) FILTER (WHERE event_type = 'checkout_abandoned') AS checkouts_abandoned
      FROM custom_events 
      WHERE tenant_id = :tenantId
      `,
      { replacements: { tenantId }, type: QueryTypes.SELECT }
    );

    const stats = result[0];

    res.json({
      checkouts_started: parseInt(stats.checkouts_started) || 0,
      checkouts_abandoned: parseInt(stats.checkouts_abandoned) || 0,
    });
  } catch (err) {
    console.error("Abandonment error:", err);
    res.status(500).json({ error: "Failed to load abandonment stats" });
  }
};

// ---------------- Global Overview ----------------
exports.globalOverview = async (req, res) => {
  try {
    if (!req.user?.is_admin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const globalStats = await sequelize.query(
      `
      SELECT 
        (SELECT COUNT(DISTINCT tenant_id) FROM tenants) AS total_tenants,
        (SELECT COUNT(*) FROM customers) AS total_customers,
        (SELECT COUNT(*) FROM orders) AS total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS total_revenue
      `,
      { type: QueryTypes.SELECT }
    );

    const tenantStats = await sequelize.query(
      `
      SELECT 
        t.tenant_id,
        t.store_domain,
        t.display_name,
        COUNT(DISTINCT c.id) AS customers,
        COUNT(DISTINCT o.id) AS orders,
        COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM tenants t
      LEFT JOIN customers c ON t.tenant_id = c.tenant_id
      LEFT JOIN orders o ON t.tenant_id = o.tenant_id
      GROUP BY t.tenant_id, t.store_domain, t.display_name
      ORDER BY revenue DESC
      `,
      { type: QueryTypes.SELECT }
    );

    res.json({
      ...globalStats[0], // SELECT returns array
      tenant_stats: tenantStats,
    });
  } catch (err) {
    console.error("Global overview error:", err);
    res.status(500).json({ error: "Failed to load global overview" });
  }
};
