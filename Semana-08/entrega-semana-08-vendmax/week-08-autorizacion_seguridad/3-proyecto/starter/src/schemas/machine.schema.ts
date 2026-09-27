import { z } from 'zod';

// ============================================================================
// VALIDACIÓN — Zod como primera barrera de seguridad
// ============================================================================
// Zod no solo valida tipos: es la capa que rechaza HTML (anti-XSS almacenado),
// acota longitudes (anti payloads gigantes) y descarta cualquier campo que no
// esté declarado, que es lo que impide un mass-assignment
// (por ejemplo, alguien intentando mandar "role": "admin" o "cashBalanceCents").
// ============================================================================

// Sin `<` ni `>`: si el dato acaba renderizado en un panel web, no puede
// inyectar etiquetas.
const noHtml = /^[^<>]*$/;

const machineFields = {
  code: z
    .string()
    .regex(/^VM-\d{3}$/, 'El código debe tener el formato VM-000'),
  modelName: z
    .string()
    .min(2, 'El modelo debe tener al menos 2 caracteres')
    .max(120)
    .regex(noHtml, 'El modelo no puede contener caracteres HTML'),
  type: z.enum(['snacks', 'bebidas', 'mixta', 'cafe']),
  location: z
    .string()
    .min(3, 'La ubicación debe tener al menos 3 caracteres')
    .max(200)
    .regex(noHtml, 'La ubicación no puede contener caracteres HTML'),
  status: z.enum(['operativa', 'mantenimiento', 'fuera_de_servicio']),
  slots: z.number().int().min(1, 'Mínimo 1 bandeja').max(100, 'Máximo 100 bandejas'),
  temperatureC: z.number().min(-5).max(25),
  lastRestockedAt: z.coerce.date(),
  notes: z.string().max(500).regex(noHtml, 'Las notas no pueden contener caracteres HTML'),
};

// OJO: en Zod 4 `.partial()` NO elimina los `.default()`. Si el objeto base
// llevara defaults, un PATCH parcial los reinyectaría y pisaría datos reales
// (por ejemplo, devolvería el estado a "operativa" sin que nadie lo pidiera).
// Por eso los defaults viven SOLO en el schema de creación.
export const createMachineSchema = z.object({
  body: z.object({
    code: machineFields.code,
    modelName: machineFields.modelName,
    type: machineFields.type,
    location: machineFields.location,
    slots: machineFields.slots,
    status: machineFields.status.default('operativa'),
    temperatureC: machineFields.temperatureC.optional(),
    lastRestockedAt: machineFields.lastRestockedAt.optional(),
    notes: machineFields.notes.optional(),
  }),
});

export const updateMachineSchema = z.object({
  body: z
    .object({
      modelName: machineFields.modelName.optional(),
      type: machineFields.type.optional(),
      location: machineFields.location.optional(),
      status: machineFields.status.optional(),
      slots: machineFields.slots.optional(),
      temperatureC: machineFields.temperatureC.optional(),
      lastRestockedAt: machineFields.lastRestockedAt.optional(),
      notes: machineFields.notes.optional(),
      active: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'Envía al menos un campo para actualizar',
    }),
});

// El recaudo no se edita con un PATCH normal: se retira con una operación
// específica y auditable, reservada al rol admin.
export const collectCashSchema = z.object({
  body: z.object({
    collectedBy: z
      .string()
      .min(3)
      .max(120)
      .regex(noHtml, 'El nombre no puede contener caracteres HTML')
      .optional(),
  }),
});

export const listMachinesQuerySchema = z.object({
  status: z.enum(['operativa', 'mantenimiento', 'fuera_de_servicio']).optional(),
  type: z.enum(['snacks', 'bebidas', 'mixta', 'cafe']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateMachineDto = z.infer<typeof createMachineSchema>['body'];
export type UpdateMachineDto = z.infer<typeof updateMachineSchema>['body'];
export type ListMachinesQuery = z.infer<typeof listMachinesQuerySchema>;
