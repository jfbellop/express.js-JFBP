import { User } from '../models/user.model';
import type { RegisterDto } from '../schemas/auth.schema';

export async function findByEmail(email: string) {
  return User.findOne({ email }).lean();
}

// Buscar por email INCLUYENDO el campo password (que tiene select: false)
export async function findByEmailWithPassword(email: string) {
  return User.findOne({ email }).select('+password').lean();
}

export async function findById(id: string) {
  return User.findById(id).lean();
}

export async function create(dto: RegisterDto & { password: string }) {
  const user = await User.create(dto);
  return user;
}
