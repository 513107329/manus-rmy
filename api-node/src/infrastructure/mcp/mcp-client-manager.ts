import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { McpConfig, McpServerConfig } from '../../domain/models';
import { toolFailure, toolSuccess, ToolResult } from '../../domain/tool-result';
import { ToolSchema } from '../../domain/services/tools/base-tool';
import { logger } from '../../utils/logger';

type McpToolInfo = { name: string; description?: string; inputSchema?: Record<string, unknown> };

export class McpClientManager {
  private readonly clients = new Map<string, Client>();
  private readonly transports: Array<{ close: () => Promise<void> }> = [];
  private readonly tools = new Map<string, McpToolInfo[]>();
  private initialized = false;

  constructor(private readonly mcpConfig: McpConfig) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const servers = Object.entries(this.mcpConfig.mcpServers ?? {}).filter(([, s]) => s.enabled);
    logger.info(`Loading ${servers.length} enabled MCP servers`);
    for (const [serverName, serverConfig] of servers) {
      try {
        await this.connectServer(serverName, serverConfig);
      } catch (e) {
        logger.error(`Connect MCP server [${serverName}] failed: ${(e as Error).message}`);
      }
    }
    this.initialized = true;
  }

  private async connectServer(serverName: string, config: McpServerConfig): Promise<void> {
    const transport = await this.createTransport(config);
    const client = new Client({ name: 'manus-api-node', version: '1.0.0' });
    await client.connect(transport);
    this.clients.set(serverName, client);
    this.transports.push({
      close: async () => {
        try {
          await client.close();
        } catch {
          /* ignore */
        }
      },
    });
    await this.cacheTools(serverName, client);
  }

  private async createTransport(config: McpServerConfig) {
    const headers = config.headers ?? undefined;
    if (config.transport === 'stdio') {
      if (!config.command) throw new Error('stdio MCP requires command');
      const env = { ...process.env, ...(config.env ?? {}) } as Record<string, string>;
      return new StdioClientTransport({
        command: config.command,
        args: config.args ?? [],
        env,
      });
    }
    if (!config.url) throw new Error(`${config.transport} MCP requires url`);
    const url = new URL(config.url);
    if (config.transport === 'sse') {
      return new SSEClientTransport(url, { requestInit: { headers } });
    }
    if (config.transport === 'streamable_http') {
      return new StreamableHTTPClientTransport(url, { requestInit: { headers } });
    }
    throw new Error(`Unsupported MCP transport: ${config.transport}`);
  }

  private async cacheTools(serverName: string, client: Client): Promise<void> {
    try {
      const response = await client.listTools();
      const list = (response.tools ?? []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown>,
      }));
      this.tools.set(serverName, list);
      logger.info(`MCP server [${serverName}] provides ${list.length} tools`);
    } catch (e) {
      logger.error(`List tools for [${serverName}] failed: ${(e as Error).message}`);
      this.tools.set(serverName, []);
    }
  }

  getAllTools(): ToolSchema[] {
    const all: ToolSchema[] = [];
    for (const [serverName, toolList] of this.tools.entries()) {
      for (const tool of toolList) {
        const prefix = serverName.startsWith('mcp_') ? serverName : `mcp_${serverName}`;
        const toolName = `${prefix}_${tool.name}`;
        all.push({
          type: 'function',
          function: {
            name: toolName,
            description: `[${serverName}] ${tool.description ?? tool.name}`,
            parameters: {
              type: 'object',
              properties: (tool.inputSchema?.properties as Record<string, Record<string, unknown>>) ?? {},
              required: (tool.inputSchema?.required as string[]) ?? [],
            },
          },
        });
      }
    }
    return all;
  }

  hasTool(toolName: string): boolean {
    const norm = (s: string) => s.replace(/-/g, '_');
    return this.getAllTools().some((t) => {
      const name = t.function.name;
      return name === toolName || norm(name) === norm(toolName);
    });
  }

  async invoke(toolName: string, args: Record<string, unknown>): Promise<ToolResult> {
    let serverName: string | null = null;
    let originalToolName: string | null = null;

    for (const name of this.mcpConfig.mcpServers ? Object.keys(this.mcpConfig.mcpServers) : []) {
      const expectedPrefix = name.startsWith('mcp_') ? name : `mcp_${name}`;
      const expectedPrefixAlt = expectedPrefix.replace(/-/g, '_');
      let prefixUsed: string | null = null;
      if (toolName.startsWith(`${expectedPrefix}_`)) prefixUsed = expectedPrefix;
      else if (toolName.startsWith(`${expectedPrefixAlt}_`)) prefixUsed = expectedPrefixAlt;
      if (prefixUsed) {
        serverName = name;
        originalToolName = toolName.slice(prefixUsed.length + 1);
        break;
      }
    }

    if (!serverName || !originalToolName) {
      return toolFailure(`服务器解析 MCP 工具不存在: ${toolName}`);
    }

    const client = this.clients.get(serverName);
    if (!client) {
      return toolFailure(`MCP 服务器 [${serverName}] 未连接`);
    }

    try {
      const result = await client.callTool({ name: originalToolName, arguments: args });
      const content: string[] = [];
      if (result.content && Array.isArray(result.content)) {
        for (const item of result.content) {
          if (item && typeof item === 'object' && 'text' in item) {
            content.push(String((item as { text: string }).text));
          } else {
            content.push(String(item));
          }
        }
      }
      return toolSuccess(content.length ? content.join('\n') : '工具执行成功');
    } catch (e) {
      logger.error(`Invoke MCP tool [${toolName}] failed: ${(e as Error).message}`);
      return toolFailure(`调用 MCP 工具 [${toolName}] 失败: ${(e as Error).message}`);
    }
  }

  async cleanup(): Promise<void> {
    if (!this.initialized) return;
    for (const transport of this.transports) {
      try {
        await transport.close();
      } catch (e) {
        logger.warn(`MCP transport close warning: ${(e as Error).message}`);
      }
    }
    this.clients.clear();
    this.tools.clear();
    this.transports.length = 0;
    this.initialized = false;
    logger.info('MCP client manager cleaned up');
  }
}
