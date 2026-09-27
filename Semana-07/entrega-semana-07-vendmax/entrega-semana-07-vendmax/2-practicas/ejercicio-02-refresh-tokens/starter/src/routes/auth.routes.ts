// ============================================
// PASO 5 ✅ — Rutas con /refresh y /logout
// ============================================

import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.me);

// PASO 5 ✅
// /refresh NO lleva authMiddleware: se usa justamente cuando el access token
// ya expiró. Su credencial es la cookie refreshToken.
router.post('/refresh', authController.refresh);

// /logout SÍ lleva authMiddleware: necesitamos saber QUÉ usuario cierra sesión
// para borrar su refreshToken en la base de datos.
router.post('/logout', authMiddleware, authController.logout);

export { router as authRouter };
