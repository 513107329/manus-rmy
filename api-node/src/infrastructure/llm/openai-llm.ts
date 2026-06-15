import OpenAI from 'openai';
import { LLMConfig } from '../../domain/models';
import { InternalServerErrorException } from '../../errors/AppException';
import { logger } from '../../utils/logger';
import { ToolSchema } from '../../domain/services/tools/base-tool';

export interface LLMMessage {
  role: string;
  content?: string;
  tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
}

export interface InvokeOptions {
  tools?: ToolSchema[];
  toolChoice?: string;
  responseFormat?: string;
}

export class OpenAILLM {
  private client: OpenAI;

  constructor(private readonly config: LLMConfig) {
    this.client = new OpenAI({
      baseURL: config.base_url,
      apiKey: config.api_key || 'sk-placeholder',
      timeout: 3600_000,
    });
  }

  async invoke(messages: LLMMessage[], options: InvokeOptions = {}): Promise<LLMMessage> {
    try {
      const body: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
        model: this.config.model_name,
        messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
        temperature: this.config.tempature,
        max_tokens: this.config.max_tokens,
      };

      if (options.responseFormat === 'json_object') {
        body.response_format = { type: 'json_object' };
      }
      console.log(options)
      if (options.tools?.length) {
        body.tools = options.tools as OpenAI.Chat.ChatCompletionTool[];
        body.tool_choice = (options.toolChoice as OpenAI.Chat.ChatCompletionToolChoiceOption) ?? 'auto';
        body.parallel_tool_calls = false;
      }

      const response = await this.client.chat.completions.create(body);
      const msg = response.choices[0]?.message;
      console.log(msg)
      return {
        role: msg?.role ?? 'assistant',
        content: msg?.content ?? '',
        tool_calls: msg?.tool_calls,
      };
    } catch (e) {
      logger.error(`调用LLM失败: ${(e as Error).message}`);
      throw new InternalServerErrorException(`调用LLM失败: ${(e as Error).message}`);
    }
  }
}
