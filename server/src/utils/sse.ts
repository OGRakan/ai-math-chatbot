import { Response } from 'express';

export interface SSEMessage {
  event?: string;
  data: any;
  id?: string;
  retry?: number;
}

export class SSEStream {
  private response: Response;
  private closed = false;

  constructor(response: Response) {
    this.response = response;
    this.setupSSE();
  }

  private setupSSE(): void {
    this.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in Nginx
    });

    // Handle client disconnect
    this.response.on('close', () => {
      this.closed = true;
    });
  }

  send(message: SSEMessage): boolean {
    if (this.closed) {
      return false;
    }

    let output = '';

    if (message.event) {
      output += `event: ${message.event}\n`;
    }

    if (message.id) {
      output += `id: ${message.id}\n`;
    }

    if (message.retry) {
      output += `retry: ${message.retry}\n`;
    }

    // Format data - matches Python's JSON formatting
    const dataStr = typeof message.data === 'string' 
      ? message.data 
      : JSON.stringify(message.data);
    
    output += `data: ${dataStr}\n\n`;

    try {
      this.response.write(output);
      return true;
    } catch (error) {
      this.closed = true;
      return false;
    }
  }

  sendText(text: string): boolean {
    return this.send({ data: JSON.stringify({ text }) });
  }

  sendError(error: string): boolean {
    return this.send({ 
      data: JSON.stringify({ 
        error,
        text: 'An error occurred while generating the response.' 
      }) 
    });
  }

  sendDone(): boolean {
    return this.send({ data: '[DONE]' });
  }

  sendKeepAlive(): boolean {
    if (this.closed) {
      return false;
    }

    try {
      this.response.write(': keepalive\n\n');
      return true;
    } catch (error) {
      this.closed = true;
      return false;
    }
  }

  end(): void {
    if (!this.closed) {
      this.response.end();
      this.closed = true;
    }
  }

  isClosed(): boolean {
    return this.closed;
  }
}

// Helper function to create SSE response
export function createSSE(response: Response): SSEStream {
  return new SSEStream(response);
}