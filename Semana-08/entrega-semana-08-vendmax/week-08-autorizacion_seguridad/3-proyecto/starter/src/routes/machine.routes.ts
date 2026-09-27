import { Router } from 'express';
<<<<<<< HEAD
import {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  collectMachineCash,
  deleteMachine,
  getCashReport,
} from '../controllers/machine.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { optionalAuth } from '../middlewares/optionalAuth.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// ============================================================================
// POLÍTICA DE ACCESO — VendMax
// ============================================================================
// | Ruta                          | Acceso                                  |
// |-------------------------------|-----------------------------------------|
// | GET    /machines              | Público (el catálogo es información útil |
// |                               | para el cliente: dónde hay una máquina)  |
// | GET    /machines/:id          | Público                                  |
// | GET    /machines/reportes/... | authMiddleware + requireRole('admin')    |
// | POST   /machines              | authMiddleware (cualquier rol)           |
// | PATCH  /machines/:id          | authMiddleware + dueño o admin (service) |
// | POST   /machines/:id/recaudo  | authMiddleware + requireRole('admin')    |
// | DELETE /machines/:id          | authMiddleware + requireRole('admin')    |
//
// requireRole SIEMPRE después de authMiddleware: necesita req.user.
// ============================================================================

// --- Lectura pública (optionalAuth enriquece la respuesta si hay token) ---
router.get('/', optionalAuth, getMachines);

// OJO al orden: esta ruta literal va ANTES que '/:id', si no Express
// interpretaría "reportes" como un id y respondería 400.
router.get('/reportes/recaudo', authMiddleware, requireRole('admin'), getCashReport);

router.get('/:id', optionalAuth, getMachineById);

// --- Escritura: requiere sesión ---
router.post('/', authMiddleware, createMachine);
router.patch('/:id', authMiddleware, updateMachine);

// --- Operaciones administrativas ---
router.post('/:id/recaudo', authMiddleware, requireRole('admin'), collectMachineCash);
router.delete('/:id', authMiddleware, requireRole('admin'), deleteMachine);
=======
import * as machineController from '../controllers/machine.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

// ============================================
// RUTAS — /api/v1/machines
// ============================================
// Todas las rutas del recurso están protegidas: sin cookie accessToken
// válida, authMiddleware corta la petición con 401.
// ============================================

const router = Router();

// Aplica a TODAS las rutas declaradas debajo
router.use(authMiddleware);

// GET    /api/v1/machines        → listar (con filtros y paginación)
router.get('/', machineController.getMachines);

// GET    /api/v1/machines/:id    → detalle (404 si no existe)
router.get('/:id', machineController.getMachineById);

// POST   /api/v1/machines        → crear (201)
router.post('/', machineController.createMachine);

// PATCH  /api/v1/machines/:id    → actualización parcial (200)
router.patch('/:id', machineController.updateMachine);

// DELETE /api/v1/machines/:id    → eliminar (204)
router.delete('/:id', machineController.deleteMachine);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8

export default router;
