/**
 * settingsService — API calls for the current user's profile/preferences.
 *
 * Talks to the /api/settings routes, which act on the user identified by the
 * x-user-id / x-user-role headers. Methods return just the `data` payload.
 */
const API_BASE_URL = `${process.env.REACT_APP_BACKEND_URL || ''}/api/settings`;

export const settingsService = {

    /** GET /settings — load the current user's profile and preferences. */
    getSettings: async (userId, userRole) => {
        const res = await fetch(`${API_BASE_URL}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                'x-user-id': userId.toString(),
                'x-user-role': userRole
            },
        });

        if (!res.ok) {
            throw new Error("Could not retrieve application preferences.");
        }

        const json = await res.json();
        return json.data;
    },

    /** PUT /settings — save the full settings object back to the server. */
    updateSettings: async (userId, userRole, payload) => {
        const res = await fetch(`${API_BASE_URL}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                'x-user-id': userId.toString(),
                'x-user-role': userRole
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error("Failed to save changes to the server.");
        }

        const json = await res.json();
        return json.data;
    }
};