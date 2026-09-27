import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../lib/mongoose.js';
import { User } from '../models/user.model.js';

// ============================================================================
// SEED — dos usuarios con roles distintos para probar RBAC
// ============================================================================
//   user@test.com  / User1234!   → role: user
//   admin@test.com / Admin1234!  → role: admin
//
// Uso:  pnpm seed   (borra los usuarios existentes y los recrea)
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/rbac_ejercicio';

async function main(): Promise<void> {
  await connectDB(MONGODB_URI);

  console.log('🧹 Limpiando usuarios...');
  await User.deleteMany({});

  console.log('👤 Creando usuarios...');
  const [userPassword, adminPassword] = await Promise.all([
    bcrypt.hash('User1234!', 12),
    bcrypt.hash('Admin1234!', 12),
  ]);

  await User.insertMany([
    { name: 'Regular User', email: 'user@test.com', password: userPassword, role: 'user' },
    { name: 'Admin User', email: 'admin@test.com', password: adminPassword, role: 'admin' },
  ]);

  console.log('\n✅ Seed completado');
  console.log('   user@test.com  / User1234!   (role: user)');
  console.log('   admin@test.com / Admin1234!  (role: admin)\n');

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

main().catch((err: unknown) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
