/**
 * routes/users.js — /api/users endpoints.
 *
 * Each route runs a chain of middleware (validation, then role check) before
 * the controller. Roles in verify_user([...]) list who may call the endpoint.
 */
const express=require("express")
const router=express.Router()
const userController = require('../controllers/userController');
const verify_user = require("../middleware/auth")
const {validateId, validateRequiredFields} = require("../middleware/validate")


// Map the routes to the controller functions
// GET /api/users/me — the logged-in user's own profile (id from x-user-id header)
router.get('/me', verify_user(["admin", "player"]), userController.getUserById);

// GET /api/users — list all users (admin only)
router.get('/', verify_user(["admin"]), userController.getAllUsers);

// GET /api/users/:id — one user by id
router.get('/:id', validateId, verify_user(["admin","player"]), userController.getUserById);

// POST /api/users — create a user (also used by the sign-up flow)
router.post('/', validateRequiredFields(["firstName", "lastName", "userRole"]), userController.createUser);

// PUT /api/users/:id — update a user's profile
router.put('/:id', validateId, verify_user(["admin","player","manager"]),
    validateRequiredFields(["firstName", "lastName"]), userController.updateUser);

// DELETE /api/users/:id — remove a user and their scores
router.delete('/:id', validateId, verify_user(["admin","player"]), userController.deleteUser);

module.exports = router;
