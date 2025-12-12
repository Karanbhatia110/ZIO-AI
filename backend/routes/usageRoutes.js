const express = require('express');
const router = express.Router();
const tokenService = require('../services/tokenService');

// Get current usage stats
router.get('/stats', async (req, res) => {
    try {
        const userId = tokenService.getUserId(req);
        const stats = await tokenService.getUsageStats(userId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Check subscription status
router.get('/subscription', async (req, res) => {
    try {
        const userId = tokenService.getUserId(req);
        const stats = await tokenService.getUsageStats(userId);

        res.json({
            hasSubscription: stats.hasSubscription,
            subscription: stats.subscription,
            plans: [
                {
                    id: 'unlimited',
                    name: 'Premium Unlimited',
                    price: 899,
                    currency: 'INR',
                    period: 'month',
                    features: [
                        'Unlimited tokens per day',
                        'Priority AI processing',
                        'Advanced pipeline validation',
                        'Email support'
                    ]
                }
            ]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Subscribe to premium (mock payment for now)
router.post('/subscribe', async (req, res) => {
    const userId = tokenService.getUserId(req);
    const { paymentId, plan = 'unlimited', months = 1 } = req.body;

    // In production, verify payment with payment gateway here
    // For now, we'll just activate the subscription

    if (!paymentId) {
        return res.status(400).json({
            error: 'Payment verification required',
            message: 'Please complete payment to activate subscription'
        });
    }

    try {
        const subscription = await tokenService.setSubscription(userId, months);

        res.json({
            success: true,
            message: 'Subscription activated successfully',
            subscription
        });
    } catch (error) {
        res.status(500).json({
            error: 'Subscription activation failed',
            message: error.message
        });
    }
});

// Cancel subscription (mark as cancelled but let it expire naturally)
router.post('/cancel', (req, res) => {
    const userId = tokenService.getUserId(req);
    // In production, update subscription status

    res.json({
        success: true,
        message: 'Subscription will not renew after current period'
    });
});

module.exports = router;
