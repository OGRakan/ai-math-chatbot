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
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const pdf_1 = require("../services/pdf");
const historyService = __importStar(require("../services/history"));
const env_1 = __importDefault(require("../env"));
const router = (0, express_1.Router)();
const ALLOWED_MIME_TYPES = [
    'text/plain',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
];
const EXTENSION_TO_MIME = {
    '.heic': 'image/heic',
    '.heif': 'image/heif',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
const MAX_INLINE_SIZE = env_1.default.maxFileSize;
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
const UPLOAD_DIR = path_1.default.resolve(env_1.default.uploadDir);
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
        const fileId = (0, uuid_1.v4)();
        const originalExtension = path_1.default.extname(file.originalname || '').toLowerCase();
        let contentType = file.mimetype;
        if (originalExtension in EXTENSION_TO_MIME) {
            contentType = EXTENSION_TO_MIME[originalExtension];
        }
        const storageExtension = getExtensionFromMimeType(contentType) || originalExtension || '';
        const filename = `${fileId}${storageExtension}`;
        req.fileId = fileId;
        req.contentType = contentType;
        cb(null, filename);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        const originalFilename = (0, pdf_1.sanitizeFilename)(file.originalname || '');
        if (!originalFilename) {
            return cb(new Error('Invalid filename'));
        }
        const fileExtension = path_1.default.extname(originalFilename).toLowerCase();
        let contentType = file.mimetype;
        if (fileExtension in EXTENSION_TO_MIME) {
            contentType = EXTENSION_TO_MIME[fileExtension];
        }
        if (!contentType || !(0, pdf_1.validateFileType)(contentType, ALLOWED_MIME_TYPES)) {
            return cb(new Error(`File type ${contentType || 'unknown'} not supported.`));
        }
        cb(null, true);
    },
});
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ detail: 'No file provided' });
        }
        const fileId = req.fileId;
        const contentType = req.contentType;
        const originalFilename = (0, pdf_1.sanitizeFilename)(req.file.originalname || '');
        const filePath = req.file.path;
        const fileSize = req.file.size;
        if (contentType === 'text/plain') {
            try {
                fs_1.default.readFileSync(filePath, 'utf-8');
            }
            catch (error) {
                fs_1.default.unlinkSync(filePath);
                return res.status(400).json({ detail: `Invalid text file: ${error}` });
            }
        }
        if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            try {
                const textContent = await (0, pdf_1.extractTextFromDocx)(filePath);
                if (!textContent || textContent.startsWith('[Error')) {
                    fs_1.default.unlinkSync(filePath);
                    return res.status(400).json({ detail: 'Invalid/corrupt DOCX' });
                }
            }
            catch (error) {
                fs_1.default.unlinkSync(filePath);
                return res.status(400).json({ detail: `Error processing DOCX: ${error}` });
            }
        }
        const processingMethod = fileSize <= MAX_INLINE_SIZE ? 'inline' : 'files_api';
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
    }
    catch (error) {
        console.error('Error uploading file:', error);
        if (req.file && fs_1.default.existsSync(req.file.path)) {
            fs_1.default.unlinkSync(req.file.path);
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
router.get('/:file_id/info', async (req, res) => {
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
    }
    catch (error) {
        console.error('Error fetching file metadata:', error);
        res.status(500).json({ detail: `Error fetching file metadata: ${error.message}` });
    }
});
router.post('/process-file/:file_id', async (req, res) => {
    try {
        const fileId = req.params.file_id;
        const fileMetadata = await historyService.getFileMetadata(fileId);
        if (!fileMetadata) {
            return res.status(404).json({ detail: `File with ID ${fileId} not found` });
        }
        const filePath = fileMetadata.local_disk_path;
        const fileSize = fileMetadata.size;
        const contentType = fileMetadata.content_type;
        const filename = path_1.default.basename(filePath);
        const processingMethod = fileSize <= MAX_INLINE_SIZE ? 'inline' : 'files_api';
        const processingResult = {
            file_id: fileId,
            filename,
            content_type: contentType,
            size: fileSize,
            path: filePath,
            processing_type: 'unknown',
            processing_method: processingMethod,
        };
        try {
            if (contentType === 'text/plain' || path_1.default.extname(filePath) === '.txt') {
                const textContent = fs_1.default.readFileSync(filePath, 'utf-8');
                const charCount = textContent.length;
                processingResult.processing_type = 'text_extraction';
                processingResult.char_count = charCount;
                processingResult.preview = textContent.length > 200
                    ? textContent.substring(0, 200) + '...'
                    : textContent;
            }
            else if (contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                path_1.default.extname(filePath) === '.docx') {
                const textContent = await (0, pdf_1.extractTextFromDocx)(filePath);
                const charCount = textContent.length;
                processingResult.processing_type = 'docx_extraction';
                processingResult.char_count = charCount;
                processingResult.preview = textContent.length > 200
                    ? textContent.substring(0, 200) + '...'
                    : textContent;
            }
            else if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                if (processingMethod === 'inline') {
                    processingResult.processing_type = 'binary_inline';
                    processingResult.preview = `[Binary ${contentType} file - will be processed directly by Gemini API]`;
                }
                else {
                    processingResult.processing_type = 'binary_files_api';
                    processingResult.preview = `[Large ${contentType} file (${(fileSize / (1024 * 1024)).toFixed(1)} MB) - will be processed using Gemini Files API]`;
                }
            }
            else {
                processingResult.processing_type = 'unsupported';
                processingResult.preview = `[Unsupported file type: ${contentType}]`;
            }
        }
        catch (error) {
            console.error(`Error processing file ${filePath}:`, error);
            processingResult.processing_type = 'error';
            processingResult.error = error.message;
            processingResult.filename = filename;
            processingResult.content_type = contentType;
            processingResult.size = fileSize;
            processingResult.processing_method = processingMethod;
        }
        res.json(processingResult);
    }
    catch (error) {
        console.error('Error processing file for chat:', error);
        res.status(500).json({ detail: `Error processing file: ${error.message}` });
    }
});
function getExtensionFromMimeType(mimeType) {
    const extensions = {
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
exports.default = router;
//# sourceMappingURL=upload.js.map