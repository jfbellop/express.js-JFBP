import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import machineRoutes from './routes/machine.routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { globalLimiter, corsOptions } from './config/security.js';

const app = express();

// ============================================================================
// CAPAS DE SEGURIDAD — el orden importa
// ============================================================================
//   1. helmet        → cabeceras seguras en TODAS las respuestas (incluidos
//                      404 y 429, que también salen del servidor)
//   2. globalLimiter → a un request bloqueado no le gastamos CPU parseando
//   3. cors          → decide si el navegador puede siquiera leer la respuesta
//   4. parsers       → json / urlencoded / cookies
//   5. mongoSanitize → después del parseo: limpia $ y . del input
//   6. rutas
//   7. notFound + errorHandler (siempre al final)
// ============================================================================

app.use(helmet());
app.use(globalLimiter);

// ⚠️ El starter traía `app.options('*', cors(corsOptions))`. En Express 5 eso
// tumba el arranque: path-to-regexp v8 ya no admite '*' como comodín
// (TypeError: Missing parameter name). Se elimina: cors() ya responde a los
// preflight OPTIONS por sí solo.
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ⚠️ express-mongo-sanitize@2.2.0 reasigna req.query, que en Express 5 es un
// getter sin setter ("Cannot set property query of #<IncomingMessage> which
// has only a getter"). Se redefine como propiedad escribible justo antes.
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

// Health check — público
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vendmax-api', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/machines', machineRoutes);

// Error handling (always last)
app.use(notFound);
app.use(errorHandler);

export { app };
