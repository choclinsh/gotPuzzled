const express=require("express")
const router=express.Router()
const scoreController = require('../controllers/scoresController');
const verify_user = require("../middleware/auth")
const {validateId, validateRequiredFields, validateScoreData,} = require("../middleware/validate")


// Map the routes to the controller functions
router.get('/', verify_user(["admin"]), scoreController.getAllScores);

router.get('/:id', validateId, verify_user(["admin","player"]), scoreController.getScoresById);

router.get('/:id/:pieces/:rounds', validateId, verify_user(["admin","player"]), scoreController.getSpecificScore);

router.post('/:id', validateId, verify_user(["admin","player"]),
    validateRequiredFields(["pieces", "rounds", "score"]), validateScoreData, scoreController.createScore);

router.put('/:id', validateId, verify_user(["admin","player"]),
    validateRequiredFields(["pieces", "rounds", "score"]), validateScoreData, scoreController.updateScore);

module.exports = router;