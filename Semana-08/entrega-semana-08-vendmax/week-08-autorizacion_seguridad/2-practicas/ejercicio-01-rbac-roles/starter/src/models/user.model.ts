import { Schema, model, Document } from 'mongoose';

// Role defines what actions a user can perform (RBAC)
export type UserRole = 'user' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false — password never returned in queries by default
    password: { type: String, required: true, select: false },
    // role defaults to 'user' — principle of least privilege
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    // select: false — refresh token not exposed in queries
    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);
