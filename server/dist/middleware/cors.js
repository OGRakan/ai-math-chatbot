"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsMiddleware = void 0;
const cors_1 = __importDefault(require("cors"));
const env_1 = __importDefault(require("../env"));
const allowedOrigins = env_1.default.allowedOrigins === '*'
    ? []
    : env_1.default.allowedOrigins.split(',').map(origin => origin.trim());
exports.corsMiddleware = (0, cors_1.default)({
    origin: env_1.default.allowedOrigins === '*' ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
});
console.log(`CORS allowed origins: ${env_1.default.allowedOrigins}`);
//# sourceMappingURL=cors.js.map