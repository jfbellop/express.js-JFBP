<<<<<<< HEAD
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
=======
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AppError } from '../errors/AppError';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
}

// ─── Access Token (15 minutos) ──────────────────────────────────────────────

export function signAccessToken(payload: JwtPayload): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new AppError(500, 'JWT_ACCESS_SECRET is not configured');
  // jti → cada access token emitido es único y rastreable en logs
  return jwt.sign({ ...payload, jti: randomUUID() }, secret, { expiresIn: '15m' });
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}

export function verifyAccessToken(token: string): JwtPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
<<<<<<< HEAD
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not defined');
  return jwt.verify(token, secret) as JwtPayload;
}

export function signRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return jwt.sign({ sub: userId }, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string } {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not defined');
  return jwt.verify(token, secret) as { sub: string };
=======
  if (!secret) throw new AppError(500, 'JWT_ACCESS_SECRET is not configured');
  return jwt.verify(token, secret) as JwtPayload;
}

// ─── Refresh Token (7 días) ─────────────────────────────────────────────────

// `jti` (JWT ID) aleatorio: sin él, dos refresh tokens firmados dentro del
// mismo segundo son idénticos (iat se mide en segundos) y la rotación no
// invalidaría el token anterior. Con jti cada token emitido es único.
export function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new AppError(500, 'JWT_REFRESH_SECRET is not configured');
  return jwt.sign({ ...payload, jti: randomUUID() }, secret, { expiresIn: '7d' });
}

export function verifyRefreshToken(token: string): JwtPayload {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new AppError(500, 'JWT_REFRESH_SECRET is not configured');
  return jwt.verify(token, secret) as JwtPayload;
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}
