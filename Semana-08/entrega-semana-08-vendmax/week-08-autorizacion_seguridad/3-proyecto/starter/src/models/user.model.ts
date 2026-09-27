<<<<<<< HEAD
import { Schema, model, Document } from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  refreshToken?: string;
=======
import mongoose, { Document, Schema } from 'mongoose';

// ============================================
// MODELO DE USUARIO
// ============================================
// El rol por defecto es 'user'. Si tu dominio requiere
// roles adicionales (ej: 'admin', 'librarian', 'pharmacist'),
// agrégalos al enum de la propiedad role.
// ============================================

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
}

const userSchema = new Schema<IUser>(
  {
<<<<<<< HEAD
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    refreshToken: { type: String, select: false },
=======
    email: {
      type: String,
      required: [true, 'El email es requerido'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      select: false, // nunca se devuelve en queries por defecto
    },
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      select: false, // nunca se devuelve por defecto
    },
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  },
  { timestamps: true }
);

<<<<<<< HEAD
export const User = model<IUser>('User', userSchema);
=======
export const UserModel = mongoose.model<IUser>('User', userSchema);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
