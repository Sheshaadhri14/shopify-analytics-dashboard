// server.js
const express = require("express");
const routes = require("./src/routes");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

// --- Hardcoded frontend URL and Shopify secret ---
const FRONTEND_URL = "http://localhost:5173"; // Change this to your frontend URL if deployed
const SHOPIFY_API_SECRET = "your-shopify-api-secret"; // Replace with your actual secret

// --- CORS ---
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);

// --- Raw body parser for Shopify webhooks ---
app.use("/api/webhooks", (req, res, next) => {
  let data = [];
  req.on("data", (chunk) => data.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(data);
    next();
  });
});

// --- Normal JSON parser for everything else ---
app.use(express.json());

// --- Routes ---
app.use(routes);

// --- Health check ---
app.get("/", (req, res) => res.send("✅ API is running..."));

// --- HTTP + Socket.IO setup ---
const PORT = 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

app.set("io", io);

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("🔌 New client connected", socket.id);

  const { tenant_id } = socket.handshake.auth || {};
  if (tenant_id) {
    socket.join(`tenant_${tenant_id}`);
    console.log(`✅ Auto-joined tenant room: tenant_${tenant_id}`);
  }

  socket.on("joinTenant", (id) => {
    socket.join(`tenant_${id}`);
    console.log(`✅ Manually joined tenant_${id}`);
  });

  socket.on("disconnect", () => console.log("❌ Client disconnected", socket.id));
});

// --- Helper to emit events to tenants ---
function emitWebhook(tenantId, topic, payload) {
  io.to(`tenant_${tenantId}`).emit("shopify_event", { topic, payload });
}
app.set("emitWebhook", emitWebhook);

// --- Start server ---
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("Shopify secret loaded:", SHOPIFY_API_SECRET);
});
