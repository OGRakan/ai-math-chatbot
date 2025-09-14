import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { transcribeAudio } from '../services/whisper';
import { sanitizeFilename, validateFileType } from '../services/pdf';
import settings from '../env';

const router = Router();

// Create audio upload directory
const AUDIO_DIR = path.resolve(settings.audioDir);
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Allowed audio MIME types - EXACT MIRROR
const ALLOWED_AUDIO_TYPES = [
  'audio/wav',
  'audio/mpeg',  // mp3
  'audio/webm',
  'audio/ogg',
  'audio/x-m4a',
];

// Configure multer for audio uploads
const audioStorage = multer.diskStorage({
  destination: AUDIO_DIR,
  filename: (req, file, cb) => {
    const audioId = uuidv4();
    const originalName = sanitizeFilename(file.originalname || 'audio');
    const extension = path.extname(originalName) || '.wav';
    cb(null, `${audioId}${extension}`);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: {
    fileSize: settings.maxAudioSize, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const filename = sanitizeFilename(file.originalname || '');
    
    if (!validateFileType(file.mimetype, ALLOWED_AUDIO_TYPES)) {
      console.warn(`Rejected audio file with unsupported type: ${file.mimetype}`);
      return cb(new Error(`Audio type ${file.mimetype} not supported. Allowed types: ${ALLOWED_AUDIO_TYPES.join(', ')}`));
    }
    
    cb(null, true);
  },
});

// POST /stt - Speech to Text
router.post('/stt', audioUpload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No audio file provided' });
    }

    const audioPath = req.file.path;
    const audioSize = req.file.size;
    const contentType = req.file.mimetype;

    console.log(`Processing audio file for transcription: ${req.file.filename} (${audioSize} bytes)`);

    try {
      // Transcribe audio using Whisper
      const transcription = await transcribeAudio(audioPath, contentType);
      
      // Schedule cleanup of temporary file
      setTimeout(() => {
        cleanupAudioFile(audioPath);
      }, 1000);

      res.json({ text: transcription });

    } catch (error: any) {
      // Cleanup on error
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

  } catch (error: any) {
    console.error('Error in speech-to-text endpoint:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      cleanupAudioFile(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        detail: `Audio file size exceeds the maximum allowed size of ${settings.maxAudioSize / (1024 * 1024)}MB` 
      });
    }
    
    if (error.message.includes('not supported')) {
      return res.status(415).json({ detail: error.message });
    }
    
    res.status(500).json({ detail: `Error processing audio: ${error.message}` });
  }
});

function cleanupAudioFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Cleaned up temporary audio file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up audio file ${filePath}:`, error);
  }
}

export default router;