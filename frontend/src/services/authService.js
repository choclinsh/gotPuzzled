/**
 * authService — API calls for authentication (login, register, logout).
 *
 * The backend port comes from REACT_APP_BACKEND_PORT (.env), defaulting to 3000.
 * Each method throws an Error with the backend's message on a non-OK response.
 */
const BASE_URL = `${process.env.REACT_APP_BACKEND_URL || 'http://localhost:3000'}/api`;

export const authService = {
    /** POST /auth/login — returns the parsed envelope { data: { user: {...} } }. */
    async login(email, password) {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Login failed.');

        return result; // Returns the parsed JSON data cleanly to the page
    },

    /** POST /users — create an account; returns the envelope with the new userId. */
    async register(userData) {
        const response = await fetch(`${BASE_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Registration failed.');
        return result;
    },

    /** POST /auth/logout — stateless on the server; resolves true on success. */
    async logout() {
        const response = await fetch(`${BASE_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('Logout failed on server');
        return true;
    }
};