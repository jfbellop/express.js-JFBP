import { Request, Response, NextFunction } from 'express';
<<<<<<< HEAD
import * as machineService from '../services/machine.service.js';
import {
  createMachineSchema,
  updateMachineSchema,
  collectCashSchema,
  listMachinesQuerySchema,
} from '../schemas/machine.schema.js';
import { AppError } from '../errors/AppError.js';
import type { IMachine } from '../models/machine.model.js';

// ============================================================================
// CONTROLADOR — Máquinas expendedoras
// ============================================================================
// Además del RBAC de las rutas, aquí se aplica autorización A NIVEL DE CAMPO:
// la misma máquina se serializa distinto según quién pregunte.
//
//   Anónimo                  → datos de catálogo (dónde está, si funciona)
//   Usuario autenticado      → + notas, dueño y fechas de gestión
//   Dueño de la máquina/admin → + cashBalanceCents (el dinero que hay dentro)
//
// Exponer el recaudo de todas las máquinas a cualquiera sería un mapa para
// quien quiera reventarlas.
// ============================================================================

interface Viewer {
  sub: string;
  role: string;
}

function serialize(machine: IMachine, viewer?: Viewer): Record<string, unknown> {
  const publicView = {
    id: String(machine._id),
    code: machine.code,
    modelName: machine.modelName,
    type: machine.type,
    location: machine.location,
    status: machine.status,
    slots: machine.slots,
    temperatureC: machine.temperatureC,
  };

  if (!viewer) return publicView;

  const authenticatedView = {
    ...publicView,
    notes: machine.notes,
    lastRestockedAt: machine.lastRestockedAt,
    createdBy: machine.createdBy,
    active: machine.active,
    createdAt: machine.createdAt,
    updatedAt: machine.updatedAt,
  };

  const isOwner = machine.createdBy === viewer.sub;
  const isAdmin = viewer.role === 'admin';
  if (!isOwner && !isAdmin) return authenticatedView;

  return { ...authenticatedView, cashBalanceCents: machine.cashBalanceCents };
}

function viewerOf(req: Request): Viewer | undefined {
  return req.user ? { sub: req.user.sub, role: req.user.role } : undefined;
}

// GET /api/v1/machines — público (optionalAuth)
=======
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

>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
export async function getMachines(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = listMachinesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
      return;
    }

<<<<<<< HEAD
    const viewer = viewerOf(req);
    const { data, meta } = await machineService.findAll(parsed.data);

    res.json({
      data: data.map((m) => serialize(m, viewer)),
      meta,
      access: viewer ? `autenticado (${viewer.role})` : 'público',
    });
=======
    const result = await machineService.getAll(parsed.data);
    res.status(200).json(result);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}

<<<<<<< HEAD
// GET /api/v1/machines/:id — público (optionalAuth)
export async function getMachineById(
  req: Request<{ id: string }>,
=======
export async function getMachineById(
  req: Request,
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
<<<<<<< HEAD
    const machine = await machineService.findById(req.params.id);
    res.json({ data: serialize(machine, viewerOf(req)) });
=======
    const machine = await machineService.getById(req.params.id as string);
    res.status(200).json(machine);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}

<<<<<<< HEAD
// POST /api/v1/machines — autenticado (cualquier rol)
export async function createMachine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = createMachineSchema.parse({ body: req.body });
    const machine = await machineService.create(body, req.user.sub);

    res.status(201).json({ message: 'Máquina registrada', data: serialize(machine, viewerOf(req)) });
=======
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
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}

<<<<<<< HEAD
// PATCH /api/v1/machines/:id — autenticado + (dueño o admin)
export async function updateMachine(
  req: Request<{ id: string }>,
=======
export async function updateMachine(
  req: Request,
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
<<<<<<< HEAD
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = updateMachineSchema.parse({ body: req.body });
    const machine = await machineService.update(
      req.params.id,
      body,
      req.user.sub,
      req.user.role,
    );

    res.json({ message: 'Máquina actualizada', data: serialize(machine, viewerOf(req)) });
=======
    const parsed = updateMachineSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
      return;
    }

    const machine = await machineService.update(req.params.id as string, parsed.data);
    res.status(200).json(machine);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}

<<<<<<< HEAD
// POST /api/v1/machines/:id/recaudo — solo admin (requireRole en la ruta)
export async function collectMachineCash(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');

    const { body } = collectCashSchema.parse({ body: req.body ?? {} });
    const collectedBy = body.collectedBy ?? req.user.email;
    const result = await machineService.collectCash(req.params.id, collectedBy);

    res.json({
      message: 'Recaudo retirado',
      data: {
        machine: serialize(result.machine, viewerOf(req)),
        collectedCents: result.collectedCents,
        collectedBy: result.collectedBy,
      },
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/machines/:id — solo admin (requireRole en la ruta)
export async function deleteMachine(
  req: Request<{ id: string }>,
=======
export async function deleteMachine(
  req: Request,
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
<<<<<<< HEAD
    const machine = await machineService.remove(req.params.id);
    res.json({ message: 'Máquina eliminada', data: { id: String(machine._id), code: machine.code } });
  } catch (err) {
    next(err);
  }
}

// GET /api/v1/machines/reportes/recaudo — solo admin (requireRole en la ruta)
export async function getCashReport(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const report = await machineService.cashReport();
    res.json({ message: 'Reporte de recaudo', data: report });
=======
    await machineService.remove(req.params.id as string);
    res.status(204).send(); // 204 No Content: sin body
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}
