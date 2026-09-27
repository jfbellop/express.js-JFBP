// ============================================
// PASO 3 ✅ — Utilidades de JWT
// ============================================
//
// Centraliza la firma y verificación de tokens.
// El secreto SIEMPRE se lee de process.env (nunca hardcodeado).

import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: string;
}

/** Duración del access token: corta a propósito (si lo roban, expira rápido). */
export const ACCESS_TOKEN_TTL = '15m';

function getAccessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET no está definido en el entorno');
  return secret;
}

// signAccessToken — firma un access token con expiración de 15 minutos
export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

// verifyAccessToken — verifica y decodifica el token
// Lanza JsonWebTokenError o TokenExpiredError si el token no es válido
export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getAccessSecret()) as JwtPayload;
}
