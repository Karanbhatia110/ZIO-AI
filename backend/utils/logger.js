const logger = {
    info: (msg) => console.log(`[INFO] ${new Date().toISOString()}: ${msg}`),
    warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()}: ${msg}`),
    error: (msg, err) => console.error(`[ERROR] ${new Date().toISOString()}: ${msg}`, err),
    debug: (msg) => console.log(`[DEBUG] ${new Date().toISOString()}: ${msg}`),
};

module.exports = logger;

