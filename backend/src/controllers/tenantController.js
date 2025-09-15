// controllers/tenantController.js
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ✅ Get list of tenants (admin only)
exports.getTenants = async (req, res) => {
  try {
    // 🔐 Authorization check
    if (!req.user?.is_admin) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    // 🔎 Fetch tenants
    const tenants = await sequelize.query(
      `SELECT tenant_id, store_domain, display_name
       FROM tenants
       ORDER BY tenant_id`,
      { type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: tenants });
  } catch (err) {
    console.error("❌ getTenants error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
