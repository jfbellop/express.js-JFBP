import { Router } from 'express';
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

export default router;
