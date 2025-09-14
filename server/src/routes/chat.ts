import { Router, Request, Response } from 'express';
import * as historyService from '../services/history';
import { HTTPException } from '../middleware/error';

const router = Router();

// POST /chats/ - Create new chat session
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = req.body || {};
    const dbChat = await historyService.createChat(chat);
    
    res.status(201).json({
      id: dbChat.id,
      title: dbChat.title,
      create_time: dbChat.create_time,
    });
  } catch (error: any) {
    console.error('Error creating chat:', error);
    if (error instanceof HTTPException) {
      res.status(error.statusCode).json({ detail: error.detail });
      return;
    }
    res.status(500).json({ detail: `Error creating chat: ${error.message}` });
  }
});

// GET /chats/ - Retrieve all chat sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const skip = parseInt(req.query.skip as string) || 0;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const chats = await historyService.getChats(skip, limit);
    res.json(chats);
  } catch (error: any) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ detail: `Error fetching chats: ${error.message}` });
  }
});

// GET /chats/{chat_id} - Retrieve specific chat session with messages
router.get('/:chat_id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error fetching chat:', error);
    res.status(500).json({ detail: `Error fetching chat: ${error.message}` });
  }
});

// PUT /chats/{chat_id} - Update chat title
router.put('/:chat_id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error updating chat:', error);
    res.status(500).json({ detail: `Error updating chat: ${error.message}` });
  }
});

// PATCH /chats/{chat_id} - Alternative to PUT for renaming
router.patch('/:chat_id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error updating chat:', error);
    res.status(500).json({ detail: `Error updating chat: ${error.message}` });
  }
});

// DELETE /chats/{chat_id} - Delete chat session and all messages
router.delete('/:chat_id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error deleting chat:', error);
    res.status(500).json({ detail: `Error deleting chat: ${error.message}` });
  }
});

// POST /chats/{chat_id}/messages/ - Create new message in chat
router.post('/:chat_id/messages/', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Error creating message:', error);
    res.status(500).json({ detail: `Error creating message: ${error.message}` });
  }
});

// GET /chats/{chat_id}/messages/ - Get all messages for a chat
router.get('/:chat_id/messages/', async (req: Request, res: Response) => {
  try {
    const chatId = parseInt(req.params.chat_id);
    
    if (isNaN(chatId)) {
      return res.status(400).json({ detail: 'Invalid chat ID' });
    }
    
    const messages = await historyService.getChatMessages(chatId);
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ detail: `Error fetching messages: ${error.message}` });
  }
});

export default router;