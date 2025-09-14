export declare function extractTextFromPdf(filePath: string): Promise<string>;
export declare function extractTextFromDocx(filePath: string): Promise<string>;
export declare function extractTextFromImage(filePath: string): Promise<string>;
export declare function validateFileType(contentType: string, allowedTypes: string[]): boolean;
export declare function sanitizeFilename(filename: string): string;
export declare function getMimeTypeFromExtension(extension: string): string | null;
//# sourceMappingURL=pdf.d.ts.map