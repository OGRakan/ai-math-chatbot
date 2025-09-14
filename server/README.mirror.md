# Node.js Backend Mirror - README

This directory contains a complete Node.js/TypeScript implementation that mirrors the Python FastAPI backend exactly.

## Architecture Overview

The Node.js backend preserves all the same:
- **API endpoints** (paths, methods, status codes)
- **Request/response schemas** (JSON structures)
- **File upload behavior** (size limits, validation, storage)
- **Streaming SSE** (Server-Sent Events format)
- **Database schema** (SQLite with Prisma ORM)
- **Environment variables** (names and defaults)
- **Error handling** (status codes and messages)

## Directory Structure

```
server/
├── src/
│   ├── index.ts              # Main Express app
│   ├── env.ts                # Environment configuration
│   ├── routes/
│   │   ├── chat.ts           # Chat management (/chats/*)
│   │   ├── upload.ts         # File uploads (/files/*)
│   │   ├── speech.ts         # Speech-to-text (/stt)
│   │   └── streaming.ts      # AI streaming (/chats/{id}/stream)
│   ├── services/
│   │   ├── ai.ts             # Gemini AI integration
│   │   ├── pdf.ts            # File processing (PDF, DOCX, images)
│   │   ├── whisper.ts        # Whisper speech transcription
│   │   └── history.ts        # Database operations (Chat/Message CRUD)
│   ├── middleware/
│   │   ├── cors.ts           # CORS configuration
│   │   ├── error.ts          # Error handling
│   │   └── rate-limiter.ts   # Rate limiting
│   ├── utils/
│   │   └── sse.ts            # Server-Sent Events streaming
│   └── db/
│       ├── client.ts         # Prisma database client
│       └── schema.prisma     # Database schema
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── schema.prisma             # Prisma schema (root level)
└── .env.example              # Environment variables template
```

## API Endpoint Parity

### Chat Management
- `POST /chats/` - Create new chat session
- `GET /chats/` - List all chats
- `GET /chats/{id}` - Get specific chat with messages
- `PUT /chats/{id}` - Update chat title
- `PATCH /chats/{id}` - Update chat title (alternative)
- `DELETE /chats/{id}` - Delete chat and all messages
- `POST /chats/{id}/messages/` - Create message in chat
- `GET /chats/{id}/messages/` - Get all messages for chat

### Streaming
- `POST /chats/{id}/stream` - Stream AI response (SSE)
- `POST /chats/{id}/interrupt` - Interrupt streaming
- `POST /chats/{id}/reset-context` - Reset chat context (no-op)

### File Upload
- `POST /files/upload` - Upload file, return file_id
- `GET /files/{id}/info` - Get file metadata
- `POST /files/process-file/{id}` - Process file for chat usage

### Speech
- `POST /stt` - Speech-to-text transcription

## Environment Variables (Identical to Python)

```bash
# Database
DATABASE_URL=file:../aichatbot.db

# API Keys
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
HUGGINGFACE_API_TOKEN=YOUR_HUGGINGFACE_API_TOKEN

# Model Configuration
GEMINI_MODEL_NAME=gemini-2.5-flash-preview-04-17

# File Upload Settings
UPLOAD_DIR=/tmp/ai-math-chatbot-uploads
MAX_FILE_SIZE=20971520  # 20MB in bytes

# Audio Upload Settings
AUDIO_DIR=/tmp/ai-math-chatbot-audio
MAX_AUDIO_SIZE=10485760  # 10MB in bytes

# Server Settings
ALLOWED_ORIGINS=http://localhost:3000,http://192.168.0.3:3000,http://localhost:5173
PORT=8000
```

## Database Schema Parity

The Prisma schema exactly mirrors the SQLAlchemy models:

- `chats` table (id, title, create_time)
- `file_metadata` table (id, filename, content_type, size, processing_method, etc.)
- `messages` table (id, chat_id, role, content, timestamp)
- `message_file_link` junction table (message_id, file_metadata_id)

## Key Libraries & Dependencies

### Production Dependencies
- `express` - Web framework (mirrors FastAPI)
- `@google/generative-ai` - Gemini AI SDK
- `@prisma/client` - Database ORM (mirrors SQLAlchemy)
- `multer` - File upload handling
- `cors` - CORS middleware
- `helmet` - Security middleware
- `express-rate-limit` - Rate limiting
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction
- `tesseract.js` - OCR for images
- `axios` - HTTP client (for Whisper API)
- `uuid` - UUID generation

### Development Dependencies
- `typescript` - TypeScript compiler
- `prisma` - Database toolkit
- `ts-node-dev` - Development server
- `jest` - Testing framework
- `supertest` - API testing
- `eslint` - Code linting

## Setup & Usage

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client
npx prisma generate

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start

# Run tests
npm test
```

## Behavioral Mirroring Details

### File Upload Processing
- **Identical size limits**: 20MB inline, 2GB max (same as Python)
- **Identical MIME type validation**: Exact same allowed types array
- **Same error messages**: Status codes and error text match Python
- **Same file storage**: UUIDs + extensions in same directory structure
- **Same processing methods**: "inline" vs "files_api" logic

### AI Streaming (SSE)
- **Identical SSE format**: `data: {JSON}\n\n` structure
- **Same chunk handling**: Generation ID, text chunks, error handling
- **Same interrupt behavior**: Generation tracking and cancellation
- **Same context building**: Chat history reconstruction from DB

### Error Handling
- **HTTP status codes**: 400, 404, 413, 415, 422, 429, 500, 503 (same as Python)
- **Error response format**: `{"detail": "message"}` structure
- **Validation errors**: Same field validation and messages

### Speech-to-Text
- **Identical Whisper integration**: Same HuggingFace endpoint
- **Same audio limits**: 10MB max, same MIME types
- **Same error handling**: Network errors, API errors, file cleanup

## Testing & Validation

The implementation includes comprehensive test coverage:

- **Contract tests**: Validate identical request/response shapes
- **Integration tests**: End-to-end API testing
- **Streaming tests**: SSE behavior validation
- **File upload tests**: Multi-file, size limits, validation
- **Error handling tests**: All error scenarios

## Migration from Python

To migrate from the Python backend:

1. **Database**: Use existing SQLite file (schema is identical)
2. **Environment**: Copy `.env` file (variables are identical)
3. **Files**: Existing uploaded files work seamlessly
4. **Frontend**: No changes required (API contracts identical)

## Performance Notes

The Node.js implementation provides:
- **Streaming performance**: Similar to Python FastAPI
- **File handling**: Comparable upload/processing speed
- **Memory usage**: Efficient with streaming and cleanup
- **Concurrency**: Event-driven architecture handles multiple requests

## Cutover Guide

1. **Stop Python server**
2. **Start Node.js server** (same port 8000)
3. **Update reverse proxy** if needed
4. **Health check**: GET `/` endpoint
5. **Rollback**: Start Python server if issues