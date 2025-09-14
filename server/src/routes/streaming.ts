import { Router, Request, Response } from 'express';
import { generateAIResponse, model, buildChatHistory } from '../services/ai';
import { createSSE } from '../utils/sse';
import * as historyService from '../services/history';
import { HTTPException } from '../middleware/error';

const router = Router();

// Global dictionary to store active generation tasks
const activeGenerations: Map<string, boolean> = new Map();

interface UserMessageInput {
  content: string;
  file_ids?: string[];
}

interface InterruptRequest {
  generation_id?: string;
}

interface InterruptResponse {
  status: string;
  message: string;
}

// POST /chats/{chat_id}/stream - Stream AI response
router.post('/:chat_id/stream', async (req: Request, res: Response) => {
  const chatId = parseInt(req.params.chat_id);
  const userMessage: UserMessageInput = req.body;
  
  if (isNaN(chatId)) {
    return res.status(400).json({ detail: 'Invalid chat ID' });
  }
  
  if (!userMessage.content) {
    return res.status(400).json({ detail: 'Content is required' });
  }

  try {
    console.log(`Received streaming request for chat_id: ${chatId}`);
    console.log(`User message content: ${userMessage.content}`);
    
    // Validate file_ids and log FileMetadata info
    if (userMessage.file_ids && userMessage.file_ids.length > 0) {
      console.log(`File IDs included in request: ${userMessage.file_ids}`);
      
      for (const fileIdStr of userMessage.file_ids) {
        const fileMetadata = await historyService.getFileMetadata(fileIdStr);
        if (fileMetadata) {
          console.log(`File metadata found for ID ${fileIdStr}: Name - ${fileMetadata.original_filename}, Path - ${fileMetadata.local_disk_path}`);
        } else {
          console.warn(`File metadata with ID ${fileIdStr} not found in database. Skipping this file.`);
        }
      }
    }
    
    // Generate unique ID for this generation
    const generationId = `${chatId}_${Math.floor(Math.random() * 900) + 100}`;
    console.log(`Generation ID: ${generationId}`);
    
    // Track this generation
    activeGenerations.set(generationId, true);
    
    // Setup SSE
    const sse = createSSE(res);
    
    // Send generation ID first
    sse.send({ data: JSON.stringify({ generation_id: generationId }) });
    console.log(`Sent generation ID: ${generationId}`);
    
    try {
      // Start streaming generation
      await generateAIResponseStream(
        chatId.toString(),
        userMessage.content,
        userMessage.file_ids || [],
        sse,
        generationId
      );
      
    } catch (error: any) {
      console.error(`Error during AI generation for ${generationId}:`, error);
      if (!sse.isClosed()) {
        sse.sendError(error.message);
      }
    } finally {
      // Clean up
      activeGenerations.delete(generationId);
      if (!sse.isClosed()) {
        sse.sendDone();
        sse.end();
      }
    }
    
  } catch (error: any) {
    console.error('Error during streaming:', error);
    res.status(500).json({ detail: `Error during streaming: ${error.message}` });
  }
});

async function generateAIResponseStream(
  chatId: string,
  userMessageContent: string,
  fileIds: string[],
  sse: any,
  generationId: string
): Promise<void> {
  if (!model) {
    throw new Error('Gemini model not initialized');
  }

  try {
    // Store user message first
    const userMessage = await historyService.createMessage(
      parseInt(chatId),
      {
        role: 'user',
        content: userMessageContent,
        fileIds: fileIds,
      }
    );

    // Build chat history for streaming
    const history = await buildChatHistory(chatId);

    // Create chat session
    const chat = model.startChat({ history });

    // Generate streaming response
    const result = await chat.sendMessageStream([{ text: userMessageContent }]);

    let fullResponse = '';
    
    // Process chunks as they come in
    for await (const chunk of result.stream) {
      // Check if generation was cancelled
      if (!activeGenerations.has(generationId)) {
        console.log(`Generation ${generationId} was cancelled`);
        break;
      }

      const chunkText = chunk.text();
      if (chunkText) {
        fullResponse += chunkText;
        
        // Send chunk in SSE format
        const chunkData = {
          text: chunkText,
          generation_id: generationId,
        };
        
        if (!sse.send({ data: JSON.stringify(chunkData) })) {
          console.log(`Client disconnected for generation ${generationId}`);
          break;
        }
        
        console.log(`Sent chunk for ${generationId} (${chunkText.length} chars)`);
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Store the complete AI response
    if (fullResponse.trim()) {
      await historyService.createMessage(
        parseInt(chatId),
        {
          role: 'model',
          content: fullResponse,
        }
      );
      
      console.log(`Stored complete AI response for chat ${chatId} (${fullResponse.length} chars)`);
    }

  } catch (error: any) {
    console.error('Error in generateAIResponseStream:', error);
    throw error;
  }
}

// POST /chats/{chat_id}/interrupt - Interrupt streaming response
router.post('/:chat_id/interrupt', async (req: Request, res: Response) => {
  const chatId = parseInt(req.params.chat_id);
  const payload: InterruptRequest = req.body;
  
  if (isNaN(chatId)) {
    return res.status(400).json({ detail: 'Invalid chat ID' });
  }

  try {
    const generationId = payload.generation_id;
    
    // If generation_id is provided, use it to find the specific task
    if (generationId && activeGenerations.has(generationId)) {
      activeGenerations.delete(generationId);
      console.log(`Cancelled generation ${generationId}`);
      
      return res.json({
        status: 'success',
        message: `Generation ${generationId} interrupted`,
      });
    }
    
    // If no generation_id, try to cancel all tasks for this chat_id
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
    } else {
      return res.json({
        status: 'warning',
        message: 'No active generations found to interrupt',
      });
    }
    
  } catch (error: any) {
    console.error('Error interrupting generation:', error);
    res.status(500).json({ detail: `Error interrupting generation: ${error.message}` });
  }
});

// POST /chats/{chat_id}/reset-context - Reset chat context (no-op for compatibility)
router.post('/:chat_id/reset-context', async (req: Request, res: Response) => {
  const chatId = parseInt(req.params.chat_id);
  
  if (isNaN(chatId)) {
    return res.status(400).json({ detail: 'Invalid chat ID' });
  }
  
  console.log(`Reset context request received for chat_id: ${chatId} (no action needed)`);
  res.status(204).send();
});

export default router;