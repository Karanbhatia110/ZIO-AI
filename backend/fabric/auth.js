const { ConfidentialClientApplication } = require("@azure/msal-node");

let userCredentials = null;
let msalClient = null;

function setCredentials(credentials) {
    // credentials: { workspaceId, tenantId, clientId, clientSecret }
    userCredentials = credentials;

    if (credentials.clientId && credentials.clientSecret && credentials.tenantId) {
        const config = {
            auth: {
                clientId: credentials.clientId,
                authority: `https://login.microsoftonline.com/${credentials.tenantId}`,
                clientSecret: credentials.clientSecret,
            }
        };
        msalClient = new ConfidentialClientApplication(config);
    }
}

async function getAccessToken() {
    if (!msalClient) return null;

    try {
        const result = await msalClient.acquireTokenByClientCredential({
            scopes: ["https://api.fabric.microsoft.com/.default"]
        });
        return result.accessToken;
    } catch (error) {
        console.error("Error acquiring token:", error);
        return null;
    }
}

function getCredentials() {
    return userCredentials;
}

function isAuthenticated() {
    return userCredentials !== null;
}

module.exports = { setCredentials, getCredentials, isAuthenticated, getAccessToken };
