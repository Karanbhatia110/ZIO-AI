const { getCredentials } = require("./auth");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Mock metadata for fallback
const MOCK_METADATA = {
    workspaces: [
        { id: "ws-123", name: "Sales Workspace" }
    ],
    lakehouses: [
        {
            id: "lh-123",
            name: "sales_lakehouse",
            tables: ["sales_raw", "customers", "products"]
        }
    ]
};

async function getMetadata(userAccessToken = null) {
    // PRIORITY 1: If user passed an access token from interactive login, use it
    if (userAccessToken) {
        console.log("Using USER access token from interactive login");
        try {
            // Fetch workspaces the user has access to
            const workspacesResponse = await axios.get(
                "https://api.fabric.microsoft.com/v1/workspaces",
                { headers: { Authorization: `Bearer ${userAccessToken}` } }
            );

            const workspaces = workspacesResponse.data.value.map(ws => ({
                id: ws.id,
                name: ws.displayName
            }));

            console.log(`Found ${workspaces.length} workspaces:`, workspaces.map(w => w.name));

            // Fetch lakehouses for each workspace
            const allLakehouses = [];
            for (const ws of workspaces) { // All workspaces
                try {
                    console.log(`Fetching lakehouses for: ${ws.name}`);
                    const lhResponse = await axios.get(
                        `https://api.fabric.microsoft.com/v1/workspaces/${ws.id}/items?type=Lakehouse`,
                        { headers: { Authorization: `Bearer ${userAccessToken}` } }
                    );

                    const items = lhResponse.data.value || [];
                    console.log(`  Found ${items.length} lakehouses`);

                    for (const lh of items) {
                        allLakehouses.push({
                            id: lh.id,
                            name: lh.displayName,
                            workspaceId: ws.id,
                            workspaceName: ws.name,
                            tables: ["(Tables loaded on demand)"]
                        });
                    }
                } catch (err) {
                    console.warn(`  Error for ${ws.name}:`, err.response?.data?.message || err.message);
                }
            }

            console.log(`Total lakehouses: ${allLakehouses.length}`);

            return {
                workspaces,
                lakehouses: allLakehouses,
                _source: "api"
            };

        } catch (error) {
            console.error("User token API error:", error.response?.data || error.message);
            return {
                ...MOCK_METADATA,
                _source: "error",
                _message: "Could not fetch workspaces. Please check API permissions in Azure."
            };
        }
    }

    // PRIORITY 2: Check for manual-metadata.json
    const manualMetadataPath = path.join(__dirname, "manual-metadata.json");
    if (fs.existsSync(manualMetadataPath)) {
        try {
            const manualData = JSON.parse(fs.readFileSync(manualMetadataPath, "utf-8"));
            if (manualData.lakehouses?.[0]?.name !== "your_lakehouse_name") {
                console.log("Using MANUAL metadata from manual-metadata.json");
                return { ...manualData, _source: "manual" };
            }
        } catch (err) {
            console.warn("Error reading manual-metadata.json:", err.message);
        }
    }

    // PRIORITY 3: Try Service Principal API
    const creds = getCredentials();
    const token = await require("./auth").getAccessToken();

    if (!creds || !token) {
        console.warn("No credentials or token found. Using Mock Metadata.");
        return {
            ...MOCK_METADATA,
            _source: "mock",
            _message: "No credentials provided. Please sign in or configure manual metadata."
        };
    }

    try {
        const response = await axios.get(
            `https://api.fabric.microsoft.com/v1/workspaces/${creds.workspaceId}/items?type=Lakehouse`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const lakehouses = response.data.value.map(lh => ({
            id: lh.id,
            name: lh.displayName,
            tables: ["(Table fetching skipped for V1)"]
        }));

        return {
            workspaces: [{ id: creds.workspaceId, name: "Connected Workspace" }],
            lakehouses: lakehouses,
            _source: "api"
        };

    } catch (error) {
        console.error("Fabric API Error:", error.response?.data || error.message);
        return {
            ...MOCK_METADATA,
            _source: "error",
            _message: "API error. Please enter metadata manually."
        };
    }
}

module.exports = { getMetadata };
