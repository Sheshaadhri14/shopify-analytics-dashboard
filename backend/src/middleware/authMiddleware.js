// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const ALLOW_TENANT_FALLBACK = process.env.ALLOW_TENANT_FALLBACK === "true";

module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    // ✅ Case 1: JWT authentication
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          userId: decoded.userId,
          tenantId: decoded.tenantId,
          is_admin: !!decoded.is_admin,
        };
        return next();
      } catch (err) {
        return res.status(403).json({ success: false, error: "Invalid token" });
      }
    }

    // ✅ Case 2: Optional tenantId fallback (only if explicitly allowed)
    if (ALLOW_TENANT_FALLBACK) {
      const tenantId =
        req.headers["x-tenant-id"] ||
        req.query.tenantId ||
        req.body.tenantId;

      if (tenantId && !isNaN(parseInt(tenantId, 10))) {
        req.user = { tenantId: parseInt(tenantId, 10) };
        return next();
      }
    }

    // ❌ No token and no valid tenantId
    return res.status(401).json({
      success: false,
      error: "Unauthorized: token required (or tenantId if fallback enabled)",
    });
  } catch (err) {
    console.error("❌ authMiddleware error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Auth middleware failure" });
  }
};
