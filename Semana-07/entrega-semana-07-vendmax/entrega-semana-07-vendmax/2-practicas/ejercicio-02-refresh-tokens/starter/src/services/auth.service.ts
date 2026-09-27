// ============================================
// PASO 3 ✅ — Service de Auth con Refresh Tokens
// ============================================

import bcrypt from 'bcrypt';
import * as usersRepository from '../repositories/users.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { hashRefreshToken, compareRefreshToken } from '../utils/tokenHash';
import { AppError } from '../errors/AppError';
import type { RegisterDto, LoginDto } from '../schemas/auth.schema';

const SALT_ROUNDS = 10;

// ── Register ──────────────────────────────────────────────────────────────────
export async function register(dto: RegisterDto) {
  const existing = await usersRepository.findByEmail(dto.email);
  if (existing) throw new AppError(409, 'El email ya está registrado');

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const user = await usersRepository.create({ ...dto, password: hashedPassword });

  // Se descartan password y refreshToken con destructuring antes de responder
  const { password: _password, refreshToken: _refreshToken, ...safeUser } = user.toObject();
  return safeUser;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(dto: LoginDto) {
  const user = await usersRepository.findByEmailWithPassword(dto.email);
  if (!user) throw new AppError(401, 'Credenciales inválidas');

  const isValid = await bcrypt.compare(dto.password, user.password as string);
  if (!isValid) throw new AppError(401, 'Credenciales inválidas');

  const userId = user._id.toString();

  // Access token (15 min)
  const accessToken = signAccessToken({
    sub: userId,
    email: user.email as string,
    role: (user.role as string) ?? 'user',
  });

  // PASO 3a ✅: Generar refresh token y guardar SOLO su hash en DB.
  // El token en claro viaja al cliente (cookie HttpOnly); la base de datos
  // guarda el hash → permite revocarlo (logout) sin poder reconstruirlo.
  const refreshToken = signRefreshToken({ sub: userId });
  const hashedRefresh = await hashRefreshToken(refreshToken); // bcrypt sobre digest SHA-256
  await usersRepository.updateRefreshToken(userId, hashedRefresh);

  return {
    accessToken,
    refreshToken,
    user: { id: user._id, email: user.email, name: user.name, role: user.role },
  };
}

// ── Refresh ────────────────────────────────────────────────────────────────────
// PASO 3b ✅: Rotación de refresh token
export async function refresh(incomingRefreshToken: string) {
  // 1. Verificar JWT del refresh token (firma + expiración)
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(incomingRefreshToken);
  } catch {
    throw new AppError(401, 'Refresh token inválido');
  }

  // 2. Buscar el usuario con el hash almacenado
  const user = await usersRepository.findByIdWithTokens(payload.sub);
  if (!user || !user.refreshToken) {
    // Sin hash en DB = sesión revocada (logout previo)
    throw new AppError(401, 'Refresh token inválido');
  }

  // 3. Comparar el token recibido con el hash almacenado.
  //    Si no coincide, es un token ya rotado (posible robo) → se rechaza.
  const isMatch = await compareRefreshToken(incomingRefreshToken, user.refreshToken as string);
  if (!isMatch) throw new AppError(401, 'Refresh token inválido o ya rotado');

  // 4. Rotar: generar nuevos tokens y reemplazar el hash en DB.
  //    El refresh token anterior queda inservible desde este instante.
  const userId = user._id.toString();
  const newAccessToken = signAccessToken({
    sub: userId,
    email: user.email as string,
    role: (user.role as string) ?? 'user',
  });
  const newRefreshToken = signRefreshToken({ sub: userId });
  const newHashedRefresh = await hashRefreshToken(newRefreshToken);
  await usersRepository.updateRefreshToken(userId, newHashedRefresh);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

// ── Logout ────────────────────────────────────────────────────────────────────
// PASO 3c ✅
export async function logout(userId: string): Promise<void> {
  // Eliminar el hash del refresh token del documento del usuario:
  // cualquier refresh posterior con el token viejo fallará con 401.
  await usersRepository.updateRefreshToken(userId, undefined);
}

// ── Me ────────────────────────────────────────────────────────────────────────
export async function getMe(userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return user;
}
