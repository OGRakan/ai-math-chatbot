"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlerMiddleware = exports.HTTPException = void 0;
exports.errorHandler = errorHandler;
exports.requestValidationErrorHandler = requestValidationErrorHandler;
exports.notFoundHandler = notFoundHandler;
class HTTPException extends Error {
    constructor(statusCode, detail) {
        super(detail);
        this.statusCode = statusCode;
        this.detail = detail;
        this.name = 'HTTPException';
    }
}
exports.HTTPException = HTTPException;
function errorHandler(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    console.error(`Error ${statusCode}:`, err.message, err.stack);
    res.status(statusCode).json({
        detail: err.message || 'Internal Server Error',
    });
}
function requestValidationErrorHandler(err, req, res, next) {
    if (err.type === 'entity.parse.failed' || err.name === 'ValidationError') {
        res.status(422).json({
            detail: 'Validation error',
            errors: err.errors || [{ msg: err.message }],
        });
        return;
    }
    next(err);
}
function notFoundHandler(req, res) {
    res.status(404).json({
        detail: 'Not found',
    });
}
class ErrorHandlerMiddleware {
    static handler() {
        return (err, req, res, next) => {
            console.error('ErrorHandlerMiddleware caught:', err);
            if (err.name === 'ValidationError') {
                return requestValidationErrorHandler(err, req, res, next);
            }
            return errorHandler(err, req, res, next);
        };
    }
}
exports.ErrorHandlerMiddleware = ErrorHandlerMiddleware;
//# sourceMappingURL=error.js.map