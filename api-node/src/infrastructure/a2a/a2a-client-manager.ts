import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { A2AConfig } from '../../domain/models';
import { toolFailure, toolSuccess, ToolResult } from '../../domain/tool-result';
import { logger } from '../../utils/logger';

export type AgentCard = Record<string, unknown> & { enabled?: boolean };

export class A2AClientManager {
  private client: AxiosInstance | null = null;
  private readonly agentCards = new Map<string, AgentCard>();
  private initialized = false;

  constructor(private readonly a2aConfig: A2AConfig) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.client = axios.create({ timeout: 600_000 });
    await this.fetchAgentCards();
    this.initialized = true;
    logger.info('A2A client initialized');
  }

  get cards(): Map<string, AgentCard> {
    return this.agentCards;
  }

  private async fetchAgentCards(): Promise<void> {
    for (const server of this.a2aConfig.a2a_servers ?? []) {
      if (!server.id) continue;
      try {
        const res = await this.client!.get(`${server.base_url}/.well-known/agent-card.json`);
        const card = { ...res.data, enabled: server.enabled ?? false } as AgentCard;
        this.agentCards.set(server.id, card);
      } catch (e) {
        logger.error(`Failed to get agent card for ${server.base_url}: ${(e as Error).message}`);
      }
    }
  }

  async invoke(agentId: string, query: string): Promise<ToolResult> {
    if (!this.client) return toolFailure('A2A client not initialized');
    const agentCard = this.agentCards.get(agentId);
    if (!agentCard) return toolFailure(`Agent ${agentId} not found`);

    const url = String(agentCard.url ?? '');
    if (!url) return toolFailure(`Agent ${agentId} url is empty`);

    try {
      const res = await this.client.post(url, {
        id: uuidv4(),
        jsonrpc: '2.0',
        method: 'message/send',
        params: {
          message: {
            messageId: uuidv4(),
            role: 'user',
            parts: [{ kind: 'text', text: query }],
          },
        },
      });
      return toolSuccess(res.data, '调用 agent 成功');
    } catch (e) {
      logger.error(`Call remote agent failed: ${(e as Error).message}`);
      return toolFailure(`调用远程 agent 失败: ${(e as Error).message}`);
    }
  }

  async cleanup(): Promise<void> {
    this.agentCards.clear();
    this.client = null;
    this.initialized = false;
    logger.info('A2A client cleaned up');
  }
}
