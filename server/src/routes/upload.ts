import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeFilename, getMimeTypeFromExtension, validateFileType, extractTextFromDocx } from '../services/pdf';
import { HTTPException } from '../middleware/error';
import * as historyService from '../services/history';
import settings from '../env';

const router = Router();

// Define allowed file types and size limits - EXACT MIRROR
const ALLOWED_MIME_TYPES = [
  'text/plain',                      // .txt
  'application/pdf',                 // .pdf
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',  // .docx
  'image/jpeg',                      // .jpg, .jpeg
  'image/png',                       // .png
  'image/gif',                       // .gif
  'image/webp',                      // .webp
  'image/heic',                      // .heic
  'image/heif',                      // .heif
];

// Extension to MIME mapping for special cases
const EXTENSION_TO_MIME: Record<string, string> = {
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const MAX_INLINE_SIZE = settings.maxFileSize;  // 20MB for inline processing
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;  // 2GB - maximum for Gemini Files API

// Create upload directory
const UPLOAD_DIR = path.resolve(settings.uploadDir);
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const originalExtension = path.extname(file.originalname || '').toLowerCase();
    
    // Determine content type
    let contentType = file.mimetype;
    if (originalExtension in EXTENSION_TO_MIME) {
      contentType = EXTENSION_TO_MIME[originalExtension];
    }
    
    const storageExtension = getExtensionFromMimeType(contentType) || originalExtension || '';
    const filename = `${fileId}${storageExtension}`;
    
    // Store additional info in request for later use
    (req as any).fileId = fileId;
    (req as any).contentType = contentType;
    
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const originalFilename = sanitizeFilename(file.originalname || '');
    if (!originalFilename) {
      return cb(new Error('Invalid filename'));
    }
    
    const fileExtension = path.extname(originalFilename).toLowerCase();
    let contentType = file.mimetype;
    if (fileExtension in EXTENSION_TO_MIME) {
      contentType = EXTENSION_TO_MIME[fileExtension];
    }
    
    if (!contentType || !validateFileType(contentType, ALLOWED_MIME_TYPES)) {
      return cb(new Error(`File type ${contentType || 'unknown'} not supported.`));
    }
    
    cb(null, true);
  },
});

// POST /files/upload - Upload file and store metadata
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file provided' });
    }

    const fileId = (req as any).fileId;
    const contentType = (req as any).contentType;
    const originalFilename = sanitizeFilename(req.file.originalname || '');
    const filePath = req.file.path;
    const fileSize = req.file.size;

    // Validate text files
    if (contentType === 'text/plain') {
      try {
        fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ detail: `Invalid text file: ${error}` });
      }
    }

    // Validate DOCX files
    if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        const textContent = await extractTextFromDocx(filePath);
        if (!textContent || textContent.startsWith('[Error')) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ detail: 'Invalid/corrupt DOCX' });
        }
      } catch (error) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ detail: `Error processing DOCX: ${error}` });
      }
    }

    // Determine processing method
    const processingMethod = fileSize <= MAX_INLINE_SIZE ? 'inline' : 'files_api';

    // Save metadata to database
    const dbFileMetadata = await historyService.createFileMetadata({
      id: fileId,
      original_filename: originalFilename,
      content_type: contentType,
      size: fileSize,
      local_disk_path: filePath,
      processing_method: processingMethod,
    });

    console.log(`File metadata saved: ${originalFilename} (ID: ${fileId}, Size: ${fileSize}, Type: ${contentType}, Method: ${processingMethod})`);

    res.status(201).json({
      file_id: dbFileMetadata.id,
      filename: dbFileMetadata.original_filename,
      content_type: dbFileMetadata.content_type,
      size: dbFileMetadata.size,
      processing_method: dbFileMetadata.processing_method,
    });

  } catch (error: any) {
    console.error('Error uploading file:', error);
    
    // Clean up file if it was uploaded
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        detail: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB` 
      });
    }
    
    if (error.message.includes('not supported')) {
      return res.status(415).json({ detail: error.message });
    }
    
    res.status(500).json({ detail: `Could not save file: ${error.message}` });
  }
});

// GET /files/{file_id}/info - Get file metadata
router.get('/:file_id/info', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.file_id;
    
    const fileMetadata = await historyService.getFileMetadata(fileId);
    if (!fileMetadata) {
      return res.status(404).json({ detail: 'File metadata not found' });
    }
    
    res.json({
      id: fileMetadata.id,
      original_filename: fileMetadata.original_filename,
      content_type: fileMetadata.content_type,
      size: fileMetadata.size,
      processing_method: fileMetadata.processing_method,
      gemini_api_file_id: fileMetadata.gemini_api_file_id,
    });
    
  } catch (error: any) {
    console.error('Error fetching file metadata:', error);
    res.status(500).json({ detail: `Error fetching file metadata: ${error.message}` });
  }
});

// POST /files/process-file/{file_id} - Process file for chat usage
router.post('/process-file/:file_id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.file_id;
    
    const fileMetadata = await historyService.getFileMetadata(fileId);
    if (!fileMetadata) {
      return res.status(404).json({ detail: `File with ID ${fileId} not found` });
    }
    
    const filePath = fileMetadata.local_disk_path;
    const fileSize = fileMetadata.size;
    const contentType = fileMetadata.content_type;
    const filename = path.basename(filePath);
    
    const processingMethod = fileSize <= MAX_INLINE_SIZE ? 'inline' : 'files_api';
    
    // Process the file based on its type
    const processingResult: any = {
      file_id: fileId,
      filename,
      content_type: contentType,
      size: fileSize,
      path: filePath,
      processing_type: 'unknown',
      processing_method: processingMethod,
    };
    
    try {
      // For text files
      if (contentType === 'text/plain' || path.extname(filePath) === '.txt') {
        const textContent = fs.readFileSync(filePath, 'utf-8');
        const charCount = textContent.length;
        processingResult.processing_type = 'text_extraction';
        processingResult.char_count = charCount;
        processingResult.preview = textContent.length > 200 
          ? textContent.substring(0, 200) + '...'
          : textContent;
      }
      
      // For DOCX files
      else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               path.extname(filePath) === '.docx') {
        const textContent = await extractTextFromDocx(filePath);
        const charCount = textContent.length;
        processingResult.processing_type = 'docx_extraction';
        processingResult.char_count = charCount;
        processingResult.preview = textContent.length > 200 
          ? textContent.substring(0, 200) + '...'
          : textContent;
      }
      
      // For PDF and image files
      else if (contentType.startsWith('image/') || contentType === 'application/pdf') {
        if (processingMethod === 'inline') {
          processingResult.processing_type = 'binary_inline';
          processingResult.preview = `[Binary ${contentType} file - will be processed directly by Gemini API]`;
        } else {
          processingResult.processing_type = 'binary_files_api';
          processingResult.preview = `[Large ${contentType} file (${(fileSize / (1024 * 1024)).toFixed(1)} MB) - will be processed using Gemini Files API]`;
        }
      }
      
      // For unsupported file types
      else {
        processingResult.processing_type = 'unsupported';
        processingResult.preview = `[Unsupported file type: ${contentType}]`;
      }
      
    } catch (error: any) {
      console.error(`Error processing file ${filePath}:`, error);
      processingResult.processing_type = 'error';
      processingResult.error = error.message;
      processingResult.filename = filename;
      processingResult.content_type = contentType;
      processingResult.size = fileSize;
      processingResult.processing_method = processingMethod;
    }
    
    res.json(processingResult);
    
  } catch (error: any) {
    console.error('Error processing file for chat:', error);
    res.status(500).json({ detail: `Error processing file: ${error.message}` });
  }
});

function getExtensionFromMimeType(mimeType: string): string | null {
  const extensions: Record<string, string> = {
    'text/plain': '.txt',
    'application/pdf': '.pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
  };
  
  return extensions[mimeType] || null;
}

export default router;