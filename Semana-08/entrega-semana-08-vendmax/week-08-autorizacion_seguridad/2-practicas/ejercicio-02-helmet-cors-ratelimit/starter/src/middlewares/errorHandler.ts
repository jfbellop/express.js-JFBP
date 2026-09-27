import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

// ============================================================================
// MANEJADOR GLOBAL DE ERRORES
// ============================================================================
// Regla de oro de la semana 08: el cliente nunca ve stack traces ni detalles
// internos (penalización de la rúbrica). Lo conocido se traduce a un status
// correcto; lo desconocido cae en un 500 genérico y se registra en servidor.
// ============================================================================

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // 1. Errores de negocio que lanzamos nosotros
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // 2. Validación Zod → 400 con el detalle de los campos
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.flatten() });
    return;
  }

  // 3. Origen bloqueado por la whitelist de CORS.
  //    Sin esto el rechazo saldría como 500 "Internal server error", que
  //    confunde: no es un fallo del servidor sino una política aplicada.
  if (err.message?.startsWith('CORS blocked')) {
    res.status(403).json({ error: 'CORS: origin not allowed' });
    return;
  }

  // 4. Lo inesperado: se registra completo en el servidor...
  console.error(err);
  // ...y al cliente solo le llega un mensaje genérico, sin stack.
  res.status(500).json({ error: 'Internal server error' });
}
