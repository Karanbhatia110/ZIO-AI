const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

// Parse YAML-like content to extract pipeline activities
function parseYamlActivities(content) {
    const activities = [];

    // Look for activities section
    const activitiesMatch = content.match(/activities:\s*([\s\S]*?)(?=\n\s*schedule:|$)/i);
    if (!activitiesMatch) return activities;

    // Parse each activity
    const activityBlocks = activitiesMatch[1].split(/\n\s*-\s*name:/);
    for (let i = 1; i < activityBlocks.length; i++) {
        const block = 'name:' + activityBlocks[i];

        const nameMatch = block.match(/name:\s*["']?([^"'\n]+)["']?/);
        const typeMatch = block.match(/type:\s*["']?([^"'\n]+)["']?/);

        if (nameMatch && typeMatch) {
            const name = nameMatch[1].trim();
            const type = typeMatch[1].trim();

            if (type.toLowerCase() === 'copy') {
                // Extract source and target paths
                const sourcePath = block.match(/source:[\s\S]*?path:\s*["']?([^"'\n]+)["']?/);
                const targetPath = block.match(/target:[\s\S]*?path:\s*["']?([^"'\n]+)["']?/);
                const sourceLakehouse = block.match(/source:[\s\S]*?lakehouse:\s*["']?([^"'\n]+)["']?/);

                activities.push({
                    name: name,
                    type: "Copy",
                    dependsOn: [],
                    policy: {
                        timeout: "0.12:00:00",
                        retry: 0,
                        retryIntervalInSeconds: 30
                    },
                    typeProperties: {
                        source: {
                            type: "LakehouseTableSource"
                        },
                        sink: {
                            type: "LakehouseTableSink",
                            tableActionOption: "Overwrite"
                        },
                        dataIntegrationUnits: 0,
                        translator: {
                            type: "TabularTranslator",
                            typeConversion: true
                        }
                    },
                    inputs: [
                        {
                            referenceName: sourcePath ? sourcePath[1].replace('/Tables/', '') : "source_table",
                            type: "DatasetReference"
                        }
                    ],
                    outputs: [
                        {
                            referenceName: targetPath ? targetPath[1].replace('/Tables/', '') : "target_table",
                            type: "DatasetReference"
                        }
                    ]
                });
            } else if (type.toLowerCase() === 'notebook') {
                activities.push({
                    name: name,
                    type: "TridentNotebook",
                    dependsOn: [],
                    policy: {
                        timeout: "0.12:00:00",
                        retry: 0,
                        retryIntervalInSeconds: 30
                    },
                    typeProperties: {}
                });
            }
        }
    }

    return activities;
}

router.post('/', async (req, res) => {
    const { pipelineYaml: content, workspaceId, lakehouseName, pipelineName } = req.body;

    const authHeader = req.headers.authorization;
    const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!content) {
        return res.status(400).json({ error: "Pipeline content is required" });
    }

    if (!userToken) {
        return res.status(401).json({ error: "Authentication required. Please sign in." });
    }

    if (!workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
    }

    const finalPipelineName = pipelineName || `zio_pipeline_${Date.now()}`;

    try {
        logger.info(`========== DEPLOYMENT STARTED ==========`);
        logger.info(`Pipeline Name: ${finalPipelineName}`);
        logger.info(`Workspace ID: ${workspaceId}`);
        logger.info(`Lakehouse: ${lakehouseName || 'Not specified'}`);

        // Parse activities from the AI response
        const activities = parseYamlActivities(content);
        logger.info(`Parsed ${activities.length} activities from AI response`);
        if (activities.length > 0) {
            activities.forEach((act, i) => {
                logger.info(`  Activity ${i + 1}: ${act.name} (${act.type})`);
            });
        }

        // ========== STEP 1: Create the Data Pipeline ==========
        const createUrl = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/items`;
        logger.info(`\n[STEP 1] Creating pipeline...`);
        logger.info(`  URL: ${createUrl}`);

        const createPayload = {
            displayName: finalPipelineName,
            type: "DataPipeline",
            description: `Pipeline created by zio.ai at ${new Date().toISOString()}`
        };
        logger.info(`  Payload: ${JSON.stringify(createPayload)}`);

        let pipelineId;
        try {
            const pipelineResponse = await axios.post(createUrl, createPayload, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                }
            });

            pipelineId = pipelineResponse.data.id;
            logger.info(`  ✓ SUCCESS: Created pipeline with ID: ${pipelineId}`);
        } catch (createError) {
            const status = createError.response?.status;
            const errorCode = createError.response?.data?.errorCode;
            const errorMsg = createError.response?.data?.message;
            const fullError = createError.response?.data;

            logger.error(`  ✗ FAILED to create pipeline`);
            logger.error(`    HTTP Status: ${status}`);
            logger.error(`    Error Code: ${errorCode}`);
            logger.error(`    Error Message: ${errorMsg}`);
            logger.error(`    Full Error: ${JSON.stringify(fullError, null, 2)}`);

            // Provide helpful messages for common errors
            let userMessage = errorMsg || createError.message;
            if (errorCode === 'FeatureNotAvailable') {
                userMessage = 'Data Pipeline creation is not available. This could mean: (1) Your Fabric capacity does not support Data Factory, (2) The Data Factory workload is disabled, or (3) Your region does not support this feature.';
            } else if (errorCode === 'Unauthorized' || status === 401) {
                userMessage = 'Authentication failed. Please sign out and sign in again with the required permissions.';
            } else if (errorCode === 'ItemDisplayNameAlreadyInUse') {
                userMessage = `A pipeline named "${finalPipelineName}" already exists. Please choose a different name.`;
            } else if (status === 403) {
                userMessage = 'Permission denied. You may not have write access to this workspace.';
            }

            return res.status(status || 500).json({
                success: false,
                step: 'CREATE_PIPELINE',
                error: userMessage,
                errorCode: errorCode,
                details: fullError
            });
        }

        // ========== STEP 2: Update Pipeline Definition ==========
        const pipelineDefinition = {
            properties: {
                activities: activities.length > 0 ? activities : [
                    {
                        name: "Wait1",
                        type: "Wait",
                        dependsOn: [],
                        typeProperties: {
                            waitTimeInSeconds: 1
                        }
                    }
                ]
            }
        };

        const pipelineDefBase64 = Buffer.from(JSON.stringify(pipelineDefinition)).toString('base64');

        const platformConfig = {
            "$schema": "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
            "config": {
                "version": "2.0",
                "logicalId": pipelineId
            }
        };
        const platformBase64 = Buffer.from(JSON.stringify(platformConfig)).toString('base64');

        const updateUrl = `https://api.fabric.microsoft.com/v1/workspaces/${workspaceId}/dataPipelines/${pipelineId}/updateDefinition?updateMetadata=true`;
        logger.info(`\n[STEP 2] Updating pipeline definition...`);
        logger.info(`  URL: ${updateUrl}`);
        logger.info(`  Pipeline Definition: ${JSON.stringify(pipelineDefinition, null, 2)}`);

        let definitionUpdated = false;
        try {
            await axios.post(
                updateUrl,
                {
                    definition: {
                        parts: [
                            {
                                path: "pipeline-content.json",
                                payload: pipelineDefBase64,
                                payloadType: "InlineBase64"
                            },
                            {
                                path: ".platform",
                                payload: platformBase64,
                                payloadType: "InlineBase64"
                            }
                        ]
                    }
                },
                {
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            logger.info(`  ✓ SUCCESS: Pipeline definition updated!`);
            definitionUpdated = true;
        } catch (updateError) {
            const status = updateError.response?.status;
            const errorCode = updateError.response?.data?.errorCode;
            const errorMsg = updateError.response?.data?.message;
            const fullError = updateError.response?.data;

            logger.error(`  ✗ FAILED to update pipeline definition`);
            logger.error(`    HTTP Status: ${status}`);
            logger.error(`    Error Code: ${errorCode}`);
            logger.error(`    Error Message: ${errorMsg}`);
            logger.error(`    Full Error: ${JSON.stringify(fullError, null, 2)}`);

            // Provide helpful messages for common errors
            if (errorCode === 'InvalidDefinitionPart') {
                logger.error(`    → The pipeline definition format may be incorrect for this Fabric version.`);
            } else if (errorCode === 'FeatureNotAvailable') {
                logger.error(`    → The updateDefinition API may not be available for Data Pipelines in your capacity.`);
            }
        }

        logger.info(`\n========== DEPLOYMENT COMPLETED ==========`);
        logger.info(`Pipeline created: ${definitionUpdated ? 'with activities' : 'empty (definition update failed)'}`);

        res.json({
            success: true,
            pipelineId: pipelineId,
            pipelineName: finalPipelineName,
            workspaceId: workspaceId,
            activitiesCount: activities.length,
            definitionUpdated: definitionUpdated,
            message: definitionUpdated
                ? `Created pipeline "${finalPipelineName}" with ${activities.length} activities!`
                : `Created empty pipeline "${finalPipelineName}". Activities could not be added (check server logs).`,
            url: `https://app.fabric.microsoft.com/groups/${workspaceId}/pipelines/${pipelineId}`
        });

    } catch (error) {
        const status = error.response?.status;
        const errorCode = error.response?.data?.errorCode;
        const errorMsg = error.response?.data?.message || error.response?.data?.error?.message || error.message;
        const fullError = error.response?.data;

        logger.error(`\n========== DEPLOYMENT FAILED ==========`);
        logger.error(`HTTP Status: ${status}`);
        logger.error(`Error Code: ${errorCode}`);
        logger.error(`Error Message: ${errorMsg}`);
        logger.error(`Full Error: ${JSON.stringify(fullError, null, 2)}`);
        logger.error(`Stack: ${error.stack}`);

        res.status(status || 500).json({
            success: false,
            error: errorMsg,
            errorCode: errorCode,
            details: fullError
        });
    }
});

module.exports = router;
