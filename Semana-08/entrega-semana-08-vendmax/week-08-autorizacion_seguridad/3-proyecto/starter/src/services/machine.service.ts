import mongoose, { QueryFilter } from 'mongoose';
import { Machine, IMachine } from '../models/machine.model.js';
import { AppError } from '../errors/AppError.js';
import type {
  CreateMachineDto,
  UpdateMachineDto,
  ListMachinesQuery,
} from '../schemas/machine.schema.js';

// ============================================================================
// SERVICIO — reglas de negocio de VendMax
// ============================================================================
// Aquí vive la autorización a nivel de RECURSO (¿es el dueño?), que el
// middleware requireRole no puede resolver: requireRole sabe qué rol tienes,
// pero no de quién es la máquina que intentas tocar.
// ============================================================================

function assertValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'El id proporcionado no es válido');
  }
}

export async function findAll(query: ListMachinesQuery): Promise<{
  data: IMachine[];
  meta: { total: number; page: number; limit: number; pages: number };
}> {
  const filter: QueryFilter<IMachine> = { active: true };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;

  const { page, limit } = query;
  const [data, total] = await Promise.all([
    Machine.find(filter)
      .sort({ code: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Machine.countDocuments(filter),
  ]);

  return {
    data,
    meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function findById(id: string): Promise<IMachine> {
  assertValidId(id);
  const machine = await Machine.findById(id);
  if (!machine) throw new AppError(404, 'Máquina no encontrada');
  return machine;
}

export async function create(data: CreateMachineDto, userId: string): Promise<IMachine> {
  const existing = await Machine.findOne({ code: data.code });
  if (existing) {
    throw new AppError(409, `Ya existe una máquina registrada con el código ${data.code}`);
  }

  // Regla del dominio: una máquina de snacks no es refrigerada.
  if (data.type === 'snacks' && data.temperatureC !== undefined) {
    throw new AppError(422, 'Una máquina de snacks no lleva control de temperatura');
  }

  return Machine.create({ ...data, createdBy: userId });
}

// ============================================================================
// AUTORIZACIÓN A NIVEL DE RECURSO
// ============================================================================
// PATCH lo puede hacer el dueño de la máquina O un admin. Cualquier otro
// usuario autenticado recibe 403: está identificado, pero esa máquina no es
// suya. Fíjate en que la comprobación va ANTES de tocar la base de datos.
// ============================================================================
export async function update(
  id: string,
  data: UpdateMachineDto,
  requesterId: string,
  requesterRole: string,
): Promise<IMachine> {
  const machine = await findById(id);

  const isOwner = machine.createdBy === requesterId;
  const isAdmin = requesterRole === 'admin';
  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'Solo el operador que registró la máquina o un admin pueden editarla');
  }

  // Una máquina fuera de servicio no vuelve a operar sin pasar por
  // mantenimiento: evita que se reactive un equipo averiado por error.
  if (
    machine.status === 'fuera_de_servicio' &&
    data.status === 'operativa'
  ) {
    throw new AppError(
      409,
      'Una máquina fuera de servicio debe pasar primero por mantenimiento',
    );
  }

  const nextType = data.type ?? machine.type;
  const nextTemp = data.temperatureC ?? machine.temperatureC;
  if (nextType === 'snacks' && nextTemp !== undefined) {
    throw new AppError(422, 'Una máquina de snacks no lleva control de temperatura');
  }

  // returnDocument: 'after' — `new: true` quedó deprecado en Mongoose 9
  const updated = await Machine.findByIdAndUpdate(id, data, {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!updated) throw new AppError(404, 'Máquina no encontrada');
  return updated;
}

// Retiro de recaudo: operación administrativa y auditable.
export async function collectCash(
  id: string,
  collectedBy: string,
): Promise<{ machine: IMachine; collectedCents: number; collectedBy: string }> {
  const machine = await findById(id);
  const collectedCents = machine.cashBalanceCents;

  if (collectedCents === 0) {
    throw new AppError(409, 'La máquina no tiene recaudo pendiente');
  }

  machine.cashBalanceCents = 0;
  machine.notes = `Recaudo de ${(collectedCents / 100).toFixed(2)} retirado por ${collectedBy}`;
  await machine.save();

  return { machine, collectedCents, collectedBy };
}

export async function remove(id: string): Promise<IMachine> {
  const machine = await findById(id);

  // No se borra una máquina con dinero dentro: primero se retira el recaudo.
  if (machine.cashBalanceCents > 0) {
    throw new AppError(
      409,
      'No se puede eliminar una máquina con recaudo pendiente: retíralo primero',
    );
  }

  await Machine.findByIdAndDelete(id);
  return machine;
}

// Reporte administrativo: solo lo consume la ruta protegida con requireRole
export async function cashReport(): Promise<{
  totalMachines: number;
  totalCashCents: number;
  byStatus: Record<string, number>;
  topMachines: Array<{ code: string; location: string; cashBalanceCents: number }>;
}> {
  const machines = await Machine.find({ active: true });

  const byStatus: Record<string, number> = {};
  let totalCashCents = 0;
  for (const m of machines) {
    byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;
    totalCashCents += m.cashBalanceCents;
  }

  const topMachines = [...machines]
    .sort((a, b) => b.cashBalanceCents - a.cashBalanceCents)
    .slice(0, 3)
    .map((m) => ({ code: m.code, location: m.location, cashBalanceCents: m.cashBalanceCents }));

  return { totalMachines: machines.length, totalCashCents, byStatus, topMachines };
}
