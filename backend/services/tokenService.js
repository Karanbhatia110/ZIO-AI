const User = require('../models/User');

const DAILY_LIMIT = 100000; // 100k tokens per day
const TOKENS_PER_CHAR = 100; // 1 character = 100 tokens

// Get today's date key
function getTodayKey() {
    return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

// Get user ID from request (using token or session)
function getUserId(req) {
    // Use a hash of the auth token or default to 'anonymous'
    const authHeader = req.headers.authorization;
    if (authHeader) {
        // Simple hash for demo - in production use proper user ID from JWT
        return 'user_' + Buffer.from(authHeader.slice(-20)).toString('base64').slice(0, 10);
    }
    return 'anonymous';
}

// Ensure user exists and get them
async function getUser(userId) {
    let user = await User.findOne({ userId });
    if (!user) {
        user = new User({ userId });
        await user.save();
    }
    return user;
}

// Calculate tokens from content
function calculateTokens(content) {
    if (!content) return 0;
    return content.length * TOKENS_PER_CHAR;
}

// Check if user has subscription
async function hasSubscription(userId) {
    const user = await getUser(userId);

    if (!user.subscription || !user.subscription.expiresAt) return false;

    // Check if subscription is still valid
    const expiryDate = new Date(user.subscription.expiresAt);
    return expiryDate > new Date();
}

// Get user's daily usage
async function getDailyUsage(userId) {
    const user = await getUser(userId);
    const today = getTodayKey();

    // Access Map directly
    return user.dailyUsage.get(today) || 0;
}

// Get remaining tokens for user
async function getRemainingTokens(userId) {
    const isSubscribed = await hasSubscription(userId);
    if (isSubscribed) {
        return Infinity; // Unlimited for subscribers
    }

    const used = await getDailyUsage(userId);
    return Math.max(0, DAILY_LIMIT - used);
}

// Record token usage
async function recordUsage(userId, tokens) {
    const user = await getUser(userId);
    const today = getTodayKey();

    const currentUsage = user.dailyUsage.get(today) || 0;
    user.dailyUsage.set(today, currentUsage + tokens);

    user.totalUsage = (user.totalUsage || 0) + tokens;
    user.lastUsed = new Date();

    await user.save();
}

// Set subscription for user
async function setSubscription(userId, months = 1) {
    const user = await getUser(userId);

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + months);

    user.subscription = {
        plan: 'unlimited',
        startedAt: new Date(),
        expiresAt: expiryDate,
        price: 899,
        isActive: true
    };

    await user.save();
    return user.subscription;
}

// Get usage stats for user
async function getUsageStats(userId) {
    const user = await getUser(userId);
    const today = getTodayKey();

    const dailyUsed = user.dailyUsage.get(today) || 0;
    const isSubscribed = await hasSubscription(userId);

    return {
        dailyUsed,
        dailyLimit: DAILY_LIMIT,
        dailyRemaining: isSubscribed ? Infinity : Math.max(0, DAILY_LIMIT - dailyUsed),
        totalUsed: user.totalUsage || 0,
        hasSubscription: isSubscribed,
        subscription: user.subscription,
        tokensPerChar: TOKENS_PER_CHAR
    };
}

// Middleware to check token limits
async function tokenLimitMiddleware(req, res, next) {
    try {
        const userId = getUserId(req);
        const remaining = await getRemainingTokens(userId);
        const subscribed = await hasSubscription(userId);

        // Add usage info to request
        req.tokenUsage = {
            userId,
            remaining,
            hasSubscription: subscribed
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
    } catch (error) {
        console.error('Token middleware error:', error);
        next(error);
    }
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
