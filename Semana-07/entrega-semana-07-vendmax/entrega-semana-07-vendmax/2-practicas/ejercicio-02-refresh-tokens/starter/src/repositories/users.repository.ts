import { User } from '../models/user.model';
import type { RegisterDto } from '../schemas/auth.schema';

export async function findByEmail(email: string) {
  return User.findOne({ email }).lean();
}

export async function findByEmailWithPassword(email: string) {
  return User.findOne({ email }).select('+password').lean();
}

// Buscar por ID incluyendo password y refreshToken
export async function findByIdWithTokens(id: string) {
  return User.findById(id).select('+password +refreshToken').lean();
}

export async function findById(id: string) {
  return User.findById(id).lean();
}

export async function create(dto: RegisterDto & { password: string }) {
  return User.create(dto);
}

// Actualizar solo el hash del refresh token (o borrarlo en logout)
export async function updateRefreshToken(id: string, hashedToken: string | undefined) {
  return User.findByIdAndUpdate(id, { refreshToken: hashedToken ?? null });
}
