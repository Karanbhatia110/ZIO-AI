import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const connectFabric = async (credentials) => {
    return await axios.post(`${API_URL}/auth/connect`, credentials);
};

export const getMetadata = async () => {
    const token = sessionStorage.getItem('fabricAccessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await axios.get(`${API_URL}/metadata`, { headers });
};

export const getTables = async (workspaceId, lakehouseId) => {
    const token = sessionStorage.getItem('fabricAccessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await axios.get(`${API_URL}/tables/${workspaceId}/${lakehouseId}`, { headers });
};

export const deployPipeline = async (pipelineYaml, workspaceId, lakehouseName, pipelineName) => {
    const token = sessionStorage.getItem('fabricAccessToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return await axios.post(`${API_URL}/deploy`, {
        pipelineYaml,
        workspaceId,
        lakehouseName,
        pipelineName
    }, { headers });
};
