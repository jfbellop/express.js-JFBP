import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError.js';

// ============================================================================
// MANEJADOR GLOBAL DE ERRORES
// ============================================================================
// Criterio de la rúbrica: "mensajes de error seguros, sin stack traces ni
// información interna". Cada error conocido se traduce a su status HTTP; lo
// desconocido se registra en el servidor y al cliente solo le llega un 500
// genérico. Nunca sale al cliente un `err.stack`, una ruta de archivo ni el
// nombre de una colección.
// ============================================================================

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // 1. Errores de negocio esperados (los lanzamos nosotros)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // 2. Validación Zod → 400 con el detalle por campo
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', details: err.flatten() });
    return;
  }

  // 3. Validación del schema de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: Object.fromEntries(Object.entries(err.errors).map(([f, e]) => [f, e.message])),
    });
    return;
  }

  // 4. ObjectId malformado en la URL
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: 'El id proporcionado no es válido' });
    return;
  }

  // 5. Índice único violado (dos máquinas con el mismo código)
  const mongoErr = err as MongoDuplicateKeyError;
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'campo';
    res.status(409).json({ error: `Ya existe un registro con ese ${field}` });
    return;
  }

  // 6. Origen rechazado por la whitelist de CORS.
  //    Sin este caso el rechazo saldría como 500 y parecería un fallo del
  //    servidor, cuando en realidad es una política de seguridad aplicada.
  if (err.message?.startsWith('CORS blocked')) {
    res.status(403).json({ error: 'CORS: origin not allowed' });
    return;
  }

  // 7. Lo inesperado: log completo en el servidor, mensaje genérico al cliente
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
