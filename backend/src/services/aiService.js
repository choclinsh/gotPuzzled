const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Instructs the model to act as a pure keyword extractor, not a chatbot.
// The strict "Return ONLY the search query string" wording prevents the model
// from adding conversational fluff like "Sure! The keyword is: ...".
const SYSTEM_INSTRUCTION =
    'You are a keyword extraction bot. The user will provide a sentence. ' +
    'Extract the core visual subject into a 1-3 word image search query. ' +
    'Do not include punctuation, conversation, or filler words. ' +
    'Return ONLY the search query string.';

/**
 * Sends the user's free-text description to the Llama 3.1 8B model via Groq
 * and returns a concise 1-3 word image-search query.
 *
 * The AI pipeline: raw user text → Groq (keyword extraction) → refined topic string.
 * The refined string is then forwarded to Pexels for image fetching.
 *
 * @param {string} userText - The raw sentence the user typed (e.g. "I want animals in a forest").
 * @returns {Promise<string>} A short, clean search query (e.g. "forest animals").
 * @throws Will throw if the Groq API call fails or the key is invalid.
 */
async function extractTopicFromText(userText) {
    const { data: completion, response: rawResponse } = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            { role: 'user',   content: userText },
        ],
    }).withResponse();

    const remainingRequests = rawResponse.headers.get('x-ratelimit-remaining-requests') ?? 'N/A';
    const remainingTokens   = rawResponse.headers.get('x-ratelimit-remaining-tokens')   ?? 'N/A';
    process.stdout.write(`[AI] Rate limits — Remaining requests (day): ${remainingRequests} | Remaining tokens (min): ${remainingTokens}\n`);

    const refined = completion.choices[0].message.content.trim();
    console.log(`[AI] "${userText}" → "${refined}"`);
    return refined;
}

module.exports = { extractTopicFromText };
