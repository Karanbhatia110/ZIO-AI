const express = require('express');
const router = express.Router();
const geminiClient = require('../gemini/client');
const metadataService = require('../fabric/metadata');
const tokenService = require('../services/tokenService');

router.post('/', async (req, res) => {
    const { prompt, conversationHistory = [] } = req.body;
    if (!prompt) return res.status(400).json({ error: "Prompt is required" });

    // Get user token from Authorization header
    const authHeader = req.headers.authorization;
    const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const userId = tokenService.getUserId(req);

    try {
        const metadata = await metadataService.getMetadata(userToken);
        const result = await geminiClient.generatePipeline(prompt, metadata, conversationHistory);

        // Calculate and record token usage
        const promptTokens = tokenService.calculateTokens(prompt);
        const resultTokens = tokenService.calculateTokens(result);
        const totalTokens = promptTokens + resultTokens;
        tokenService.recordUsage(userId, totalTokens);

        res.json({
            result: result,
            usage: {
                tokensUsed: totalTokens,
                remaining: tokenService.getRemainingTokens(userId)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

