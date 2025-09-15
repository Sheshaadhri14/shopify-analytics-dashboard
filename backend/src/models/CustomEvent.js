const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CustomEvent = sequelize.define(
  "custom_events",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER },
    event_type: { type: DataTypes.TEXT, allowNull: false },
    shopify_resource_id: { type: DataTypes.BIGINT },
    payload: { type: DataTypes.JSONB },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { timestamps: false }
);

module.exports = CustomEvent;
