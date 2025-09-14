"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = require("./middleware/cors");
const rate_limiter_1 = require("./middleware/rate-limiter");
const error_1 = require("./middleware/error");
const env_1 = __importDefault(require("./env"));
const chat_1 = __importDefault(require("./routes/chat"));
const upload_1 = __importDefault(require("./routes/upload"));
const speech_1 = __importDefault(require("./routes/speech"));
const streaming_1 = __importDefault(require("./routes/streaming"));
console.log('AI Math Chatbot Node.js Server');
console.log('Checking database connection...');
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use(rate_limiter_1.rateLimiter);
app.use(cors_1.corsMiddleware);
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the AI Math Chatbot API',
    });
});
app.use('/chats', chat_1.default);
app.use('/chats', streaming_1.default);
app.use('/files', upload_1.default);
app.use('', speech_1.default);
app.use(error_1.notFoundHandler);
app.use(error_1.ErrorHandlerMiddleware.handler());
const PORT = env_1.default.port;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}`);
    console.log(`CORS origins: ${env_1.default.allowedOrigins}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map