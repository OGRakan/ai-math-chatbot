"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const historyService = __importStar(require("../services/history"));
const error_1 = require("../middleware/error");
const router = (0, express_1.Router)();
router.post('/', async (req, res) => {
    try {
        const chat = req.body || {};
        const dbChat = await historyService.createChat(chat);
        res.status(201).json({
            id: dbChat.id,
            title: dbChat.title,
            create_time: dbChat.create_time,
        });
    }
    catch (error) {
        console.error('Error creating chat:', error);
        if (error instanceof error_1.HTTPException) {
            return res.status(error.statusCode).json({ detail: error.detail });
        }
        res.status(500).json({ detail: `Error creating chat: ${error.message}` });
    }
});
router.get('/', async (req, res) => {
    try {
        const skip = parseInt(req.query.skip) || 0;
        const limit = parseInt(req.query.limit) || 100;
        const chats = await historyService.getChats(skip, limit);
        res.json(chats);
    }
    catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ detail: `Error fetching chats: ${error.message}` });
    }
});
router.get('/:chat_id', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chat_id);
        if (isNaN(chatId)) {
            return res.status(400).json({ detail: 'Invalid chat ID' });
        }
        const chat = await historyService.getChat(chatId);
        if (!chat) {
            return res.status(404).json({ detail: 'Chat not found' });
        }
        res.json(chat);
    }
    catch (error) {
        console.error('Error fetching chat:', error);
        res.status(500).json({ detail: `Error fetching chat: ${error.message}` });
    }
});
router.put('/:chat_id', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chat_id);
        const chatUpdate = req.body;
        if (isNaN(chatId)) {
            return res.status(400).json({ detail: 'Invalid chat ID' });
        }
        if (!chatUpdate.title) {
            return res.status(400).json({ detail: 'Title is required' });
        }
        const chat = await historyService.updateChat(chatId, chatUpdate);
        if (!chat) {
            return res.status(404).json({ detail: 'Chat not found' });
        }
        res.json(chat);
    }
    catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ detail: `Error updating chat: ${error.message}` });
    }
});
router.patch('/:chat_id', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chat_id);
        const chatUpdate = req.body;
        if (isNaN(chatId)) {
            return res.status(400).json({ detail: 'Invalid chat ID' });
        }
        if (!chatUpdate.title) {
            return res.status(400).json({ detail: 'Title is required' });
        }
        const chat = await historyService.updateChat(chatId, chatUpdate);
        if (!chat) {
            return res.status(404).json({ detail: 'Chat not found' });
        }
        res.json(chat);
    }
    catch (error) {
        console.error('Error updating chat:', error);
        res.status(500).json({ detail: `Error updating chat: ${error.message}` });
    }
});
router.delete('/:chat_id', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chat_id);
        if (isNaN(chatId)) {
            return res.status(400).json({ detail: 'Invalid chat ID' });
        }
        const deleted = await historyService.deleteChat(chatId);
        if (!deleted) {
            return res.status(404).json({ detail: 'Chat not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({ detail: `Error deleting chat: ${error.message}` });
    }
});
router.post('/:chat_id/messages/', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chat_id);
        const messageData = req.body;
        if (isNaN(chatId)) {
            return res.status(400).json({ detail: 'Invalid chat ID' });
        }
        if (!messageData.role || !messageData.content) {
            return res.status(400).json({ detail: 'Role and content are required' });
        }
        const message = await historyService.createMessage(chatId, messageData);
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ detail: `Error creating message: ${error.message}` });
    }
});
router.get('/:chat_id/messages/', async (req, res) => {
    try {
        const chatId = parseInt(req.params.chat_id);
        if (isNaN(chatId)) {
            return res.status(400).json({ detail: 'Invalid chat ID' });
        }
        const messages = await historyService.getChatMessages(chatId);
        res.json(messages);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ detail: `Error fetching messages: ${error.message}` });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map