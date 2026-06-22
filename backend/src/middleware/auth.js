/**
 * auth.js — role-based access control middleware.
 *
 * Every protected route passes an `allowedRoles` list to `verify_user`.
 * The returned middleware reads `x-user-id` and `x-user-role` from the request
 * headers (set by the frontend after login), cross-checks the role against the
 * database, and enforces the access rules before the request reaches a controller.
 *
 * Access rules:
 *  - `admin` and `manager` roles can access any user's data.
 *  - `player` role can only access their own data (targetUserID === requestedUserID).
 */
const { User } = require('../models');

/**
 * Factory that returns Express middleware enforcing role-based access.
 *
 * @param {string[]} allowedRoles - Roles permitted to call this endpoint (e.g. ["admin", "player"]).
 * @returns {import('express').RequestHandler} Middleware that calls `next()` on success or sends a 400/404.
 */
function verify_user(allowedRoles) {
    return async function(req, res, next) {
        const requestUserRole  = req.headers['x-user-role'];
        const targetUserID     = parseInt(req.headers['x-user-id']);
        // If the route has a :id param it refers to a different user's resource;
        // otherwise the operation is on the calling user's own data.
        const requestedUserID  = req.params.id ? parseInt(req.params.id) : targetUserID;

        if (isNaN(targetUserID)) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: 'VALIDATION_ERROR', message: 'Invalid User ID format in headers.', details: {} }
            });
        }

        // Confirm the calling user actually exists in the database
        const user = await User.findByPk(targetUserID);
        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                error: { code: 'NOT_FOUND', message: "Your user doesn't exist. Please create one and try again.", details: {} }
            });
        }

        // Check the header role is in the list of roles allowed for this route
        if (!allowedRoles.includes(requestUserRole)) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: 'FORBIDDEN', message: 'You are not in the allowed roles to access this endpoint.', details: {} }
            });
        }

        // Guard against header spoofing: the header role must match the DB role
        if (user.userRole !== requestUserRole) {
            return res.status(400).json({
                success: false,
                data: null,
                error: { code: 'VALIDATION_ERROR', message: 'Mismatch in roles between database and header.', details: {} }
            });
        }

        // Admins and managers may access any user's data
        if (requestUserRole === 'admin' || requestUserRole === 'manager') {
            return next();
        }

        // Regular players may only access their own data
        if (targetUserID === requestedUserID) {
            return next();
        }

        return res.status(400).json({
            success: false,
            data: null,
            error: { code: 'FORBIDDEN', message: 'You do not have permission to access other users data.', details: {} }
        });
    };
}

module.exports = verify_user;
