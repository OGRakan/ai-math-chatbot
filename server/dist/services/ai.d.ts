import { GoogleGenerativeAI, GenerativeModel, Part } from '@google/generative-ai';
declare let genAI: GoogleGenerativeAI | null;
declare let model: GenerativeModel | null;
export interface FileProcessingResult {
    part?: Part;
    error?: string;
}
export declare function processFileForGemini(filePath: string): Promise<FileProcessingResult>;
export interface ChatHistoryItem {
    role: 'user' | 'model';
    parts: Part[];
}
export declare function buildChatHistory(chatId: string): Promise<ChatHistoryItem[]>;
export declare function generateAIResponse(chatId: string, userMessageContent: string, fileIds?: string[]): Promise<string>;
export { model, genAI };
//# sourceMappingURL=ai.d.ts.map