import express from 'express';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRouter);

app.use(notFound);
app.use(errorHandler);

export { app };
