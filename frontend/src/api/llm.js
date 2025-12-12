import axios from 'axios';
import { API_URL } from '../config';

// Helper to get auth header
const getAuthHeader = () => {
    const token = sessionStorage.getItem('fabricAccessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generatePipeline = async (prompt, conversationHistory = []) => {
    return await axios.post(
        `${API_URL}/generate`,
        { prompt, conversationHistory },
        { headers: getAuthHeader() }
    );
};

// Validate and optimize pipeline with live streaming updates
export const validateAndOptimize = (prompt, conversationHistory = [], onEvent) => {
    const token = sessionStorage.getItem('fabricAccessToken');

    return new Promise((resolve, reject) => {
        // Use fetch with streaming for SSE
        fetch(`${API_URL}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ prompt, conversationHistory })
        }).then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            const processStream = ({ done, value }) => {
                if (done) {
                    resolve();
                    return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop(); // Keep incomplete data in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            onEvent(data);

                            if (data.type === 'complete') {
                                resolve(data);
                            }
                        } catch (e) {
                            console.error('Failed to parse SSE data:', e);
                        }
                    }
                }

                reader.read().then(processStream);
            };

            reader.read().then(processStream);
        }).catch(reject);
    });
};

