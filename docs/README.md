# GOT PUZZLED!

## How to get started?
start by Installing dependencies. in bash terminal run the following command:
```bash
npm install
```
Now in order to start the server, in the same terminal run:
```bash
npm start
```
or
```bash
node server.js
```

### Port & Base URL:
```text
Port: 3000

Base URL: http://localhost:3000
```

#### API Base Path
```text
/
```
**Success (200)**
```json
{
  "success": true,
  "data": {
    "message": "My Interactive Puzzle API is running!"
  },
  "error": null
}
```
**Server Error (500)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "SERVER_ERROR",
    "message": "An unexpected error occurred on the server.",
    "details": {}
  }
}
```
---

## Assumptions

- IDs are auto-generated as incrementing numbers.
- All data is stored in memory and resets when the server restarts.
- Authentication is simulated by using a request header: `x-user-role`.
    - Accepted roles: `admin`, `player`
- Only `admin` can delete scores.
- only `admin` can get all users.
- only `admin` can get all scores.
- the rest of the routes can be used by both `admin` and `player`.
- Dates (`createDate`, `updateDate`) are set automatically by the server.

## Middleware

- Logger - Logs method, URL, timestamp, and status code for every request.
- Auth - Reads `x-user-role` `x-user-id` and headers and enforces id and role-based access on protected routes.
- Validate - Included params type check, and body params existence and type.

## Response Format
All responses follow this structure:

**Success:**
```json
{
"success": true,
"data": {},
"error": null
}
```
**Error:**
```json
{
"success": false,
"data": null,
"error": {
"code": "ERROR_CODE",
"message": "Human readable message",
"details": {}
}
}
```

## API Reference

### Users

#### GET /users

- Returns all users.

- Headers Required: `x-user-role`, `x-user-id`

- Query Parameters: None

**Success Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "userId": 1,
      "firstName": "Max",
      "lastName": "Black",
      "createDate": "2025-05-07",
      "updateDate": "2026-05-07",
      "userRole": "player"
    },
    {
      "userId": 2,
      "firstName": "Han",
      "lastName": "Lee",
      "createDate": "2024-01-23",
      "updateDate": "2025-05-10",
      "userRole": "admin"
    },
    {
      "userId": 3,
      "firstName": "Caroline",
      "lastName": "Channing",
      "createDate": "2026-01-13",
      "updateDate": "2026-04-23",
      "userRole": "player"
    },
    {
      "userId": 4,
      "firstName": "Sophie",
      "lastName": "Kachinsky",
      "createDate": "2025-02-03",
      "updateDate": "2026-05-07",
      "userRole": "player"
    }
  ],
  "error": null
}
```
**Error Response (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not in the allowed roles to access this endpoint.",
    "details": {}
  }
}
```
---

#### GET /users/:id
- Returns a single user by `id`.
- Returns a single user by `id`.
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`

**Success Response (200)**
```json
{
    "success": true,
    "data": {
        "userId": 1,
        "firstName": "Max",
        "lastName": "Black",
        "createDate": "2025-05-07",
        "updateDate": "2026-05-07",
        "userRole": "player"
    },
    "error": null
}
```

**Error Response (400)**
```json
{
  "success": false,
          "data": null,
          "error": {
    "code": "FORBIDDEN",
            "message": "You do not have permission to access other users data.",
            "details": {}
  }
}
```

---

#### POST /users
- Creates a new user.
- No auth headers or url headers required.

**Request Body**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "userRole": "player / admin"
}
```

**Success Response (201)**
```json
{
  "success": true,
  "data": {
    "userId": 5
  },
  "error": null
}
```

**Validation Error (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field(s): userRole",
    "details": {
      "missing": [
        "userRole"
      ]
    }
  }
}
```

---

#### PUT /users/:id
- Updates an existing user.
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`

**Request Body**
```json
{
  "firstName": "Jane",
  "lastName": "Updated"
}
```

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "firstName": "Ben",
    "lastName": "Smith",
    "updateDate": "14/05/2026, 11:59:18",
    "userRole": "admin"
  },
  "error": null
}
```
**Validation Error (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mismatch in roles between database and in header.",
    "details": {}
  }
}
```
---

#### DELETE /users/:id
- Deletes a user (and automatically triggers their scores to be deleted).
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "userId": 5,
    "deletedScores": 0
  },
  "error": null
}
```

**Forbidden Error (404)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "NOT FOUND",
    "message": "Your user doesn't exist. Please create one and try again.",
    "details": {}
  }
}
```

---

### Scores

#### GET /scores
- Returns all scores.
- Headers Required: `x-user-role`, `x-user-id`
- Query Parameters: None

**Success Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pieces": 9,
      "rounds": 1,
      "score": "00:00:39"
    },
    {
      "id": 1,
      "pieces": 25,
      "rounds": 3,
      "score": "00:07:45"
    },
    {
      "id": 1,
      "pieces": 56,
      "rounds": 2,
      "score": "00:27:58"
    },
    {
      "id": 1,
      "pieces": 100,
      "rounds": 4,
      "score": "02:22:42"
    },
    {
      "id": 2,
      "pieces": 25,
      "rounds": 5,
      "score": "00:22:43"
    },
    {
      "id": 2,
      "pieces": 56,
      "rounds": 1,
      "score": "00:12:03"
    },
    {
      "id": 3,
      "pieces": 25,
      "rounds": 3,
      "score": "00:09:05"
    },
    {
      "id": 3,
      "pieces": 56,
      "rounds": 2,
      "score": "00:31:08"
    },
    {
      "id": 3,
      "pieces": 100,
      "rounds": 2,
      "score": "01:05:19"
    },
    {
      "id": 3,
      "pieces": 25,
      "rounds": 2,
      "score": "00:12:13"
    },
    {
      "id": 3,
      "pieces": 56,
      "rounds": 1,
      "score": "00:11:13"
    }
  ],
  "error": null
}
```

**Forbidden Error (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not in the allowed roles to access this endpoint.",
    "details": {}
  }
}
```
---

#### GET /scores/:id
- Returns all the scores for a user by their `id`.
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`

**Success Response (200)**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "pieces": 9,
      "rounds": 1,
      "score": "00:00:39"
    },
    {
      "id": 1,
      "pieces": 25,
      "rounds": 3,
      "score": "00:07:45"
    },
    {
      "id": 1,
      "pieces": 56,
      "rounds": 2,
      "score": "00:27:58"
    },
    {
      "id": 1,
      "pieces": 100,
      "rounds": 4,
      "score": "02:22:42"
    }
  ],
  "error": null
}
```

**Error Response (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The ID parameter must be a numeric value.",
    "details": {
      "provided": "one"
    }
  }
}
```

---

#### GET /scores/:id/:pieces/:rounds
- Returns a specific score based on the user `id`, amount of puzzle `pieces`, and `rounds` played.
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`, `pieces`, `rounds`

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "pieces": 9,
    "rounds": 1,
    "score": "00:00:39"
  },
  "error": null
}
```

**Error Response (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The ID parameter must be a numeric value.",
    "details": {
      "provided": "one"
    }
  }
}
```

---

#### POST /scores
- Creates a new score.
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`
- Request Body: `pieces`, `rounds`, `score`
**Request Body**
```json
{
  "userId": 1,
  "pieces": 100,
  "puzzlesAmount": 5,
  "score": "00:01:14"
}
```

**Success Response (201)**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "pieces": 8,
    "rounds": 2,
    "score": "00:00:44"
  },
  "error": null
}
```
**Error Response (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ALREADY_EXISTS",
    "message": "Score for user with id 1, and 1 puzzles with 9 pieces ALREADY exists",
    "details": {
      "Tip": "Update, dont Create"
    }
  }
}
```
---

#### PUT /scores/:id
- Updates an existing score for a specific `pieces`/`rounds` combination.
- Headers Required: `x-user-role`, `x-user-id`
- Path Parameters: `id`
- Request Body: `pieces`, `rounds`, `score`

**Request Body**
```json
{
  "pieces": 200,
  "puzzlesAmount": 10,
  "score": "00:10:25"
}
```

**Success Response (200)**
```json
{
  "success": true,
  "data": {
    "id": 3,
    "pieces": 25,
    "rounds": 3,
    "score": "09:08:25"
  },
  "error": null
}
```

**Error Response (400)**
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data types provided in the request body.",
    "details": {
      "errors": [
        "'score' must be a valid time string in the format HH:MM:SS (e.g., '00:12:13')."
      ]
    }
  }
}
```
---

## HTTP Status Codes Meaning
```text
200 - Success (GET / PUT / DELETE)

201 - Created (POST)

400 - Validation error / missing fields

404 - Item not found

500 - Unexpected server error
```
## -Project Structure-
```text
server.jsExpress app setup

routes/             Route definitions - user.js, scores.js

controllers/        Request handlers - scoresController.js, userController.js

models/             Mock data - bestScoresData.json, userData.json, scoreData.js, userData.js

middleware/         Logger and Auth middleware - auth.js, logger.js, validate.js

docs/               README and Postman collection - README.md, images
```          



