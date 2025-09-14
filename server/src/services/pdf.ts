import fs from 'fs';
import path from 'path';

export async function extractTextFromPdf(filePath: string): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`Failed to extract text from PDF: ${error}`);
  }
}

export async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`Failed to extract text from DOCX: ${error}`);
  }
}

export async function extractTextFromImage(filePath: string): Promise<string> {
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker();
    
    const { data: { text } } = await worker.recognize(filePath);
    await worker.terminate();
    
    return text;
  } catch (error) {
    console.error('Error extracting text from image using OCR:', error);
    throw new Error(`Failed to extract text from image: ${error}`);
  }
}

export function validateFileType(contentType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(contentType);
}

export function sanitizeFilename(filename: string): string {
  if (!filename) return '';
  
  // Remove dangerous characters and keep only safe ones
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

export function getMimeTypeFromExtension(extension: string): string | null {
  const mimeTypes: Record<string, string> = {
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