const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String
    },
    name: {
        type: String
    },
    dailyUsage: {
        type: Map,
        of: Number,
        default: {}
    },
    totalUsage: {
        type: Number,
        default: 0
    },
    lastUsed: {
        type: Date,
        default: Date.now
    },
    subscription: {
        plan: { type: String, enum: ['free', 'unlimited'], default: 'free' },
        startedAt: Date,
        expiresAt: Date,
        price: Number,
        isActive: { type: Boolean, default: false }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
