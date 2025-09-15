const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Tenant = sequelize.define(
  "tenants",
  {
    tenant_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    store_domain: { type: DataTypes.TEXT, unique: true },
    display_name: { type: DataTypes.TEXT },
    access_token: { type: DataTypes.TEXT },
    webhook_secret: { type: DataTypes.TEXT },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { timestamps: false }
);

module.exports = Tenant;
