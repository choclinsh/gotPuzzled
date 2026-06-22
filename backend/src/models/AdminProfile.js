/**
 * models/AdminProfile.js — Sequelize model for the `admin_profiles` table.
 *
 * Stores elevated-access metadata for users whose `userRole` is 'admin' or
 * 'manager'. Not every user has a row here — only the two privileged roles.
 *
 * Relationships (defined in models/index.js):
 *   - belongsTo User (One-to-One inverse: this profile belongs to one user)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AdminProfile = sequelize.define('AdminProfile', {
    /** Auto-incrementing primary key. */
    adminId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    /** FK → users.userId */
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    /** Distinguishes full admins from limited managers. */
    accessLevel: {
        type: DataTypes.ENUM('admin', 'manager'),
        allowNull: false
    }
}, {
    tableName:  'admin_profiles',
    timestamps: false
});

module.exports = AdminProfile;
