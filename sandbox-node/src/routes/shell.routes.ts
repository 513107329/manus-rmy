import { Router, Request, Response } from 'express';
import { shellService } from '../services/shell.service';
import { success } from '../utils/response';
import { BadRequestException } from '../errors/AppException';
import { validateBody } from '../middlewares/validate';
import {
  execCommandSchema,
  viewShellSchema,
  waitForProcessSchema,
  writeToProcessSchema,
  killProcessSchema,
} from '../schemas';
import os from 'os';

export const shellRouter = Router();

shellRouter.post('/exec-command', validateBody(execCommandSchema), async (req: Request, res: Response) => {
  let sessionId = req.body.session_id;
  if (!sessionId) sessionId = shellService.createSessionId();
  let execDir = req.body.exec_dir;
  if (!execDir) execDir = os.homedir();

  const result = await shellService.execCommand(sessionId, req.body.command, execDir);
  res.json(success('success', result));
});

shellRouter.post('/view_shell', validateBody(viewShellSchema), async (req, res) => {
  if (!req.body.session_id) throw new BadRequestException('会话ID不能为空');
  const result = await shellService.viewShell(req.body.session_id, req.body.console);
  res.json(success('success', result));
});

shellRouter.post('/wait_for_process', validateBody(waitForProcessSchema), async (req, res) => {
  if (!req.body.session_id) throw new BadRequestException('会话ID不能为空');
  const result = await shellService.waitForProcess(req.body.session_id, req.body.seconds);
  res.json(success(`返回状态码为${result.returncode}`, result));
});

shellRouter.post('/write-to-process', validateBody(writeToProcessSchema), async (req, res) => {
  if (!req.body.session_id) throw new BadRequestException('会话ID不能为空');
  const result = await shellService.writeToProcess(req.body.session_id, req.body.inputText, req.body.enter);
  res.json(success('向进程写入数据成功', result));
});

shellRouter.post('/kill-process', validateBody(killProcessSchema), async (req, res) => {
  if (!req.body.session_id) throw new BadRequestException('会话ID不能为空');
  const result = await shellService.killProcess(req.body.session_id);
  const message = result.status === 'terminated' ? '进程已终止' : '进程已结束';
  res.json(success(message, result));
});
