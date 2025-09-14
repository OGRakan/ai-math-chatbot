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
const ai_1 = require("../services/ai");
const sse_1 = require("../utils/sse");
const historyService = __importStar(require("../services/history"));
const router = (0, express_1.Router)();
const activeGenerations = new Map();
router.post('/:chat_id/stream', async (req, res) => {
    const chatId = parseInt(req.params.chat_id);
    const userMessage = req.body;
    if (isNaN(chatId)) {
        return res.status(400).json({ detail: 'Invalid chat ID' });
    }
    if (!userMessage.content) {
        return res.status(400).json({ detail: 'Content is required' });
    }
    try {
        console.log(`Received streaming request for chat_id: ${chatId}`);
        console.log(`User message content: ${userMessage.content}`);
        if (userMessage.file_ids && userMessage.file_ids.length > 0) {
            console.log(`File IDs included in request: ${userMessage.file_ids}`);
            for (const fileIdStr of userMessage.file_ids) {
                const fileMetadata = await historyService.getFileMetadata(fileIdStr);
                if (fileMetadata) {
                    console.log(`File metadata found for ID ${fileIdStr}: Name - ${fileMetadata.original_filename}, Path - ${fileMetadata.local_disk_path}`);
                }
                else {
                    console.warn(`File metadata with ID ${fileIdStr} not found in database. Skipping this file.`);
                }
            }
        }
        const generationId = `${chatId}_${Math.floor(Math.random() * 900) + 100}`;
        console.log(`Generation ID: ${generationId}`);
        activeGenerations.set(generationId, true);
        const sse = (0, sse_1.createSSE)(res);
        sse.send({ data: JSON.stringify({ generation_id: generationId }) });
        console.log(`Sent generation ID: ${generationId}`);
        try {
            await generateAIResponseStream(chatId.toString(), userMessage.content, userMessage.file_ids || [], sse, generationId);
        }
        catch (error) {
            console.error(`Error during AI generation for ${generationId}:`, error);
            if (!sse.isClosed()) {
                sse.sendError(error.message);
            }
        }
        finally {
            activeGenerations.delete(generationId);
            if (!sse.isClosed()) {
                sse.sendDone();
                sse.end();
            }
        }
    }
    catch (error) {
        console.error('Error during streaming:', error);
        res.status(500).json({ detail: `Error during streaming: ${error.message}` });
    }
});
async function generateAIResponseStream(chatId, userMessageContent, fileIds, sse, generationId) {
    if (!ai_1.model) {
        throw new Error('Gemini model not initialized');
    }
    try {
        const userMessage = await historyService.createMessage(parseInt(chatId), {
            role: 'user',
            content: userMessageContent,
            fileIds: fileIds,
        });
        const history = await (0, ai_1.buildChatHistory)(chatId);
        const chat = ai_1.model.startChat({ history });
        const result = await chat.sendMessageStream([{ text: userMessageContent }]);
        let fullResponse = '';
        for await (const chunk of result.stream) {
            if (!activeGenerations.has(generationId)) {
                console.log(`Generation ${generationId} was cancelled`);
                break;
            }
            const chunkText = chunk.text();
            if (chunkText) {
                fullResponse += chunkText;
                const chunkData = {
                    text: chunkText,
                    generation_id: generationId,
                };
                if (!sse.send({ data: JSON.stringify(chunkData) })) {
                    console.log(`Client disconnected for generation ${generationId}`);
                    break;
                }
                console.log(`Sent chunk for ${generationId} (${chunkText.length} chars)`);
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        if (fullResponse.trim()) {
            await historyService.createMessage(parseInt(chatId), {
                role: 'model',
                content: fullResponse,
            });
            console.log(`Stored complete AI response for chat ${chatId} (${fullResponse.length} chars)`);
        }
    }
    catch (error) {
        console.error('Error in generateAIResponseStream:', error);
        throw error;
    }
}
router.post('/:chat_id/interrupt', async (req, res) => {
    const chatId = parseInt(req.params.chat_id);
    const payload = req.body;
    if (isNaN(chatId)) {
        return res.status(400).json({ detail: 'Invalid chat ID' });
    }
    try {
        const generationId = payload.generation_id;
        if (generationId && activeGenerations.has(generationId)) {
            activeGenerations.delete(generationId);
            console.log(`Cancelled generation ${generationId}`);
            return res.json({
                status: 'success',
                message: `Generation ${generationId} interrupted`,
            });
        }
        const prefix = `${chatId}_`;
        let cancelledCount = 0;
        for (const [genId] of activeGenerations.entries()) {
            if (genId.startsWith(prefix)) {
                activeGenerations.delete(genId);
                cancelledCount++;
            }
        }
        if (cancelledCount > 0) {
            return res.json({
                status: 'success',
                message: `Interrupted ${cancelledCount} active generations for chat ${chatId}`,
            });
        }
        else {
            return res.json({
                status: 'warning',
                message: 'No active generations found to interrupt',
            });
        }
    }
    catch (error) {
        console.error('Error interrupting generation:', error);
        res.status(500).json({ detail: `Error interrupting generation: ${error.message}` });
    }
});
router.post('/:chat_id/reset-context', async (req, res) => {
    const chatId = parseInt(req.params.chat_id);
    if (isNaN(chatId)) {
        return res.status(400).json({ detail: 'Invalid chat ID' });
    }
    console.log(`Reset context request received for chat_id: ${chatId} (no action needed)`);
    res.status(204).send();
});
exports.default = router;
//# sourceMappingURL=streaming.js.map