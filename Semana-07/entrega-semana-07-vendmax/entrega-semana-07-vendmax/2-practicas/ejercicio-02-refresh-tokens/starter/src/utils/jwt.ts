// ============================================
// PASO 2 ✅ — Utilidades de JWT: Access + Refresh
// ============================================

import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export const ACCESS_TOKEN_TTL = '15m'; // corta duración
export const REFRESH_TOKEN_TTL = '7d'; // larga duración

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET no está definido en el entorno');
  return secret;
}

function getRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET no está definido en el entorno');
  return secret;
}

// ── Access Token ──────────────────────────────────────────────────────────────
// `jti` hace único cada token emitido (dos firmas dentro del mismo segundo
// serían idénticas sin él, porque `iat` se mide en segundos).
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getAccessSecret()) as JwtPayload;
}

// ── Refresh Token (PASO 2) ────────────────────────────────────────────────────
// El refresh token usa un SECRETO DIFERENTE al access token: si se filtra el
// secreto de acceso, el atacante aún no puede fabricar refresh tokens válidos.
// Su payload lleva solo `sub` (menos información expuesta).
//
// `jti` (JWT ID) es OBLIGATORIO para que la rotación funcione de verdad:
// dos tokens firmados en el mismo segundo con el mismo payload producen
// exactamente la misma cadena (iat va en segundos), así que el token "viejo"
// seguiría siendo válido después de rotar. Un UUID aleatorio los hace únicos.
export function signRefreshToken(payload: Pick<JwtPayload, 'sub'>): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, getRefreshSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'sub'> {
  return jwt.verify(token, getRefreshSecret()) as Pick<JwtPayload, 'sub'>;
}
