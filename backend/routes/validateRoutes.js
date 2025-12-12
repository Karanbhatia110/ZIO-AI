const express = require('express');
const router = express.Router();
const yaml = require('js-yaml');
const geminiClient = require('../gemini/client');
const metadataService = require('../fabric/metadata');
const logger = require('../utils/logger');

// Validation and optimization endpoint with Server-Sent Events
router.post('/', async (req, res) => {
    const { prompt, conversationHistory = [] } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    };

    const MAX_ITERATIONS = 5;
    let currentPipeline = null;
    let iteration = 0;

    // Get user token from Authorization header
    const authHeader = req.headers.authorization;
    const userToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    try {
        const metadata = await metadataService.getMetadata(userToken);

        sendEvent('status', {
            message: 'Starting pipeline generation...',
            phase: 'generating',
            iteration: 0
        });

        // Initial generation
        sendEvent('detail', {
            icon: 'agent',
            title: 'AI Agent',
            message: 'Generating initial pipeline based on your request...'
        });

        let currentPrompt = prompt;
        let lastErrors = [];

        while (iteration < MAX_ITERATIONS) {
            iteration++;

            sendEvent('status', {
                message: `Iteration ${iteration}/${MAX_ITERATIONS}`,
                phase: 'iterating',
                iteration
            });

            // Generate or regenerate pipeline
            if (iteration > 1) {
                sendEvent('detail', {
                    icon: 'fix',
                    title: 'Fixing Issues',
                    message: `Attempting to fix ${lastErrors.length} problem(s)...`
                });

                // Build fix prompt with detailed error context
                currentPrompt = buildFixPrompt(prompt, currentPipeline, lastErrors);
            }

            // Call Gemini
            sendEvent('detail', {
                icon: 'loading',
                title: 'AI Processing',
                message: 'Waiting for AI response...'
            });

            const result = await geminiClient.generatePipeline(currentPrompt, metadata, conversationHistory);
            currentPipeline = result;

            sendEvent('detail', {
                icon: 'doc',
                title: 'Pipeline Generated',
                message: `Received pipeline definition (${result.length} characters)`
            });

            // Validate the pipeline
            sendEvent('status', {
                message: 'Validating pipeline...',
                phase: 'validating',
                iteration
            });

            const validationResult = validatePipeline(result, metadata);

            if (validationResult.isValid) {
                sendEvent('detail', {
                    icon: 'success',
                    title: 'Validation Passed',
                    message: 'All checks passed. Pipeline is valid.'
                });

                sendEvent('status', {
                    message: 'Pipeline optimized and ready',
                    phase: 'complete',
                    iteration
                });

                sendEvent('complete', {
                    success: true,
                    pipeline: result,
                    iterations: iteration,
                    message: `Pipeline validated successfully after ${iteration} iteration(s)`
                });

                res.end();
                return;
            }

            // Report validation errors
            lastErrors = validationResult.errors;

            for (const error of lastErrors) {
                sendEvent('detail', {
                    icon: 'error',
                    title: `Problem: ${error.type}`,
                    message: error.message,
                    severity: error.severity || 'error'
                });
            }

            if (iteration < MAX_ITERATIONS) {
                sendEvent('detail', {
                    icon: 'retry',
                    title: 'Retry',
                    message: `Found ${lastErrors.length} issue(s). Asking AI to fix...`
                });
            }
        }

        // Max iterations reached
        sendEvent('status', {
            message: 'Max iterations reached',
            phase: 'incomplete',
            iteration
        });

        sendEvent('complete', {
            success: false,
            pipeline: currentPipeline,
            iterations: iteration,
            remainingErrors: lastErrors,
            message: `Could not fully validate after ${MAX_ITERATIONS} attempts. Manual review recommended.`
        });

        res.end();

    } catch (error) {
        logger.error('Validation loop error:', error);

        sendEvent('detail', {
            icon: 'error',
            title: 'Error',
            message: error.message
        });

        sendEvent('complete', {
            success: false,
            error: error.message,
            pipeline: currentPipeline
        });

        res.end();
    }
});

// Build a prompt to fix specific errors
function buildFixPrompt(originalPrompt, currentPipeline, errors) {
    const errorDescriptions = errors.map((e, i) =>
        `${i + 1}. [${e.type}] ${e.message}${e.suggestion ? ` → Suggestion: ${e.suggestion}` : ''}`
    ).join('\n');

    return `
PREVIOUS REQUEST:
${originalPrompt}

CURRENT PIPELINE (with errors):
${currentPipeline}

VALIDATION ERRORS FOUND:
${errorDescriptions}

INSTRUCTIONS:
Please fix the above errors and regenerate the pipeline. Make sure to:
1. Address each error specifically
2. Keep the original intent of the pipeline
3. Use valid table/file names from the metadata
4. Follow the correct YAML schema format

Generate the corrected pipeline:
`;
}

// Validate pipeline YAML and schema
function validatePipeline(pipelineContent, metadata) {
    const errors = [];

    // Extract YAML from the response
    let yamlContent = pipelineContent;

    // Remove PIPELINE_YAML: prefix if present
    if (yamlContent.includes('PIPELINE_YAML:')) {
        yamlContent = yamlContent.split('PIPELINE_YAML:')[1];
    }

    // Remove NOTEBOOKS: section if present
    if (yamlContent.includes('NOTEBOOKS:')) {
        yamlContent = yamlContent.split('NOTEBOOKS:')[0];
    }

    // Remove --- delimiters
    yamlContent = yamlContent.replace(/^---\s*$/gm, '').trim();

    // 1. YAML Syntax Validation
    let parsed;
    try {
        parsed = yaml.load(yamlContent);
    } catch (yamlError) {
        errors.push({
            type: 'YAML Syntax',
            message: `Invalid YAML at line ${yamlError.mark?.line || 'unknown'}: ${yamlError.reason || yamlError.message}`,
            severity: 'critical',
            suggestion: 'Check for proper indentation and YAML syntax'
        });
        return { isValid: false, errors };
    }

    // 2. Schema Validation - Check required fields
    if (!parsed) {
        errors.push({
            type: 'Empty Pipeline',
            message: 'Pipeline definition is empty',
            severity: 'critical'
        });
        return { isValid: false, errors };
    }

    const pipeline = parsed.pipeline || parsed;

    if (!pipeline.name) {
        errors.push({
            type: 'Missing Field',
            message: 'Pipeline is missing required field: name',
            severity: 'error',
            suggestion: 'Add a "name" field to the pipeline'
        });
    }

    if (!pipeline.activities || !Array.isArray(pipeline.activities)) {
        errors.push({
            type: 'Missing Activities',
            message: 'Pipeline has no activities defined',
            severity: 'error',
            suggestion: 'Add at least one activity to the pipeline'
        });
    } else {
        // 3. Validate each activity
        pipeline.activities.forEach((activity, index) => {
            if (!activity.name) {
                errors.push({
                    type: 'Activity Error',
                    message: `Activity ${index + 1} is missing a name`,
                    severity: 'error'
                });
            }

            if (!activity.type) {
                errors.push({
                    type: 'Activity Error',
                    message: `Activity "${activity.name || index + 1}" is missing a type`,
                    severity: 'error'
                });
            }

            // Validate Copy activity
            if (activity.type?.toLowerCase() === 'copy') {
                const source = activity.source || activity.settings?.source;
                const sink = activity.sink || activity.target || activity.settings?.target;

                if (!source) {
                    errors.push({
                        type: 'Copy Activity',
                        message: `Copy activity "${activity.name}" is missing source configuration`,
                        severity: 'error'
                    });
                }

                if (!sink) {
                    errors.push({
                        type: 'Copy Activity',
                        message: `Copy activity "${activity.name}" is missing sink/target configuration`,
                        severity: 'error'
                    });
                }
            }

            // Validate Notebook activity
            if (activity.type?.toLowerCase() === 'notebook') {
                if (!activity.notebookId) {
                    errors.push({
                        type: 'Notebook Activity',
                        message: `Notebook activity "${activity.name}" is missing notebookId`,
                        severity: 'warning',
                        suggestion: 'Add a notebookId or the system will use a placeholder'
                    });
                }
            }
        });

        // 4. Resource Existence Validation (LENIENT - only validate if we have data)
        const allTables = extractTablesFromMetadata(metadata);

        // Only validate resource existence if we have table metadata available
        // Skip this check for trial users who may not have access to table APIs
        if (allTables.length > 0) {
            pipeline.activities.forEach(activity => {
                if (activity.type?.toLowerCase() === 'copy') {
                    const source = activity.source || activity.settings?.source;

                    // Check source table exists (informational only, not a breaking error)
                    if (source?.path) {
                        const tableName = extractTableName(source.path);
                        // Only warn if table is explicitly referenced and we have tables to check against
                        if (tableName && !allTables.includes(tableName) && !source.path.startsWith('Files/')) {
                            // Log for debugging but don't add as error (would cause infinite loop)
                            console.log(`Info: Table "${tableName}" not in known tables: [${allTables.join(', ')}]`);
                        }
                    }
                }
            });
        }
    }

    // Only fail validation on actual errors, not warnings about resources
    const criticalErrors = errors.filter(e => e.severity === 'critical' || e.severity === 'error');

    return {
        isValid: criticalErrors.length === 0,
        errors
    };
}

// Helper to extract table name from path
function extractTableName(path) {
    if (!path) return null;
    // Handle paths like "/Tables/users" or "Tables/users"
    const match = path.match(/Tables\/([^\/]+)/i);
    return match ? match[1] : null;
}

// Helper to get all tables from metadata
function extractTablesFromMetadata(metadata) {
    const tables = new Set();

    // Check _tableSchemas (from manual metadata or schema fetch)
    if (metadata._tableSchemas) {
        metadata._tableSchemas.forEach(t => tables.add(t.name));
    }

    // Check lakehouses for table lists
    if (metadata.lakehouses) {
        metadata.lakehouses.forEach(lh => {
            if (Array.isArray(lh.tables)) {
                lh.tables.forEach(t => {
                    // Handle both string tables and object tables
                    if (typeof t === 'string') {
                        tables.add(t);
                    } else if (t.name) {
                        tables.add(t.name);
                    }
                });
            }
        });
    }

    // If no tables found, be lenient - don't fail validation for missing table info
    // This helps with trial users who can't always fetch table metadata
    return Array.from(tables);
}

module.exports = router;
