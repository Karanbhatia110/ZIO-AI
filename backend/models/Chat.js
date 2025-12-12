const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    title: {
        type: String,
        default: 'New Chat'
    },
    messages: [{
        type: { type: String, enum: ['user', 'ai', 'system', 'error'], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        validated: Boolean,
        iterations: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
chatSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Chat', chatSchema);
