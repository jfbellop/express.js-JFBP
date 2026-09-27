import 'dotenv/config';
import { app } from './app';
import { connectDB } from './lib/mongoose';

const PORT = Number(process.env.PORT) || 3000;

async function start(): Promise<void> {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err: unknown) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
