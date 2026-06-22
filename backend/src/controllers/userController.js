/**
 * userController.js — request handlers for all /api/users and /api/auth routes.
 *
 * All functions follow the same envelope format:
 *   Success → { success: true,  data: <payload>, error: null }
 *   Error   → { success: false, data: null, error: { code, message, details } }
 */
const { User, Score } = require('../models');

/**
 * GET /api/users/:id  or  GET /api/users/me
 * Retrieve a single user by their primary key. The ID is read from the URL
 * parameter first; if absent, falls back to the `x-user-id` request header
 * (used by the /me and /settings routes).
 *
 * @param {import('express').Request}  req - Expects `req.params.id` or header `x-user-id`.
 * @param {import('express').Response} res - JSON response with the user object.
 */
async function getUserById(req, res) {
    const rawId = req.params.id || req.headers['x-user-id'];
    const id = parseInt(rawId);

    const user = await User.findByPk(id);
    if (!user) {
        return res.status(404).json({
            success: false,
            data: null,
            error: {
                code: 'NOT_FOUND',
                message: "The user doesn't exist. Please create one and try again.",
                details: {}
            }
        });
    }
    res.status(200).json({ success: true, data: user, error: null });
}

/**
 * GET /api/users
 * Return all users in the database. Accessible by admins only (enforced by the
 * `verify_user` middleware on the route).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res - JSON array of all user rows.
 */
async function getAllUsers(req, res) {
    const users = await User.findAll();
    res.status(200).json({ success: true, data: users, error: null });
}

/**
 * POST /api/users
 * Create a new user account. Also used by the sign-up flow on the frontend.
 * Returns only the new userId so the client can immediately fetch the full profile.
 *
 * @param {import('express').Request}  req - Body: { firstName, lastName, userRole, email, password }.
 * @param {import('express').Response} res - 201 with { userId } on success.
 */
async function createUser(req, res) {
    const { firstName, lastName, userRole, email, password } = req.body;

    const newUser = await User.create({ firstName, lastName, userRole, email, password, theme: 'light' });

    return res.status(201).json({
        success: true,
        data: { userId: newUser.userId },
        error: null
    });
}

/**
 * PUT /api/users/:id  or  PUT /api/settings
 * Update a user's profile fields. Reads the target ID from the URL param or
 * the `x-user-id` header. Only updates the fields provided in the body.
 *
 * @param {import('express').Request}  req - Body: { firstName, lastName, email, theme }.
 * @param {import('express').Response} res - 200 with the updated user object.
 */
async function updateUser(req, res) {
    const rawId = req.params.id || req.headers['x-user-id'];
    const id = parseInt(rawId);

    const user = await User.findByPk(id);
    if (!user) {
        return res.status(404).json({
            success: false,
            data: null,
            error: { code: 'NOT_FOUND', message: 'User not found', details: {} }
        });
    }

    const { firstName, lastName, email, theme } = req.body;
    await user.update({ firstName, lastName, email, theme });

    return res.status(200).json({ success: true, data: user, error: null });
}

/**
 * DELETE /api/users/:id
 * Remove a user and cascade-delete all of their scores. Returns the count of
 * deleted scores for debugging transparency.
 *
 * @param {import('express').Request}  req - URL param `:id` — the user to delete.
 * @param {import('express').Response} res - 200 with { userId, deletedScores }.
 */
async function deleteUser(req, res) {
    const id = parseInt(req.params.id);

    const deletedScores = await Score.destroy({ where: { userId: id } });
    await User.destroy({ where: { userId: id } });

    return res.status(200).json({
        success: true,
        data: { userId: id, deletedScores },
        error: null
    });
}

/**
 * POST /api/auth/login
 * Verify email + password against the database and return the userId and role
 * on success. No token or session is created — the frontend stores the result
 * in React state and sends it as headers on subsequent requests.
 *
 * NOTE: Passwords are stored as plain text (acceptable for this academic
 * project; a production app would use bcrypt).
 *
 * @param {import('express').Request}  req - Body: { email, password }.
 * @param {import('express').Response} res - 200 with { userId, userRole } or 401.
 */
async function loginUser(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email, password } });
    if (!user) {
        return res.status(401).json({
            success: false,
            data: null,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
        });
    }

    res.status(200).json({
        success: true,
        data: {
            message: 'Login successful',
            user: { userId: user.userId, userRole: user.userRole }
        },
        error: null
    });
}

module.exports = { getAllUsers, getUserById, createUser, updateUser, deleteUser, loginUser };
