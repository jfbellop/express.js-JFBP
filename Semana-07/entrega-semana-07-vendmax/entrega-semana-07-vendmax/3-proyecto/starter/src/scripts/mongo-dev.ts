import { MongoMemoryServer } from 'mongodb-memory-server';

// MongoDB de desarrollo, sin Docker. Uso: pnpm mongo
async function main(): Promise<void> {
  console.log('Preparando MongoDB (la primera vez descarga el binario)...');

  const mongo = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'vendmax_dev',
      storageEngine: 'wiredTiger',
    },
  });

  console.log('');
  console.log('MongoDB escuchando en ' + mongo.getUri());
  console.log('Deja ESTA terminal abierta. Ctrl+C para detener.');
  console.log('En otra terminal: pnpm seed -> pnpm dev');

  const stop = async (): Promise<void> => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

main().catch((err: unknown) => {
  console.error('No se pudo iniciar MongoDB:', err);
  process.exit(1);
});
