import dotenv from 'dotenv';

dotenv.config();

interface Settings {
  // Database Configuration
  databaseUrl: string;

  // API Keys
  geminiApiKey: string;
  huggingfaceApiToken: string;
  whisperApiKey: string;

  // API Endpoints
  huggingfaceWhisperEndpoint: string;

  // Model Configuration
  geminiModelName: string;

  // File Upload Settings
  uploadDir: string;
  maxFileSize: number;

  // Audio Upload Settings
  audioDir: string;
  maxAudioSize: number;

  // Server Settings
  allowedOrigins: string;
  port: number;
}

function parseIntEnv(varName: string, defaultValue: number): number {
  const value = process.env[varName] || defaultValue.toString();
  // Remove comments and strip whitespace
  const cleanValue = value.split('#')[0].trim();
  return parseInt(cleanValue, 10);
}

function getSettings(): Settings {
  return {
    // Database Configuration
    databaseUrl: process.env.DATABASE_URL || 'file:../aichatbot.db',

    // API Keys
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    huggingfaceApiToken: process.env.HUGGINGFACE_API_TOKEN || '',
    whisperApiKey: process.env.HUGGINGFACE_API_TOKEN || '',

    // API Endpoints
    huggingfaceWhisperEndpoint: 'https://api-inference.huggingface.co/models/openai/whisper-large-v3',

    // Model Configuration
    geminiModelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-preview-04-17',

    // File Upload Settings
    uploadDir: process.env.UPLOAD_DIR || '/tmp/ai-math-chatbot-uploads',
    maxFileSize: parseIntEnv('MAX_FILE_SIZE', 20 * 1024 * 1024), // 20MB default

    // Audio Upload Settings
    audioDir: process.env.AUDIO_DIR || '/tmp/ai-math-chatbot-audio',
    maxAudioSize: parseIntEnv('MAX_AUDIO_SIZE', 10 * 1024 * 1024), // 10MB default

    // Server Settings
    allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
    port: parseIntEnv('PORT', 8000),
  };
}

const settings = getSettings();

// Get API Keys from environment variables for backward compatibility
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;

// Define the Hugging Face Inference API endpoint for Whisper
export const HUGGINGFACE_WHISPER_ENDPOINT = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';

// Basic validation
if (!GEMINI_API_KEY) {
  console.warn('Warning: GEMINI_API_KEY environment variable not set.');
}
if (!HUGGINGFACE_API_TOKEN) {
  console.warn('Warning: HUGGINGFACE_API_TOKEN environment variable not set. Whisper functionality will be disabled.');
}

export default settings;
export { getSettings };