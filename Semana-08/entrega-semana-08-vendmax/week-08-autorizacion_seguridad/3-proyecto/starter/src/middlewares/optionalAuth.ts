import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';

// ============================================================================
// optionalAuth — autenticación OPCIONAL para rutas públicas
// ============================================================================
// El catálogo de máquinas es público: cualquiera puede consultar dónde hay una
// máquina y si está operativa. Pero si quien pregunta SÍ trae un token válido,
// queremos saber quién es para enseñarle más campos (el recaudo, por ejemplo).
//
// Diferencia con authMiddleware:
//   authMiddleware  → sin token válido corta con 401.
//   optionalAuth    → sin token sigue adelante como anónimo (req.user vacío).
//
// Un token inválido o caducado NO bloquea la ruta pública: se atiende como
// anónimo. Así una sesión expirada no rompe la navegación del catálogo.
// ============================================================================

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    req.user = verifyAccessToken(authHeader.split(' ')[1] as string);
  } catch {
    // Token ilegible o expirado → se continúa como visitante anónimo
  }

  next();
}
