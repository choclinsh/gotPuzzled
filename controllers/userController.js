const getUsers = require("../models/userData");
const getScores = require("../models/scoreData");

// return the details of the requested user
function getUserById(req, res) {

    const id = parseInt(req.params.id);
    const user = getUsers().find((j)=> j.userId === id);
    // we don't need to check again if user exist because we validated the request in the middleware
    res.status(200).json({
        success: true,
        data: user,
        error: null
    });
}

// return the details of all users
function getAllUsers(req, res) {
    const users = getUsers();
    if (!users) {
        return res.status(404).json({
            "success": false,
            "data": null,
            "error": {
                "code": "NOT_FOUND",
                "message": "No users exist in the system currently",
                "details": { }
            }
        })
    }
    res.status(200).json({
        success: true,
        data: users,
        error: null
    });
}

// creating new user after validating fields in the middleware
function createUser(req, res) {
    const { firstName, lastName, userRole } = req.body;
    const users = getUsers();
    const newUser = {
        userId: users.length + 1,   // simple ID generation
        firstName: firstName,
        lastName: lastName,
        userRole: userRole,
        createDate: new Date().toLocaleString(),
        updateDate: new Date().toLocaleString()
    };

    users.push(newUser);

    return res.status(201).json({
        success: true,
        data: { userId: newUser.userId },
        error: null
    });
}

//updates personal information for a certain user.
function updateUser(req, res) {
    const id = parseInt(req.params.id);
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.userId === id);

    const { firstName, lastName} = req.body;
    const updatedDate = new Date().toLocaleString();
    // Update the user in-place
    users[userIndex] = {
        ...users[userIndex],   // keep existing fields (userId, createDate...)
        firstName,
        lastName,
        updateDate: new Date().toLocaleString()
    };

    return res.status(200).json({
        success: true,
        data: { userId: id,
            firstName: firstName,
            lastName: lastName,
            updateDate: updatedDate,
            "userRole": "admin"},
        error: null
    });
}

//deletes user
function deleteUser(req, res) {
    const id = parseInt(req.params.id);

    // Delete the scores
    const scores = getScores();
    const originalScoresCount = scores.length;
    const updatedScores = scores.filter((s) => s.id !== id);

    scores.length = 0;
    updatedScores.forEach((s) => scores.push(s));
    const deletedScoresCount = originalScoresCount - updatedScores.length;

    // Delete the user
    const users = getUsers();
    const userIndex = users.findIndex((u) => u.userId === id);
    if (userIndex !== -1) {
        users.splice(userIndex, 1);
    }

    // Send one response
    return res.status(200).json({
        success: true,
        data: {
            userId: id,
            deletedScores: deletedScoresCount
        },
        error: null
    });
}


module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};