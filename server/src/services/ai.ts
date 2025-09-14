import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../db/client';
import settings, { GEMINI_API_KEY } from '../env';
import { HTTPException } from '../middleware/error';

// System instruction for the math chatbot persona - EXACT MIRROR of Python
const MATH_CHATBOT_SYSTEM_INSTRUCTION = `
You are an AI Math Chatbot designed to help students and professionals with mathematics problems.
Your capabilities include:

1. Solving math problems step-by-step, from basic arithmetic to advanced calculus, linear algebra, statistics, and more.
2. Explaining mathematical concepts clearly with examples.
3. Providing visual representations of mathematical concepts using LaTeX notation.
4. Helping debug mathematical code (Python, R, MATLAB, etc.).
5. Answering questions about mathematical history and applications.

Guidelines:
- Always show your work step-by-step when solving problems.
- Format mathematical expressions using LaTeX:
  * Use $...$ for inline math (e.g., $x^2 + 5$)
  * Use $$...$$ for display/block math (e.g., $$\\int_0^\\infty e^{-x} dx = 1$$)
  * Ensure all LaTeX expressions are properly escaped (e.g., \\int, \\sum, \\frac)
  * **When presenting a mathematical formula, equation or text with inline math (using $$...$$ for display/block math (e.g., $$\\int_0^\\infty e^{-x} dx = 1$$)) after a colon (e.g., "The formula is:"), always place the rendered math on a new line, using display math ($$...$$), and ensure it is centered with an appropriate amount of space before and after the math block. The structure after the colon must always be: new line: "$$", new line: "block math", new line: "$$".** For example:
    The Pythagorean theorem states:
    $$
    a^2 + b^2 = c^2
    $$
    This ensures the math is visually distinct and easy to read.
- **In the case of a text in a bullet point, When presenting a mathematical formula, equation or text with inline math (using $$...$$ for display/block math (e.g., $$\\int_0^\\infty e^{-x} dx = 1$$)) after a colon (e.g., "- The formula is:"), always place the rendered math on a new line, using display math ($$...$$), and ensure it is centered with an appropriate amount of space before and after the math block. The structure after the colon must always be: new line: "$$", new line: "block math", new line: "$$".**
- When presenting a text after a colon, always place the text on a new line. The structure after the colon must always be: new line: "text". For example:
    Here's what the theorem states:`;

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null;

// Initialize Gemini AI client - mirrors Python behavior
try {
  if (GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ 
      model: settings.geminiModelName,
      systemInstruction: MATH_CHATBOT_SYSTEM_INSTRUCTION,
    });

    // Test the connection (mirror Python's model listing attempt)
    console.log('Model generation config:', model.generationConfig);
    console.log('Gemini AI client configured successfully.');
  } else {
    console.warn('GEMINI_API_KEY not found. AI functionality will be disabled.');
  }
} catch (error) {
  console.error('Failed to configure Gemini client:', error);
  model = null;
}

export interface FileProcessingResult {
  part?: Part;
  error?: string;
}

export async function processFileForGemini(filePath: string): Promise<FileProcessingResult> {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return { error: 'File not found' };
  }

  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const mimeType = getMimeType(filePath);

    if (!mimeType) {
      return { error: 'Unknown file type' };
    }

    const fileExtension = path.extname(filePath).toLowerCase();

    // For text files, extract the text and return as text content
    if (fileExtension === '.txt' || mimeType === 'text/plain') {
      const textContent = fs.readFileSync(filePath, 'utf-8');
      console.log(`Extracted ${textContent.length} characters from text file: ${filePath}`);
      return { part: { text: textContent } };
    }

    // For DOCX files, extract text using mammoth
    if (fileExtension === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const textContent = await extractTextFromDocx(filePath);
      console.log(`Extracted ${textContent.length} characters from DOCX file: ${filePath}`);
      return { part: { text: textContent } };
    }

    // For PDF and image files, handle based on size
    const maxInlineSize = settings.maxFileSize;

    if (fileSize <= maxInlineSize) {
      const fileData = fs.readFileSync(filePath);
      console.log(`Processing ${fileSize} bytes of ${mimeType} data inline from file: ${filePath}`);
      
      return { 
        part: {
          inlineData: {
            data: fileData.toString('base64'),
            mimeType: mimeType,
          },
        },
      };
    }

    // For larger files, we'd use Files API (not implemented in this version)
    return { error: `File size ${fileSize} exceeds inline processing limit` };

  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return { error: `Failed to process file: ${error}` };
  }
}

async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    return `[Error extracting DOCX: ${error}]`;
  }
}

function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.txt': 'text/plain',
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.heif': 'image/heif',
  };
  
  return mimeTypes[ext] || null;
}

export interface ChatHistoryItem {
  role: 'user' | 'model';
  parts: Part[];
}

export async function buildChatHistory(chatId: string): Promise<ChatHistoryItem[]> {
  const messages = await prisma.message.findMany({
    where: { chat_id: parseInt(chatId) },
    include: {
      files: {
        include: {
          file_metadata: true,
        },
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  const history: ChatHistoryItem[] = [];

  for (const message of messages) {
    const parts: Part[] = [];

    // Add text content
    if (message.content.trim()) {
      parts.push({ text: message.content });
    }

    // Add files
    for (const fileLink of message.files) {
      const filePath = fileLink.file_metadata.local_disk_path;
      const result = await processFileForGemini(filePath);
      if (result.part) {
        parts.push(result.part);
      } else if (result.error) {
        console.warn(`Skipping file ${filePath}: ${result.error}`);
      }
    }

    if (parts.length > 0) {
      history.push({
        role: message.role === 'user' ? 'user' : 'model',
        parts,
      });
    }
  }

  return history;
}

export async function generateAIResponse(
  chatId: string,
  userMessageContent: string,
  fileIds: string[] = []
): Promise<string> {
  if (!model) {
    throw new HTTPException(500, 'Gemini model not initialized');
  }

  try {
    // Build chat history
    const history = await buildChatHistory(chatId);

    // Create user message parts
    const userParts: Part[] = [];
    
    if (userMessageContent.trim()) {
      userParts.push({ text: userMessageContent });
    }

    // Process uploaded files
    for (const fileId of fileIds) {
      const fileMetadata = await prisma.fileMetadata.findUnique({
        where: { id: fileId },
      });

      if (fileMetadata) {
        const result = await processFileForGemini(fileMetadata.local_disk_path);
        if (result.part) {
          userParts.push(result.part);
        } else if (result.error) {
          console.warn(`Skipping file ${fileId}: ${result.error}`);
        }
      }
    }

    // Create chat with history
    const chat = model.startChat({ history });

    // Generate response
    const result = await chat.sendMessage(userParts);
    return result.response.text();

  } catch (error) {
    console.error('Error generating AI response:', error);
    throw new HTTPException(500, `Error generating AI response: ${error}`);
  }
}

export { model, genAI };