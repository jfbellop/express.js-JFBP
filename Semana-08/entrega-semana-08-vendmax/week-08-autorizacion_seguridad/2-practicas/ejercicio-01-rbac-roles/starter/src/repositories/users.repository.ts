import { User, IUser } from '../models/user.model.js';

export async function findUserByEmail(email: string): Promise<IUser | null> {
  return User.findOne({ email }).select('+password +refreshToken');
}

export async function findUserById(id: string): Promise<IUser | null> {
  return User.findById(id);
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}): Promise<IUser> {
  return User.create(data);
}

export async function updateRefreshToken(
  userId: string,
  refreshToken: string | null
): Promise<void> {
  await User.findByIdAndUpdate(userId, { refreshToken });
}

export async function findAllUsers(): Promise<IUser[]> {
  return User.find().select('-__v');
}
