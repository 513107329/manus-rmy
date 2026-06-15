export interface AgentMessage {
  message: string;
  attachments: string[];
}

export function parseAgentMessage(raw: Record<string, unknown>): AgentMessage {
  return {
    message: String(raw.message ?? ''),
    attachments: Array.isArray(raw.attachments) ? raw.attachments.map(String) : [],
  };
}
