# gotPuzzled — Full-Stack Interactive Puzzle Application

An image-based jigsaw puzzle game with three modes: Solo, Co-op, and head-to-head Racing.
Players type a free-text description; the Gemini AI refines it into a keyword, Pexels fetches matching images, and the puzzle is generated on the fly.

---

## Project Purpose

gotPuzzled is a full-stack web application that combines:
- **AI-powered image selection** — Gemini Flash extracts a clean search keyword from any natural-language description.
- **Real-time multiplayer** — Socket.IO powers cooperative and competitive puzzle sessions between two browser tabs/clients.
- **Persistent scoring** — MySQL (via Sequelize ORM) stores every player's best time per pieces/rounds combination.

---

## Tech Stack

| Layer    | Technology                                    |
|----------|-----------------------------------------------|
| Frontend | React 18, React Router, Fetch API             |
| Backend  | Node.js, Express                              |
| Database | MySQL 8+                                      |
| ORM      | Sequelize                                     |
| Sockets  | Socket.IO                                     |
| AI       | Groq — Llama 3.1 8B Instant (`groq-sdk`)      |
| Images   | Pexels REST API                               |

---

## Installation

### Prerequisites
- Node.js 18+
- MySQL 8+
- A Pexels API key (free at [pexels.com/api](https://www.pexels.com/api/))
- A Groq API key (free at [console.groq.com](https://console.groq.com/))

### 1. Clone the repository
```bash
git clone <repo-url>
cd gotPuzzled
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

---

## Database Setup

1. Start MySQL and create the database:
```sql
CREATE DATABASE gotpuzzled;
```

2. Copy the environment file and fill in your credentials:
```bash
cd backend
cp .env.example .env
```

3. Edit `backend/.env` with your values (see **Environment Variables** below).

4. Run the seed script to create all tables and insert sample data:
```bash
node src/scripts/syncAndSeed.js
```

Alternatively, you can apply the raw SQL schema manually:
```bash
mysql -u root -p gotpuzzled < src/migrations/schema.sql
```

---

## Environment Variables

Create `backend/.env` based on `backend/.env.example`:

| Variable         | Description                                      | Example          |
|------------------|--------------------------------------------------|------------------|
| `DB_NAME`        | MySQL database name                              | `gotpuzzled`     |
| `DB_USER`        | MySQL username                                   | `root`           |
| `DB_PASS`        | MySQL password                                   | `yourpassword`   |
| `DB_HOST`        | MySQL host                                       | `localhost`      |
| `DB_PORT`        | MySQL port                                       | `3306`           |
| `PEXELS_API_KEY` | Pexels REST API key (for image fetching)         | `your_key_here`  |
| `GROQ_API_KEY`   | Groq API key (for AI topic extraction via Llama) | `your_key_here`  |

For the frontend, create `frontend/.env.local`:
```
REACT_APP_BACKEND_URL=http://localhost:3000
```

---

## Running the Application

### Start the backend
```bash
cd backend
npm start
```
The API and Socket.IO server will start on `http://localhost:3000`.

### Start the frontend
```bash
cd frontend
npm start
```
The React dev server will open at `http://localhost:5173`.

---

## ORM Setup

The project uses **Sequelize** with the MySQL dialect. All models live in `backend/src/models/`.

### Models

| Model          | Table            | Description                                      |
|----------------|------------------|--------------------------------------------------|
| `User`         | `users`          | Players, admins, and managers                    |
| `AdminProfile` | `admin_profiles` | Elevated-access metadata for admin/manager users |
| `Score`        | `scores`         | Player best times (junction table)               |

### ORM Relationships

| Type         | Association                          |
|--------------|--------------------------------------|
| One-to-One   | `User` ↔ `AdminProfile`              |
| One-to-Many  | `User` → `Score`                     |

---

## API Endpoints

All responses follow this envelope:

**Success:** `{ "success": true, "data": {}, "error": null }`
**Error:**   `{ "success": false, "data": null, "error": { "code": "...", "message": "...", "details": {} } }`

Authentication is header-based: every protected request sends `x-user-id` and `x-user-role`.

### Auth
| Method | Route               | Description                        | Auth |
|--------|---------------------|------------------------------------|------|
| POST   | `/api/auth/login`   | Verify credentials, return user ID | No   |
| POST   | `/api/auth/logout`  | Stateless acknowledgement          | No   |

### Users
| Method | Route            | Description                | Auth          |
|--------|------------------|----------------------------|---------------|
| GET    | `/api/users`     | List all users             | admin only    |
| GET    | `/api/users/me`  | Current user's profile     | admin, player |
| GET    | `/api/users/:id` | One user by ID             | admin, player |
| POST   | `/api/users`     | Register a new user        | public        |
| PUT    | `/api/users/:id` | Update user profile        | admin, player |
| DELETE | `/api/users/:id` | Delete user + their scores | admin, player |

### Scores
| Method | Route                             | Description                                          | Auth          |
|--------|-----------------------------------|------------------------------------------------------|---------------|
| GET    | `/api/scores`                     | All scores (global leaderboard)                      | admin only    |
| GET    | `/api/scores/:id`                 | Personal leaderboard for a user                      | admin, player |
| GET    | `/api/scores/:id/:pieces/:rounds` | One specific score                                   | admin, player |
| GET    | `/api/scores/stats/:id`           | Dashboard stats (topPieces, topRounds, fastestScore) | any           |
| POST   | `/api/scores/:id`                 | Record a new score                                   | admin, player |
| PUT    | `/api/scores/:id`                 | Update score if improved                             | admin, player |

### Settings
| Method | Route            | Description                         | Auth                   |
|--------|------------------|-------------------------------------|------------------------|
| GET    | `/api/settings`  | Load current user's settings        | admin, player, manager |
| PUT    | `/api/settings`  | Save current user's settings        | admin, player, manager |

### AI
| Method | Route               | Description                                     | Auth |
|--------|---------------------|-------------------------------------------------|------|
| POST   | `/api/ai/extract`   | Extract image keyword from free-text (Groq)     | No   |

### Images
| Method | Route                                | Description                            | Auth |
|--------|--------------------------------------|----------------------------------------|------|
| GET    | `/api/images/generate?topic=&count=` | Fetch random Pexels images for a topic | No   |

---

## WebSocket Feature

Socket.IO powers two real-time multiplayer game modes. Both use the same server (`server.js`).

### Events — Co-op Mode
| Direction       | Event                  | Description                                   |
|-----------------|------------------------|-----------------------------------------------|
| client → server | `find_coop_match`      | Join the co-op matchmaking queue              |
| server → client | `waiting_for_partner`  | Queued; waiting for another player            |
| server → client | `match_started`        | Partner found; game state sent to both        |
| client → server | `make_move`            | Place a piece on the board                    |
| client → server | `remove_piece`         | Return a placed piece to the bank             |
| server → client | `turn_update`          | Updated board + source bank + current turn    |
| server → client | `next_round`           | Current round complete; next round state sent |
| server → client | `coop_victory`         | All rounds solved; final time sent            |
| server → client | `partner_disconnected` | Partner's socket disconnected                 |
| client → server | `cancel_matchmaking`   | Leave the queue                               |
| server → client | `match_error`          | Image fetch failed; both players notified     |

### Events — Racing Mode
| Direction       | Event                        | Description                                       |
|-----------------|------------------------------|---------------------------------------------------|
| client → server | `join_race_queue`            | Join the race matchmaking queue                   |
| server → client | `waiting_for_race_partner`   | Queued; waiting for an opponent                   |
| server → client | `race_started`               | Opponent found; each player gets their own images |
| client → server | `update_race_progress`       | Report pieces-correct count after each move       |
| server → client | `opponent_progress_update`   | Relay opponent's progress count                   |
| client → server | `submit_race_win`            | Claim victory after finishing all rounds          |
| server → client | `race_over`                  | Race decided; winner + loser IDs + final time     |
| server → client | `race_opponent_disconnected` | Opponent disconnected; current player wins        |
| client → server | `cancel_race_queue`          | Leave the queue                                   |

**Demonstrating two-client communication:** open `http://localhost:5173` in two separate browser windows, log in with two different accounts (e.g. `max@mail.com` / `han@mail.com`, both password `123456`), and start a Co-op or Race match.

---

## AI Feature

**Groq (Llama 3.1 8B Instant) keyword extraction** powers the topic-to-image pipeline:

1. Player types a natural-language description (e.g. *"I want to solve a puzzle about animals in the jungle"*).
2. Dashboard calls `POST /api/ai/extract` with the raw text.
3. The backend sends the text to Groq's Llama 3.1 8B Instant model with a strict system instruction to return **only** a 1-3 word search query.
4. The extracted keyword (e.g. *"jungle animals"*) is forwarded to Pexels to fetch puzzle images.

Groq's free tier offers substantially higher rate limits than Gemini's, making it better suited for demo and classroom use. The GROQ_API_KEY lives exclusively on the server — it is never sent to the frontend.

---

## Known Limitations

- **Plain-text passwords** — stored without hashing (acceptable for this academic project; production would use bcrypt).
- **Stateless authentication** — no JWT or sessions; the userId/role are stored in React state and lost on page refresh (user must log in again).
- **No email validation** on the backend — only the frontend validates email format.
- **Socket.IO in-memory queues** — matchmaking state resets on server restart; pending players are dropped.
- **Score uniqueness constraint** — one score row per (userId, pieces, rounds) combination; the client updates via PUT if a second game is played on the same settings.
- **Pexels API rate limits** — the free tier allows 200 requests/hour. Heavy load during demos may hit this ceiling.
