/**
 * routes/scores.js — /api/scores endpoints.
 *
 * Each route runs validation and a role check before the controller. POST/PUT
 * additionally validate the score body shape via validateScoreData.
 */
const express=require("express")
const router=express.Router()
const scoreController = require('../controllers/scoresController');
const verify_user = require("../middleware/auth")
const {validateId, validateRequiredFields, validateScoreData,} = require("../middleware/validate")


// Map the routes to the controller functions
router.get('/', verify_user(["admin"]), scoreController.getAllScores);  // GET /api/scores — global leaderboard (admin)

router.get('/:id', validateId, verify_user(["admin","player"]), scoreController.getScoresById);  // GET /api/scores/:id — a user's personal leaderboard

router.get('/:id/:pieces/:rounds', validateId, verify_user(["admin","player"]), scoreController.getSpecificScore);  // GET — one score for an exact pieces/rounds combo

router.get('/stats/:id', validateId, verify_user(["admin","manager", "player"]), scoreController.getStats);  // GET /api/scores/stats/:id — dashboard stats

router.post('/:id', validateId, verify_user(["admin", "player"]),  // POST /api/scores/:id — record a new score after a game
    validateRequiredFields(["pieces", "rounds", "score"]), validateScoreData, scoreController.createScore);

router.put('/:id', validateId, verify_user(["admin","manager", "player"]),   // PUT /api/scores/:id — update a score (e.g. new personal best)
    validateRequiredFields(["pieces", "rounds", "score"]), validateScoreData, scoreController.updateScore);


module.exports = router;