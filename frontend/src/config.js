// API Configuration
// In development: uses localhost
// In production: uses environment variable VITE_API_URL

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
