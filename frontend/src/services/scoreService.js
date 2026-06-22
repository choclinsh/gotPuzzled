/**
 * scoreService — API calls for scores, stats, and the leaderboards.
 *
 * id/role are sent as x-user-id / x-user-role headers. Methods return just the
 * `data` payload (not the full envelope) and throw on unexpected errors.
 */
const BASE_URL = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/api/scores`;

export const scoreService = {
    /** GET /scores/:id — the logged-in player's own scores. */
    async getPersonalScores(userId, userRole) {
        const response = await fetch(`${BASE_URL}/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId.toString(),
                'x-user-role': userRole
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Failed to fetch your leaderboard.');

        return result.data; // Return just the array of scores
    },

    /** GET /scores — every user's scores (admin-only global leaderboard). */
    async getGlobalScores(userId, userRole) {
        const response = await fetch(`${BASE_URL}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId.toString(),
                'x-user-role': userRole
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Failed to fetch global leaderboard.');

        return result.data; // Return just the array of scores
    },

    /**
     * GET /scores/stats/:id — aggregated dashboard stats (topPieces, topRounds,
     * fastestScore). Returns null (not an error) when the user has no scores yet.
     */
    async getPersonalStats(userId, userRole) {
        const response = await fetch(`${BASE_URL}/stats/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId.toString(),
                'x-user-role': userRole // Sent for your verify_user middleware consistency
            }
        });

        // A user with no scores yet is a normal empty state, not an error.
        // The backend returns 404 here; surface it as null so the dashboard
        // can render zeros instead of an error message.
        if (response.status === 404) return null;

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Failed to fetch personal stats.');

        // Return the direct object payload so keys are explicit on the frontend
        return result.data;
    },

    /**
     * Save a score for a (pieces, rounds) combo. Tries POST /scores/:id first;
     * if the combo already exists (400 ALREADY_EXISTS) it falls back to
     * PUT /scores/:id to update the existing record. Returns the saved data.
     */
    async setScore(userId, userRole, pieces, rounds, score) {
        const response = await fetch(`${BASE_URL}/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId.toString(),
                'x-user-role': userRole
            },
            body: JSON.stringify({
                pieces: pieces,
                rounds: rounds,
                score: score
            })
        });

        const result = await response.json();

        if (!response.ok) {

            // 1. Catch your exact "NOT_FOUND" scenario
            if (response.status === 400 && result.error?.code === "ALREADY_EXISTS") {

                const putResponse = await fetch(`${BASE_URL}/${userId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': userId.toString(),
                        'x-user-role': userRole
                    },

                    body: JSON.stringify({
                        pieces: pieces,
                        rounds: rounds,
                        score: score
                    })
                });


                const putResult = await putResponse.json();
                if (!putResponse.ok) throw new Error(putResult.error?.message || 'Failed to fetch personal stats.');

                // Return the direct object payload so keys are explicit on the frontend
                return putResult.data;
            }

            // Catch all OTHER bad errors (e.g., validation failed, server crashed, auth failed)
            throw new Error(result.error?.message || 'A could not connect your scores database.');
        }

        return result.data;
    }


};