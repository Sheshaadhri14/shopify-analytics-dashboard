// controllers/eventController.js
const { QueryTypes } = require("sequelize");
const { sequelize } = require("../config/database");

function requireTenant(req, res) {
  if (!req.user || !req.user.tenantId) {
    res.status(403).json({ error: "No tenant selected. Please set current tenant." });
    return false;
  }
  return true;
}

// ✅ Helper: safe JSON parse
function safeParse(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value }; // fallback: wrap string
  }
}

exports.getEvents = async (req, res) => {
  if (!requireTenant(req, res)) return;

  try {
    const { tenantId } = req.user;
    const { type, limit = 50 } = req.query;

    const maxLimit = Math.min(parseInt(limit, 10) || 50, 200);
    let events = [];

    if (!type || type === "webhook") {
      const webhookEvents = await sequelize.query(
        `SELECT 
            'webhook' AS source,
            topic,
            raw_payload AS payload,
            received_at,
            processed
         FROM webhook_staging
         WHERE tenant_id = :tenantId
         ORDER BY received_at DESC
         LIMIT ${maxLimit}`,
        {
          replacements: { tenantId },
          type: QueryTypes.SELECT,
        }
      );
      events = events.concat(webhookEvents);
    }

    if (!type || type === "custom") {
      const customEvents = await sequelize.query(
        `SELECT 
            'custom' AS source,
            event_type AS topic,
            payload,
            created_at AS received_at,
            TRUE AS processed
         FROM custom_events
         WHERE tenant_id = :tenantId
         ORDER BY created_at DESC
         LIMIT ${maxLimit}`,
        {
          replacements: { tenantId },
          type: QueryTypes.SELECT,
        }
      );
      events = events.concat(customEvents);
    }

    // ✅ Normalize payloads
    events = events.map((e) => ({
      ...e,
      payload: safeParse(e.payload),
    }));

    // ✅ Sort merged events globally
    events.sort((a, b) => new Date(b.received_at) - new Date(a.received_at));

    res.json({
      success: true,
      tenant_id: tenantId,
      count: events.length,
      events: events.slice(0, maxLimit),
    });
  } catch (err) {
    console.error("getEvents error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};
