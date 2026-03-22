import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Standard success response
export function sendSuccess<T>(res: Response, statusCode: number, data: T) {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  });
}

// Standard error response
export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  details?: any
) {
  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  });
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let code = 'INTERNAL_ERROR';
  let details = undefined;

  // Prisma errors
  if (err.code === 'P2002') {
    statusCode = 409;
    code = 'DUPLICATE_ENTRY';
    const field = err.meta?.target?.[0] || 'field';
    message = `A user with this ${field} already exists`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Record not found';
  }

  // Express-validator errors
  if (Array.isArray(err.errors)) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.errors.map((e: any) => ({
      field: e.param,
      message: e.msg,
    }));
  }

  // Mongoose errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(', ');
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', err);
    details = details || { stack: err.stack };
  }

  sendError(res, statusCode, message, code, details);
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
}
