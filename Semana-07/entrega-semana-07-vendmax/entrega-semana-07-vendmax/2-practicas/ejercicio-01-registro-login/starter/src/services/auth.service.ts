// ============================================
// PASO 2 ✅ — Servicio de Autenticación
// ============================================

import bcrypt from 'bcrypt';
import * as usersRepository from '../repositories/users.repository';
import { signAccessToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';
import type { RegisterDto, LoginDto } from '../schemas/auth.schema';

/**
 * Coste de bcrypt. A mayor número, más lento el hash (y más caro el ataque
 * por fuerza bruta). 10 ≈ 1024 iteraciones internas, ~80-100 ms por hash.
 * La rúbrica exige >= 10.
 */
const SALT_ROUNDS = 10;

// ── Register ──────────────────────────────────────────────────────────────────
export async function register(dto: RegisterDto) {
  // Verificar que el email no esté en uso
  const existing = await usersRepository.findByEmail(dto.email);
  if (existing) {
    throw new AppError(409, 'El email ya está registrado');
  }

  // PASO 2a ✅: Hashear la contraseña antes de guardar.
  // bcrypt.hash() es asíncrono (no bloquea el event loop) y genera el salt
  // automáticamente, guardándolo dentro del propio hash resultante.
  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  const user = await usersRepository.create({ ...dto, password: hashedPassword });

  // Retornar datos del usuario sin contraseña.
  // Se descarta `password` con destructuring: es imposible que se escape.
  const { password: _password, ...safeUser } = user.toObject();
  return safeUser;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(dto: LoginDto) {
  // Buscar usuario con campo password (select: false por defecto)
  const user = await usersRepository.findByEmailWithPassword(dto.email);

  // Mismo mensaje para email no encontrado Y contraseña incorrecta
  // (previene user enumeration)
  if (!user) {
    throw new AppError(401, 'Credenciales inválidas');
  }

  // PASO 2b ✅: Comparar la contraseña ingresada con el hash almacenado.
  // bcrypt.compare() extrae el salt del hash guardado, vuelve a hashear
  // la contraseña recibida y compara en tiempo constante.
  const passwordStr = user.password as string;
  const isValid = await bcrypt.compare(dto.password, passwordStr);
  if (!isValid) {
    throw new AppError(401, 'Credenciales inválidas');
  }

  // Firmar y retornar el access token
  const token = signAccessToken({
    sub: user._id.toString(),
    email: user.email as string,
    role: (user.role as string) ?? 'user',
  });

  return {
    token,
    user: { id: user._id, email: user.email, name: user.name, role: user.role },
  };
}

// ── Me ────────────────────────────────────────────────────────────────────────
export async function getMe(userId: string) {
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return user;
}
