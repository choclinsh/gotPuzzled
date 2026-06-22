/**
 * routes/auth.js — /api/auth endpoints (login / logout).
 *
 * No real sessions or tokens: login just verifies credentials and returns the
 * user id + role, which the frontend stores in React state (UserContext).
 */
const express = require('express');
const router = express.Router();
const userController = require("../controllers/userController");


// POST /api/auth/login — verify email + password, return { userId, userRole }
router.post('/login', userController.loginUser);

// POST /api/auth/logout — stateless acknowledgement (no server session to clear)
router.post('/logout', (req, res) => {
    res.status(200).json({
        success: true,
        data: { message: "Successfully logged out" },
        error: null
    });
});



module.exports = router;