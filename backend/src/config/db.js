/**
 * config/db.js — Sequelize connection singleton.
 *
 * Reads database credentials from environment variables (set in .env / .env.example).
 * Exported as a single Sequelize instance shared across all ORM model files.
 * `logging: false` suppresses the per-query SQL output in the console.
 */
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host:    process.env.DB_HOST || 'localhost',
        port:    parseInt(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: false
    }
);

module.exports = sequelize;
