/**
 * models/User.js — Sequelize model for the `users` table.
 *
 * Represents a registered player, admin, or manager. All authentication is
 * done by comparing plain-text passwords (acceptable for an academic project).
 *
 * Relationships (defined in models/index.js):
 *   - hasOne  AdminProfile  (One-to-One:  a user may have an admin profile)
 *   - hasMany Score         (One-to-Many: a user can have many score records)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    /** Auto-incrementing primary key. */
    userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    firstName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    /** Must be unique — used as the login identifier. */
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    /** Controls which API endpoints the user can access. */
    userRole: {
        type: DataTypes.ENUM('player', 'admin', 'manager'),
        defaultValue: 'player'
    },
    /** CSS theme class applied to the whole frontend ('light' | 'dark' | 'retro'). */
    theme: {
        type: DataTypes.STRING,
        defaultValue: 'light'
    }
}, {
    tableName:  'users',
    timestamps: true,
    createdAt:  'createDate',
    updatedAt:  'updateDate'
});

module.exports = User;
