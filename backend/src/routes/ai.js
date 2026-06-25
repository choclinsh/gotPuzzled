/**
 * routes/ai.js — /api/ai endpoints.
 *
 * Exposes the Groq AI keyword-extraction pipeline to the frontend.
 * The API key is stored server-side only (never sent to the browser).
 */
const express = require('express');
const router = express.Router();
const { extractTopicFromText } = require('../services/aiService');

/**
 * POST /api/ai/extract
 * Accepts a free-text sentence and returns a short, clean image search query
 * produced by the Groq model.
 *
 * Request body: { text: string }
 * Response:     { success: true, data: "refined query", error: null }
 *
 * @param {import('express').Request}  req - Body must include a non-empty `text` field.
 * @param {import('express').Response} res - The refined keyword string or an error envelope.
 */
router.post('/extract', async (req, res) => {
    const { text } = req.body;

    if (!text || !text.trim()) {
        return res.status(400).json({
            success: false, data: null,
            error: { code: 'INVALID_INPUT', message: 'A text input is required.', details: {} }
        });
    }

    try {
        const topic = await extractTopicFromText(text.trim());
        res.json({ success: true, data: topic, error: null });
    } catch (err) {
        console.error(`[AI] extract failed for "${text}":`, err.message);
        res.status(500).json({
            success: false, data: null,
            error: { code: 'AI_ERROR', message: err.message, details: {} }
        });
    }
});

module.exports = router;
