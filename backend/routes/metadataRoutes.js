const express = require('express');
const router = express.Router();
const metadataService = require('../fabric/metadata');
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res) => {
    try {
        // Check if user passed an access token from frontend login
        const authHeader = req.headers.authorization;
        const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        const data = await metadataService.getMetadata(userToken);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST endpoint to save manual metadata from frontend
router.post('/manual', (req, res) => {
    try {
        const { workspaceName, lakehouses } = req.body;

        const metadata = {
            workspaces: [{ id: "manual-ws", name: workspaceName || "My Workspace" }],
            lakehouses: lakehouses || []
        };

        const filePath = path.join(__dirname, '../fabric/manual-metadata.json');
        fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));

        res.json({ success: true, message: "Manual metadata saved!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
