const express = require('express');
const router = express.Router();
const axios = require('axios');

// GET tables and files for a specific lakehouse
router.get('/:workspaceId/:lakehouseId', async (req, res) => {
    try {
        const { workspaceId, lakehouseId } = req.params;
        const authHeader = req.headers.authorization;
        const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!userToken) {
            return res.json({ tables: [], tablesWithSchema: [], files: [] });
        }

        console.log(`Fetching tables and files for lakehouse ${lakehouseId} in workspace ${workspaceId}`);

        let tablesWithSchema = [];
        let files = [];

        // Try the Fabric Lakehouse Tables API
        try {
            const response = await axios.get(
                `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables`,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            const data = response.data.data || response.data.value || [];
            console.log(`Tables API returned ${data.length} tables`);

            tablesWithSchema = data.map(t => ({
                name: t.name,
                type: t.type || 'managed',
                location: t.location || '',
                format: t.format || 'delta',
                // Schema might be in different places depending on API version
                columns: t.columns || t.schema?.columns || []
            }));

            // If no columns in initial response, try to get schema for each table
            for (let i = 0; i < tablesWithSchema.length; i++) {
                if (tablesWithSchema[i].columns.length === 0) {
                    try {
                        const schemaRes = await axios.get(
                            `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables/${tablesWithSchema[i].name}`,
                            { headers: { Authorization: `Bearer ${userToken}` } }
                        );
                        tablesWithSchema[i].columns = schemaRes.data.columns || schemaRes.data.schema?.columns || [];
                    } catch (schemaErr) {
                        console.log(`Could not fetch schema for ${tablesWithSchema[i].name}:`, schemaErr.response?.data?.message || schemaErr.message);
                    }
                }
            }

        } catch (err) {
            console.log(`Tables API failed: ${err.response?.data?.message || err.message}`);
            console.log(`Error code: ${err.response?.data?.errorCode || 'unknown'}`);
        }

        // Fetch files from the Files folder using OneLake API
        try {
            // First, get the lakehouse details to get the OneLake path
            const lakehouseRes = await axios.get(
                `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}`,
                { headers: { Authorization: `Bearer ${userToken}` } }
            );

            const lakehouseName = lakehouseRes.data.displayName || lakehouseRes.data.name;
            console.log(`Lakehouse name: ${lakehouseName}`);

            // Try to list files using the OneLake Files API
            try {
                const filesResponse = await axios.get(
                    `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/files`,
                    { headers: { Authorization: `Bearer ${userToken}` } }
                );

                const filesData = filesResponse.data.data || filesResponse.data.value || [];
                console.log(`Files API returned ${filesData.length} files`);

                files = filesData.map(f => ({
                    name: f.name,
                    path: `Files/${f.name}`,
                    size: f.size || f.contentLength || 0,
                    type: getFileType(f.name),
                    lastModified: f.lastModified || f.lastModifiedDateTime || null
                }));
            } catch (filesErr) {
                console.log(`Files API failed: ${filesErr.response?.data?.message || filesErr.message}`);

                // Fallback: Try alternative endpoint
                try {
                    const altFilesResponse = await axios.get(
                        `https://onelake.dfs.fabric.microsoft.com/${workspaceId}/${lakehouseId}/Files?resource=filesystem&recursive=false`,
                        { headers: { Authorization: `Bearer ${userToken}` } }
                    );

                    const paths = altFilesResponse.data.paths || [];
                    files = paths.filter(p => !p.isDirectory).map(f => ({
                        name: f.name.split('/').pop(),
                        path: `Files/${f.name.split('/').pop()}`,
                        size: f.contentLength || 0,
                        type: getFileType(f.name),
                        lastModified: f.lastModified || null
                    }));
                    console.log(`Alt Files API returned ${files.length} files`);
                } catch (altErr) {
                    console.log(`Alt Files API also failed: ${altErr.response?.data?.message || altErr.message}`);
                }
            }

        } catch (lhErr) {
            console.log(`Could not fetch lakehouse details: ${lhErr.response?.data?.message || lhErr.message}`);
        }

        const tableNames = tablesWithSchema.map(t => t.name);
        console.log(`Returning ${tableNames.length} tables and ${files.length} files`);

        res.json({
            tables: tableNames,
            tablesWithSchema: tablesWithSchema,
            files: files
        });

    } catch (error) {
        console.error('Error fetching tables/files:', error.response?.data || error.message);
        res.json({ tables: [], tablesWithSchema: [], files: [] });
    }
});

// Helper function to determine file type from extension
function getFileType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
        'csv': 'CSV',
        'parquet': 'Parquet',
        'json': 'JSON',
        'xlsx': 'Excel',
        'xls': 'Excel',
        'txt': 'Text',
        'avro': 'Avro',
        'orc': 'ORC'
    };
    return types[ext] || ext.toUpperCase();
}

// GET schema for a specific table
router.get('/:workspaceId/:lakehouseId/:tableName/schema', async (req, res) => {
    try {
        const { workspaceId, lakehouseId, tableName } = req.params;
        const authHeader = req.headers.authorization;
        const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

        if (!userToken) {
            return res.json({ columns: [] });
        }

        console.log(`Fetching schema for table ${tableName}`);

        const response = await axios.get(
            `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/lakehouses/${lakehouseId}/tables/${tableName}`,
            { headers: { Authorization: `Bearer ${userToken}` } }
        );

        const columns = response.data.columns || response.data.schema?.columns || [];
        console.log(`Found ${columns.length} columns for ${tableName}`);

        res.json({ columns });

    } catch (error) {
        console.error('Error fetching table schema:', error.response?.data || error.message);
        res.json({ columns: [] });
    }
});

module.exports = router;
