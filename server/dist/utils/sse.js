"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEStream = void 0;
exports.createSSE = createSSE;
class SSEStream {
    constructor(response) {
        this.closed = false;
        this.response = response;
        this.setupSSE();
    }
    setupSSE() {
        this.response.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        this.response.on('close', () => {
            this.closed = true;
        });
    }
    send(message) {
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
        const dataStr = typeof message.data === 'string'
            ? message.data
            : JSON.stringify(message.data);
        output += `data: ${dataStr}\n\n`;
        try {
            this.response.write(output);
            return true;
        }
        catch (error) {
            this.closed = true;
            return false;
        }
    }
    sendText(text) {
        return this.send({ data: JSON.stringify({ text }) });
    }
    sendError(error) {
        return this.send({
            data: JSON.stringify({
                error,
                text: 'An error occurred while generating the response.'
            })
        });
    }
    sendDone() {
        return this.send({ data: '[DONE]' });
    }
    sendKeepAlive() {
        if (this.closed) {
            return false;
        }
        try {
            this.response.write(': keepalive\n\n');
            return true;
        }
        catch (error) {
            this.closed = true;
            return false;
        }
    }
    end() {
        if (!this.closed) {
            this.response.end();
            this.closed = true;
        }
    }
    isClosed() {
        return this.closed;
    }
}
exports.SSEStream = SSEStream;
function createSSE(response) {
    return new SSEStream(response);
}
//# sourceMappingURL=sse.js.map