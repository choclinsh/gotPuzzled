/**
 * validate.js — request validation middleware used by the routes before a
 * controller runs. Each rejects bad input with a 400 VALIDATION_ERROR envelope
 * and otherwise calls next().
 */

/**
 * Ensure the id is numeric. Uses the :id URL param, falling back to the
 * x-user-id header. Rejects non-numeric values (e.g. "/users/abc").
 */
function validateId(req, res, next) {  // middleware function
    // to validate the type of the id parameter entered to the url
    const originalId = req.params.id;
    const id = req.params.id ? parseInt(req.params.id) : parseInt(req.headers["x-user-id"]);  // if url param dont exist

    if (isNaN(id) || id.toString() !== originalId) {
        return res.status(400).json({
            success: false,
            data: null,
            error: {
                code: "VALIDATION_ERROR",
                message: "The ID parameter must be a numeric value.",
                details: { provided: req.params.id }
            }
        });
    }

    // If it's a valid number, move to the next function
    next();
}


/**
 * Build middleware that checks req.body contains every required field.
 * @param {string[]} requiredFields - field names that must be present (truthy).
 * @returns Express middleware; rejects 400 listing any missing fields.
 */
function validateRequiredFields(requiredFields) {
    return function (req, res, next) {
        const missingFields = [];

        // Loop through the array of required fields and check req.body
        requiredFields.forEach(field => {
            // Using strict check for undefined/null/empty string
            if (!req.body[field]) {
                missingFields.push(field);
            }
        });

        // If any fields are missing, intercept the request and return the error
        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                data: null,
                error: {
                    code: "VALIDATION_ERROR",
                    message: `Missing required field(s): ${missingFields.join(", ")}`,
                    details: { missing: missingFields }
                }
            });
        }

        // All required fields exist! Move to the controller
        next();
    };
}

/**
 * Validate a score payload: `pieces` and `rounds` must be integers and `score`
 * must be a time string in "HH:MM:SS" format. Rejects 400 listing each problem.
 */
function validateScoreData(req, res, next) {
    const { pieces, rounds, score } = req.body;
    const typeErrors = [];

    // Validate pieces is an integer
    if (!Number.isInteger(pieces)) {
        typeErrors.push("'pieces' must be an integer.");
    }

    // Validate rounds is an integer
    if (!Number.isInteger(rounds)) {
        typeErrors.push("'rounds' must be an integer.");
    }

    // Validate score is a string in "HH:MM:SS" format
    // Regex explanation: \d{2} (2 digits for hours), [0-5]\d (00-59 for mins/secs)
    const timeRegex = /^\d{2}:[0-5]\d:[0-5]\d$/;
    if (typeof score !== 'string' || !timeRegex.test(score)) {
        typeErrors.push("'score' must be a valid time string in the format HH:MM:SS (e.g., '00:12:13').");
    }

    // If there are any type errors, stop the request and return 400 Bad Request
    if (typeErrors.length > 0) {
        return res.status(400).json({
            success: false,
            data: null,
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid data types provided in the request body.",
                details: { errors: typeErrors }
            }
        });
    }

    // Move to the controller.
    next();
}

module.exports = { validateId, validateRequiredFields, validateScoreData,};
