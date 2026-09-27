import bcrypt from 'bcrypt';
<<<<<<< HEAD
import { AppError } from '../errors/AppError.js';
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateRefreshToken,
} from '../repositories/users.repository.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import type { RegisterDto, LoginDto } from '../schemas/auth.schema.js';

export async function register(dto: RegisterDto) {
  const existing = await findUserByEmail(dto.email);
  if (existing) throw new AppError(409, 'Email already registered');

  const hashed = await bcrypt.hash(dto.password, 12);
  const user = await createUser({ ...dto, password: hashed });
  return { id: user._id, name: user.name, email: user.email, role: user.role };
}

export async function login(dto: LoginDto) {
  const user = await findUserByEmail(dto.email);
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const refreshToken = signRefreshToken(user._id.toString());
  await updateRefreshToken(user._id.toString(), refreshToken);

  return { accessToken, refreshToken, role: user.role };
}

export async function refreshTokens(token: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  const user = await findUserById(payload.sub);
  if (!user) throw new AppError(401, 'User not found');

  const accessToken = signAccessToken({
    sub: user._id.toString(),
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = signRefreshToken(user._id.toString());
  await updateRefreshToken(user._id.toString(), newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string) {
  await updateRefreshToken(userId, null);
}

export async function getMe(userId: string) {
  const user = await findUserById(userId);
  if (!user) throw new AppError(404, 'User not found');
  return { id: user._id, name: user.name, email: user.email, role: user.role };
=======
import { AppError } from '../errors/AppError';
import * as usersRepository from '../repositories/users.repository';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { hashRefreshToken, compareRefreshToken } from '../utils/tokenHash';
import { RegisterDto, LoginDto } from '../schemas/auth.schema';
import { IUser } from '../models/user.model';

const SALT_ROUNDS = 10;
const COOKIE_ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutos
const COOKIE_REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días

export interface TokenCookieOptions {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
  refreshMaxAge: number;
}

export async function register(dto: RegisterDto): Promise<IUser> {
  const existing = await usersRepository.findByEmail(dto.email);
  if (existing) throw new AppError(409, 'El email ya está registrado');

  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  return usersRepository.create({ ...dto, password: hashedPassword });
}

export async function login(dto: LoginDto): Promise<TokenCookieOptions> {
  const user = await usersRepository.findByEmailWithPassword(dto.email);

  // Mismo mensaje para email no encontrado Y contraseña incorrecta
  // — previene user enumeration attacks
  if (!user) throw new AppError(401, 'Credenciales inválidas');

  const isMatch = await bcrypt.compare(dto.password, user.password);
  if (!isMatch) throw new AppError(401, 'Credenciales inválidas');

  const payload = { sub: user._id.toString(), email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ sub: user._id.toString() });

  // Almacenar HASH del refresh token — nunca el token en claro.
  // hashRefreshToken = bcrypt sobre un digest SHA-256 (ver utils/tokenHash.ts:
  // bcrypt trunca a 72 bytes y un JWT completo no cabe → la rotación fallaba).
  const hashedRefresh = await hashRefreshToken(refreshToken);
  await usersRepository.updateRefreshToken(user._id.toString(), hashedRefresh);

  return {
    accessToken,
    refreshToken,
    accessMaxAge: COOKIE_ACCESS_MAX_AGE,
    refreshMaxAge: COOKIE_REFRESH_MAX_AGE,
  };
}

export async function refresh(incomingToken: string): Promise<TokenCookieOptions> {
  // 1. Verificar firma y expiración del refresh token
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(incomingToken) as { sub: string };
  } catch {
    throw new AppError(401, 'Refresh token inválido o expirado');
  }

  // 2. Cargar usuario con su hash de refresh token
  const user = await usersRepository.findByIdWithTokens(payload.sub);
  if (!user || !user.refreshToken) {
    throw new AppError(401, 'Sesión no válida');
  }

  // 3. Comparar token recibido con hash almacenado
  const isValid = await compareRefreshToken(incomingToken, user.refreshToken);
  if (!isValid) throw new AppError(401, 'Refresh token no coincide');

  // 4. Rotar: generar nuevos tokens
  const newPayload = { sub: user._id.toString(), email: user.email, role: user.role };
  const newAccessToken = signAccessToken(newPayload);
  const newRefreshToken = signRefreshToken({ sub: user._id.toString() });

  // 5. Guardar nuevo hash, invalidar el anterior
  const newHashedRefresh = await hashRefreshToken(newRefreshToken);
  await usersRepository.updateRefreshToken(user._id.toString(), newHashedRefresh);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    accessMaxAge: COOKIE_ACCESS_MAX_AGE,
    refreshMaxAge: COOKIE_REFRESH_MAX_AGE,
  };
}

export async function logout(userId: string): Promise<void> {
  // Invalidar refresh token en la base de datos
  await usersRepository.updateRefreshToken(userId, undefined);
}

export async function getMe(userId: string): Promise<IUser> {
  const user = await usersRepository.findById(userId);
  if (!user) throw new AppError(404, 'Usuario no encontrado');
  return user;
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}
