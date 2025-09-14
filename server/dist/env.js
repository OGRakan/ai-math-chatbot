"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HUGGINGFACE_WHISPER_ENDPOINT = exports.HUGGINGFACE_API_TOKEN = exports.GEMINI_API_KEY = void 0;
exports.getSettings = getSettings;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function parseIntEnv(varName, defaultValue) {
    const value = process.env[varName] || defaultValue.toString();
    const cleanValue = value.split('#')[0].trim();
    return parseInt(cleanValue, 10);
}
function getSettings() {
    return {
        databaseUrl: process.env.DATABASE_URL || 'file:../aichatbot.db',
        geminiApiKey: process.env.GEMINI_API_KEY || '',
        huggingfaceApiToken: process.env.HUGGINGFACE_API_TOKEN || '',
        whisperApiKey: process.env.HUGGINGFACE_API_TOKEN || '',
        huggingfaceWhisperEndpoint: 'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
        geminiModelName: process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash-preview-04-17',
        uploadDir: process.env.UPLOAD_DIR || '/tmp/ai-math-chatbot-uploads',
        maxFileSize: parseIntEnv('MAX_FILE_SIZE', 20 * 1024 * 1024),
        audioDir: process.env.AUDIO_DIR || '/tmp/ai-math-chatbot-audio',
        maxAudioSize: parseIntEnv('MAX_AUDIO_SIZE', 10 * 1024 * 1024),
        allowedOrigins: process.env.ALLOWED_ORIGINS || '*',
        port: parseIntEnv('PORT', 8000),
    };
}
const settings = getSettings();
exports.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
exports.HUGGINGFACE_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
exports.HUGGINGFACE_WHISPER_ENDPOINT = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
if (!exports.GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY environment variable not set.');
}
if (!exports.HUGGINGFACE_API_TOKEN) {
    console.warn('Warning: HUGGINGFACE_API_TOKEN environment variable not set. Whisper functionality will be disabled.');
}
exports.default = settings;
//# sourceMappingURL=env.js.map