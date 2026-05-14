function validateId(req, res, next) {  // middleware function
    // to validate the type of the id parameter entered to the url
    const originalId = req.params.id;
    const id = parseInt(req.params.id);

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


// Dynamic middleware to check for required fields in req.body
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
