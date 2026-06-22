/**
 * models/Score.js — Sequelize model for the `scores` table.
 *
 * Records a player's best time for a specific pieces/rounds combination.
 *
 * Relationships (defined in models/index.js):
 *   - belongsTo User  (the player who earned this score)
 */
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Score = sequelize.define('Score', {
    /** Auto-incrementing primary key. */
    scoreId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    /** FK → users.userId */
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    pieces: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    rounds: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    /** Completion time stored as "HH:MM:SS" string (e.g. "00:05:23"). */
    timeScore: {
        type: DataTypes.STRING,
        allowNull: false
    }
}, {
    tableName:  'scores',
    timestamps: false
});

module.exports = Score;
