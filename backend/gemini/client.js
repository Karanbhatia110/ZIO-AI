const { GoogleGenerativeAI } = require("@google/generative-ai");
const config = require("../config");
const { SYSTEM_PROMPT } = require("./prompts");
const logger = require("../utils/logger");

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Helper function to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

// Fallback models configuration
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

async function generatePipeline(prompt, metadata, conversationHistory = []) {
  // Build conversation context
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10); // Limit context
    conversationContext = '\nCONVERSATION HISTORY:\n';
    recentHistory.forEach((msg) => {
      if (msg.type === 'user') {
        conversationContext += `[User]: ${msg.content}\n`;
      } else if (msg.type === 'ai') {
        const summary = msg.content.length > 500
          ? msg.content.substring(0, 500) + '... [truncated]'
          : msg.content;
        conversationContext += `[Assistant]: ${summary}\n`;
      }
    });
    conversationContext += '\n---\n';
  }

  const fullPrompt = `
SYSTEM:
${SYSTEM_PROMPT}

METADATA:
${JSON.stringify(metadata, null, 2)}
${conversationContext}
USER REQUEST:
${prompt}
  `;

  let lastError = null;

  // Try each model in sequence
  for (const modelName of MODELS) {
    try {
      logger.info(`Attempting generation with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      // Retry loop for the CURRENT model
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAYS[attempt - 1] || 4000;
            logger.info(`Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`);
            await sleep(delay);
          }

          logger.info(`Sending request to ${modelName}...`);
          const result = await model.generateContent(fullPrompt);
          const response = await result.response;
          const text = response.text();

          logger.info(`Received successful response from ${modelName}`);
          return text;

        } catch (error) {
          lastError = error;
          const isRateLimit = error.status === 503 || error.status === 429 ||
            error.message?.includes('overloaded') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('429');

          logger.error(`${modelName} error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message || error);

          if (isRateLimit) {
            // unexpected delay parsing logic if needed
            const retryMatch = error.message?.match(/retry in ([0-9.]+)s/);
            if (retryMatch) {
              const specificDelay = Math.ceil(parseFloat(retryMatch[1]) * 1000);
              if (specificDelay > 10000) {
                logger.warn(`Delay too long (${specificDelay}ms). Switching model immediately.`);
                break; // Break RETRY loop to continue to NEXT MODEL
              }
            }

            if (attempt < MAX_RETRIES) continue; // Retry same model
          }

          // If we ran out of retries OR it's a fatal error, break retry loop to try next model
          break;
        }
      }

      // If we are here, retries failed for this model.
      logger.warn(`Model ${modelName} failed or exhausted retries. Switching to next model...`);
      // Continue to next model in MODELS loop

    } catch (globalError) {
      logger.error(`Critical error with model selection ${modelName}:`, globalError);
    }
  }

  // If we get here, all models failed
  logger.error("All accessible models failed. Returning MOCK response.");
  return `
PIPELINE_YAML:
pipeline:
  name: "Mock Sales Pipeline (Fallback)"
  description: "Generated because all AI models failed. Loads sales data and aggregates by region."
  activities:
    - name: "LoadSales"
      type: "Copy"
      source:
        type: "Lakehouse"
        path: "Files/sales_raw.csv"
      sink:
        type: "Lakehouse"
        path: "Tables/sales_clean"
    - name: "AggregateRegion"
      type: "Notebook"
      notebookId: "nb-agg-001"
      dependsOn: ["LoadSales"]
  schedule:
    type: "Daily"
    interval: 1

NOTEBOOKS:
# Notebook: nb-agg-001
df = spark.read.format("delta").load("Tables/sales_clean")
df_agg = df.groupBy("region").agg(sum("amount").alias("total_sales"))
df_agg.write.format("delta").mode("overwrite").save("Tables/sales_by_region")
`;
}

module.exports = { generatePipeline };
