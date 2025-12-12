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

async function generatePipeline(prompt, metadata, conversationHistory = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Build conversation context from history (limit to last 10 messages to avoid token limits)
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-10); // Last 10 messages max
    conversationContext = '\nCONVERSATION HISTORY:\n';
    recentHistory.forEach((msg, i) => {
      if (msg.type === 'user') {
        conversationContext += `[User]: ${msg.content}\n`;
      } else if (msg.type === 'ai') {
        // Only include a summary of AI responses to save tokens
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

  // Retry loop with exponential backoff
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] || 4000;
        logger.info(`Retry attempt ${attempt}/${MAX_RETRIES} after ${delay}ms delay...`);
        await sleep(delay);
      }

      logger.info("Sending request to Gemini...");
      logger.info(`Conversation context includes ${conversationHistory.length} previous messages`);

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      logger.info("Received response from Gemini.");
      return text;

    } catch (error) {
      const isRateLimit = error.status === 503 || error.status === 429 ||
        error.message?.includes('overloaded') ||
        error.message?.includes('rate limit');

      logger.error(`Gemini API error (attempt ${attempt + 1}/${MAX_RETRIES + 1}):`, error.message || error);

      // If it's a rate limit error and we have retries left, continue
      if (isRateLimit && attempt < MAX_RETRIES) {
        logger.info(`Rate limit or overload detected. Will retry...`);
        continue;
      }

      // If all retries exhausted or non-retryable error, return mock
      logger.info("Returning MOCK response due to API error.");
      return `
PIPELINE_YAML:
pipeline:
  name: "Mock Sales Pipeline (Fallback)"
  description: "Generated because Gemini API call failed. Loads sales data and aggregates by region."
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
  }
}

module.exports = { generatePipeline };

