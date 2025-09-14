import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    details?: any;
}
export declare class HTTPException extends Error {
    statusCode: number;
    detail: string;
    constructor(statusCode: number, detail: string);
}
export declare function errorHandler(err: AppError, req: Request, res: Response, next: NextFunction): void;
export declare function requestValidationErrorHandler(err: any, req: Request, res: Response, next: NextFunction): void;
export declare function notFoundHandler(req: Request, res: Response): void;
export declare class ErrorHandlerMiddleware {
    static handler(): (err: AppError, req: Request, res: Response, next: NextFunction) => void;
}
//# sourceMappingURL=error.d.ts.map