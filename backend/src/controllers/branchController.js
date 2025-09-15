// controllers/branchController.js
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// ✅ Fetch all branches for tenant
exports.getBranches = async (req, res) => {
  try {
    const { tenantId } = req.user;

    const branches = await sequelize.query(
      `SELECT id, tenant_id, name, location, created_at, updated_at
       FROM branches
       WHERE tenant_id = :tenantId
       ORDER BY created_at DESC`,
      {
        replacements: { tenantId },
        type: QueryTypes.SELECT,
      }
    );

    res.json({ success: true, branches });
  } catch (err) {
    console.error("GetBranches error:", err);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};

// ✅ Create new branch for tenant
exports.createBranch = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({ error: "Name and location required" });
    }

    // Use SELECT type to capture RETURNING rows (Postgres)
    const created = await sequelize.query(
      `INSERT INTO branches (tenant_id, name, location, created_at, updated_at)
       VALUES (:tenantId, :name, :location, NOW(), NOW())
       RETURNING id, tenant_id, name, location, created_at, updated_at`,
      {
        replacements: { tenantId, name, location },
        type: QueryTypes.SELECT,
      }
    );

    const branch = created[0]; // guaranteed row

    res.status(201).json({ success: true, branch });
  } catch (err) {
    console.error("CreateBranch error:", err);
    res.status(500).json({ error: "Failed to create branch" });
  }
};
