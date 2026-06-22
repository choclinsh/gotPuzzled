/**
 * models/index.js — ORM relationship declarations and central export.
 *
 * Imports all Sequelize models and wires up every association in one place so
 * the rest of the codebase can do `require('../models')` and get everything.
 *
 * Relationships implemented:
 *   One-to-One   User ↔ AdminProfile   (a user may have one admin profile)
 *   One-to-Many  User → Score          (a user has many score records)
 */
const sequelize    = require('../config/db');
const User         = require('./User');
const AdminProfile = require('./AdminProfile');
const Score        = require('./Score');

// ── One-to-One: User ↔ AdminProfile ─────────────────────────────────────────
User.hasOne(AdminProfile, { foreignKey: 'userId', as: 'adminProfile' });
AdminProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ── One-to-Many: User → Score ────────────────────────────────────────────────
User.hasMany(Score, { foreignKey: 'userId', as: 'scores' });
Score.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = { sequelize, User, AdminProfile, Score };
