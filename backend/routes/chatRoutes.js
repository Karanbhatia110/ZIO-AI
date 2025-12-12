const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const tokenService = require('../services/tokenService');

// Get all chats for the current user
router.get('/', async (req, res) => {
    try {
        const userId = tokenService.getUserId(req);
        const chats = await Chat.find({ userId }).sort({ updatedAt: -1 });
        res.json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create or update a chat
router.post('/', async (req, res) => {
    try {
        const userId = tokenService.getUserId(req);
        const { id, title, messages } = req.body;

        let chat;
        if (id) {
            // Update existing chat
            chat = await Chat.findOne({ _id: id, userId });
            if (chat) {
                chat.title = title || chat.title;
                chat.messages = messages || chat.messages;
                chat.updatedAt = Date.now();
                await chat.save();
            }
        }

        if (!chat) {
            // Create new chat
            chat = new Chat({
                userId,
                title: title || 'New Chat',
                messages: messages || []
            });
            await chat.save();
        }

        res.json(chat);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a chat
router.delete('/:id', async (req, res) => {
    try {
        const userId = tokenService.getUserId(req);
        await Chat.deleteOne({ _id: req.params.id, userId });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
