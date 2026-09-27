import type { QueryFilter } from 'mongoose';
import { MachineModel, IMachine, MachineDocument } from '../models/machine.model';
import { CreateMachineDto, UpdateMachineDto } from '../schemas/machine.schema';

// ============================================
// REPOSITORIO — Máquinas Expendedoras
// ============================================
// Única capa que habla con Mongoose. Servicios y controladores
// nunca importan el modelo directamente.
// ============================================

export interface FindAllOptions {
  page: number;
  limit: number;
}

export interface PaginatedMachines {
  items: MachineDocument[];
  total: number;
}

export async function findAll(
  filter: QueryFilter<IMachine> = {},
  { page, limit }: FindAllOptions = { page: 1, limit: 20 },
): Promise<PaginatedMachines> {
  const skip = (page - 1) * limit;

  // Promise.all → las dos consultas viajan en paralelo
  const [items, total] = await Promise.all([
    MachineModel.find(filter).sort({ code: 1 }).skip(skip).limit(limit),
    MachineModel.countDocuments(filter),
  ]);

  return { items, total };
}

export async function findById(id: string): Promise<MachineDocument | null> {
  return MachineModel.findById(id);
}

export async function findByCode(code: string): Promise<MachineDocument | null> {
  return MachineModel.findOne({ code: code.toUpperCase() });
}

export async function create(
  data: CreateMachineDto & { createdBy: string },
): Promise<MachineDocument> {
  return MachineModel.create(data);
}

export async function updateById(
  id: string,
  data: UpdateMachineDto,
): Promise<MachineDocument | null> {
  return MachineModel.findByIdAndUpdate(id, data, {
    returnDocument: 'after', // devuelve el documento YA actualizado (reemplaza al deprecado new: true)
    runValidators: true, // vuelve a correr las validaciones del schema
  });
}

export async function deleteById(id: string): Promise<boolean> {
  const deleted = await MachineModel.findByIdAndDelete(id);
  return deleted !== null;
}
