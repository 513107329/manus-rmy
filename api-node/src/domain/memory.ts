import { logger } from '../utils/logger';
import OpenAI from 'openai';

export type MemoryMessage = {
  role: string;
  content?: string;
  tool_calls?: OpenAI.Chat.ChatCompletionMessageToolCall[];
  tool_call_id?: string;
  function_name?: string;
  reasoning_content?: string;
  [key: string]: unknown;
};

export class Memory {
  messages: MemoryMessage[] = [];

  addMessage(message: MemoryMessage): void {
    this.messages.push(message);
  }

  addMessages(messages: MemoryMessage[]): void {
    this.messages.push(...messages);
  }

  getMessages(): MemoryMessage[] {
    return this.messages;
  }

  getLastMessage(): MemoryMessage | null {
    return this.messages.length > 0 ? this.messages[this.messages.length - 1] : null;
  }

  rollbackMemory(): void {
    this.messages = this.messages.slice(0, -1);
  }

  compact(): void {
    for (const message of this.messages) {
      if (message.role === 'tool') {
        const fn = message.function_name as string | undefined;
        if (fn === 'browser_view' || fn === 'browser_navigate') {
          message.content = '(Removed)';
        }
      }
      if ('reasoning_content' in message) {
        delete message.reasoning_content;
      }
    }
    logger.debug('Memory compacted');
  }

  get isEmpty(): boolean {
    return this.messages.length === 0;
  }

  static fromJSON(raw: unknown): Memory {
    const mem = new Memory();
    if (raw && typeof raw === 'object' && Array.isArray((raw as Memory).messages)) {
      mem.messages = (raw as Memory).messages;
    }
    return mem;
  }

  toJSON(): { messages: MemoryMessage[] } {
    return { messages: this.messages };
  }
}
