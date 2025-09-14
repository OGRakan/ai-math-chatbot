"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPdf = extractTextFromPdf;
exports.extractTextFromDocx = extractTextFromDocx;
exports.extractTextFromImage = extractTextFromImage;
exports.validateFileType = validateFileType;
exports.sanitizeFilename = sanitizeFilename;
exports.getMimeTypeFromExtension = getMimeTypeFromExtension;
const fs_1 = __importDefault(require("fs"));
async function extractTextFromPdf(filePath) {
    try {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs_1.default.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        return data.text;
    }
    catch (error) {
        console.error('Error extracting text from PDF:', error);
        throw new Error(`Failed to extract text from PDF: ${error}`);
    }
}
async function extractTextFromDocx(filePath) {
    try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
    }
    catch (error) {
        console.error('Error extracting text from DOCX:', error);
        throw new Error(`Failed to extract text from DOCX: ${error}`);
    }
}
async function extractTextFromImage(filePath) {
    try {
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker();
        const { data: { text } } = await worker.recognize(filePath);
        await worker.terminate();
        return text;
    }
    catch (error) {
        console.error('Error extracting text from image using OCR:', error);
        throw new Error(`Failed to extract text from image: ${error}`);
    }
}
function validateFileType(contentType, allowedTypes) {
    return allowedTypes.includes(contentType);
}
function sanitizeFilename(filename) {
    if (!filename)
        return '';
    return filename
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
        .replace(/^\.+/, '')
        .substring(0, 255);
}
function getMimeTypeFromExtension(extension) {
    const mimeTypes = {
        '.txt': 'text/plain',
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.heic': 'image/heic',
        '.heif': 'image/heif',
    };
    return mimeTypes[extension.toLowerCase()] || null;
}
//# sourceMappingURL=pdf.js.map