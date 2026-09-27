import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

// ============================================
// PASO 1 — requireRole: la capa de AUTORIZACIÓN
// ============================================
//
// Higher-order function: recibe la lista de roles permitidos y devuelve
// el middleware que Express ejecutará en cada request.
//
//   router.use(authMiddleware);          // ¿quién eres?   → autenticación
//   router.use(requireRole('admin'));    // ¿puedes hacerlo? → autorización
//
// Reglas:
//   - SIEMPRE se ejecuta DESPUÉS de authMiddleware (necesita req.user).
//   - Sin req.user            → 401 (no autenticado).
//   - Con req.user pero rol no permitido → 403 (autenticado, sin permiso).
//
// La diferencia 401/403 no es cosmética: 401 le dice al cliente
// "identifícate o renueva tu token"; 403 le dice "ya sé quién eres y
// aun así no puedes". Un 403 nunca se arregla reintentando el login.
// ============================================

export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!roles.includes(req.user.role as string)) {
      return next(new AppError(403, `Access denied. Required roles: ${roles.join(', ')}`));
    }

    next();
  };
}
