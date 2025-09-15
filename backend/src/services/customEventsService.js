const { QueryTypes } = require('sequelize');
const db = require('../config/database');

class CustomEventsService {
  // Track checkout started event
  static async trackCheckoutStarted(tenantId, branchId, checkoutData) {
    try {
      await db.query(`
        INSERT INTO custom_events (tenant_id, branch_id, event_type, shopify_resource_id, payload)
        VALUES (:tenant_id, :branch_id, 'checkout_started', :resource_id, :payload)
      `, {
        replacements: {
          tenant_id: tenantId,
          branch_id: branchId,
          resource_id: checkoutData.id,
          payload: JSON.stringify({
            checkout_id: checkoutData.id,
            total_price: checkoutData.total_price,
            customer_id: checkoutData.customer?.id,
            line_items_count: checkoutData.line_items?.length || 0,
            created_at: checkoutData.created_at
          })
        },
        type: QueryTypes.INSERT
      });
    } catch (error) {
      console.error('Track checkout started error:', error);
    }
  }

  // Track abandoned checkout
  static async trackAbandonedCheckout(tenantId, branchId, checkoutData) {
    try {
      // First, check if checkout_started event exists
      const [existingEvent] = await db.query(`
        SELECT id FROM custom_events 
        WHERE tenant_id = :tenant_id AND shopify_resource_id = :resource_id 
        AND event_type = 'checkout_started'
      `, {
        replacements: {
          tenant_id: tenantId,
          resource_id: checkoutData.id
        },
        type: QueryTypes.SELECT
      });

      if (existingEvent.length > 0) {
        await db.query(`
          INSERT INTO custom_events (tenant_id, branch_id, event_type, shopify_resource_id, payload)
          VALUES (:tenant_id, :branch_id, 'checkout_abandoned', :resource_id, :payload)
        `, {
          replacements: {
            tenant_id: tenantId,
            branch_id: branchId,
            resource_id: checkoutData.id,
            payload: JSON.stringify({
              checkout_id: checkoutData.id,
              abandoned_at: new Date(),
              total_price: checkoutData.total_price,
              customer_id: checkoutData.customer?.id,
              time_to_abandon: this.calculateTimeToAbandon(checkoutData)
            })
          },
          type: QueryTypes.INSERT
        });
      }
    } catch (error) {
      console.error('Track abandoned checkout error:', error);
    }
  }

  // Calculate customer segments
  static async getCustomerSegments(tenantId) {
    try {
      const segments = await db.query(`
        WITH customer_stats AS (
          SELECT 
            c.shopify_customer_id,
            c.first_name,
            c.last_name,
            c.email,
            COUNT(o.id) as order_count,
            SUM(o.total_amount) as total_spent,
            MAX(o.created_at) as last_order_date,
            MIN(o.created_at) as first_order_date
          FROM customers c
          LEFT JOIN orders o ON c.shopify_customer_id = o.customer_shopify_id 
            AND c.tenant_id = o.tenant_id
          WHERE c.tenant_id = :tenant_id
          GROUP BY c.shopify_customer_id, c.first_name, c.last_name, c.email
        )
        SELECT 
          *,
          CASE 
            WHEN order_count = 0 THEN 'New Customer'
            WHEN order_count = 1 THEN 'One-time Buyer'
            WHEN order_count >= 2 AND order_count <= 5 THEN 'Regular Customer'
            WHEN order_count > 5 THEN 'VIP Customer'
          END as segment,
          CASE
            WHEN total_spent >= 1000 THEN 'High Value'
            WHEN total_spent >= 500 THEN 'Medium Value'
            WHEN total_spent > 0 THEN 'Low Value'
            ELSE 'No Purchase'
          END as value_segment
        FROM customer_stats
        ORDER BY total_spent DESC
      `, {
        replacements: { tenant_id: tenantId },
        type: QueryTypes.SELECT
      });

      return segments;
    } catch (error) {
      console.error('Get customer segments error:', error);
      return [];
    }
  }

  static calculateTimeToAbandon(checkoutData) {
    const created = new Date(checkoutData.created_at);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60)); // minutes
  }
}

module.exports = CustomEventsService;