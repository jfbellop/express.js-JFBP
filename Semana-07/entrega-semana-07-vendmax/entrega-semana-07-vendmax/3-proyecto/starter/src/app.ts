import express from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth.routes';
import machineRouter from './routes/machine.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

export const app = express();

app.use(express.json({ limit: '10kb' })); // límite defensivo de payload
app.use(cookieParser());

// Healthcheck — útil para Docker/monitoreo y para verificar que la API está viva
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'vendmax-api',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de autenticación (públicas + protegidas)
app.use('/api/v1/auth', authRouter);

// Recurso principal del dominio: máquinas expendedoras (todo protegido con JWT)
app.use('/api/v1/machines', machineRouter);

// Middlewares de errores (siempre al final)
app.use(notFound);
app.use(errorHandler);
