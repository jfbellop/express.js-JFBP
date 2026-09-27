<<<<<<< HEAD
import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../schemas/auth.schema.js';
import { AppError } from '../errors/AppError.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { body } = registerSchema.parse({ body: req.body });
    const user = await authService.register(body);
    res.status(201).json({ message: 'User registered', data: user });
=======
import { Request, Response, NextFunction, CookieOptions } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const isProduction = process.env.NODE_ENV === 'production';

function setCookieOptions(maxAge: number, path = '/'): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge,
    path,
  };
}

function setTokenCookies(
  res: Response,
  tokens: Awaited<ReturnType<typeof authService.login>>
): void {
  res.cookie('accessToken', tokens.accessToken, setCookieOptions(tokens.accessMaxAge));
  res.cookie(
    'refreshToken',
    tokens.refreshToken,
    setCookieOptions(tokens.refreshMaxAge, '/api/v1/auth')
  );
}

function clearTokenCookies(res: Response): void {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth' });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body);
    const user = await authService.register(dto);
    res.status(201).json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
<<<<<<< HEAD
    const { body } = loginSchema.parse({ body: req.body });
    const { accessToken, refreshToken, role } = await authService.login(body);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken, role });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) throw new AppError(401, 'Refresh token missing');

    const tokens = await authService.refreshTokens(token);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: tokens.accessToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw new AppError(401, 'Not authenticated');
    await authService.logout(req.user.sub);
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
=======
    const dto = loginSchema.parse(req.body);
    const tokens = await authService.login(dto);
    setTokenCookies(res, tokens);
    res.status(200).json({ message: 'Login exitoso' });
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
<<<<<<< HEAD
    if (!req.user) throw new AppError(401, 'Not authenticated');
    const user = await authService.getMe(req.user.sub);
    res.json({ data: user });
=======
    const userId = req.user!.sub;
    const user = await authService.getMe(userId);
    res.status(200).json({
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incomingToken = req.cookies?.refreshToken as string | undefined;
    if (!incomingToken) {
      res.status(401).json({ error: 'Refresh token no encontrado' });
      return;
    }
    const tokens = await authService.refresh(incomingToken);
    setTokenCookies(res, tokens);
    res.status(200).json({ message: 'Tokens renovados' });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    await authService.logout(userId);
    clearTokenCookies(res);
    res.status(200).json({ message: 'Sesión cerrada' });
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  } catch (err) {
    next(err);
  }
}
