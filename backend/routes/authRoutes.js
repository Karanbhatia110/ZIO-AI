const express = require('express');
const router = express.Router();
const authInfo = require('../fabric/auth');

router.post('/connect', (req, res) => {
    const { workspaceId, tenantId, clientId, clientSecret } = req.body;

    if (!workspaceId || !tenantId || !clientId || !clientSecret) {
        return res.status(400).json({ error: "Missing required credentials" });
    }

    authInfo.setCredentials({ workspaceId, tenantId, clientId, clientSecret });
    res.json({ success: true, message: "Connected to Fabric" });
});

module.exports = router;
