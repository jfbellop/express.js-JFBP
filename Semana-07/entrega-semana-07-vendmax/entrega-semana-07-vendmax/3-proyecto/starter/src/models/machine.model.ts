import mongoose, { HydratedDocument, Schema } from 'mongoose';

// ============================================
// MODELO DEL RECURSO PRINCIPAL — Máquina Expendedora
// ============================================
// Dominio: VendMax — red de máquinas expendedoras (snacks y bebidas)
// Recurso: Machine  → colección "machines" → /api/v1/machines
// ============================================

/** Estados operativos de una máquina dentro de la red. */
export const MACHINE_STATUSES = ['operativa', 'mantenimiento', 'fuera_de_servicio'] as const;
export type MachineStatus = (typeof MACHINE_STATUSES)[number];

/** Tipos de máquina según lo que dispensa (define si requiere refrigeración). */
export const MACHINE_TYPES = ['snacks', 'bebidas', 'mixta', 'cafe'] as const;
export type MachineType = (typeof MACHINE_TYPES)[number];

export interface IMachine {
  code: string; // identificador físico pegado en la máquina: VM-001
  model: string; // modelo del fabricante
  type: MachineType;
  location: string; // sede / punto donde está instalada
  status: MachineStatus;
  slots: number; // número de bandejas/espacios de producto
  temperatureC?: number; // solo aplica a máquinas refrigeradas
  cashBalanceCents: number; // recaudo acumulado pendiente de retiro (en centavos)
  lastRestockedAt?: Date; // última reposición de producto
  notes?: string;
  createdBy: mongoose.Types.ObjectId; // usuario autenticado que la registró
  createdAt: Date;
  updatedAt: Date;
}

export type MachineDocument = HydratedDocument<IMachine>;

const machineSchema = new Schema<IMachine>(
  {
    code: {
      type: String,
      required: [true, 'El código de la máquina es requerido'],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^VM-\d{3}$/, 'El código debe tener el formato VM-001'],
    },
    model: {
      type: String,
      required: [true, 'El modelo es requerido'],
      trim: true,
      minlength: [2, 'Mínimo 2 caracteres'],
      maxlength: [60, 'Máximo 60 caracteres'],
    },
    type: {
      type: String,
      enum: {
        values: [...MACHINE_TYPES],
        message: 'Tipo inválido: {VALUE}',
      },
      required: [true, 'El tipo de máquina es requerido'],
    },
    location: {
      type: String,
      required: [true, 'La ubicación es requerida'],
      trim: true,
      minlength: [3, 'Mínimo 3 caracteres'],
      maxlength: [120, 'Máximo 120 caracteres'],
    },
    status: {
      type: String,
      enum: {
        values: [...MACHINE_STATUSES],
        message: 'Estado inválido: {VALUE}',
      },
      default: 'operativa',
    },
    slots: {
      type: Number,
      required: [true, 'El número de bandejas es requerido'],
      min: [1, 'Mínimo 1 bandeja'],
      max: [100, 'Máximo 100 bandejas'],
    },
    temperatureC: {
      type: Number,
      min: [-10, 'Temperatura mínima: -10 °C'],
      max: [25, 'Temperatura máxima: 25 °C'],
    },
    cashBalanceCents: {
      type: Number,
      default: 0,
      min: [0, 'El recaudo no puede ser negativo'],
    },
    lastRestockedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: [280, 'Máximo 280 caracteres'] },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

// Índices pensados para las consultas reales del panel de operaciones
machineSchema.index({ status: 1 });
machineSchema.index({ location: 1 });

export const MachineModel = mongoose.model<IMachine>('Machine', machineSchema);
