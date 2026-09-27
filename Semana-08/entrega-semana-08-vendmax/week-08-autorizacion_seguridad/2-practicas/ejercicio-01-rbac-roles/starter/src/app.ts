import 'dotenv/config';
import express, { Router } from 'express';
import cookieParser from 'cookie-parser';
import publicRoutes from './routes/public.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { getDashboard } from './controllers/user.controller.js';
import { authMiddleware } from './middlewares/auth.middleware.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';

const app = express();

// Body parsing
app.use(express.json());
app.use(cookieParser());

// ============================================
// RUTAS ORDENADAS POR NIVEL DE ACCESO
// ============================================
// 1. Públicas — sin middleware
app.use('/api/v1', publicRoutes);

// 2. Autenticación (login/register son públicas por definición)
app.use('/api/v1/auth', authRoutes);

// 3. Autenticadas — cualquier rol válido
app.use('/api/v1/users', userRoutes);

// Alias /api/v1/dashboard → mismo handler que /api/v1/users/dashboard.
// El enunciado prueba la ruta corta y el starter monta el router en
// /users; con un router propio se soportan ambas SIN que authMiddleware
// se cuele en el resto de /api/v1 (si montáramos userRoutes en la raíz,
// cualquier ruta inexistente devolvería 401 en vez de 404).
const dashboardAlias = Router();
dashboardAlias.get('/dashboard', authMiddleware, getDashboard);
app.use('/api/v1', dashboardAlias);

// 4. Solo rol 'admin' — authMiddleware + requireRole('admin')
app.use('/api/v1/admin', adminRoutes);

// Error handling (always last)
app.use(notFound);
app.use(errorHandler);

export { app };
