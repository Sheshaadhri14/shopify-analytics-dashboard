const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Product = sequelize.define(
  "products",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false },
    branch_id: { type: DataTypes.INTEGER },
    shopify_product_id: { type: DataTypes.BIGINT, allowNull: false },
    data: { type: DataTypes.JSONB },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    timestamps: false,
    indexes: [{ unique: true, fields: ["tenant_id", "shopify_product_id"] }],
  }
);

module.exports = Product;
