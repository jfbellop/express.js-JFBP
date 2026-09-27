import 'dotenv/config';
<<<<<<< HEAD
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../lib/mongoose.js';
import { User } from '../models/user.model.js';
import { Machine } from '../models/machine.model.js';

// ============================================================================
// SEED — VendMax semana 08
// ============================================================================
// Crea los usuarios de los dos roles y un parque de máquinas repartido entre
// ellos, para poder demostrar la matriz completa de RBAC:
//
//   admin@vendmax.co    / Admin1234!     → role: admin
//   operador@vendmax.co / Operador1234!  → role: user   (dueño de 4 máquinas)
//   tecnico@vendmax.co  / Tecnico1234!   → role: user   (dueño de 2 máquinas)
//
// Con dos usuarios de rol "user" se puede probar el caso clave: un usuario
// autenticado que intenta editar la máquina de OTRO → 403.
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/vendmax_semana08';

async function main(): Promise<void> {
  await connectDB(MONGODB_URI);

  console.log('🧹 Limpiando colecciones...');
  await Promise.all([User.deleteMany({}), Machine.deleteMany({})]);

  console.log('👤 Creando usuarios...');
  const [adminPass, operadorPass, tecnicoPass] = await Promise.all([
    bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!', 12),
    bcrypt.hash(process.env.SEED_OPERATOR_PASSWORD ?? 'Operador1234!', 12),
    bcrypt.hash('Tecnico1234!', 12),
  ]);

  const [admin, operador, tecnico] = await User.insertMany([
    {
      name: 'Administración VendMax',
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@vendmax.co',
      password: adminPass,
      role: 'admin',
    },
    {
      name: 'Operador Ruta Centro',
      email: process.env.SEED_OPERATOR_EMAIL ?? 'operador@vendmax.co',
      password: operadorPass,
      role: 'user',
    },
    {
      name: 'Técnico Ruta Norte',
      email: 'tecnico@vendmax.co',
      password: tecnicoPass,
      role: 'user',
    },
  ]);

  console.log('🥤 Creando máquinas...');
  const operadorId = String(operador._id);
  const tecnicoId = String(tecnico._id);

  await Machine.insertMany([
    {
      code: 'VM-001',
      modelName: 'CoolDrink 500',
      type: 'bebidas',
      location: 'Universidad Nacional — Bloque A',
      status: 'operativa',
      slots: 40,
      temperatureC: 4,
      cashBalanceCents: 185_400,
      lastRestockedAt: new Date('2026-09-22T09:30:00.000Z'),
      createdBy: operadorId,
    },
    {
      code: 'VM-002',
      modelName: 'SnackMaster 3000',
      type: 'snacks',
      location: 'Centro Comercial Andino — Piso 2',
      status: 'operativa',
      slots: 36,
      cashBalanceCents: 92_750,
      lastRestockedAt: new Date('2026-09-24T14:00:00.000Z'),
      createdBy: operadorId,
    },
    {
      code: 'VM-003',
      modelName: 'MixVend Pro',
      type: 'mixta',
      location: 'Hospital San Rafael — Urgencias',
      status: 'mantenimiento',
      slots: 50,
      temperatureC: 6,
      cashBalanceCents: 41_300,
      notes: 'Lector de billetes atascado',
      createdBy: operadorId,
    },
    {
      code: 'VM-004',
      modelName: 'CafeExpress 200',
      type: 'cafe',
      location: 'Torre Empresarial 93 — Lobby',
      status: 'operativa',
      slots: 24,
      temperatureC: 8,
      cashBalanceCents: 233_900,
      lastRestockedAt: new Date('2026-09-25T07:15:00.000Z'),
      createdBy: operadorId,
    },
    {
      code: 'VM-005',
      modelName: 'SnackMaster 3000',
      type: 'snacks',
      location: 'Estación Calle 100 — Andén norte',
      status: 'fuera_de_servicio',
      slots: 36,
      cashBalanceCents: 0,
      notes: 'Retirada por vandalismo, pendiente de reemplazo',
      createdBy: tecnicoId,
    },
    {
      code: 'VM-006',
      modelName: 'CoolDrink 500',
      type: 'bebidas',
      location: 'Aeropuerto El Dorado — Muelle internacional',
      status: 'operativa',
      slots: 40,
      temperatureC: 3,
      cashBalanceCents: 512_600,
      lastRestockedAt: new Date('2026-09-25T18:45:00.000Z'),
      createdBy: tecnicoId,
    },
  ]);

  console.log('\n✅ Seed completado');
  console.log(`   Usuarios: 3   |   Máquinas: 6`);
  console.log(`   Admin    → ${admin.email} / Admin1234!      (role: admin)`);
  console.log(`   Operador → ${operador.email} / Operador1234!   (role: user, 4 máquinas)`);
  console.log(`   Técnico  → ${tecnico.email} / Tecnico1234!    (role: user, 2 máquinas)\n`);

  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

main().catch((err: unknown) => {
  console.error('❌ Seed falló:', err);
=======
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
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  process.exit(1);
});
