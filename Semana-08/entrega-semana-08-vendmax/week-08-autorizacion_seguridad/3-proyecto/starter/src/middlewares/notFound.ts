import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import { AppError } from '../errors/AppError.js';

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError(404, 'Route not found'));
=======

export function notFound(_req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({ error: 'Ruta no encontrada' });
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}
