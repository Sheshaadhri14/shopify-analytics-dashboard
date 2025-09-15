// routes/index.js
const express = require("express");
const router = express.Router();

// Controllers
const authController = require("../controllers/authController");
const branchController = require("../controllers/branchController");
const shopifyWebhookController = require("../controllers/shopifyWebhookController");
const analyticsController = require("../controllers/analyticsController");
const customerController = require("../controllers/customerController");
const productController = require("../controllers/productController");
const orderController = require("../controllers/orderController");
const eventController = require("../controllers/eventController");
const tenantController = require("../controllers/tenantController");
const insightsController = require("../controllers/insightsController");

// Middleware
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware"); // ✅ New

// routes/index.js

// ---------------------- AUTH ----------------------
router.post("/api/auth/register", authController.register);
router.post("/api/auth/login", authController.login);

// ---------------------- BRANCHES ----------------------
router.use("/api/branches", authMiddleware, express.Router()
  .get("/", branchController.getBranches)
  .post("/", branchController.createBranch)
);

// ---------------------- SHOPIFY WEBHOOKS ----------------------
router.post("/api/webhooks", shopifyWebhookController.handleWebhook);

// ---------------------- ANALYTICS ----------------------
router.use("/api/analytics", authMiddleware, express.Router()
  .get("/overview", analyticsController.overview)
  .get("/revenue-trends", analyticsController.revenueTrends)
  .get("/top-customers", analyticsController.topCustomers)
  .get("/branch-performance", analyticsController.branchPerformance)
  .get("/abandonment", analyticsController.abandonment)
  .get("/global-overview", adminMiddleware, analyticsController.globalOverview) // ✅ Admin only
);

// ---------------------- CUSTOMERS CRUD ----------------------
router.use("/api/customers", authMiddleware, express.Router()
  .get("/", customerController.getCustomers)
  .get("/:id", customerController.getCustomerById)
  .post("/", customerController.createCustomer)
  .put("/:id", customerController.updateCustomer)
  .delete("/:id", customerController.deleteCustomer)
);

// ---------------------- PRODUCTS CRUD ----------------------
router.use("/api/products", authMiddleware, express.Router()
  .get("/", productController.getProducts)
  .get("/:id", productController.getProductById)
  .post("/", productController.createProduct)
  .put("/:id", productController.updateProduct)
  .delete("/:id", productController.deleteProduct)
);

// ---------------------- ORDERS CRUD ----------------------
router.use("/api/orders", authMiddleware, express.Router()
  .get("/", orderController.getOrders)
  .get("/:id", orderController.getOrderById)
  .post("/", orderController.createOrder)
  .put("/:id", orderController.updateOrder)
  .delete("/:id", orderController.deleteOrder)
);

// ---------------------- EVENTS CRUD ----------------------
router.use("/api/events", authMiddleware, express.Router()
  .get("/", eventController.getEvents)
);

// ---------------------- INSIGHTS (separate) ----------------------
router.get("/api/insights/orders", authMiddleware, insightsController.ordersInsights);
router.get("/api/insights/customers", authMiddleware, insightsController.customersInsights);
router.get("/api/insights/products", authMiddleware, insightsController.productsInsights);
router.get("/api/insights/events", authMiddleware, insightsController.eventsInsights);
// ---------------------- TENANTS (Admin only) ----------------------
router.get("/api/tenants", authMiddleware, adminMiddleware, tenantController.getTenants);

module.exports = router;
