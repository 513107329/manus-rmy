import { NextFunction, Request, Response } from 'express';
import { AppException } from '../errors/AppException';
import { fail } from '../utils/response';
import { logger } from '../utils/logger';
import { getSettings } from '../config';
import { getSupervisorService } from '../services/supervisor.service';

const IGNORE_PATHS = [
  '/api/supervisor/active-timeout',
  '/api/supervisor/extend-timeout',
  '/api/supervisor/cancel-timeout',
  '/api/supervisor/timeout-status',
];

export async function autoExtendTimeoutMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const settings = getSettings();
  const supervisor = getSupervisorService();

  if (
    settings.serverTimeoutMinutes != null &&
    supervisor.expand_enabled &&
    req.path.startsWith('/api') &&
    !IGNORE_PATHS.some((p) => req.path.startsWith(p))
  ) {
    try {
      await supervisor.extendTimeout(3);
      logger.debug('调用API请求自动延长超时时间');
    } catch (e) {
      logger.warn(`自动延长超时失败：${(e as Error).message}`);
    }
  }
  next();
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppException) {
    logger.error(`AppException: ${err.msg}`);
    res.status(err.statusCode).json(fail(err.statusCode, err.msg, err.data));
    return;
  }

  logger.error(`Unhandled error: ${(err as Error).message}`);
  res.status(500).json(fail(500, 'Internal Server Error'));
}
