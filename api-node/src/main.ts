import { createApp } from './routes';
import { attachVncWebSocket } from './routes/session.routes';
import { getSettings } from './config';
import { initDatabase, closeDatabase } from './infrastructure/database/prisma';
import { initRedis, closeRedis } from './infrastructure/redis/client';
import { logger } from './utils/logger';
import { Server } from 'http';

let server: Server | null = null;

export async function startServer(): Promise<Server> {
  await initDatabase();
  await initRedis();

  const app = createApp();
  const { port } = getSettings();

  server = app.listen(port, '0.0.0.0', () => {
    logger.info(`Manus API (Node.js) listening on port ${port}`);
  });

  attachVncWebSocket(server);

  const shutdown = async () => {
    logger.info('Shutting down...');
    await closeRedis();
    await closeDatabase();
    server?.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return server;
}

if (require.main === module) {
  startServer().catch((e) => {
    logger.error(`Failed to start server: ${e.message}`);
    process.exit(1);
  });
}

export { createApp };
