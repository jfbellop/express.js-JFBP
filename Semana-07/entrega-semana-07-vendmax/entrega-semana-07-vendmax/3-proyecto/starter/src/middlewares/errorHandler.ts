import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';

// ============================================
// MANEJADOR GLOBAL DE ERRORES
// ============================================
// Regla de oro: el cliente nunca ve stack traces ni detalles internos.
// Cada tipo de error conocido se traduce a un status HTTP correcto;
// lo desconocido cae en un 500 genérico (y se registra en el servidor).
// ============================================

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Errores de negocio esperados (los que lanzamos nosotros)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // 2. Validación Zod que escapó de un controlador con .parse()
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', details: err.flatten() });
    return;
  }

  // 3. Validación del schema de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: Object.fromEntries(
        Object.entries(err.errors).map(([field, e]) => [field, e.message]),
      ),
    });
    return;
  }

  // 4. ObjectId malformado en la URL
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: 'El id proporcionado no es válido' });
    return;
  }

  // 5. Índice único violado (por ejemplo, dos máquinas con el mismo código)
  const mongoErr = err as MongoDuplicateKeyError;
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'campo';
    res.status(409).json({ error: `Ya existe un registro con ese ${field}` });
    return;
  }

  // 6. Desconocido → log interno + respuesta genérica (sin stack trace)
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}
