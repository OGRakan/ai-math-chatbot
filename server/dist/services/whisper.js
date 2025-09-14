"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcribeAudio = transcribeAudio;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const error_1 = require("../middleware/error");
const env_1 = __importDefault(require("../env"));
async function transcribeAudio(audioPath, contentType) {
    const whisperApiKey = env_1.default.whisperApiKey;
    if (!whisperApiKey) {
        throw new error_1.HTTPException(500, 'Whisper API key not configured');
    }
    try {
        console.log(`Processing audio file for transcription: ${audioPath}`);
        const audioData = fs_1.default.readFileSync(audioPath);
        const response = await axios_1.default.post(env_1.default.huggingfaceWhisperEndpoint, audioData, {
            headers: {
                'Authorization': `Bearer ${whisperApiKey}`,
                'Content-Type': contentType,
            },
            timeout: 30000,
        });
        if (response.status !== 200) {
            const errorDetail = response.data?.error || 'Unknown error';
            console.error('Whisper API error:', errorDetail);
            throw new error_1.HTTPException(500, `Whisper API error: ${errorDetail}`);
        }
        const transcription = response.data?.text || '';
        console.log(`Successfully transcribed audio (${transcription.length} characters)`);
        return transcription;
    }
    catch (error) {
        if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
            console.error('Network error connecting to Whisper API:', error.message);
            throw new error_1.HTTPException(503, `Error connecting to Whisper API: ${error.message}`);
        }
        console.error('Error processing audio:', error.message);
        throw new error_1.HTTPException(500, `Error processing audio: ${error.message}`);
    }
}
//# sourceMappingURL=whisper.js.map