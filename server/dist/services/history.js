"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChat = createChat;
exports.getChats = getChats;
exports.getChat = getChat;
exports.updateChat = updateChat;
exports.deleteChat = deleteChat;
exports.createMessage = createMessage;
exports.getChatMessages = getChatMessages;
exports.createFileMetadata = createFileMetadata;
exports.getFileMetadata = getFileMetadata;
const client_1 = __importDefault(require("../db/client"));
const error_1 = require("../middleware/error");
async function createChat(chat = {}) {
    try {
        const existingChats = await getChats(0, 1);
        if (!chat.title && existingChats.length > 0) {
            console.log(`Returning existing chat instead of creating new one: ${existingChats[0].id}`);
            return existingChats[0];
        }
        const title = chat.title || 'New Chat';
        console.log(`Attempting to create new chat with title: ${title}`);
        const dbChat = await client_1.default.chat.create({
            data: {
                title,
            },
        });
        if (!dbChat || !dbChat.id) {
            console.error('Chat created, but no valid ID was assigned');
            throw new Error('Failed to generate valid chat ID');
        }
        console.log(`Created new chat with ID: ${dbChat.id}`);
        return {
            id: dbChat.id,
            title: dbChat.title,
            create_time: dbChat.create_time,
        };
    }
    catch (error) {
        console.error('Error creating chat:', error);
        throw new error_1.HTTPException(500, `Error creating chat: ${error}`);
    }
}
async function getChats(skip = 0, limit = 100) {
    const chats = await client_1.default.chat.findMany({
        skip,
        take: limit,
        orderBy: { create_time: 'desc' },
    });
    return chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        create_time: chat.create_time,
    }));
}
async function getChat(chatId) {
    const dbChat = await client_1.default.chat.findUnique({
        where: { id: chatId },
        include: {
            messages: {
                include: {
                    files: {
                        include: {
                            file_metadata: true,
                        },
                    },
                },
                orderBy: { timestamp: 'asc' },
            },
        },
    });
    if (!dbChat) {
        return null;
    }
    const messages = dbChat.messages.map(message => ({
        id: message.id,
        chat_id: message.chat_id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        files: message.files.map(fileLink => ({
            id: fileLink.file_metadata.id,
            original_filename: fileLink.file_metadata.original_filename,
            content_type: fileLink.file_metadata.content_type,
            size: fileLink.file_metadata.size,
            processing_method: fileLink.file_metadata.processing_method,
            gemini_api_file_id: fileLink.file_metadata.gemini_api_file_id,
        })),
    }));
    return {
        id: dbChat.id,
        title: dbChat.title,
        create_time: dbChat.create_time,
        messages,
    };
}
async function updateChat(chatId, chatUpdate) {
    try {
        const dbChat = await client_1.default.chat.update({
            where: { id: chatId },
            data: { title: chatUpdate.title },
        });
        return {
            id: dbChat.id,
            title: dbChat.title,
            create_time: dbChat.create_time,
        };
    }
    catch (error) {
        if (error.code === 'P2025') {
            return null;
        }
        throw error;
    }
}
async function deleteChat(chatId) {
    try {
        await client_1.default.chat.delete({
            where: { id: chatId },
        });
        return true;
    }
    catch (error) {
        if (error.code === 'P2025') {
            return false;
        }
        throw error;
    }
}
async function createMessage(chatId, message) {
    const result = await client_1.default.$transaction(async (tx) => {
        const dbMessage = await tx.message.create({
            data: {
                chat_id: chatId,
                role: message.role,
                content: message.content,
            },
        });
        if (message.fileIds && message.fileIds.length > 0) {
            const fileLinks = message.fileIds.map(fileId => ({
                message_id: dbMessage.id,
                file_metadata_id: fileId,
            }));
            await tx.messageFileLink.createMany({
                data: fileLinks,
                skipDuplicates: true,
            });
        }
        return dbMessage;
    });
    const messageWithFiles = await client_1.default.message.findUnique({
        where: { id: result.id },
        include: {
            files: {
                include: {
                    file_metadata: true,
                },
            },
        },
    });
    return {
        id: messageWithFiles.id,
        chat_id: messageWithFiles.chat_id,
        role: messageWithFiles.role,
        content: messageWithFiles.content,
        timestamp: messageWithFiles.timestamp,
        files: messageWithFiles.files.map(fileLink => ({
            id: fileLink.file_metadata.id,
            original_filename: fileLink.file_metadata.original_filename,
            content_type: fileLink.file_metadata.content_type,
            size: fileLink.file_metadata.size,
            processing_method: fileLink.file_metadata.processing_method,
            gemini_api_file_id: fileLink.file_metadata.gemini_api_file_id,
        })),
    };
}
async function getChatMessages(chatId) {
    const messages = await client_1.default.message.findMany({
        where: { chat_id: chatId },
        include: {
            files: {
                include: {
                    file_metadata: true,
                },
            },
        },
        orderBy: { timestamp: 'asc' },
    });
    return messages.map(message => ({
        id: message.id,
        chat_id: message.chat_id,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        files: message.files.map(fileLink => ({
            id: fileLink.file_metadata.id,
            original_filename: fileLink.file_metadata.original_filename,
            content_type: fileLink.file_metadata.content_type,
            size: fileLink.file_metadata.size,
            processing_method: fileLink.file_metadata.processing_method,
            gemini_api_file_id: fileLink.file_metadata.gemini_api_file_id,
        })),
    }));
}
async function createFileMetadata(data) {
    return await client_1.default.fileMetadata.create({ data });
}
async function getFileMetadata(fileId) {
    return await client_1.default.fileMetadata.findUnique({
        where: { id: fileId },
    });
}
//# sourceMappingURL=history.js.map