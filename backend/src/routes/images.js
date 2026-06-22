/**
 * routes/images.js — /api/images endpoints.
 *
 * Wraps the Pexels service so the frontend can request puzzle images without
 * exposing the PEXELS_API_KEY. Includes automatic fallback to an "abstract"
 * topic when the requested topic yields no results (handled inside pexelsService).
 */
const express = require('express');
const router = express.Router();
const { fetchPexelsImages } = require('../utils/pexelsService');

/**
 * GET /api/images/generate?topic=<string>&count=<number>
 * Fetch `count` random Pexels images for the given `topic`.
 * Returns an array of direct image URLs ready for use as puzzle backgrounds.
 *
 * Query params:
 *   topic {string} - The image search keyword (e.g. "sunset mountains").
 *   count {number} - How many images to return (1–20; defaults to 5).
 *
 * Response: { success: true, data: string[], error: null }
 *
 * @param {import('express').Request}  req - Query: { topic, count }.
 * @param {import('express').Response} res - Array of image URL strings or an error envelope.
 */
router.get('/generate', async (req, res) => {
    const { topic, count } = req.query;

    if (!topic || !topic.trim()) {
        return res.status(400).json({
            success: false, data: null,
            error: { code: 'INVALID_TOPIC', message: 'A topic is required.', details: {} }
        });
    }

    try {
        const urls = await fetchPexelsImages(topic, count);
        res.json({ success: true, data: urls, error: null });
    } catch (err) {
        const isNotFound = err.message.startsWith('No images found');
        res.status(isNotFound ? 404 : 500).json({
            success: false, data: null,
            error: {
                code:    isNotFound ? 'NO_IMAGES_FOUND' : 'PEXELS_ERROR',
                message: err.message,
                details: {}
            }
        });
    }
});

module.exports = router;
