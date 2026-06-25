/**
 * imageService.js — frontend client for the /api/images endpoints.
 *
 * Routes all image-fetch calls through the backend so the PEXELS_API_KEY is
 * never exposed to the browser. The backend handles Pexels fetching, shuffling,
 * and the fallback-to-"abstract" mechanic transparently.
 */
const BASE_URL = `${process.env.REACT_APP_BACKEND_URL || ''}/api/images`;

export const imageService = {
    /**
     * Fetch `count` random puzzle image URLs for the given topic from Pexels.
     * The backend automatically falls back to an "abstract" topic if the
     * requested topic yields no results.
     *
     * @param {string} topic - The image search keyword (e.g. "sunset mountains").
     * @param {number} count - How many images to return (1–20).
     * @returns {Promise<string[]>} Array of direct image URL strings.
     * @throws {Error} If the network request fails or no images were found.
     */
    async generateImages(topic, count) {
        const response = await fetch(
            `${BASE_URL}/generate?topic=${encodeURIComponent(topic)}&count=${count}`
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'Failed to fetch images.');
        return result.data;
    }
};
