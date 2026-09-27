import { Router } from 'express';
import { listUsers, getStats } from '../controllers/admin.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { requireRole } from '../middlewares/requireRole.js';

const router = Router();

// ============================================
// PASO 4 — toda la rama /admin exige rol 'admin'
// ============================================
// El orden NO es negociable: authMiddleware rellena req.user leyendo el
// JWT; requireRole lee req.user.role. Invertirlos haría que requireRole
// viera siempre req.user === undefined y respondiera 401 a todo el mundo.
//
// Se aplican con router.use() en vez de repetirlos ruta por ruta: así una
// ruta nueva nace protegida por defecto (fail-safe).
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/users', listUsers);
router.get('/stats', getStats);

export default router;
