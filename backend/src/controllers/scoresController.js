/**
 * scoresController.js — request handlers for all /api/scores routes.
 *
 * All functions follow the same envelope format:
 *   Success → { success: true,  data: <payload>, error: null }
 *   Error   → { success: false, data: null, error: { code, message, details } }
 */
const { Score, User } = require('../models');

/**
 * Map a Sequelize Score instance to the shape the frontend expects.
 * Keeps the controller response shape stable independently of the ORM model.
 *
 * @param {Score} s - A Score model instance.
 * @returns {{ id, scoreId, pieces, rounds, score }} Formatted score object.
 */
function formatScore(s) {
    return {
        id:       s.userId,
        scoreId:  s.scoreId,
        pieces:   s.pieces,
        rounds:   s.rounds,
        score:    s.timeScore
    };
}

/**
 * GET /api/scores/:id
 * Return all scores belonging to a specific user (their personal leaderboard).
 *
 * @param {import('express').Request}  req - URL param `:id` — the target user ID.
 * @param {import('express').Response} res - JSON array of the user's scores, or 404.
 */
async function getScoresById(req, res) {
    const id = parseInt(req.params.id);
    const userScores = await Score.findAll({ where: { userId: id } });

    if (userScores.length === 0) {
        return res.status(404).json({
            success: false,
            data: null,
            error: { code: 'NOT_FOUND', message: 'No scores found', details: {} }
        });
    }
    res.status(200).json({ success: true, data: userScores.map(formatScore), error: null });
}

/**
 * GET /api/scores/:id/:pieces/:rounds
 * Look up one specific score record for a user/pieces/rounds combination.
 * Used by the frontend to check whether a score already exists before saving.
 *
 * @param {import('express').Request}  req - URL params: `:id`, `:pieces`, `:rounds`.
 * @param {import('express').Response} res - The matching score or 404.
 */
async function getSpecificScore(req, res) {
    const id     = parseInt(req.params.id);
    const pieces = parseInt(req.params.pieces);
    const rounds = parseInt(req.params.rounds);

    const score = await Score.findOne({ where: { userId: id, pieces, rounds } });
    if (!score) {
        return res.status(404).json({
            success: false,
            data: null,
            error: {
                code: 'NOT_FOUND',
                message: `Score for user ${id}, ${rounds} rounds, ${pieces} pieces not found`,
                details: {}
            }
        });
    }
    res.status(200).json({ success: true, data: formatScore(score), error: null });
}

/**
 * GET /api/scores
 * Return every score in the database, each joined with its owner (User).
 * Demonstrates a relational JOIN query through Sequelize's `include` option.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - Array of all scores with nested user data.
 */
async function getAllScores(req, res) {
    const scores = await Score.findAll({
        include: [
            { model: User, as: 'user', attributes: ['userId', 'firstName', 'lastName', 'userRole'] }
        ]
    });
    res.status(200).json({ success: true, data: scores.map(formatScore), error: null });
}

/**
 * POST /api/scores/:id
 * Record a new score after a game session. Rejects duplicate piece/round combos
 * — the frontend handles this by falling back to PUT on a 400 ALREADY_EXISTS.
 *
 * @param {import('express').Request}  req - URL param `:id`; body: { pieces, rounds, score }.
 * @param {import('express').Response} res - 201 with the created score, or 400 if already exists.
 */
async function createScore(req, res) {
    const id = parseInt(req.params.id);
    const { pieces, rounds, score } = req.body;

    const existing = await Score.findOne({ where: { userId: id, pieces, rounds } });
    if (existing) {
        return res.status(400).json({
            success: false,
            data: null,
            error: {
                code: 'ALREADY_EXISTS',
                message: `Score for user ${id}, ${rounds} rounds, ${pieces} pieces already exists`,
                details: { Tip: 'Update, dont Create' }
            }
        });
    }

    const newScore = await Score.create({ userId: id, pieces, rounds, timeScore: score });
    return res.status(201).json({ success: true, data: { ...formatScore(newScore), isNewRecord: true }, error: null });
}

/**
 * PUT /api/scores/:id
 * Update an existing score only if the new time is strictly better (lower).
 * `isNewRecord` in the response tells the frontend whether to play the record sound.
 *
 * @param {import('express').Request}  req - URL param `:id`; body: { pieces, rounds, score }.
 * @param {import('express').Response} res - 200 with the score and `isNewRecord` flag.
 */
async function updateScore(req, res) {
    const id = parseInt(req.params.id);
    const { rounds, pieces, score } = req.body;

    const existing = await Score.findOne({ where: { userId: id, pieces, rounds } });
    if (!existing) {
        return res.status(404).json({
            success: false,
            data: null,
            error: {
                code: 'NOT_FOUND',
                message: `Score for user ${id}, ${rounds} rounds, ${pieces} pieces not found`,
                details: {}
            }
        });
    }

    // Only overwrite if the new time is strictly better (time strings compare lexicographically in HH:MM:SS)
    const wasImproved = score < existing.timeScore;
    if (wasImproved) {
        await existing.update({ timeScore: score });
    }

    return res.status(200).json({ success: true, data: { ...formatScore(existing), isNewRecord: wasImproved }, error: null });
}

/**
 * GET /api/scores/stats/:id
 * Return aggregated dashboard statistics for a user:
 *   - topPieces:    the largest puzzle they completed
 *   - topRounds:    the most rounds they played in one session
 *   - fastestScore: their best (lowest) time string
 *
 * Uses a Sequelize relational include (User → Score) to load all scores in one
 * query rather than a separate count/max fetch.
 *
 * @param {import('express').Request}  req - URL param `:id` or header `x-user-id`.
 * @param {import('express').Response} res - 200 with { topPieces, topRounds, fastestScore }, or 404.
 */
async function getStats(req, res) {
    const rawId = req.headers['x-user-id'] || req.params.id;
    const id = parseInt(rawId);

    // Relational query: load the user together with all their scores in one call
    const userWithScores = await User.findByPk(id, {
        include: [{ model: Score, as: 'scores' }]
    });

    if (!userWithScores || userWithScores.scores.length === 0) {
        return res.status(404).json({
            success: false,
            data: null,
            error: { code: 'NOT_FOUND', message: `No scores found for user ${id}`, details: {} }
        });
    }

    const userScores = userWithScores.scores;

    // Derive summary stats by reducing over the loaded scores
    const topPieces    = userScores.reduce((max, s) => s.pieces > max ? s.pieces : max,         userScores[0].pieces);
    const topRounds    = userScores.reduce((max, s) => s.rounds > max ? s.rounds : max,         userScores[0].rounds);
    const fastestScore = userScores.reduce((min, s) => s.timeScore < min ? s.timeScore : min,   userScores[0].timeScore);

    res.status(200).json({
        success: true,
        data: { topPieces, topRounds, fastestScore },
        error: null
    });
}

module.exports = { getAllScores, getScoresById, getSpecificScore, createScore, updateScore, getStats };
