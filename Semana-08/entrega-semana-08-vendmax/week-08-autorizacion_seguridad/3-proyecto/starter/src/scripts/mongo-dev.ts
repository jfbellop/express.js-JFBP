<<<<<<< HEAD
import { MongoMemoryServer } from 'mongodb-memory-server';

// ============================================================================
// MONGODB DE DESARROLLO — alternativa a Docker
// ============================================================================
// Levanta un servidor MongoDB real en el puerto 27017, sin Docker, sin
// instalar nada en el sistema y sin permisos de administrador.
// La primera ejecución descarga el binario de MongoDB (~100 MB) y lo deja
// cacheado dentro de node_modules; las siguientes arrancan en segundos.
//
// Uso:  pnpm mongo     (deja esta terminal abierta, Ctrl+C para detener)
//
// En el .env debe quedar:  MONGODB_URI=mongodb://localhost:27017/vendmax_semana08
// ============================================================================

async function main(): Promise<void> {
  console.log('⏳ Preparando MongoDB de desarrollo (la primera vez descarga el binario)...');

  const mongo = await MongoMemoryServer.create({
    instance: {
      port: 27017, // mismo puerto que usaría Docker
      dbName: 'vendmax_semana08',
=======
﻿import { MongoMemoryServer } from 'mongodb-memory-server';

// MongoDB de desarrollo, sin Docker. Uso: pnpm mongo
async function main(): Promise<void> {
  console.log('Preparando MongoDB (la primera vez descarga el binario)...');

  const mongo = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'vendmax_dev',
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
      storageEngine: 'wiredTiger',
    },
  });

<<<<<<< HEAD
  console.log('\n✅ MongoDB escuchando en', mongo.getUri());
  console.log('   .env  →  MONGODB_URI=mongodb://localhost:27017/vendmax_semana08');
  console.log('\n   Deja ESTA terminal abierta.');
  console.log('   En otra terminal:  pnpm seed  →  pnpm dev  →  pnpm test:flow');
  console.log('   Ctrl+C para detener la base de datos.\n');

  // Cierre ordenado
  const stop = async (): Promise<void> => {
    console.log('\n🛑 Deteniendo MongoDB...');
=======
  console.log('');
  console.log('MongoDB escuchando en ' + mongo.getUri());
  console.log('Deja ESTA terminal abierta. Ctrl+C para detener.');
  console.log('En otra terminal: pnpm seed -> pnpm dev');

  const stop = async (): Promise<void> => {
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

main().catch((err: unknown) => {
<<<<<<< HEAD
  console.error('❌ No se pudo iniciar MongoDB:', err);
=======
  console.error('No se pudo iniciar MongoDB:', err);
>>>>>>> 3339a8116a24bcc88df890a9c06c2e1a74cb61b8
  process.exit(1);
});
