import { createApp } from './routes';
import { getSettings } from './config';
import { logger } from './utils/logger';

export function startServer() {
  const app = createApp();
  const { port } = getSettings();

  app.listen(port, '0.0.0.0', () => {
    logger.info(`Manus sandbox (Node.js) listening on port ${port}`);
  });

  return app;
}

if (require.main === module) {
  startServer();
}

export { createApp };
