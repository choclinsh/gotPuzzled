/**
 * aiService.js — frontend client for the /api/ai endpoints.
 *
 * Routes all AI calls through the backend so the GROQ_API_KEY is never
 * exposed to the browser. The backend handles the Groq call and returns
 * a clean JSON envelope.
 */
const BASE_URL = `${process.env.REACT_APP_BACKEND_URL || ''}/api/ai`;

export const aiService = {
    /**
     * Send the user's free-text description to the backend AI pipeline and
     * receive a short, clean image search query in return.
     *
     * Flow: frontend → POST /api/ai/extract → Groq Llama → refined keyword
     *
     * @param {string} text - Raw sentence typed by the user (e.g. "I want animals in a forest").
     * @returns {Promise<string>} Refined 1-3 word keyword (e.g. "forest animals").
     * @throws {Error} If the network request fails or the server returns an error envelope.
     */
    async extractTopic(text) {
        const response = await fetch(`${BASE_URL}/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'AI extraction failed.');
        return result.data;
    }
};
