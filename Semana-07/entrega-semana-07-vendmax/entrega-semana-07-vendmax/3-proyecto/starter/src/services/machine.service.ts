import mongoose, { type QueryFilter } from 'mongoose';
import { IMachine, MachineDocument } from '../models/machine.model';
import * as machineRepository from '../repositories/machine.repository';
import {
  CreateMachineDto,
  UpdateMachineDto,
  ListMachinesQuery,
} from '../schemas/machine.schema';
import { AppError } from '../errors/AppError';

// ============================================
// SERVICIO — Máquinas Expendedoras (lógica de negocio)
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pages: number };
}

/** Evita que un id malformado reviente como CastError 500. */
function assertValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'El id proporcionado no es válido');
  }
}

export async function getAll(query: ListMachinesQuery): Promise<PaginatedResult<MachineDocument>> {
  const { status, type, location, page, limit } = query;

  const filter: QueryFilter<IMachine> = {};
  if (status) filter.status = status;
  if (type) filter.type = type;
  // Búsqueda parcial por sede, insensible a mayúsculas.
  // Se escapa la entrada para que el usuario no pueda inyectar una regex costosa (ReDoS).
  if (location) {
    filter.location = { $regex: location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  const { items, total } = await machineRepository.findAll(filter, { page, limit });

  return {
    data: items,
    meta: { total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getById(id: string): Promise<MachineDocument> {
  assertValidId(id);
  const machine = await machineRepository.findById(id);
  if (!machine) throw new AppError(404, 'Máquina no encontrada');
  return machine;
}

export async function create(dto: CreateMachineDto, userId: string): Promise<MachineDocument> {
  const code = dto.code.toUpperCase();

  // Regla de negocio: el código físico es irrepetible en toda la red
  const existing = await machineRepository.findByCode(code);
  if (existing) {
    throw new AppError(409, `Ya existe una máquina registrada con el código ${code}`);
  }

  // Regla de negocio: solo las máquinas de bebidas/café reportan temperatura
  if (dto.temperatureC !== undefined && dto.type === 'snacks') {
    throw new AppError(422, 'Una máquina de snacks no lleva control de temperatura');
  }

  return machineRepository.create({ ...dto, code, createdBy: userId });
}

export async function update(id: string, dto: UpdateMachineDto): Promise<MachineDocument> {
  const current = await getById(id); // lanza 404 si no existe

  // Regla de negocio: el código es único; si se cambia, no puede chocar con otra máquina
  if (dto.code) {
    const code = dto.code.toUpperCase();
    const other = await machineRepository.findByCode(code);
    if (other && other._id.toString() !== id) {
      throw new AppError(409, `Ya existe una máquina registrada con el código ${code}`);
    }
    dto = { ...dto, code };
  }

  // Regla de negocio: una máquina dada de baja no vuelve a operar sin revisión previa
  if (current.status === 'fuera_de_servicio' && dto.status === 'operativa') {
    throw new AppError(
      409,
      "Una máquina 'fuera_de_servicio' debe pasar primero por 'mantenimiento'",
    );
  }

  const updated = await machineRepository.updateById(id, dto);
  if (!updated) throw new AppError(404, 'Máquina no encontrada');
  return updated;
}

export async function remove(id: string): Promise<void> {
  const machine = await getById(id); // lanza 404 si no existe

  // Regla de negocio: no se da de baja una máquina con dinero adentro
  if (machine.cashBalanceCents > 0) {
    throw new AppError(
      409,
      'No se puede eliminar la máquina: primero debe retirarse el recaudo pendiente',
    );
  }

  const deleted = await machineRepository.deleteById(id);
  if (!deleted) throw new AppError(404, 'Máquina no encontrada');
}
