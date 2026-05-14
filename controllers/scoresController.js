const getScores = require("../models/scoreData");

// get all the scores made by specific user
function getScoresById(req, res) {
    const id = parseInt(req.params.id);
    const userScores = getScores().filter((j) => j.id === id);

    // Check if the array is empty
    if (userScores.length === 0) {
        return res.status(404).json({
            "success": false,
            "data": null,
            "error": {
                "code": "NOT_FOUND",
                "message": `No scores found for user with id ${id}`,
                "details": { }
            }
        });
    }
    res.status(200).json({
        success: true,
        data: userScores,
        error: null
    });
}

// get one specific score of specific combination of rounds and pieces
function getSpecificScore(req, res) {
    const id = parseInt(req.params.id);
    const pieces = parseInt(req.params.pieces);
    const rounds = parseInt(req.params.rounds);

    const score = getScores().find((j)=> j.id === id && j.rounds === rounds && j.pieces === pieces );
    if (!score) {
        return res.status(404).json({
            "success": false,
            "data": null,
            "error": {
                "code": "NOT_FOUND",
                "message": `Score for user with id ${id}, and ${rounds} puzzles with ${pieces} pieces doesn't exist`,
                "details": { }
            }
        })
    }
    res.status(200).json({
        success: true,
        data: score,
        error: null
    });
}

// get all scores in the database
function getAllScores(req, res) {
    const scores = getScores();
    if (!scores) {
        return res.status(404).json({
            "success": false,
            "data": null,
            "error": {
                "code": "NOT_FOUND",
                "message": "No users with scores exist in the system currently",
                "details": { }
            }
        })
    }
    res.status(200).json({
        success: true,
        data: scores,
        error: null
    });
}

function createScore(req, res) {
    const id = parseInt(req.params.id);
    const { pieces, rounds, score } = req.body;

    const scores = getScores();
    const curr_score = scores.find((j) => j.id === id && j.pieces === pieces && j.rounds === rounds);

    if (curr_score) {
        return res.status(400).json({
            "success": false,
            "data": null,
            "error": {
                "code": "ALREADY_EXISTS",
                "message": `Score for user with id ${id}, and ${rounds} puzzles with ${pieces} pieces ALREADY exists`,
                "details": { "Tip": "Update, dont Create" }
            }
        });
    }

    const newScore = {
        id: id,
        rounds: rounds,
        pieces: pieces,
        score: score
    };

    scores.push(newScore);

    return res.status(201).json({
        success: true,
        data: {
            id: newScore.id,
            pieces: newScore.pieces,
            rounds: newScore.rounds,
            score: newScore.score
        },
        error: null
    });
}


function updateScore(req, res) {
    const id = parseInt(req.params.id);
    const { rounds, pieces, score } = req.body;

    const scoreIndex = getScores().findIndex((j) => j.id === id && j.pieces === pieces && j.rounds === rounds);

    if (scoreIndex === -1) {
        return res.status(404).json({
            "success": false,
            "data": null,
            "error": {
                "code": "NOT_FOUND",
                "message": `Score for user with id ${id}, and ${rounds} puzzles with ${pieces} pieces doesn't exist`,
                "details": { }
            }
        });
    }

    const scores = getScores();

    scores[scoreIndex] = {
        ...scores[scoreIndex],
        pieces,
        rounds,
        score,
    };

    return res.status(200).json({
        success: true,
        data: {
            id: id,
            pieces: pieces,
            rounds: rounds,
            score: score
        },
        error: null
    });
}


module.exports = {
    getAllScores,
    getScoresById,
    getSpecificScore,
    createScore,
    updateScore
};