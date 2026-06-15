export type ToolSchema = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, Record<string, unknown>>;
      required: string[];
    };
  };
};

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export abstract class BaseTool {
  abstract readonly name: string;
  private readonly schemas = new Map<string, ToolSchema>();
  private readonly handlers = new Map<string, ToolHandler>();

  protected registerTool(schema: ToolSchema, handler: ToolHandler): void {
    const toolName = schema.function.name;
    this.schemas.set(toolName, schema);
    this.handlers.set(toolName, handler);
  }

  getTools(): ToolSchema[] {
    return Array.from(this.schemas.values());
  }

  hasTool(toolName: string): boolean {
    return this.handlers.has(toolName);
  }

  async invoke(toolName: string, args: Record<string, unknown>) {
    const { toolSuccess, toolFailure } = await import('../../tool-result');
    const handler = this.handlers.get(toolName);
    if (!handler) {
      return toolFailure(`工具${toolName}未找到`);
    }
    try {
      const data = await handler(args);
      return toolSuccess(data);
    } catch (e) {
      return toolFailure((e as Error).message);
    }
  }
}

export function toolSchema(
  name: string,
  description: string,
  params: Record<string, Record<string, unknown>>,
  required: string[],
): ToolSchema {
  return {
    type: 'function',
    function: { name, description, parameters: { type: 'object', properties: params, required } },
  };
}
