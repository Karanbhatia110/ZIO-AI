const fs = require('fs');
const path = require('path');

const USAGE_FILE = path.join(__dirname, '../data/token-usage.json');
const DAILY_LIMIT = 100000; // 100k tokens per day
const TOKENS_PER_CHAR = 100; // 1 character = 100 tokens

// Ensure data directory exists
const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Load usage data
function loadUsageData() {
    try {
        if (fs.existsSync(USAGE_FILE)) {
            return JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
        }
    } catch (error) {
        console.error('Error loading usage data:', error);
    }
    return { users: {} };
}

// Save usage data
function saveUsageData(data) {
    try {
        fs.writeFileSync(USAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving usage data:', error);
    }
}

// Get today's date key
function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// Get user ID from request (using token or session)
function getUserId(req) {
    // Use a hash of the auth token or default to 'anonymous'
    const authHeader = req.headers.authorization;
    if (authHeader) {
        // Simple hash for demo - in production use proper user ID
        return 'user_' + Buffer.from(authHeader.slice(-20)).toString('base64').slice(0, 10);
    }
    return 'anonymous';
}

// Calculate tokens from content
function calculateTokens(content) {
    if (!content) return 0;
    return content.length * TOKENS_PER_CHAR;
}

// Check if user has subscription
function hasSubscription(userId) {
    const data = loadUsageData();
    const user = data.users[userId];

    if (!user || !user.subscription) return false;

    // Check if subscription is still valid
    const expiryDate = new Date(user.subscription.expiresAt);
    return expiryDate > new Date();
}

// Get user's daily usage
function getDailyUsage(userId) {
    const data = loadUsageData();
    const user = data.users[userId];
    const today = getTodayKey();

    if (!user || !user.dailyUsage || !user.dailyUsage[today]) {
        return 0;
    }

    return user.dailyUsage[today];
}

// Get remaining tokens for user
function getRemainingTokens(userId) {
    if (hasSubscription(userId)) {
        return Infinity; // Unlimited for subscribers
    }

    const used = getDailyUsage(userId);
    return Math.max(0, DAILY_LIMIT - used);
}

// Record token usage
function recordUsage(userId, tokens) {
    const data = loadUsageData();
    const today = getTodayKey();

    if (!data.users[userId]) {
        data.users[userId] = {
            createdAt: new Date().toISOString(),
            dailyUsage: {},
            totalUsage: 0
        };
    }

    if (!data.users[userId].dailyUsage) {
        data.users[userId].dailyUsage = {};
    }

    data.users[userId].dailyUsage[today] = (data.users[userId].dailyUsage[today] || 0) + tokens;
    data.users[userId].totalUsage = (data.users[userId].totalUsage || 0) + tokens;
    data.users[userId].lastUsed = new Date().toISOString();

    saveUsageData(data);
}

// Set subscription for user
function setSubscription(userId, months = 1) {
    const data = loadUsageData();

    if (!data.users[userId]) {
        data.users[userId] = {
            createdAt: new Date().toISOString(),
            dailyUsage: {},
            totalUsage: 0
        };
    }

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    data.users[userId].subscription = {
        plan: 'unlimited',
        startedAt: new Date().toISOString(),
        expiresAt: expiryDate.toISOString(),
        price: 899
    };

    saveUsageData(data);
    return data.users[userId].subscription;
}

// Get usage stats for user
function getUsageStats(userId) {
    const data = loadUsageData();
    const user = data.users[userId] || {};
    const today = getTodayKey();

    return {
        dailyUsed: user.dailyUsage?.[today] || 0,
        dailyLimit: DAILY_LIMIT,
        dailyRemaining: getRemainingTokens(userId),
        totalUsed: user.totalUsage || 0,
        hasSubscription: hasSubscription(userId),
        subscription: user.subscription || null,
        tokensPerChar: TOKENS_PER_CHAR
    };
}

// Middleware to check token limits
function tokenLimitMiddleware(req, res, next) {
    const userId = getUserId(req);
    const remaining = getRemainingTokens(userId);

    // Add usage info to request
    req.tokenUsage = {
        userId,
        remaining,
        hasSubscription: hasSubscription(userId)
    };

    // If no tokens remaining, block the request
    if (remaining <= 0) {
        return res.status(429).json({
            error: 'Daily token limit exceeded',
            code: 'TOKEN_LIMIT_EXCEEDED',
            message: 'You have reached your daily limit of 100,000 tokens. Upgrade to Premium for unlimited access.',
            upgradeUrl: '/subscription'
        });
    }

    next();
}

module.exports = {
    calculateTokens,
    hasSubscription,
    getDailyUsage,
    getRemainingTokens,
    recordUsage,
    setSubscription,
    getUsageStats,
    tokenLimitMiddleware,
    getUserId,
    DAILY_LIMIT,
    TOKENS_PER_CHAR
};
