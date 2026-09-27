import 'dotenv/config';
import { app } from './app.js';
import { connectDB } from './lib/mongoose.js';
import { User } from './models/user.model.js';
import { Machine } from './models/machine.model.js';

const PORT = Number(process.env.PORT ?? 3000);
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vendmax_semana08';

async function main(): Promise<void> {
  await connectDB(MONGODB_URI);

  const [users, machines] = await Promise.all([User.countDocuments(), Machine.countDocuments()]);
  if (users === 0 || machines === 0) {
    console.log('\n⚠️  La base de datos está vacía. Ejecuta `pnpm seed` en otra terminal');
    console.log('   para crear los usuarios (admin/operador/técnico) y las 6 máquinas.\n');
  }

  app.listen(PORT, () => {
    console.log(`🥤 VendMax API  → http://localhost:${PORT}`);
    console.log(`   Health       → http://localhost:${PORT}/api/v1/health`);
    console.log(`   Catálogo     → http://localhost:${PORT}/api/v1/machines  (público)`);
    console.log(`   Usuarios BD: ${users}  |  Máquinas BD: ${machines}`);
  });
}

main().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
