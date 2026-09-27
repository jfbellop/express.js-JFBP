import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

// Global error handler — always 4 arguments for Express to recognize it
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Unexpected errors — never expose stack traces to clients
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
