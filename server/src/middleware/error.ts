import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  details?: any;
}

export class HTTPException extends Error {
  statusCode: number;
  detail: string;

  constructor(statusCode: number, detail: string) {
    super(detail);
    this.statusCode = statusCode;
    this.detail = detail;
    this.name = 'HTTPException';
  }
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  
  console.error(`Error ${statusCode}:`, err.message, err.stack);

  // Mirror Python FastAPI error response format
  res.status(statusCode).json({
    detail: err.message || 'Internal Server Error',
  });
}

export function requestValidationErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err.type === 'entity.parse.failed' || err.name === 'ValidationError') {
    res.status(422).json({
      detail: 'Validation error',
      errors: err.errors || [{ msg: err.message }],
    });
    return;
  }
  next(err);
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    detail: 'Not found',
  });
}

export class ErrorHandlerMiddleware {
  static handler() {
    return (err: AppError, req: Request, res: Response, next: NextFunction) => {
      console.error('ErrorHandlerMiddleware caught:', err);
      
      // Handle specific error types
      if (err.name === 'ValidationError') {
        return requestValidationErrorHandler(err, req, res, next);
      }
      
      return errorHandler(err, req, res, next);
    };
  }
}