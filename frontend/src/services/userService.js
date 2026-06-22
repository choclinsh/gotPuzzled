/**
 * userService — API calls for user profile data.
 *
 * The id/role are passed as the x-user-id / x-user-role headers the backend
 * auth middleware expects.
 */
const BASE_URL = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/api/users`;

export const userService = {
    /** GET /users/me — fetch the logged-in user's full profile after login. */
    async getProfile(userId, userRole) {
        const response = await fetch(`${BASE_URL}/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId.toString(),
                'x-user-role': userRole
            }
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Failed to load profile.');
        return result; // Return just the user data object
    }
};