// ============================================
// PASO 5 ✅ — Rutas de Autenticación
// ============================================
//
// La ruta GET /me está protegida por authMiddleware.

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);

// Ruta protegida: sin cookie válida → 401
router.get('/me', authMiddleware, authController.me);

export { router as authRouter };
