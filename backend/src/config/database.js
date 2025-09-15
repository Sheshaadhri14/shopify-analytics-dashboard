// database.js
const { Sequelize } = require("sequelize");
require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const sequelize = new Sequelize(
  process.env.DB_NAME || "xeno_multitenant",
  process.env.DB_USER || "postgres",
  process.env.DB_PASSWORD || "Arun200$",
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: false,
  }
);

module.exports = { sequelize }; // <-- export object
