import { Router, Request, Response } from 'express';
import { appConfigService } from '../services/app-config.service';
import { success, fail } from '../utils/response';
import { AgentConfig, LLMConfig, McpConfig } from '../domain/models';

export const appConfigRouter = Router();

appConfigRouter.get('/llm-config', (_req, res: Response) => {
  const config = appConfigService.getLlmConfig();
  const { api_key: _, ...safe } = config;
  res.json(success('success', safe));
});

appConfigRouter.get('/agent-config', (_req, res: Response) => {
  res.json(success('success', appConfigService.getAgentConfig()));
});

appConfigRouter.get('/app-config', (_req, res: Response) => {
  const config = appConfigService.getAppConfig();
  const { api_key: _, ...llmSafe } = config.llm_config;
  res.json(success('success', { ...config, llm_config: llmSafe }));
});

appConfigRouter.post('/llm-config', async (req: Request<unknown, unknown, LLMConfig>, res: Response) => {
  const updated = await appConfigService.updateLlmConfig(req.body);
  const { api_key: _, ...safe } = updated;
  res.json(success('更新成功', safe));
});

appConfigRouter.post('/agent-config', async (req: Request<unknown, unknown, AgentConfig>, res: Response) => {
  const updated = await appConfigService.updateAgentConfig(req.body);
  res.json(success('更新成功', updated));
});

appConfigRouter.get('/mcp-servers', async (_req, res) => {
  const servers = await appConfigService.getMcpServers();
  res.json(success('success', servers));
});

appConfigRouter.post('/mcp-servers', async (req: Request<unknown, unknown, McpConfig>, res) => {
  const updated = await appConfigService.updateAndCreateMcpServer(req.body);
  res.json(success('创建成功', updated));
});

appConfigRouter.post('/mcp-servers/:serverName/enable', async (req, res) => {
  try {
    const updated = await appConfigService.enableMcpServer(req.params.serverName, req.body.enable);
    res.json(success('更新MCP服务启用状态成功', updated));
  } catch (e) {
    res.json(fail(500, (e as Error).message));
  }
});

appConfigRouter.delete('/mcp-servers/:serverName/delete', async (req, res) => {
  try {
    const updated = await appConfigService.deleteMcpServer(req.params.serverName);
    res.json(success('删除成功', updated));
  } catch (e) {
    res.json(fail(500, (e as Error).message));
  }
});

appConfigRouter.get('/a2a-servers', async (_req, res) => {
  const servers = await appConfigService.getA2aServers();
  res.json(success('success', servers));
});

appConfigRouter.post('/a2a-servers', async (req, res) => {
  const updated = await appConfigService.createA2aServer(req.body.base_url);
  res.json(success('创建成功', updated));
});

appConfigRouter.post('/a2a-servers/:id/enable', async (req, res) => {
  try {
    const updated = await appConfigService.enableA2aServer(req.params.id, req.body.enable);
    res.json(success('更新A2A服务启用状态成功', updated));
  } catch (e) {
    res.json(fail(500, (e as Error).message));
  }
});

appConfigRouter.delete('/a2a-servers/:id/delete', async (req, res) => {
  try {
    const updated = await appConfigService.deleteA2aServer(req.params.id);
    res.json(success('删除成功', updated));
  } catch (e) {
    res.json(fail(500, (e as Error).message));
  }
});
