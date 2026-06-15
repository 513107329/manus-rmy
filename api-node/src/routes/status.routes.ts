import { Router, Request, Response } from 'express';
import { statusService } from '../services/status.service';
import { success, fail } from '../utils/response';
import { NotFoundException } from '../errors/AppException';

export const statusRouter = Router();

statusRouter.get('/health', async (_req: Request, res: Response) => {
  const statuses = await statusService.checkAll();
  if (statuses.some((s) => s.status === 'error')) {
    res.status(503).json(fail(503, '服务异常', statuses));
    return;
  }
  res.json(success('success', statuses));
});

statusRouter.get('/notFound', () => {
  throw new NotFoundException('资源未找到');
});
