import { v4 as uuidv4 } from 'uuid';
import { AgentConfig } from '../../models';
import { Memory, MemoryMessage } from '../../memory';
import { AgentEvent, ErrorEvent, MessageEvent, ToolEvent, ToolEventStatus } from '../../events';
import { RepairJsonParser } from '../../../infrastructure/json-parser/repair-json-parser';
import { OpenAILLM, LLMMessage } from '../../../infrastructure/llm/openai-llm';
import { BaseTool } from '../tools/base-tool';
import { sessionRepository } from '../../../repositories/session.repository';
import { logger } from '../../../utils/logger';

export abstract class BaseAgent {
  protected memory: Memory | null = null;

  constructor(
    protected readonly sessionId: string,
    protected readonly agentConfig: AgentConfig,
    protected readonly llm: OpenAILLM,
    protected readonly jsonParser: RepairJsonParser,
    protected readonly tools: BaseTool[],
  ) {}

  protected abstract get name(): string;
  protected abstract get systemPrompt(): string;
  protected get format(): string | undefined {
    return 'json_object';
  }
  protected get toolChoice(): string | undefined {
    return undefined;
  }

  protected async ensureMemory(): Promise<void> {
    if (!this.memory) {
      this.memory = await sessionRepository.getMemory(this.sessionId, this.name);
    }
  }

  protected async saveMemory(): Promise<void> {
    if (this.memory) {
      await sessionRepository.saveMemory(this.sessionId, this.name, this.memory);
    }
  }

  protected getTool(functionName: string): BaseTool | undefined {
    return this.tools.find((t) => t.hasTool(functionName));
  }

  protected getAvailableTools() {
    return this.tools.flatMap((t) => t.getTools());
  }

  async compactMemory(): Promise<void> {
    await this.ensureMemory();
    this.memory!.compact();
    await this.saveMemory();
  }

  protected async addToMemory(messages: LLMMessage[]): Promise<void> {
    await this.ensureMemory();
    if (this.memory!.isEmpty) {
      this.memory!.addMessage({ role: 'system', content: this.systemPrompt });
    }
    this.memory!.addMessages(messages as MemoryMessage[]);
    await this.saveMemory();
  }

  protected async invokeTool(tool: BaseTool, toolName: string, toolArgs: Record<string, unknown>) {
    for (let i = 0; i < this.agentConfig.max_retries; i++) {
      try {
        return await tool.invoke(toolName, toolArgs);
      } catch (e) {
        logger.error(`执行工具失败: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return { success: false, error: '工具执行失败' };
  }

  protected async invokeLlm(messages: LLMMessage[], responseFormat?: string): Promise<LLMMessage> {
    await this.addToMemory(messages);
    for (let i = 0; i < this.agentConfig.max_retries; i++) {
      try {
        const message = await this.llm.invoke(this.memory!.getMessages() as LLMMessage[], {
          tools: this.getAvailableTools(),
          toolChoice: this.toolChoice,
          responseFormat: responseFormat ?? this.format,
        });

        if (message.role === 'assistant' && !message.content && !message.tool_calls?.length) {
          await this.addToMemory([
            { role: 'assistant', content: '' },
            { role: 'user', content: 'AI无响应内容，请重新生成' },
          ]);
          continue;
        }

        const filtered: LLMMessage = { role: message.role ?? 'assistant', content: message.content ?? '' };
        if (message.tool_calls?.length) {
          filtered.tool_calls = message.tool_calls.slice(0, 1);
        }
        await this.addToMemory([filtered]);
        return filtered;
      } catch (e) {
        logger.error(`调用大模型失败: ${(e as Error).message}`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error('调用大模型失败');
  }

  async *invoke(query: string, format?: string): AsyncGenerator<AgentEvent> {
    let message = await this.invokeLlm([{ role: 'user', content: query }], format);

    for (let i = 0; i < this.agentConfig.max_iterations; i++) {
      if (!message.tool_calls?.length) break;

      const toolMessages: LLMMessage[] = [];
      for (const toolCall of message.tool_calls) {
        const fn = toolCall.function;
        if (!fn?.name) continue;
        const toolId = toolCall.id ?? uuidv4();
        const functionArgs = await this.jsonParser.invoke(fn.arguments ?? '{}');
        const tool = this.getTool(fn.name);

        yield {
          id: uuidv4(),
          type: 'tool',
          created_at: Date.now(),
          tool_call_id: toolId,
          tool_name: tool?.name ?? '',
          function_name: fn.name,
          function_args: functionArgs,
          status: ToolEventStatus.CALLING,
        } as ToolEvent;

        const result = tool
          ? await this.invokeTool(tool, fn.name, functionArgs)
          : { success: false, message: 'tool not found' };

        yield {
          id: uuidv4(),
          type: 'tool',
          created_at: Date.now(),
          tool_call_id: toolId,
          tool_name: tool?.name ?? '',
          function_name: fn.name,
          function_args: functionArgs,
          function_result: result,
          status: ToolEventStatus.CALLED,
        } as ToolEvent;

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolId,
          content: JSON.stringify(result),
        });
      }

      message = await this.invokeLlm(toolMessages, format);
    }

    if (message.content) {
      yield {
        id: uuidv4(),
        type: 'message',
        role: 'assistant',
        message: message.content,
        created_at: Date.now(),
      } as MessageEvent;
    } else {
      yield {
        id: uuidv4(),
        type: 'error',
        error: '达到最大迭代次数或无响应',
        created_at: Date.now(),
      } as ErrorEvent;
    }
  }

  async rollBack(message: { message: string; attachments: string[] }): Promise<void> {
    await this.ensureMemory();
    const last = this.memory!.getLastMessage();
    if (!last?.tool_calls || !Array.isArray(last.tool_calls) || last.tool_calls.length === 0) {
      return;
    }
    const toolCall = last.tool_calls[0] as { function?: { name?: string }; id?: string };
    if (toolCall.function?.name === 'message_ask_user') {
      this.memory!.addMessage({
        role: 'tool',
        tool_call_id: toolCall.id,
        function_name: toolCall.function.name,
        content: JSON.stringify(message),
      });
    } else {
      this.memory!.rollbackMemory();
    }
    await this.saveMemory();
  }
}
