import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

const app = express();

app.use(express.json());
app.use(cookieParser());

// Rutas
app.use('/api/v1/auth', authRouter);

// 404 y errores
app.use(notFound);
app.use(errorHandler);

export { app };
