// API Configuration
// In development: uses localhost
// In production: uses environment variable VITE_API_URL

const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;

    if (!envUrl) {
        return 'http://localhost:3000/api';
    }

    // Ensure URL ends with /api
    if (envUrl.endsWith('/api')) {
        return envUrl;
    }

    // Remove trailing slash if present, then add /api
    return envUrl.replace(/\/$/, '') + '/api';
};

export const API_URL = getApiUrl();
