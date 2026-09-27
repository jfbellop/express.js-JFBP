import mongoose from 'mongoose';

<<<<<<< HEAD
export async function connectDB(uri: string): Promise<void> {
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
=======
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

  await mongoose.connect(uri);
  console.log('MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
