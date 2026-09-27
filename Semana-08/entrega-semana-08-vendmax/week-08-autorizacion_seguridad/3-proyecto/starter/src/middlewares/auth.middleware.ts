import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../errors/AppError.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Authorization header missing or malformed'));
  }

  const token = authHeader.split(' ')[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token'));
=======
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken as string | undefined;

  if (!token) {
    return next(new AppError(401, 'No autenticado — token no encontrado'));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch {
    next(new AppError(401, 'Token inválido o expirado'));
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  }
}
