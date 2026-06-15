export enum SessionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
}

export interface FileRecord {
  id: string;
  filename: string;
  filepath: string;
  key: string;
  extension: string;
  mime_type: string;
  size: number;
}

export interface BaseEvent {
  id: string;
  type: string;
  created_at: number;
  [key: string]: unknown;
}

export interface MessageEvent extends BaseEvent {
  type: 'message';
  role: 'user' | 'assistant';
  message: string;
  attachments?: FileRecord[];
}

export interface DoneEvent extends BaseEvent {
  type: 'done';
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  error: string;
}

export interface WaitEvent extends BaseEvent {
  type: 'wait';
}

export type Event = import('./events').AgentEvent;

export interface Session {
  id: string;
  sandbox_id?: string | null;
  task_id?: string | null;
  title: string;
  unread_msg_count: number;
  latest_msg: string;
  latest_message_at?: Date | null;
  events: Event[];
  files: FileRecord[];
  memories: Record<string, unknown>;
  status: SessionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface HealthStatus {
  status: 'ok' | 'error';
  service: string;
  detail?: string;
}

export interface LLMConfig {
  base_url: string;
  api_key: string;
  model_name: string;
  tempature: number;
  max_tokens: number;
}

export interface AgentConfig {
  max_iterations: number;
  max_retries: number;
  max_search_results: number;
}

export interface McpServerConfig {
  transport: string;
  enabled: boolean;
  description?: string;
  env?: Record<string, string> | null;
  command?: string | null;
  args?: string[] | null;
  url?: string | null;
  headers?: Record<string, string> | null;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

export interface A2AServerConfig {
  id?: string;
  base_url: string;
  enabled?: boolean;
}

export interface A2AConfig {
  a2a_servers: A2AServerConfig[];
}

export interface AppConfig {
  llm_config: LLMConfig;
  agent_config: AgentConfig;
  mcp_config: McpConfig;
  a2a_config: A2AConfig;
}
