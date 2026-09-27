import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { globalLimiter, corsOptions } from './config/security.js';

const app = express();

// ============================================
// PASO 1 — Helmet: cabeceras HTTP de seguridad
// ============================================
// Va PRIMERO: así hasta un 404 o un 429 salen con las cabeceras puestas.
// helmet() activa ~12 cabeceras; las que más pesan en una API son
// X-Content-Type-Options: nosniff, X-Frame-Options, Strict-Transport-Security
// y Content-Security-Policy. Además elimina X-Powered-By: Express, que le
// regala al atacante el stack que estás usando.
app.use(helmet());

// ============================================
// PASO 2 — Rate limiting global
// ============================================
// Antes del parseo del body: a un request bloqueado no le gastamos CPU.
app.use(globalLimiter);

// ============================================
// PASO 4 — CORS con whitelist
// ============================================
// cors() ya responde por sí solo a los preflight OPTIONS.
//
// ⚠️ El starter traía `app.options('*', cors(corsOptions))`. En Express 5 eso
// revienta al arrancar: path-to-regexp v8 ya no acepta '*' como comodín
// (TypeError: Missing parameter name). Se elimina porque es redundante.
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================
// PASO 5 — Sanitización contra NoSQL injection
// ============================================
// DESPUÉS de express.json() (si no, el body todavía no es un objeto) y
// ANTES de las rutas. Elimina claves con `$` o con `.` en body, query y params.
//
// ⚠️ express-mongo-sanitize@2.2.0 es anterior a Express 5, donde `req.query`
// pasó a ser un getter sin setter: la librería intenta reasignarlo y lanza
// "Cannot set property query of #<IncomingMessage> which has only a getter".
// El parche: volver a declarar `query` como propiedad normal y escribible
// justo antes. Es el workaround oficial hasta que salga la v3.
app.use((req: Request, _res: Response, next: NextFunction) => {
  Object.defineProperty(req, 'query', {
    value: req.query,
    writable: true,
    configurable: true,
    enumerable: true,
  });
  next();
});
app.use(mongoSanitize());

// Health check — ruta pública sin auth
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'security-ejercicio', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// Error handling (always last)
app.use(notFound);
app.use(errorHandler);

export { app };
