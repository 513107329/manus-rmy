import { A2AConfig } from '../../models';
import { A2AClientManager } from '../../../infrastructure/a2a/a2a-client-manager';
import { BaseTool, toolSchema } from './base-tool';
import { logger } from '../../../utils/logger';

export class A2ATool extends BaseTool {
  readonly name = 'a2a';
  private manager: A2AClientManager | null = null;
  private initialized = false;

  constructor() {
    super();
    this.registerTool(
      toolSchema('get_remote_agent_cards', '获取远程 agent 卡片', {}, []),
      async () => {
        if (!this.manager) return [];
        return Array.from(this.manager.cards.entries()).map(([id, card]) => ({ id, ...card }));
      },
    );
    this.registerTool(
      toolSchema(
        'call_remote_agent',
        '调用远程 agent',
        {
          agent_id: { type: 'string', description: '要调用的 agent 的 id' },
          query: { type: 'string', description: '要调用的 agent 的查询' },
        },
        ['agent_id', 'query'],
      ),
      async (args) => {
        if (!this.manager) throw new Error('A2A 未初始化');
        const result = await this.manager.invoke(String(args.agent_id), String(args.query));
        if (!result.success) throw new Error(result.message ?? result.error);
        return result.data;
      },
    );
  }

  async initialize(config: A2AConfig): Promise<void> {
    if (this.initialized) return;
    this.manager = new A2AClientManager(config);
    await this.manager.initialize();
    this.initialized = true;
    logger.info(`A2A tool loaded ${this.manager.cards.size} agent cards`);
  }

  async cleanup(): Promise<void> {
    if (this.manager) await this.manager.cleanup();
    this.manager = null;
    this.initialized = false;
  }
}
