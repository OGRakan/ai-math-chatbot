"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        detail: 'Too many requests from this IP, please try again later.',
    },
    handler: (req, res) => {
        res.status(429).json({
            detail: 'Too many requests from this IP, please try again later.',
        });
    },
});
//# sourceMappingURL=rate-limiter.js.map