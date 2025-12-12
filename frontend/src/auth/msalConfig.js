import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

// Determine redirect URI based on environment
const getRedirectUri = () => {
    if (window.location.hostname === 'localhost') {
        return 'http://localhost:5173';
    }
    // Production - use current origin
    return window.location.origin;
};

// IMPORTANT: Update these values with your Azure App Registration details
const msalConfig = {
    auth: {
        clientId: "0a55a511-291e-4ca1-a698-dcf73b193e34",
        authority: "https://login.microsoftonline.com/bc9cd8e7-1801-4d9b-9c0d-c39cb60a7a19",
        redirectUri: getRedirectUri(),
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) return;
                switch (level) {
                    case LogLevel.Error:
                        console.error(message);
                        break;
                    case LogLevel.Warning:
                        console.warn(message);
                        break;
                    case LogLevel.Info:
                        console.info(message);
                        break;
                    case LogLevel.Verbose:
                        console.debug(message);
                        break;
                }
            },
        },
    },
};

// Scopes for Fabric API access
export const loginRequest = {
    scopes: [
        "https://api.fabric.microsoft.com/Workspace.ReadWrite.All",
        "https://api.fabric.microsoft.com/Item.ReadWrite.All"
    ]
};

export const fabricApiRequest = {
    scopes: ["https://api.fabric.microsoft.com/.default"]
};

export const msalInstance = new PublicClientApplication(msalConfig);
