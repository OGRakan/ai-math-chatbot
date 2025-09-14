export interface ChatCreate {
    title?: string;
}
export interface ChatUpdate {
    title: string;
}
export interface MessageCreate {
    role: string;
    content: string;
    fileIds?: string[];
}
export interface Chat {
    id: number;
    title: string;
    create_time: Date;
    messages?: Message[];
}
export interface Message {
    id: number;
    chat_id: number;
    role: string;
    content: string;
    timestamp: Date;
    files?: FileMetadata[];
}
export interface FileMetadata {
    id: string;
    original_filename: string;
    content_type: string;
    size: number;
    processing_method: string;
    gemini_api_file_id?: string | null;
}
export declare function createChat(chat?: ChatCreate): Promise<Chat>;
export declare function getChats(skip?: number, limit?: number): Promise<Chat[]>;
export declare function getChat(chatId: number): Promise<Chat | null>;
export declare function updateChat(chatId: number, chatUpdate: ChatUpdate): Promise<Chat | null>;
export declare function deleteChat(chatId: number): Promise<boolean>;
export declare function createMessage(chatId: number, message: MessageCreate): Promise<Message>;
export declare function getChatMessages(chatId: number): Promise<Message[]>;
export declare function createFileMetadata(data: {
    id: string;
    original_filename: string;
    content_type: string;
    size: number;
    local_disk_path: string;
    processing_method: string;
}): Promise<any>;
export declare function getFileMetadata(fileId: string): Promise<any>;
//# sourceMappingURL=history.d.ts.map