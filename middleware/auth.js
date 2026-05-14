const getUsers = require("../models/userData");

function verify_user(allowedRoles) {  // factory structure. Needed for adding parameter
    return function(req, res, next) {  // because strict express structure allow only 3 params

        const requestUserRole = req.headers["x-user-role"];
        const targetUserID = parseInt(req.headers["x-user-id"]);
        const requestedUserID = parseInt(req.params.id);

        if (isNaN(targetUserID)) {  // type check for id in header
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid User ID format in headers.",
                    details: {}
                }
            });
        }
        // check if claimed id exist
        const user = getUsers().find((j)=> j.userId === targetUserID);
        if (!user) {
            return res.status(404).json({
                success: false,
                data: null,
                error: {
                    code: "NOT FOUND",
                    message: "Your user doesn't exist. Please create one and try again.",
                    details: {}
                }
            });
        }
        // check if claimed role is allowed
        if ( allowedRoles.includes(requestUserRole) ) {
            // check if claimed role is the real role of the users id in database
            if (user.userRole !== requestUserRole) {
                return res.status(400).json({
                    success: false,
                    data: null,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: "Mismatch in roles between database and in header.",
                        details: {}
                    }
                });
            }
            if (requestUserRole === "admin") {  // admins can access everyone's data
                return next();
            }
            if (targetUserID === requestedUserID) {  // users can access only their data
                return next();
            }

            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "FORBIDDEN",
                    message: "You do not have permission to access other users data.",
                    details: {}
                }
            });
        }
        else {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "FORBIDDEN",
                    message: "You are not in the allowed roles to access this endpoint.",
                    details: {}
                }
            });
        }
    }
}

module.exports = verify_user;
