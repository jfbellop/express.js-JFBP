import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { AppError } from '../errors/AppError';

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = registerSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
      return;
    }
    const user = await authService.register(parsed.data.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
      return;
    }
    const { token, user } = await authService.login(parsed.data.body);

    // Guardar access token en cookie HttpOnly
    res.cookie('accessToken', token, {
      ...COOKIE_BASE,
      maxAge: 15 * 60 * 1000, // 15 minutos
    });

    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError(401, 'No autenticado'));
      return;
    }
    const user = await authService.getMe(req.user.sub);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}
