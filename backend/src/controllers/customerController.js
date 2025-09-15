// controllers/customerController.js
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database");

function requireTenant(req, res) {
  if (!req.user || !req.user.tenantId) {
    res.status(403).json({ error: "No tenant selected. Please set current tenant." });
    return false;
  }
  return true;
}

// ✅ Get all customers for tenant
exports.getCustomers = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const customers = await sequelize.query(
      `SELECT id, tenant_id, shopify_customer_id, first_name, last_name, email, phone, address, created_at, updated_at
       FROM customers
       WHERE tenant_id = :tenant_id
       ORDER BY created_at DESC`,
      { replacements: { tenant_id: req.user.tenantId }, type: QueryTypes.SELECT }
    );

    res.json({ success: true, customers });
  } catch (err) {
    console.error("getCustomers error:", err);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
};

// ✅ Get single customer by Shopify ID
exports.getCustomerById = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const id = req.params.id;

    const [customer] = await sequelize.query(
      `SELECT id, tenant_id, shopify_customer_id, first_name, last_name, email, phone, address, created_at, updated_at
       FROM customers
       WHERE tenant_id = :tenant_id AND shopify_customer_id = :id
       LIMIT 1`,
      { replacements: { tenant_id: req.user.tenantId, id }, type: QueryTypes.SELECT }
    );

    if (!customer) return res.status(404).json({ error: "Customer not found" });

    res.json({ success: true, customer });
  } catch (err) {
    console.error("getCustomerById error:", err);
    res.status(500).json({ error: "Failed to fetch customer" });
  }
};

// ✅ Create new customer
exports.createCustomer = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const { first_name, last_name, email, phone, address, shopify_customer_id } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({ error: "First name, last name, and email are required" });
    }

    const created = await sequelize.query(
      `INSERT INTO customers
        (tenant_id, first_name, last_name, email, phone, address, shopify_customer_id, created_at, updated_at)
       VALUES (:tenant_id, :first_name, :last_name, :email, :phone, :address::jsonb, :shopify_customer_id, NOW(), NOW())
       RETURNING id, tenant_id, shopify_customer_id, first_name, last_name, email, phone, address, created_at, updated_at`,
      {
        replacements: {
          tenant_id: req.user.tenantId,
          first_name,
          last_name,
          email,
          phone: phone || null,
          address: JSON.stringify(address || {}),
          shopify_customer_id: shopify_customer_id || null,
        },
        type: QueryTypes.SELECT, // ✅ instead of INSERT
      }
    );

    const customer = created[0];
    res.status(201).json({ success: true, customer });
  } catch (err) {
    console.error("createCustomer error:", err);
    res.status(500).json({ error: "Failed to create customer" });
  }
};

// ✅ Update existing customer
exports.updateCustomer = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const id = req.params.id;
    const { first_name, last_name, email, phone, address } = req.body;

    const updated = await sequelize.query(
      `UPDATE customers
       SET first_name = :first_name,
           last_name = :last_name,
           email = :email,
           phone = :phone,
           address = :address::jsonb,
           updated_at = NOW()
       WHERE tenant_id = :tenant_id AND shopify_customer_id = :id
       RETURNING id, tenant_id, shopify_customer_id, first_name, last_name, email, phone, address, created_at, updated_at`,
      {
        replacements: {
          first_name,
          last_name,
          email,
          phone: phone || null,
          address: JSON.stringify(address || {}),
          tenant_id: req.user.tenantId,
          id,
        },
        type: QueryTypes.SELECT, // ✅ instead of UPDATE
      }
    );

    if (!updated.length) return res.status(404).json({ error: "Customer not found" });

    res.json({ success: true, customer: updated[0] });
  } catch (err) {
    console.error("updateCustomer error:", err);
    res.status(500).json({ error: "Failed to update customer" });
  }
};

// ✅ Delete customer
exports.deleteCustomer = async (req, res) => {
  if (!requireTenant(req, res)) return;
  try {
    const id = req.params.id;

    const deleted = await sequelize.query(
      `DELETE FROM customers
       WHERE tenant_id = :tenant_id AND shopify_customer_id = :id
       RETURNING id`,
      { replacements: { tenant_id: req.user.tenantId, id }, type: QueryTypes.SELECT } // ✅ instead of DELETE
    );

    if (!deleted.length) return res.status(404).json({ error: "Customer not found" });

    res.json({ success: true, message: "Customer deleted" });
  } catch (err) {
    console.error("deleteCustomer error:", err);
    res.status(500).json({ error: "Failed to delete customer" });
  }
};
