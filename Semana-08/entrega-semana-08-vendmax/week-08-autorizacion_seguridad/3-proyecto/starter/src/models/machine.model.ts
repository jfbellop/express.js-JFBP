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
  createdAt: Date;
  updatedAt: Date;
}

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
        message: 'Estado inválido: {VALUE}',
      },
      default: 'operativa',
    },
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
  },
  { timestamps: true },
);

// Índices pensados para las consultas reales del catálogo
machineSchema.index({ status: 1, type: 1 });
machineSchema.index({ createdBy: 1 });

export const Machine = model<IMachine>('Machine', machineSchema);
