# AI Math Chatbot

An advanced AI-powered chatbot designed to help students and professionals solve mathematics problems, from basic arithmetic to advanced calculus, linear algebra, statistics, and more. This project demonstrates expertise in full-stack development, AI/LLM integration, multimodal input handling, and software engineering best practices.

## 🚀 Project Highlights

- **Step-by-step math problem solving** powered by Google Gemini LLM
- **Mathematical concept explanations** with real examples
- **LaTeX rendering** for beautiful math display (KaTeX)
- **File upload support** (images, PDFs, text, DOCX) with intelligent backend processing (**up to 5 files at once**)
- **Speech-to-text** for voice input (Whisper integration)
- **Streaming responses** with typing effect for real-time, interactive UX
- **Chat history management** with persistent storage (SQLite + SQLAlchemy)
- **Robust error handling** and accessibility (A11y) features
- **ChatGPT-like UI** with Shadcn UI components
- **Chat History Sidebar** with search, rename, and delete functionality
- **User's response** with copy to clipboard, regenerate, and edit functionality
- **Model's response** with copy to clipboard and regenerate functionality
- **Context Management** with multi-turn chat history for coherent, contextual conversations

## Demo Screens

Here are some screenshots demonstrating the AI Math Chatbot in action:

- **Initial Page (Light Mode):**
  ![Initial Page Light Mode](assets/Initial_page_light_mode.png)
- **Initial Page (Dark Mode):**
  ![Initial Page Dark Mode](assets/Initial_page_dark_mode.png)
- **File Upload Demo:**
  ![File Upload Demo](assets/file_upload_demo.png)
- **Voice Input Demo:**
  ![Voice Input Demo](assets/voice_input_demo.png)
- **Chat Demo:**
  ![Chat Demo](assets/demo.png)


## 🧠 AI & Engineering Skills Demonstrated

- **Large Language Model (LLM) Integration:** Google Gemini Pro API for advanced math reasoning, step-by-step explanations, and conceptual understanding
- **Prompt Engineering:** Custom system instructions to define chatbot persona and capabilities
- **Multimodal Input:** Backend supports text, images, PDFs, and DOCX; intelligently extracts and routes content for optimal LLM use
- **Streaming & Real-Time UX:** Implements streaming LLM responses for instant feedback
- **Speech-to-Text:** Whisper (via Hugging Face) for accessible, voice-driven input
- **Context Management:** Multi-turn chat history for coherent, contextual conversations
- **File API Usage:** Handles large files with Gemini's File API, including TTL management
- **Error Handling:** User-friendly error messages, robust backend exception handling, and logging
- **Accessibility & UX:** WCAG 2.1 AA compliance, semantic HTML, keyboard navigation, and responsive design
- **Modern Full-Stack Engineering:** FastAPI backend, Next.js/React frontend, Zustand state management, Tailwind CSS, Dockerized deployment

## 🗂️ Technology Stack

### Backend
- Python 3.9+
- FastAPI
- Google Gen AI SDK (Gemini 2.5 Flash)
- SQLAlchemy with SQLite
- Hugging Face Inference API (Whisper for speech-to-text)

### Frontend
- Next.js with TypeScript
- Tailwind CSS with Shadcn UI components
- KaTeX for LaTeX rendering
- Zustand for state management

## 🏗️ Project Structure

Refer to the [project-structure.md](project-structure.md) file for a detailed breakdown of the project structure.
- `backend/`: FastAPI app, API endpoints, business logic, DB models, Gemini integration
- `frontend/`: Next.js/React app, UI components, state management, API services
- `docs/`: Project documentation, rules, and references
- `.env.example`: Template for environment variables (**located in `backend/`**)
- `LICENSE`: MIT License (see [LICENSE](LICENSE))
- `docker-compose.yml`: Orchestrates local development for frontend & backend

## ⚙️ Setup Instructions

### Prerequisites

- Python 3.9 or higher
- Node.js 16 or higher
- Google Gemini API key
- Hugging Face API token (optional, for speech-to-text)

### Environment Variables

Copy `.env.example` from the `backend/` directory and create your own `.env` file in the same location:

```
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL_NAME=gemini-2.5-flash-preview-04-17
HUGGINGFACE_API_TOKEN=your_huggingface_token
UPLOAD_DIR=/path/to/upload/directory
AUDIO_DIR=/path/to/audio/directory
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```
2. Create a virtual environment:
   ```
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```
4. Run the server:
   ```
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```
2. Install dependencies:
   ```
   npm install
   # or
   pnpm install
   ```
3. Create a `.env.local` file with:
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
4. Run the development server:
   ```
   npm run dev
   # or
   pnpm dev
   ```
   The frontend will be available at http://localhost:3000

### Docker Setup

Alternatively, use Docker Compose to run both frontend and backend:

1. Ensure Docker and Docker Compose are installed
2. Create a `.env` file in the `backend/` directory with your API keys
3. From the project root, run:
   ```
   docker-compose up --build
   ```
4. Access the app at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🔗 API Endpoints

### Backend API
- `/chats`, `/chats/{chat_id}`: Chat CRUD
- `/chats/{chat_id}/messages/`: Message CRUD
- `/chats/{chat_id}/stream`: Streaming LLM responses
- `/upload-file`: File upload (PDF, image, DOCX, text; **up to 5 files per request**)
- `/stt`: Speech-to-text (Whisper)

See `app/routers/` for implementation details.


### Frontend API Routes
- `POST /api/chat`: Send a message to the chatbot (proxies to backend)

## 🧩 Frontend/Backend Integration

- **Chat Management:** Fetch, create, and manage chats via backend API
- **Streaming Responses:** Real-time LLM responses via Server-Sent Events (SSE)
- **File Upload:** Multi-part form data for sending up to 5 files to backend
- **Speech-to-Text:** Audio recordings sent to backend for transcription
- **Centralized API Logic:** All API calls managed in `frontend/lib/api-service.ts`

## 🎤 Voice Input

- **Speech-to-Text:** The chatbot supports voice input using Whisper (via Hugging Face Inference API). Users can record their math questions or problems directly in the chat interface using the microphone button.
- **Real-Time Transcription:** Audio is streamed to the backend, transcribed to text, and inserted into the chat input for review and editing before sending.
- **Supported Formats:** Accepts standard audio formats (e.g., WAV, MP3, M4A, WebM) as supported by browsers and Whisper API.
- **Accessibility:** Voice input is fully accessible via keyboard navigation and screen readers. Visual feedback is provided during recording and transcription.
- **Error Handling:** User-friendly error messages are shown for unsupported formats, transcription failures, or permission issues.
- **Privacy:** Audio is processed in-memory and not stored on the server beyond the request lifecycle.
- **Frontend Display:** A modal or inline UI provides recording controls and displays transcription progress. See the demo screenshot below:


## 📂 File Handling

- **Supported Types:**
  - PDF: `application/pdf`
  - Images: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`
  - Text: `text/plain`
  - Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
- **Size Limits:**
  - Inline processing for files < ~20MB
  - Gemini Files API for files up to 2GB (48-hour TTL)
- **File Count Limit:**
  - Up to 5 files can be uploaded at once per request
- **Processing:**
  - `.txt` and `.docx`: Text extracted before sending to Gemini
  - PDF/Images: Sent directly to Gemini
- **Frontend Display:** Uploaded files shown as chips with remove functionality (max 5)
- **No persistent backend storage** beyond Gemini's 48-hour TTL

## 🧪 Testing

**Note:** Backend and frontend tests will be implemented in a later stage. The project is structured for easy test integration using:

- **Backend:** `pytest` for unit/integration tests, `httpx` for API testing
- **Frontend:** `jest` and `react-testing-library` for component and integration tests
- **E2E:** Playwright or Cypress for end-to-end user flow testing

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔮 Future Considerations

- **Advanced Math Capabilities:** Integrate symbolic computation (e.g., SymPy) for algebraic manipulation and equation solving
- **User Authentication:** Optional login for saving personal chat history and preferences
- **Admin Dashboard:** Analytics, usage stats, and moderation tools
- **Multilingual Support:** Expand to support multiple languages for global accessibility
- **Mobile App:** React Native or Flutter client for mobile devices
- **Enhanced A11y:** Further improvements for screen readers and cognitive accessibility
- **Cloud Deployment:** One-click deploy to GCP, AWS, or Azure
- **Automated Testing:** CI/CD integration for automated test runs and deployments
- **Plugin System:** Allow users to extend chatbot capabilities with custom plugins
- **Calculator:** Add a calculator with basic and scientific modes to the chatbot
- **Graphs and Charts:** Add the ability to create graphs and charts from data
- **Canvas drawing:** Add the ability to draw on a canvas mathematical expressions, geometry, graphs, etc.
- **Unit/Integration/E2E Testing:** Add unit, integration, and E2E tests

## 📬 Contact
For questions or feedback, please reach out via:

- **GitHub:** [EvanGks](https://github.com/EvanGks)
- **X (Twitter):** [@Evan6471133782](https://x.com/Evan6471133782)
- **LinkedIn:** [Evangelos Gakias](https://www.linkedin.com/in/evangelos-gakias-346a9072)
- **Kaggle:** [evangelosgakias](https://www.kaggle.com/evangelosgakias)
- **Email:** [evangks88@gmail.com](mailto:evangks88@gmail.com)

---
