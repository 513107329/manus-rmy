import { NextFunction, Request, Response } from 'express';
import { AppException } from '../errors/AppException';
import { fail } from '../utils/response';
import { logger } from '../utils/logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppException) {
    logger.error(`AppException: ${err.msg}`);
    res.status(err.statusCode).json(fail(err.code, err.msg, err.data));
    return;
  }
  logger.error(`Unhandled error: ${(err as Error).message}`);
  res.status(500).json(fail(500, '服务器内部错误，请稍后重试'));
}
