const express=require("express")
const router=express.Router()
const userController = require('../controllers/userController');
const verify_user = require("../middleware/auth")
const {validateId, validateRequiredFields} = require("../middleware/validate")


// Map the routes to the controller functions
router.get('/', verify_user(["admin"]), userController.getAllUsers);

router.get('/:id', validateId, verify_user(["admin","player"]), userController.getUserById);

router.post('/', validateRequiredFields(["firstName", "lastName", "userRole"]), userController.createUser);

router.put('/:id', validateId, verify_user(["admin","player"]),
    validateRequiredFields(["firstName", "lastName"]), userController.updateUser);

router.delete('/:id', validateId, verify_user(["admin","player"]), userController.deleteUser);

module.exports = router;
