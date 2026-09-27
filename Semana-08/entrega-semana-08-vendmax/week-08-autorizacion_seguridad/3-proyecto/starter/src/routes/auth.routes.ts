import { Router } from 'express';
<<<<<<< HEAD
import { register, login, refresh, logout, me } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../config/security.js';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);
=======
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Rutas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);

// Rutas protegidas
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8

export default router;
