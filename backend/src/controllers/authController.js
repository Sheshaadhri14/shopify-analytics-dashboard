// controllers/authController.js
const { QueryTypes } = require("sequelize");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sequelize } = require("../config/database");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// ---------------- Register ----------------
exports.register = async (req, res) => {
  try {
    const { email, password, storeId } = req.body;

    if (!email || !password || !storeId) {
      return res.status(400).json({ error: "email, password, and storeId are required" });
    }

    // Check if email exists
    const existing = await sequelize.query(
      `SELECT id FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    await sequelize.query(
      `INSERT INTO users (tenant_id, email, password_hash, is_admin, created_at, updated_at)
       VALUES (:tenant_id, :email, :password_hash, false, NOW(), NOW())`,
      {
        replacements: {
          tenant_id: storeId,
          email,
          password_hash: hashed,
        },
        type: QueryTypes.INSERT,
      }
    );

    res.json({ message: "Registration successful. Please login." });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to register" });
  }
};

// ---------------- Login ----------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email & password required" });
    }

    const users = await sequelize.query(
      `SELECT id, tenant_id, email, password_hash, is_admin 
       FROM users WHERE email = :email LIMIT 1`,
      { replacements: { email }, type: QueryTypes.SELECT }
    );

    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tenantId: user.tenant_id,
        is_admin: user.is_admin,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      is_admin: user.is_admin,
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to login" });
  }
};
