"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const whisper_1 = require("../services/whisper");
const pdf_1 = require("../services/pdf");
const env_1 = __importDefault(require("../env"));
const router = (0, express_1.Router)();
const AUDIO_DIR = path_1.default.resolve(env_1.default.audioDir);
if (!fs_1.default.existsSync(AUDIO_DIR)) {
    fs_1.default.mkdirSync(AUDIO_DIR, { recursive: true });
}
const ALLOWED_AUDIO_TYPES = [
    'audio/wav',
    'audio/mpeg',
    'audio/webm',
    'audio/ogg',
    'audio/x-m4a',
];
const audioStorage = multer_1.default.diskStorage({
    destination: AUDIO_DIR,
    filename: (req, file, cb) => {
        const audioId = (0, uuid_1.v4)();
        const originalName = (0, pdf_1.sanitizeFilename)(file.originalname || 'audio');
        const extension = path_1.default.extname(originalName) || '.wav';
        cb(null, `${audioId}${extension}`);
    },
});
const audioUpload = (0, multer_1.default)({
    storage: audioStorage,
    limits: {
        fileSize: env_1.default.maxAudioSize,
    },
    fileFilter: (req, file, cb) => {
        const filename = (0, pdf_1.sanitizeFilename)(file.originalname || '');
        if (!(0, pdf_1.validateFileType)(file.mimetype, ALLOWED_AUDIO_TYPES)) {
            console.warn(`Rejected audio file with unsupported type: ${file.mimetype}`);
            return cb(new Error(`Audio type ${file.mimetype} not supported. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`));
        }
        cb(null, true);
    },
});
router.post('/stt', audioUpload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: 'No audio file provided' });
        }
        const audioPath = req.file.path;
        const audioSize = req.file.size;
        const contentType = req.file.mimetype;
        console.log(`Processing audio file for transcription: ${req.file.filename} (${audioSize} bytes)`);
        try {
            const transcription = await (0, whisper_1.transcribeAudio)(audioPath, contentType);
            setTimeout(() => {
                cleanupAudioFile(audioPath);
            }, 1000);
            res.json({ text: transcription });
        }
        catch (error) {
            cleanupAudioFile(audioPath);
            if (error instanceof Error && error.message.includes('API key not configured')) {
                return res.status(500).json({ detail: error.message });
            }
            if (error instanceof Error && error.message.includes('connecting to Whisper API')) {
                return res.status(503).json({ detail: error.message });
            }
            console.error('Error processing audio:', error);
            res.status(500).json({ detail: `Error processing audio: ${error.message}` });
        }
    }
    catch (error) {
        console.error('Error in speech-to-text endpoint:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            cleanupAudioFile(req.file.path);
        }
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                detail: `Audio file size exceeds the maximum allowed size of ${env_1.default.maxAudioSize / (1024 * 1024)}MB`
            });
        }
        if (error.message.includes('not supported')) {
            return res.status(415).json({ detail: error.message });
        }
        res.status(500).json({ detail: `Error processing audio: ${error.message}` });
    }
});
function cleanupAudioFile(filePath) {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
            console.log(`Cleaned up temporary audio file: ${filePath}`);
        }
    }
    catch (error) {
        console.error(`Error cleaning up audio file ${filePath}:`, error);
    }
}
exports.default = router;
//# sourceMappingURL=speech.js.map