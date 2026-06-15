import { McpConfig } from '../../models';
import { toolFailure } from '../../tool-result';
import { McpClientManager } from '../../../infrastructure/mcp/mcp-client-manager';
import { BaseTool, ToolSchema } from './base-tool';
import { logger } from '../../../utils/logger';

export class McpTool extends BaseTool {
  readonly name = 'mcp';
  private manager: McpClientManager | null = null;
  private cachedTools: ToolSchema[] = [];
  private initialized = false;

  async initialize(config: McpConfig): Promise<void> {
    if (this.initialized) return;
    this.manager = new McpClientManager(config);
    await this.manager.initialize();
    this.cachedTools = this.manager.getAllTools();
    this.initialized = true;
    logger.info(`MCP tool loaded ${this.cachedTools.length} tools`);
  }

  override getTools(): ToolSchema[] {
    return this.cachedTools;
  }

  override hasTool(toolName: string): boolean {
    return this.manager?.hasTool(toolName) ?? false;
  }

  override async invoke(toolName: string, args: Record<string, unknown>) {
    if (!this.manager) return toolFailure('MCP 未初始化');
    return this.manager.invoke(toolName, args);
  }

  async cleanup(): Promise<void> {
    if (this.manager) await this.manager.cleanup();
    this.manager = null;
    this.cachedTools = [];
    this.initialized = false;
  }
}
