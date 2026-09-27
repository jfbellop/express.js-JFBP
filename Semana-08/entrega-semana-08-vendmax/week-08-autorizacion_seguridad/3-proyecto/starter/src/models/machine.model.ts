<<<<<<< HEAD
import { Schema, model, Document } from 'mongoose';

// ============================================================================
// MODELO — Máquina expendedora (dominio VendMax)
// ============================================================================
// Reemplaza al item.model.ts genérico del starter.
//
// createdBy guarda el id del operador que registró la máquina. Es la pieza
// que hace posible la autorización a nivel de recurso: el dueño puede editar
// SU máquina, el admin puede editar cualquiera, y nadie más puede tocarla.
// ============================================================================

export type MachineType = 'snacks' | 'bebidas' | 'mixta' | 'cafe';
export type MachineStatus = 'operativa' | 'mantenimiento' | 'fuera_de_servicio';

export interface IMachine extends Document {
  code: string;
  modelName: string; // "model" a secas choca con Document.model() de Mongoose
  type: MachineType;
  location: string;
  status: MachineStatus;
  slots: number;
  temperatureC?: number;
  cashBalanceCents: number;
  lastRestockedAt?: Date;
  notes?: string;
  active: boolean;
  createdBy: string; // id del operador dueño — NO quitar
=======
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
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  createdAt: Date;
  updatedAt: Date;
}

<<<<<<< HEAD
const machineSchema = new Schema<IMachine>(
  {
    // Código de inventario visible en el chasis: VM-001, VM-002...
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^VM-\d{3}$/, 'El código debe tener el formato VM-000'],
    },
    modelName: { type: String, required: true, trim: true, maxlength: 120 },
    type: {
      type: String,
      required: true,
      enum: {
        values: ['snacks', 'bebidas', 'mixta', 'cafe'],
        message: 'Tipo inválido: {VALUE}',
      },
    },
    location: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: {
        values: ['operativa', 'mantenimiento', 'fuera_de_servicio'],
=======
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
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
        message: 'Estado inválido: {VALUE}',
      },
      default: 'operativa',
    },
<<<<<<< HEAD
    slots: { type: Number, required: true, min: 1, max: 100 },
    // Solo tiene sentido en máquinas refrigeradas (bebidas, mixta, café)
    temperatureC: { type: Number, min: -5, max: 25 },
    // Recaudo pendiente de retirar, en centavos (nunca en flotante: el dinero
    // en coma flotante es una fuente clásica de descuadres).
    cashBalanceCents: { type: Number, default: 0, min: 0 },
    lastRestockedAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 500 },
    // Baja lógica: una máquina retirada deja de listarse pero conserva su
    // histórico contable.
    active: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
=======
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
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  },
  { timestamps: true },
);

<<<<<<< HEAD
// Índices pensados para las consultas reales del catálogo
machineSchema.index({ status: 1, type: 1 });
machineSchema.index({ createdBy: 1 });

export const Machine = model<IMachine>('Machine', machineSchema);
=======
// Índices pensados para las consultas reales del panel de operaciones
machineSchema.index({ status: 1 });
machineSchema.index({ location: 1 });

export const MachineModel = mongoose.model<IMachine>('Machine', machineSchema);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
