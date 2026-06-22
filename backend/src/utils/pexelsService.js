/**
 * pexelsService.js — wrapper around the Pexels Images REST API.
 *
 * Fetches a shuffled pool of photos for a given topic and returns a
 * random sample of `count` unique image URLs. Includes automatic fallback:
 * if the requested topic returns 0 photos (or the request itself fails),
 * the function retries once with the generic "abstract" fallback topic so
 * the game always has images to show.
 */

const POOL_SIZE   = 50;           // how many photos to request from Pexels before sampling
const FALLBACK_TOPIC = 'abstract'; // used when the user's topic yields no results

/**
 * Fisher-Yates shuffle on a copy of the given array.
 * Used to randomise which photos from the Pexels pool are picked each game.
 * @param {any[]} arr - Source array.
 * @returns {any[]} New shuffled array.
 */
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Fetch `count` random image URLs from Pexels matching `topic`.
 *
 * Fallback mechanics:
 *  1. Requests up to POOL_SIZE photos from Pexels for the given topic.
 *  2. If the HTTP request fails, retries with FALLBACK_TOPIC (once).
 *  3. If the response contains 0 photos, retries with FALLBACK_TOPIC (once).
 *  4. Shuffles the pool and slices `count` items so every game session is unique.
 *  5. Returns only the `.large` image URLs (suitable for puzzle backgrounds).
 *
 * @param {string}  topic      - The image search query (e.g. "sunset mountains").
 * @param {number}  count      - How many image URLs to return (clamped to 1–20).
 * @param {boolean} [isFallback=false] - Internal flag; prevents infinite retry loops.
 * @returns {Promise<string[]>} Array of `count` image URLs from Pexels.
 * @throws If even the fallback topic returns no images, or if the API key is missing.
 */
async function fetchPexelsImages(topic, count, isFallback = false) {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('PEXELS_API_KEY is not configured on the server.');

    // Clamp count to valid range (1–20) to avoid abusing the API
    const safeCount = Math.min(Math.max(parseInt(count, 10) || 5, 1), 20);
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(topic.trim())}&per_page=${POOL_SIZE}`;

    let photos = [];
    try {
        const response = await fetch(url, { headers: { Authorization: apiKey } });
        if (!response.ok) throw new Error(`Pexels API responded with status ${response.status}`);
        const data = await response.json();
        photos = data.photos || [];
    } catch (err) {
        // Network or API error — retry with the fallback topic rather than crashing
        if (isFallback) throw err;
        console.warn(`[pexels] request failed for "${topic}": ${err.message} — retrying with "${FALLBACK_TOPIC}"`);
        return fetchPexelsImages(FALLBACK_TOPIC, count, true);
    }

    if (photos.length === 0) {
        // Topic exists but returned no photos — retry with the fallback topic
        if (isFallback) throw new Error(`No images found even for fallback topic "${FALLBACK_TOPIC}".`);
        console.warn(`[pexels] 0 photos for "${topic}" — retrying with "${FALLBACK_TOPIC}"`);
        return fetchPexelsImages(FALLBACK_TOPIC, count, true);
    }

    // Shuffle the full pool so each call returns a different random sample
    return shuffleArray(photos)
        .slice(0, safeCount)
        .map(photo => photo.src.large);
}

module.exports = { fetchPexelsImages };
