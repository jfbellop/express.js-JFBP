import 'dotenv/config';
import bcrypt from 'bcrypt';
import { connectDB, disconnectDB } from '../lib/mongoose';
import { UserModel } from '../models/user.model';
import { MachineModel } from '../models/machine.model';

// ============================================
// SEED — datos de demostración de VendMax
// ============================================
// Uso:  pnpm seed
// Crea 2 usuarios (admin + operador) y 6 máquinas de ejemplo.
// ============================================

const SALT_ROUNDS = 10;

async function main(): Promise<void> {
  await connectDB();

  console.log('🧹 Limpiando colecciones...');
  await Promise.all([UserModel.deleteMany({}), MachineModel.deleteMany({})]);

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@vendmax.co';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!';
  const operatorEmail = process.env.SEED_OPERATOR_EMAIL ?? 'operador@vendmax.co';
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD ?? 'Operador1234!';

  console.log('👤 Creando usuarios...');
  const admin = await UserModel.create({
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, SALT_ROUNDS), // nunca en texto plano
    name: 'Supervisora de Red',
    role: 'admin',
  });

  const operator = await UserModel.create({
    email: operatorEmail,
    password: await bcrypt.hash(operatorPassword, SALT_ROUNDS),
    name: 'Operador de Ruta',
    role: 'user',
  });

  console.log('🥤 Creando máquinas...');
  await MachineModel.create([
    {
      code: 'VM-001',
      model: 'SnackMaster 3000',
      type: 'snacks',
      location: 'Universidad Central — Bloque C, piso 2',
      status: 'operativa',
      slots: 36,
      cashBalanceCents: 148500,
      lastRestockedAt: new Date('2026-09-22T13:00:00Z'),
      createdBy: admin._id,
    },
    {
      code: 'VM-002',
      model: 'CoolDrink XL',
      type: 'bebidas',
      location: 'Universidad Central — Cafetería principal',
      status: 'operativa',
      slots: 24,
      temperatureC: 4,
      cashBalanceCents: 92300,
      lastRestockedAt: new Date('2026-09-23T10:30:00Z'),
      createdBy: admin._id,
    },
    {
      code: 'VM-003',
      model: 'CoolDrink XL',
      type: 'bebidas',
      location: 'Centro Empresarial Andino — Lobby',
      status: 'mantenimiento',
      slots: 24,
      temperatureC: 9,
      cashBalanceCents: 0,
      notes: 'Compresor con ruido, técnico asignado para el 27/09',
      createdBy: admin._id,
    },
    {
      code: 'VM-004',
      model: 'MixVend Pro',
      type: 'mixta',
      location: 'Hospital San Rafael — Urgencias',
      status: 'operativa',
      slots: 48,
      temperatureC: 6,
      cashBalanceCents: 231000,
      lastRestockedAt: new Date('2026-09-25T07:15:00Z'),
      createdBy: operator._id,
    },
    {
      code: 'VM-005',
      model: 'BaristaBot 200',
      type: 'cafe',
      location: 'Coworking La 93 — Piso 4',
      status: 'operativa',
      slots: 12,
      temperatureC: 20,
      cashBalanceCents: 57800,
      lastRestockedAt: new Date('2026-09-24T16:45:00Z'),
      createdBy: operator._id,
    },
    {
      code: 'VM-006',
      model: 'SnackMaster 3000',
      type: 'snacks',
      location: 'Terminal de Transportes — Sala de espera',
      status: 'fuera_de_servicio',
      slots: 36,
      cashBalanceCents: 0,
      notes: 'Vandalizada, pendiente de retiro',
      createdBy: admin._id,
    },
  ]);

  const machines = await MachineModel.countDocuments();
  console.log('\n✅ Seed completado');
  console.log(`   Usuarios: 2   |   Máquinas: ${machines}`);
  console.log(`   Admin    → ${adminEmail} / ${adminPassword}`);
  console.log(`   Operador → ${operatorEmail} / ${operatorPassword}\n`);

  await disconnectDB();
}

main().catch(async (err: unknown) => {
  console.error('❌ Error en el seed:', err);
  await disconnectDB().catch(() => undefined);
  process.exit(1);
});
