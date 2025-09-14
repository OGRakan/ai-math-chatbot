# AI Math Chatbot Repository Audit Report

## 1. AI Integration Analysis

### 1.1 LLM Integration with Google Gemini

**Primary Integration Points:**
- **File**: `backend/app/services.py` (Lines 76-89, 390-433)
- **Configuration**: `backend/app/config.py` (Lines 20-28, 52-53)

**Model Configuration:**
```python
# services.py lines 82-89
client = genai.Client(api_key=config.GEMINI_API_KEY)
model_name = config.get_settings().gemini_model_name  # "gemini-2.5-flash-preview-04-17"
```

**Settings Used:**
- **Model**: `gemini-2.5-flash-preview-04-17` (configurable via `GEMINI_MODEL_NAME` env var)
- **Temperature**: 0.7
- **Top-P**: 0.95  
- **Top-K**: 40
- **Max Output Tokens**: 8192

**System Instruction:**
- **Location**: `backend/app/services.py` (Lines 25-73)
- **Purpose**: Defines math chatbot persona with LaTeX formatting rules
- **Key Features**: Step-by-step problem solving, LaTeX formatting, encouraging tone

**Libraries Used:**
- `google-genai==0.8.0` (New Google Gen AI SDK)
- Model instantiation at `services.py:390-416`

### 1.2 Chat History & Context Management

**Context Injection:**
- **File**: `backend/app/services.py` (Lines 283-357)
- **Function**: `generate_ai_response()`
- **Flow**: Constructs full conversation history from database messages
- **Format**: Converts to Gemini's `types.Content` objects with role-based structure

**History Processing:**
```python
# Lines 283-318 in services.py
for msg in chat_history:
    message_parts = [types.Part(text=msg.content)]
    if msg.files:  # Include file content in history
        # Process each attached file...
    gemini_history.append(types.Content(role=msg.role, parts=message_parts))
```

### 1.3 Streaming Implementation

**Streaming Response:**
- **Router**: `backend/app/routers/streaming_router.py` (Lines 42-194)
- **Service**: `backend/app/services.py` (Lines 648-761)
- **Method**: Server-Sent Events (SSE) using `StreamingResponse`

**Streaming Flow:**
1. Client sends POST to `/chats/{chat_id}/stream`
2. Backend creates async queue for chunk passing
3. `generate_ai_response_stream()` processes Gemini streaming response
4. Chunks sent via SSE format: `data: {"text": "chunk"}\n\n`

**Frontend Streaming:**
- **File**: `frontend/lib/api-service.ts` (Lines 200-406)
- **Implementation**: EventSource-like processing with fetch() and ReadableStream
- **Error Handling**: Comprehensive abort controller and error propagation

## 2. PDF & File Upload Flow

### 2.1 Complete Upload Flow

**Frontend Upload:**
1. **Component**: File upload via drag-and-drop or file picker
2. **API Call**: `frontend/lib/api-service.ts:uploadFile()` (Lines 159-197)
3. **Endpoint**: `POST /files/upload`

**Backend Processing:**
1. **Router**: `backend/app/routers/file_router.py` (Lines 54-135)
2. **Validation**: MIME type checking, file size limits
3. **Storage**: Local disk storage with UUID-based filenames
4. **Database**: Metadata stored in `file_metadata` table

### 2.2 Supported File Types & Processing

**Allowed MIME Types** (`file_router.py:21-31`):
- `text/plain` (.txt)
- `application/pdf` (.pdf) 
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- `image/jpeg`, `image/png`, `image/gif`, `image/webp` 
- `image/heic`, `image/heif`

**Size Limits:**
- **Inline Processing**: ≤ 20MB (configurable via `MAX_FILE_SIZE`)
- **Gemini Files API**: ≤ 2GB for large files
- **Total Files**: Up to 5 files per message

### 2.3 Text Extraction Libraries

**DOCX Processing:**
- **Library**: `python-docx==1.1.2` 
- **Function**: `services.py:extract_text_from_docx()` (Lines 241-271)
- **Process**: Extracts text from paragraphs and tables

**Text Files:**
- **Processing**: Direct UTF-8 reading with error handling
- **Encoding**: `encoding='utf-8', errors='replace'`

### 2.4 Error Handling & Validation

**Upload Validation** (`file_router.py:84-112`):
- File size streaming validation during upload
- MIME type verification
- Text file encoding validation
- DOCX integrity checking

**Multi-file Support:**
- **Frontend**: `streamChatMessage()` accepts `File[]` array
- **Processing**: Sequential upload with error handling per file
- **Backend**: `file_ids` array in message linking

## 3. AI-PDF Connection

### 3.1 File Processing for AI Context

**File Preparation** (`services.py:813-867`):
- **Function**: `_prepare_single_file_for_gemini()`
- **Text Extraction**: For .txt and .docx files, content extracted and sent as text
- **Binary Files**: PDFs and images sent directly to Gemini (inline or via Files API)

### 3.2 Content Chunking & Prompt Integration

**Text Handling:**
```python
# services.py lines 825-832
if fm.content_type == 'text/plain':
    with open(fm.local_disk_path, 'r', encoding='utf-8', errors='replace') as f:
        text_content = f.read()
    return [context_part, types.Part(text=text_content)]
```

**File Context Integration:**
- **Preamble**: Each file gets context marker `[File attached: filename, type: content_type]`
- **Content**: Text files inserted as text parts, binary files as inline data or File API references
- **History**: Files attached to historical messages re-processed for each AI call

### 3.3 Gemini Files API Integration

**Large File Handling** (`services.py:840-860`):
- **Trigger**: Files > 20MB use Files API
- **Upload**: `client.files.upload()` with 48-hour TTL
- **TTL Management**: Database tracking of expiry times with auto-refresh
- **Fallback**: If Files API fails, falls back to inline processing

## 4. Node.js Migration Recommendations

### 4.1 Framework & Library Equivalents

**Current Python Stack → Node.js Equivalents:**

| Python Component | Node.js Equivalent | Purpose |
|------------------|-------------------|---------|
| FastAPI | Express.js / NestJS | Web framework |
| SQLAlchemy + SQLite | Prisma + SQLite | ORM + Database |
| python-multipart | multer | File upload handling |
| python-docx | node-docx-parser | DOCX text extraction |
| google-genai | @google/generative-ai | Google Gemini SDK |
| uvicorn | Built-in Express | Development server |

### 4.2 Recommended Tech Stack

```json
{
  "framework": "Express.js",
  "orm": "Prisma",
  "database": "SQLite",
  "fileUpload": "multer",
  "pdfParsing": "pdf-parse",
  "docxParsing": "mammoth",
  "aiSdk": "@google/generative-ai",
  "streaming": "Server-Sent Events",
  "validation": "zod"
}
```

### 4.3 File Structure Proposal

```
backend-nodejs/
├── src/
│   ├── controllers/
│   │   ├── chatController.js
│   │   ├── fileController.js
│   │   └── streamController.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── fileService.js
│   │   └── streamingService.js
│   ├── models/
│   │   └── schema.prisma
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/
│   │   ├── chat.js
│   │   ├── files.js
│   │   └── streaming.js
│   └── app.js
├── uploads/
├── package.json
└── .env
```

### 4.4 Endpoint Mapping

| Current Python Endpoint | Node.js Equivalent | Method |
|-------------------------|-------------------|---------|
| `POST /chats` | `POST /api/chats` | Create chat |
| `GET /chats/{chat_id}` | `GET /api/chats/:chatId` | Get chat |
| `POST /files/upload` | `POST /api/upload` | File upload |
| `POST /chats/{chat_id}/stream` | `POST /api/chat/:chatId/stream` | Streaming chat |
| `POST /stt` | `POST /api/speech-to-text` | Speech transcription |

## 5. Example Code Stubs

### 5.1 AI Chat Service with History

```javascript
// src/services/aiService.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const prisma = new PrismaClient();

const SYSTEM_INSTRUCTION = `
You are an AI Math Chatbot designed to help students and professionals with mathematics problems.
// ... (same system instruction as Python version)
`;

export async function generateAIResponse(chatId, userMessage, fileIds = []) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
      }
    });

    // Fetch chat history
    const messages = await prisma.message.findMany({
      where: { chatId: parseInt(chatId) },
      include: { files: true },
      orderBy: { timestamp: 'asc' }
    });

    // Build conversation history
    const chatHistory = await Promise.all(
      messages.map(async (msg) => {
        const parts = [{ text: msg.content }];
        
        // Process attached files
        for (const file of msg.files) {
          if (file.contentType.startsWith('text/')) {
            const fs = require('fs').promises;
            const textContent = await fs.readFile(file.localPath, 'utf-8');
            parts.push({ text: `[Content from ${file.filename}]\n${textContent}` });
          } else {
            // Handle binary files (PDF, images)
            const fileData = await fs.readFile(file.localPath);
            parts.push({
              inlineData: {
                mimeType: file.contentType,
                data: fileData.toString('base64')
              }
            });
          }
        }

        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts
        };
      })
    );

    // Add current user message with files
    const currentParts = [{ text: userMessage }];
    // ... process current files similar to history

    const result = await model.generateContent([
      ...chatHistory,
      { role: 'user', parts: currentParts }
    ]);

    return result.response.text();
  } catch (error) {
    console.error('AI generation error:', error);
    throw error;
  }
}
```

### 5.2 File Upload + PDF Parse

```javascript
// src/controllers/fileController.js
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

export const uploadFile = upload.single('file');

export async function processFileUpload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, size, path: filePath } = req.file;
    const fileId = filename.split('.')[0];

    // Determine processing method
    const maxInlineSize = 20 * 1024 * 1024; // 20MB
    const processingMethod = size <= maxInlineSize ? 'inline' : 'files_api';

    // Extract text preview for text files
    let textPreview = null;
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      textPreview = result.value.substring(0, 200);
    } else if (mimetype === 'text/plain') {
      const fs = require('fs').promises;
      const content = await fs.readFile(filePath, 'utf-8');
      textPreview = content.substring(0, 200);
    }

    // Save metadata to database
    const fileMetadata = await prisma.fileMetadata.create({
      data: {
        id: fileId,
        originalFilename: originalname,
        contentType: mimetype,
        size,
        localPath: filePath,
        processingMethod,
        uploadTimestamp: new Date()
      }
    });

    res.json({
      file_id: fileId,
      filename: originalname,
      content_type: mimetype,
      size,
      processing_method: processingMethod,
      preview: textPreview
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'File upload failed' });
  }
}
```

### 5.3 SSE Streaming Implementation

```javascript
// src/controllers/streamController.js
import { generateAIResponseStream } from '../services/streamingService.js';
import { PrismaClient } from '@prisma/prisma';

const prisma = new PrismaClient();

export async function streamChatResponse(req, res) {
  const { chatId } = req.params;
  const { content, file_ids } = req.body;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  try {
    // Save user message
    const userMessage = await prisma.message.create({
      data: {
        chatId: parseInt(chatId),
        role: 'user',
        content,
        timestamp: new Date()
      }
    });

    // Link files to message
    if (file_ids && file_ids.length > 0) {
      await prisma.messageFile.createMany({
        data: file_ids.map(fileId => ({
          messageId: userMessage.id,
          fileId: fileId
        }))
      });
    }

    // Generate streaming response
    const stream = await generateAIResponseStream(chatId, content, file_ids);
    let aiResponse = '';

    stream.on('data', (chunk) => {
      aiResponse += chunk;
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    });

    stream.on('end', async () => {
      // Save AI response
      await prisma.message.create({
        data: {
          chatId: parseInt(chatId),
          role: 'model',
          content: aiResponse,
          timestamp: new Date()
        }
      });

      res.write('data: [DONE]\n\n');
      res.end();
    });

    stream.on('error', (error) => {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      stream.destroy();
    });

  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
}
```

## 6. Step-by-Step Migration Plan

### Phase 1: Setup & Dependencies (1-2 days)
1. **Initialize Node.js Project**
   ```bash
   npm init -y
   npm install express prisma @prisma/client @google/generative-ai multer
   npm install mammoth pdf-parse uuid zod helmet cors
   npm install -D @types/node typescript ts-node nodemon
   ```

2. **Setup Database Schema**
   - Create `prisma/schema.prisma` mirroring current SQLAlchemy models
   - Run `npx prisma migrate dev` to create initial migration

3. **Environment Configuration**
   - Port existing `.env` variables
   - Setup configuration management similar to current `config.py`

### Phase 2: Core Services (2-3 days)
1. **Implement AI Service**
   - Port `services.py` AI integration logic
   - Setup Gemini client with same configuration
   - Implement history context building

2. **File Processing Service**
   - Setup multer for file uploads
   - Implement text extraction (mammoth, pdf-parse)
   - File metadata management

3. **Database Layer**
   - Setup Prisma client
   - Implement CRUD operations matching current `crud/` modules

### Phase 3: API Endpoints (2-3 days)
1. **Chat Endpoints**
   - `GET/POST /api/chats`
   - `GET/PATCH/DELETE /api/chats/:id`

2. **File Upload Endpoint**
   - `POST /api/upload` with validation
   - File processing and metadata storage

3. **Streaming Endpoint** 
   - `POST /api/chat/:chatId/stream`
   - SSE implementation
   - Error handling and client disconnect handling

### Phase 4: Advanced Features (2-3 days)
1. **Speech-to-Text**
   - Port Whisper integration
   - Audio file handling

2. **Files API Integration**
   - Large file handling via Gemini Files API
   - TTL management and refresh logic

3. **Error Handling & Middleware**
   - Global error handler
   - Rate limiting
   - CORS configuration

### Phase 5: Testing & Deployment (2-3 days)
1. **Unit Tests**
   - Service layer testing
   - API endpoint testing
   - File upload testing

2. **Integration Testing**
   - End-to-end chat flow
   - File processing pipeline
   - Streaming functionality

3. **Docker & Deployment**
   - Dockerfile for Node.js backend
   - Docker-compose updates
   - Environment variable documentation

### Phase 6: Frontend Updates (1-2 days)
1. **API Service Updates**
   - Update base URLs in `api-config.ts`
   - Verify endpoint compatibility
   - Test streaming functionality

2. **Error Handling**
   - Update error message handling
   - Test file upload limits and validation

**Total Estimated Time: 10-16 days**

### Migration Checklist
- [ ] Node.js project setup with dependencies
- [ ] Database schema migration (Prisma)
- [ ] AI service implementation (Gemini integration)
- [ ] File processing (upload, validation, text extraction)
- [ ] Core API endpoints (chats, messages, files)
- [ ] Streaming implementation (SSE)
- [ ] Speech-to-text integration
- [ ] Error handling and middleware
- [ ] Unit and integration tests
- [ ] Docker configuration updates
- [ ] Frontend compatibility verification
- [ ] Performance testing
- [ ] Documentation updates

The migration maintains the same API contracts and feature set while leveraging Node.js ecosystem advantages like better JavaScript ecosystem integration and potentially improved streaming performance.