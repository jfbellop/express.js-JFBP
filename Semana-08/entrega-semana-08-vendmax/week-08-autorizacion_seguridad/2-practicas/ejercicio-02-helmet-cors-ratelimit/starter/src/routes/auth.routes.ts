import { Router } from 'express';
import { register, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../config/security.js';

const router = Router();

// ============================================
// PASO 3 — rate limit estricto SOLO en autenticación
// ============================================
// 5 intentos por IP cada 15 min. Se aplica ruta por ruta (no con router.use)
// porque /refresh, /logout y /me no deben heredarlo: un usuario legítimo
// renueva su token muchas veces al día y quedaría bloqueado sin motivo.
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);

export default router;
