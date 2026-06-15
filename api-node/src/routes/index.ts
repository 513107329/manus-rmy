import express, { Express } from 'express';
import cors from 'cors';
import { Server } from 'http';
import { statusRouter } from './status.routes';
import { appConfigRouter } from './app-config.routes';
import { fileRouter } from './file.routes';
import { sessionRouter, attachVncWebSocket } from './session.routes';
import { errorHandler } from '../middlewares/errorHandler';
import { setupSwagger } from '../swagger/config';

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());

  setupSwagger(app);

  const router = express.Router();
  router.use('/status', statusRouter);
  router.use('/app-config', appConfigRouter);
  router.use('/files', fileRouter);
  router.use('/sessions', sessionRouter);
  app.use('/api', router);

  app.use(errorHandler);
  return app;
}

export function createServer(): Server {
  const app = createApp();
  const server = app.listen();
  attachVncWebSocket(server);
  return server;
}
