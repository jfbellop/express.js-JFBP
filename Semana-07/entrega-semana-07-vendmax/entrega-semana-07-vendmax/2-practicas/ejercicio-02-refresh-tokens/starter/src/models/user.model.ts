// ============================================
// PASO 1 ✅ — Campo refreshToken en el Schema
// ============================================
//
// El campo `refreshToken` almacena el HASH bcrypt del refresh token
// (nunca el token en texto plano).
// Al hacer logout o una rotación fallida, se pone a null/undefined.

import mongoose, { Schema } from 'mongoose';

export interface IUser {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  refreshToken?: string | null; // ← PASO 1: hash del refresh token
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'Mínimo 8 caracteres'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'Mínimo 2 caracteres'],
      maxlength: [80, 'Máximo 80 caracteres'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // PASO 1 ✅: Campo para el hash del refresh token.
    // Si un atacante lee la base de datos, obtiene hashes inservibles:
    // no puede reconstruir el refresh token original.
    refreshToken: {
      type: String,
      select: false, // no se incluye en queries por defecto
      default: undefined,
    },
  },
  { timestamps: true },
);

export const User = mongoose.model<IUser>('User', userSchema);
