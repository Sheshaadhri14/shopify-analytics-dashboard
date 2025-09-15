// controllers/productController.js
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

// ✅ GET all products (tenant-wide, optional branch filter)
exports.getProducts = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { tenantId } = req.user;
    const { branchId } = req.query;

    let query = "SELECT * FROM products WHERE tenant_id = :tenantId";
    const replacements = { tenantId };

    if (branchId) {
      query += " AND branch_id = :branchId";
      replacements.branchId = branchId;
    }

    const products = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
    });

    res.json({ success: true, products });
  } catch (err) {
    console.error("getProducts error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
};

// ✅ GET single product by Shopify ID
exports.getProductById = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const products = await sequelize.query(
      "SELECT * FROM products WHERE tenant_id = :tenantId AND shopify_product_id = :id",
      { replacements: { tenantId, id }, type: QueryTypes.SELECT }
    );

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, product: products[0] });
  } catch (err) {
    console.error("getProductById error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
};

// ✅ CREATE product
exports.createProduct = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { tenantId } = req.user;
    const { title, handle, price, inventory, shopify_product_id, metadata, branch_id, data } = req.body;

    const [rows] = await sequelize.query(
      `INSERT INTO products
        (tenant_id, branch_id, title, handle, price, inventory, shopify_product_id, metadata, data, created_at, updated_at)
       VALUES (:tenantId, :branch_id, :title, :handle, :price, :inventory, :shopify_product_id, :metadata::jsonb, :data::jsonb, now(), now())
       RETURNING *`,
      {
        replacements: {
          tenantId,
          branch_id: branch_id || null,
          title,
          handle,
          price,
          inventory,
          shopify_product_id,
          metadata: JSON.stringify(metadata || {}),
          data: JSON.stringify(data || {}),
        },
        type: QueryTypes.INSERT,
      }
    );

    res.status(201).json({ success: true, product: rows[0] });
  } catch (err) {
    console.error("createProduct error:", err);
    res.status(500).json({ success: false, error: "Failed to create product" });
  }
};

// ✅ UPDATE product
exports.updateProduct = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { title, handle, price, inventory, metadata, branch_id, data } = req.body;

    const [rows] = await sequelize.query(
      `UPDATE products
       SET title = :title,
           handle = :handle,
           price = :price,
           inventory = :inventory,
           branch_id = :branch_id,
           metadata = :metadata::jsonb,
           data = :data::jsonb,
           updated_at = now()
       WHERE tenant_id = :tenantId AND shopify_product_id = :id
       RETURNING *`,
      {
        replacements: {
          tenantId,
          id,
          title,
          handle,
          price,
          inventory,
          branch_id: branch_id || null,
          metadata: JSON.stringify(metadata || {}),
          data: JSON.stringify(data || {}),
        },
        type: QueryTypes.UPDATE,
      }
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, product: rows[0] });
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
};

// ✅ DELETE product
exports.deleteProduct = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { tenantId } = req.user;
    const { id } = req.params;

    const [rows] = await sequelize.query(
      `DELETE FROM products 
       WHERE tenant_id = :tenantId AND shopify_product_id = :id
       RETURNING *`,
      {
        replacements: { tenantId, id },
        type: QueryTypes.DELETE,
      }
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }

    res.json({ success: true, deleted: rows[0] });
  } catch (err) {
    console.error("deleteProduct error:", err);
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
};
