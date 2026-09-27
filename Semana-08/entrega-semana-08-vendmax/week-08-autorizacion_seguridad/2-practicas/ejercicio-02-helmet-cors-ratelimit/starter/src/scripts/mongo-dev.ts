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
// En el .env debe quedar:  MONGODB_URI=mongodb://localhost:27017/security_ejercicio
// ============================================================================

async function main(): Promise<void> {
  console.log('⏳ Preparando MongoDB de desarrollo (la primera vez descarga el binario)...');

  const mongo = await MongoMemoryServer.create({
    instance: {
      port: 27017, // mismo puerto que usaría Docker
      dbName: 'security_ejercicio',
      storageEngine: 'wiredTiger',
    },
  });

  console.log('\n✅ MongoDB escuchando en', mongo.getUri());
  console.log('   .env  →  MONGODB_URI=mongodb://localhost:27017/security_ejercicio');
  console.log('\n   Deja ESTA terminal abierta.');
  console.log('   En otra terminal:  pnpm seed  →  pnpm dev  →  pnpm test:flow');
  console.log('   Ctrl+C para detener la base de datos.\n');

  // Cierre ordenado
  const stop = async (): Promise<void> => {
    console.log('\n🛑 Deteniendo MongoDB...');
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

main().catch((err: unknown) => {
  console.error('❌ No se pudo iniciar MongoDB:', err);
  process.exit(1);
});
