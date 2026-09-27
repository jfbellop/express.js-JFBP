// ============================================
// PASO 4 ✅ — Middleware de Autenticación
// ============================================
//
// Lee el access token de la cookie HttpOnly y lo verifica.
// Si el token es válido, agrega el payload a req.user.

import { Request, Response, NextFunction } from 'express';
import { TokenExpiredError } from 'jsonwebtoken';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';

export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // 1. El token viaja en una cookie HttpOnly (no en localStorage → inmune a XSS)
  const token = req.cookies?.accessToken as string | undefined;

  // 2. Sin cookie → 401 No autenticado
  if (!token) {
    next(new AppError(401, 'No autenticado'));
    return;
  }

  // 3. Verificar firma + expiración
  try {
    const decoded = verifyAccessToken(token);
    // 4. Inyectar el payload en la request para los siguientes middlewares
    req.user = decoded;
    next();
  } catch (err) {
    // jwt.verify lanza TokenExpiredError si `exp` ya pasó
    if (err instanceof TokenExpiredError) {
      next(new AppError(401, 'Token expirado'));
      return;
    }
    next(new AppError(401, 'Token inválido'));
  }
}
