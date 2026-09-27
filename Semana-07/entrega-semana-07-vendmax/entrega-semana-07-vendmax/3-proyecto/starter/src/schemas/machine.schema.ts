import { z } from 'zod';
import { MACHINE_STATUSES, MACHINE_TYPES } from '../models/machine.model';

// ============================================
// SCHEMAS ZOD — Máquina Expendedora (VendMax)
// ============================================
// `.strict()` rechaza cualquier campo no declarado aquí: protege contra
// mass assignment (un cliente enviando "createdBy", "_id" o "__v").
//
// ⚠️ Cuidado con `.default()` + `.partial()`:
// en Zod, `.partial()` NO elimina los defaults, así que un PATCH de
// { cashBalanceCents: 50000 } devolvía además { status: 'operativa' } y un
// PATCH de { status } reseteaba el recaudo a 0 — pisando datos reales.
// Por eso el objeto BASE no lleva defaults: los defaults se agregan solo en
// el schema de creación.
// ============================================

/** Código físico de la máquina: VM- seguido de 3 dígitos. */
export const MACHINE_CODE_REGEX = /^VM-\d{3}$/i;

/** Definición común de campos, SIN defaults. */
const machineBaseSchema = z
  .object({
    code: z.string().trim().regex(MACHINE_CODE_REGEX, 'El código debe tener el formato VM-001'),
    model: z.string().trim().min(2, 'Mínimo 2 caracteres').max(60, 'Máximo 60 caracteres'),
    type: z.enum(MACHINE_TYPES),
    location: z.string().trim().min(3, 'Mínimo 3 caracteres').max(120, 'Máximo 120 caracteres'),
    status: z.enum(MACHINE_STATUSES),
    slots: z
      .number()
      .int('Debe ser un número entero')
      .min(1, 'Mínimo 1 bandeja')
      .max(100, 'Máximo 100 bandejas'),
    temperatureC: z
      .number()
      .min(-10, 'Temperatura mínima: -10 °C')
      .max(25, 'Temperatura máxima: 25 °C')
      .optional(),
    cashBalanceCents: z
      .number()
      .int('Debe ser un número entero de centavos')
      .min(0, 'El recaudo no puede ser negativo'),
    lastRestockedAt: z.coerce.date().optional(),
    notes: z.string().trim().max(280, 'Máximo 280 caracteres').optional(),
  })
  .strict();

/** Creación: status y recaudo son opcionales y toman valor por defecto. */
export const createMachineSchema = machineBaseSchema.extend({
  status: z.enum(MACHINE_STATUSES).default('operativa'),
  cashBalanceCents: z
    .number()
    .int('Debe ser un número entero de centavos')
    .min(0, 'El recaudo no puede ser negativo')
    .default(0),
});

/** Actualización parcial: solo viajan los campos enviados, sin defaults. */
export const updateMachineSchema = machineBaseSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debes enviar al menos un campo para actualizar',
  });

/** Filtros y paginación de GET /api/v1/machines */
export const listMachinesQuerySchema = z.object({
  status: z.enum(MACHINE_STATUSES).optional(),
  type: z.enum(MACHINE_TYPES).optional(),
  location: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateMachineDto = z.infer<typeof createMachineSchema>;
export type UpdateMachineDto = z.infer<typeof updateMachineSchema>;
export type ListMachinesQuery = z.infer<typeof listMachinesQuerySchema>;
