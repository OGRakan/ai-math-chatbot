import { Response } from 'express';
export interface SSEMessage {
    event?: string;
    data: any;
    id?: string;
    retry?: number;
}
export declare class SSEStream {
    private response;
    private closed;
    constructor(response: Response);
    private setupSSE;
    send(message: SSEMessage): boolean;
    sendText(text: string): boolean;
    sendError(error: string): boolean;
    sendDone(): boolean;
    sendKeepAlive(): boolean;
    end(): void;
    isClosed(): boolean;
}
export declare function createSSE(response: Response): SSEStream;
//# sourceMappingURL=sse.d.ts.map