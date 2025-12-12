import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, Shield, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const Subscription = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [usageStats, setUsageStats] = useState(null);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);

    useEffect(() => {
        fetchUsageData();
    }, []);

    const fetchUsageData = async () => {
        try {
            const token = sessionStorage.getItem('fabricAccessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [statsRes, subRes] = await Promise.all([
                axios.get(`${API_URL}/usage/stats`, { headers }),
                axios.get(`${API_URL}/usage/subscription`, { headers })
            ]);

            setUsageStats(statsRes.data);
            setSubscriptionInfo(subRes.data);
        } catch (error) {
            console.error('Failed to fetch usage data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async () => {
        setSubscribing(true);

        try {
            // In production, integrate with Razorpay or Stripe here
            // For demo, we'll mock the payment
            const token = sessionStorage.getItem('fabricAccessToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            // Mock payment ID for demo
            const mockPaymentId = 'pay_' + Date.now();

            const response = await axios.post(
                `${API_URL}/usage/subscribe`,
                { paymentId: mockPaymentId, plan: 'unlimited', months: 1 },
                { headers }
            );

            if (response.data.success) {
                alert('Subscription activated successfully!');
                fetchUsageData();
            }
        } catch (error) {
            console.error('Subscription failed:', error);
            alert('Subscription failed. Please try again.');
        } finally {
            setSubscribing(false);
        }
    };

    const formatNumber = (num) => {
        if (num === Infinity) return 'Unlimited';
        return num.toLocaleString();
    };

    const getUsagePercentage = () => {
        if (!usageStats || usageStats.hasSubscription) return 0;
        return Math.min(100, (usageStats.dailyUsed / usageStats.dailyLimit) * 100);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
            {/* Header */}
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-sm hover:opacity-80 transition"
                    style={{ color: 'var(--text-muted)' }}
                >
                    <ArrowLeft size={16} />
                    Back to Dashboard
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12">
                {/* Title */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
                        style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <Crown size={16} style={{ color: '#8b5cf6' }} />
                        <span className="text-sm font-medium" style={{ color: '#8b5cf6' }}>Premium Plan</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Upgrade to Unlimited</h1>
                    <p style={{ color: 'var(--text-muted)' }}>
                        Remove daily limits and unlock the full power of AI pipeline generation
                    </p>
                </div>

                {/* Current Usage Card */}
                <div className="rounded-xl p-6 mb-8" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-muted)' }}>
                        YOUR CURRENT USAGE
                    </h3>

                    <div className="flex items-center justify-between mb-3">
                        <span className="text-white">Daily Tokens Used</span>
                        <span style={{ color: usageStats?.hasSubscription ? '#10b981' : 'var(--text-secondary)' }}>
                            {formatNumber(usageStats?.dailyUsed || 0)} / {usageStats?.hasSubscription ? 'Unlimited' : formatNumber(usageStats?.dailyLimit || 100000)}
                        </span>
                    </div>

                    {!usageStats?.hasSubscription && (
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
                            <div
                                className="h-full rounded-full transition-all"
                                style={{
                                    width: `${getUsagePercentage()}%`,
                                    background: getUsagePercentage() > 80 ? '#ef4444' : getUsagePercentage() > 50 ? '#f59e0b' : '#10b981'
                                }}
                            />
                        </div>
                    )}

                    {usageStats?.hasSubscription && (
                        <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <Check size={16} className="text-green-400" />
                            <span className="text-sm text-green-400">
                                Premium Active until {new Date(usageStats.subscription?.expiresAt).toLocaleDateString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Pricing Card */}
                {!usageStats?.hasSubscription && (
                    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-secondary)', border: '2px solid #8b5cf6' }}>
                        {/* Most Popular Badge */}
                        <div className="text-center py-2" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
                            <span className="text-xs font-semibold text-white uppercase tracking-wide">Most Popular</span>
                        </div>

                        <div className="p-8">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-white mb-2">Premium Unlimited</h2>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-4xl font-bold text-white">₹899</span>
                                    <span style={{ color: 'var(--text-muted)' }}>/month</span>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                        <Check size={12} className="text-green-400" />
                                    </div>
                                    <span className="text-white">Unlimited tokens per day</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                        <Check size={12} className="text-green-400" />
                                    </div>
                                    <span className="text-white">Priority AI processing</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                        <Check size={12} className="text-green-400" />
                                    </div>
                                    <span className="text-white">Advanced pipeline validation</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                                        <Check size={12} className="text-green-400" />
                                    </div>
                                    <span className="text-white">Email support</span>
                                </div>
                            </div>

                            {/* Subscribe Button */}
                            <button
                                onClick={handleSubscribe}
                                disabled={subscribing}
                                className="w-full py-3 rounded-lg font-semibold text-white flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
                            >
                                {subscribing ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Zap size={18} />
                                        Subscribe Now
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
                                Cancel anytime. No questions asked.
                            </p>
                        </div>
                    </div>
                )}

                {/* Already Subscribed */}
                {usageStats?.hasSubscription && (
                    <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                        <Crown size={48} className="mx-auto mb-4" style={{ color: '#8b5cf6' }} />
                        <h2 className="text-xl font-bold text-white mb-2">You're a Premium Member!</h2>
                        <p style={{ color: 'var(--text-muted)' }} className="mb-4">
                            Thank you for your support. Enjoy unlimited AI pipeline generation.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                            <Shield size={16} className="text-green-400" />
                            <span className="text-sm text-green-400">
                                Valid until {new Date(usageStats.subscription?.expiresAt).toLocaleDateString('en-IN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                )}

                {/* FAQ */}
                <div className="mt-12">
                    <h3 className="text-lg font-semibold text-white mb-6 text-center">Frequently Asked Questions</h3>
                    <div className="space-y-4">
                        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                            <h4 className="font-medium text-white mb-1">What are tokens?</h4>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Tokens measure your AI usage. Each character in your prompt and the generated response counts as 100 tokens.
                            </p>
                        </div>
                        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                            <h4 className="font-medium text-white mb-1">What happens when I hit the limit?</h4>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Free users have 100,000 tokens per day. Once exceeded, you'll need to wait until the next day or upgrade to Premium.
                            </p>
                        </div>
                        <div className="rounded-lg p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                            <h4 className="font-medium text-white mb-1">Can I cancel anytime?</h4>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                Yes! Cancel anytime and your subscription will remain active until the end of your billing period.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Subscription;
