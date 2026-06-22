/**
 * routes/settings.js — /api/settings endpoints.
 *
 * Convenience routes that act on the *current* user (id taken from the
 * x-user-id header), reusing the user controller's get/update handlers.
 */
const express=require("express")
const router=express.Router()
const userController = require('../controllers/userController');
const verify_user = require("../middleware/auth")


// GET /api/settings — fetch the current user's profile/preferences
router.get('/', verify_user(["admin","player","manager"]), userController.getUserById);

// PUT /api/settings — update the current user's profile/preferences
router.put('/', verify_user(["admin","player","manager"]), userController.updateUser);

module.exports = router;
