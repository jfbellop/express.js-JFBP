import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { AppError } from '../errors/AppError';

const COOKIE_BASE = {
  httpOnly: true, // inaccesible desde document.cookie (anti-XSS)
  secure: process.env.NODE_ENV === 'production', // solo HTTPS en prod
  sameSite: 'lax' as const, // mitiga CSRF
};

function setTokenCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, {
    ...COOKIE_BASE,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 min — igual que el TTL del JWT
  });
  res.cookie('refreshToken', refreshToken, {
    ...COOKIE_BASE,
    path: '/api/v1/auth', // solo se envía a rutas auth
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días — igual que el TTL del JWT
  });
}

function clearTokenCookies(res: Response): void {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

// ── Register ──────────────────────────────────────────────────────────────────
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

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse({ body: req.body });
    if (!parsed.success) {
      res.status(400).json({ message: 'Datos inválidos', errors: parsed.error.flatten() });
      return;
    }
    const { accessToken, refreshToken, user } = await authService.login(parsed.data.body);
    setTokenCookies(res, accessToken, refreshToken);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

// ── Me ────────────────────────────────────────────────────────────────────────
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

// ── Refresh ───────────────────────────────────────────────────────────────────
// PASO 4a ✅
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. El refresh token viene en su propia cookie HttpOnly
    const incomingToken = req.cookies?.refreshToken as string | undefined;
    if (!incomingToken) {
      next(new AppError(401, 'No autenticado'));
      return;
    }
    // 2. El servicio verifica, compara con el hash en DB y rota
    const { accessToken, refreshToken } = await authService.refresh(incomingToken);
    // 3. Se reemplazan AMBAS cookies con los tokens nuevos
    setTokenCookies(res, accessToken, refreshToken);
    res.status(200).json({ message: 'Token renovado' });
  } catch (err) {
    next(err);
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
// PASO 4b ✅
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError(401, 'No autenticado'));
      return;
    }
    // Invalida el refresh token en la base de datos (revocación del lado servidor)
    await authService.logout(req.user.sub);
    // Y borra las cookies del cliente
    clearTokenCookies(res);
    res.status(200).json({ message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
}
