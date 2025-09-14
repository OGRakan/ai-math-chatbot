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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.genAI = exports.model = void 0;
exports.processFileForGemini = processFileForGemini;
exports.buildChatHistory = buildChatHistory;
exports.generateAIResponse = generateAIResponse;
const generative_ai_1 = require("@google/generative-ai");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = __importDefault(require("../db/client"));
const env_1 = __importStar(require("../env"));
const error_1 = require("../middleware/error");
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
let genAI = null;
exports.genAI = genAI;
let model = null;
exports.model = model;
try {
    if (env_1.GEMINI_API_KEY) {
        exports.genAI = genAI = new generative_ai_1.GoogleGenerativeAI(env_1.GEMINI_API_KEY);
        exports.model = model = genAI.getGenerativeModel({
            model: env_1.default.geminiModelName,
            systemInstruction: MATH_CHATBOT_SYSTEM_INSTRUCTION,
        });
        model.getGenerationConfig();
        console.log('Gemini AI client configured successfully.');
    }
    else {
        console.warn('GEMINI_API_KEY not found. AI functionality will be disabled.');
    }
}
catch (error) {
    console.error('Failed to configure Gemini client:', error);
    exports.model = model = null;
}
async function processFileForGemini(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return { error: 'File not found' };
    }
    try {
        const stats = fs_1.default.statSync(filePath);
        const fileSize = stats.size;
        const mimeType = getMimeType(filePath);
        if (!mimeType) {
            return { error: 'Unknown file type' };
        }
        const fileExtension = path_1.default.extname(filePath).toLowerCase();
        if (fileExtension === '.txt' || mimeType === 'text/plain') {
            const textContent = fs_1.default.readFileSync(filePath, 'utf-8');
            console.log(`Extracted ${textContent.length} characters from text file: ${filePath}`);
            return { part: { text: textContent } };
        }
        if (fileExtension === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const textContent = await extractTextFromDocx(filePath);
            console.log(`Extracted ${textContent.length} characters from DOCX file: ${filePath}`);
            return { part: { text: textContent } };
        }
        const maxInlineSize = env_1.default.maxFileSize;
        if (fileSize <= maxInlineSize) {
            const fileData = fs_1.default.readFileSync(filePath);
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
        return { error: `File size ${fileSize} exceeds inline processing limit` };
    }
    catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
        return { error: `Failed to process file: ${error}` };
    }
}
async function extractTextFromDocx(filePath) {
    try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }
    catch (error) {
        console.error('Error extracting text from DOCX:', error);
        return `[Error extracting DOCX: ${error}]`;
    }
}
function getMimeType(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    const mimeTypes = {
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
async function buildChatHistory(chatId) {
    const messages = await client_1.default.message.findMany({
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
    const history = [];
    for (const message of messages) {
        const parts = [];
        if (message.content.trim()) {
            parts.push({ text: message.content });
        }
        for (const fileLink of message.files) {
            const filePath = fileLink.file_metadata.local_disk_path;
            const result = await processFileForGemini(filePath);
            if (result.part) {
                parts.push(result.part);
            }
            else if (result.error) {
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
async function generateAIResponse(chatId, userMessageContent, fileIds = []) {
    if (!model) {
        throw new error_1.HTTPException(500, 'Gemini model not initialized');
    }
    try {
        const history = await buildChatHistory(chatId);
        const userParts = [];
        if (userMessageContent.trim()) {
            userParts.push({ text: userMessageContent });
        }
        for (const fileId of fileIds) {
            const fileMetadata = await client_1.default.fileMetadata.findUnique({
                where: { id: fileId },
            });
            if (fileMetadata) {
                const result = await processFileForGemini(fileMetadata.local_disk_path);
                if (result.part) {
                    userParts.push(result.part);
                }
                else if (result.error) {
                    console.warn(`Skipping file ${fileId}: ${result.error}`);
                }
            }
        }
        const chat = model.startChat({ history });
        const result = await chat.sendMessage(userParts);
        return result.response.text();
    }
    catch (error) {
        console.error('Error generating AI response:', error);
        throw new error_1.HTTPException(500, `Error generating AI response: ${error}`);
    }
}
//# sourceMappingURL=ai.js.map