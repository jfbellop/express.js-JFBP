import { Request, Response, NextFunction } from 'express';
import * as machineService from '../services/machine.service';
import {
  createMachineSchema,
  updateMachineSchema,
  listMachinesQuerySchema,
} from '../schemas/machine.schema';

// ============================================
// CONTROLADOR — Máquinas Expendedoras
// ============================================
// Se usa safeParse (no parse) para responder 400 con el detalle de los
// errores de validación en lugar de dejar escapar un ZodError al 500.
// ============================================

export async function getMachines(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listMachinesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
      return;
    }

    const result = await machineService.getAll(parsed.data);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMachineById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const machine = await machineService.getById(req.params.id as string);
    res.status(200).json(machine);
  } catch (err) {
    next(err);
  }
}

export async function createMachine(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createMachineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
      return;
    }

    // req.user lo inyecta authMiddleware tras verificar el JWT de la cookie
    const userId = req.user!.sub;
    const machine = await machineService.create(parsed.data, userId);
    res.status(201).json(machine);
  } catch (err) {
    next(err);
  }
}

export async function updateMachine(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = updateMachineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
      return;
    }

    const machine = await machineService.update(req.params.id as string, parsed.data);
    res.status(200).json(machine);
  } catch (err) {
    next(err);
  }
}

export async function deleteMachine(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await machineService.remove(req.params.id as string);
    res.status(204).send(); // 204 No Content: sin body
  } catch (err) {
    next(err);
  }
}
