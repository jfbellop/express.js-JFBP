import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
<<<<<<< HEAD
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
=======
import { AppError } from '../errors/AppError';

// ============================================
// MANEJADOR GLOBAL DE ERRORES
// ============================================
// Regla de oro: el cliente nunca ve stack traces ni detalles internos.
// Cada tipo de error conocido se traduce a un status HTTP correcto;
// lo desconocido cae en un 500 genérico (y se registra en el servidor).
// ============================================
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

<<<<<<< HEAD
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  // 1. Errores de negocio esperados (los lanzamos nosotros)
=======
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. Errores de negocio esperados (los que lanzamos nosotros)
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

<<<<<<< HEAD
  // 2. Validación Zod → 400 con el detalle por campo
=======
  // 2. Validación Zod que escapó de un controlador con .parse()
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', details: err.flatten() });
    return;
  }

  // 3. Validación del schema de Mongoose
  if (err instanceof mongoose.Error.ValidationError) {
    res.status(400).json({
      error: 'Datos inválidos',
<<<<<<< HEAD
      details: Object.fromEntries(Object.entries(err.errors).map(([f, e]) => [f, e.message])),
=======
      details: Object.fromEntries(
        Object.entries(err.errors).map(([field, e]) => [field, e.message]),
      ),
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
    });
    return;
  }

  // 4. ObjectId malformado en la URL
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ error: 'El id proporcionado no es válido' });
    return;
  }

<<<<<<< HEAD
  // 5. Índice único violado (dos máquinas con el mismo código)
=======
  // 5. Índice único violado (por ejemplo, dos máquinas con el mismo código)
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  const mongoErr = err as MongoDuplicateKeyError;
  if (mongoErr.code === 11000) {
    const field = Object.keys(mongoErr.keyValue ?? {})[0] ?? 'campo';
    res.status(409).json({ error: `Ya existe un registro con ese ${field}` });
    return;
  }

<<<<<<< HEAD
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
=======
  // 6. Desconocido → log interno + respuesta genérica (sin stack trace)
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}
