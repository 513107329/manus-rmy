import fs from 'fs/promises';
import path from 'path';
import YAML from 'yaml';
import lockfile from 'proper-lockfile';
import { v4 as uuidv4 } from 'uuid';
import { getSettings } from '../config';
import { AppConfig, A2AConfig, A2AServerConfig, LLMConfig, AgentConfig, McpConfig, McpServerConfig } from '../domain/models';

export class FileAppConfigRepository {
  constructor(private readonly filepath = getSettings().appConfigFilepath) {}

  private resolvePath(): string {
    return path.isAbsolute(this.filepath)
      ? this.filepath
      : path.resolve(process.cwd(), this.filepath);
  }

  private lockPath(): string {
    return `${this.resolvePath()}.lock`;
  }

  load(): AppConfig {
    const content = require('fs').readFileSync(this.resolvePath(), 'utf-8');
    const parsed = YAML.parse(content) as AppConfig;
    parsed.a2a_config.a2a_servers = (parsed.a2a_config.a2a_servers ?? []).map((s: A2AServerConfig) => ({
      ...s,
      id: s.id ?? uuidv4(),
      enabled: s.enabled ?? false,
    }));
    return parsed;
  }

  async save(config: AppConfig): Promise<void> {
    const filePath = this.resolvePath();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const release = await lockfile.lock(filePath, {
      lockfilePath: this.lockPath(),
      retries: { retries: 5, minTimeout: 100, maxTimeout: 1000 },
    });
    try {
      await fs.writeFile(filePath, YAML.stringify(config), 'utf-8');
    } finally {
      await release();
    }
  }
}

export class AppConfigService {
  constructor(private readonly repo = new FileAppConfigRepository()) {}

  getAppConfig(): AppConfig {
    return this.repo.load();
  }

  getLlmConfig(): LLMConfig {
    return this.getAppConfig().llm_config;
  }

  getAgentConfig(): AgentConfig {
    return this.getAppConfig().agent_config;
  }

  getMcpConfig(): McpConfig {
    return this.getAppConfig().mcp_config;
  }

  getA2aConfig(): A2AConfig {
    return this.getAppConfig().a2a_config;
  }

  async updateLlmConfig(config: LLMConfig): Promise<LLMConfig> {
    const appConfig = this.getAppConfig();
    appConfig.llm_config = config;
    await this.repo.save(appConfig);
    return config;
  }

  async updateAgentConfig(config: AgentConfig): Promise<AgentConfig> {
    const appConfig = this.getAppConfig();
    appConfig.agent_config = config;
    await this.repo.save(appConfig);
    return config;
  }

  async getMcpServers() {
    const config = this.getAppConfig();
    return Object.entries(config.mcp_config.mcpServers).map(([serverName, serverConfig]: [string, McpServerConfig]) => ({
      server_name: serverName,
      enabled: serverConfig.enabled,
      transport: serverConfig.transport,
      tools: [] as string[],
    }));
  }

  async updateAndCreateMcpServer(mcpConfig: McpConfig): Promise<McpConfig> {
    const appConfig = this.getAppConfig();
    appConfig.mcp_config.mcpServers = {
      ...appConfig.mcp_config.mcpServers,
      ...mcpConfig.mcpServers,
    };
    await this.repo.save(appConfig);
    return appConfig.mcp_config;
  }

  async deleteMcpServer(serverName: string): Promise<McpConfig> {
    const appConfig = this.getAppConfig();
    if (!(serverName in appConfig.mcp_config.mcpServers)) {
      throw new Error(`MCP服务 ${serverName} 不存在`);
    }
    delete appConfig.mcp_config.mcpServers[serverName];
    await this.repo.save(appConfig);
    return appConfig.mcp_config;
  }

  async enableMcpServer(serverName: string, enable: boolean): Promise<McpConfig> {
    const appConfig = this.getAppConfig();
    if (!(serverName in appConfig.mcp_config.mcpServers)) {
      throw new Error(`MCP服务 ${serverName} 不存在`);
    }
    appConfig.mcp_config.mcpServers[serverName].enabled = enable;
    await this.repo.save(appConfig);
    return appConfig.mcp_config;
  }

  async getA2aServers() {
    const config = this.getAppConfig();
    return {
      a2a_servers: config.a2a_config.a2a_servers.map((s: A2AServerConfig) => ({
        id: s.id!,
        name: '',
        description: '',
        input_modes: [],
        output_modes: [],
        streamable: false,
        push_notifications: false,
        enabled: s.enabled ?? false,
      })),
    };
  }

  async createA2aServer(baseUrl: string): Promise<A2AConfig> {
    const appConfig = this.getAppConfig();
    appConfig.a2a_config.a2a_servers.push({ id: uuidv4(), base_url: baseUrl, enabled: false });
    await this.repo.save(appConfig);
    return appConfig.a2a_config;
  }

  async deleteA2aServer(id: string): Promise<A2AConfig> {
    const appConfig = this.getAppConfig();
    const idx = appConfig.a2a_config.a2a_servers.findIndex((s: A2AServerConfig) => s.id === id);
    if (idx < 0) throw new Error(`A2A服务 ${id} 不存在`);
    appConfig.a2a_config.a2a_servers.splice(idx, 1);
    await this.repo.save(appConfig);
    return appConfig.a2a_config;
  }

  async enableA2aServer(id: string, enable: boolean): Promise<A2AConfig> {
    const appConfig = this.getAppConfig();
    const server = appConfig.a2a_config.a2a_servers.find((s: A2AServerConfig) => s.id === id);
    if (!server) throw new Error(`A2A服务 ${id} 不存在`);
    server.enabled = enable;
    await this.repo.save(appConfig);
    return appConfig.a2a_config;
  }
}

export const appConfigService = new AppConfigService();
