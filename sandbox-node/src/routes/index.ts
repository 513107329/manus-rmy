import express, { Express } from 'express';
import cors from 'cors';
import { fileRouter } from './file.routes';
import { shellRouter } from './shell.routes';
import { supervisorRouter } from './supervisor.routes';
import { autoExtendTimeoutMiddleware, errorHandler } from '../middlewares';

export function createApp(): Express {
  const app = express();
  app.use(cors({ origin: '*', credentials: true }));
  app.use(express.json());
  app.use(autoExtendTimeoutMiddleware);

  const apiRouter = express.Router();
  apiRouter.use('/file', fileRouter);
  apiRouter.use('/shell', shellRouter);
  apiRouter.use('/supervisor', supervisorRouter);
  app.use('/api', apiRouter);

  app.use(errorHandler);
  return app;
}
