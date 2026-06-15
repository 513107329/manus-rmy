import { Router, Request, Response } from 'express';
import { getSupervisorService } from '../services/supervisor.service';
import { success } from '../utils/response';
import { validateBody } from '../middlewares/validate';
import { supervisorTimeoutSchema } from '../schemas';

export const supervisorRouter = Router();

supervisorRouter.get('/status', async (_req: Request, res: Response) => {
  const result = await getSupervisorService().getAllStatus();
  res.json(success('获取成功', result));
});

supervisorRouter.post('/stop-all-process', async (_req, res) => {
  const result = await getSupervisorService().stopAllProcess();
  res.json(success('停止成功', result));
});

supervisorRouter.post('/start-all-process', async (_req, res) => {
  const result = await getSupervisorService().startAllProcess();
  res.json(success('启动成功', result));
});

supervisorRouter.post('/shutdown', async (_req, res) => {
  const result = await getSupervisorService().shutdown();
  res.json(success('关闭成功', result));
});

supervisorRouter.post('/restart', async (_req, res) => {
  const result = await getSupervisorService().restart();
  res.json(success('重启成功', result));
});

supervisorRouter.post('/active-timeout', validateBody(supervisorTimeoutSchema), async (req, res) => {
  const svc = getSupervisorService();
  const result = await svc.activeTimeout(req.body.minutes);
  svc.enableExpand();
  res.json(success('超时销毁已设置', result));
});

supervisorRouter.post('/extend-timeout', validateBody(supervisorTimeoutSchema), async (req, res) => {
  const svc = getSupervisorService();
  const result = await svc.extendTimeout(req.body.minutes ?? 3);
  svc.disableExpand();
  res.json(success('已延长超时时间', result));
});

supervisorRouter.post('/cancel-timeout', async (_req, res) => {
  const result = await getSupervisorService().cancelTimeout();
  res.json(success('销毁事件已取消', result));
});

supervisorRouter.post('/timeout-status', async (_req, res) => {
  const result = await getSupervisorService().getTimeoutStatus();
  const msg = !result.active ? '未生成销毁事件' : `剩余分钟数: ${Math.floor((result.remaining_seconds ?? 0) / 60)}`;
  res.json(success(msg, result));
});
