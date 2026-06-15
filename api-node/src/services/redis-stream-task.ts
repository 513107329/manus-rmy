import { v4 as uuidv4 } from 'uuid';
import { AgentTaskClass, AgentTaskHandle, TaskMessageQueue, TaskRunner } from '../domain/external/task';
import { TaskCancelledError } from '../domain/services/agent-task-runner';
import { getRedis } from '../infrastructure/redis/client';
import { logger } from '../utils/logger';

export class RedisStreamMessageQueue implements TaskMessageQueue {
  constructor(private readonly streamName: string) {}

  private get redis() {
    return getRedis();
  }

  async put(message: string): Promise<string> {
    const id = await this.redis.xadd(this.streamName, '*', 'message', message);
    return id ?? uuidv4();
  }

  async get(startId = '0', blockMs = 0): Promise<[string | null, string | null]> {
    const redis = this.redis as unknown as {
      xread: (...args: (string | number)[]) => Promise<[string, [string, string[]][]][] | null>;
    };
    const result =
      blockMs > 0
        ? await redis.xread('BLOCK', blockMs, 'COUNT', 1, 'STREAMS', this.streamName, startId)
        : await redis.xread('COUNT', 1, 'STREAMS', this.streamName, startId);
    if (!result || result.length === 0) return [null, null];
    const [, messages] = result[0];
    if (!messages?.length) return [null, null];
    const [messageId, fields] = messages[0];
    const idx = fields.indexOf('message');
    return [messageId, idx >= 0 ? fields[idx + 1] : null];
  }

  async pop(): Promise<[string | null, string | null]> {
    const messages = await this.redis.xrange(this.streamName, '-', '+', 'COUNT', 1);
    if (!messages?.length) return [null, null];
    const [messageId, fields] = messages[0];
    await this.redis.xdel(this.streamName, messageId);
    const idx = fields.indexOf('message');
    return [messageId, idx >= 0 ? fields[idx + 1] : null];
  }

  async isEmpty(): Promise<boolean> {
    const len = await this.redis.xlen(this.streamName);
    return len === 0;
  }
}

export class RedisStreamTask implements AgentTaskHandle {
  private static registry = new Map<string, RedisStreamTask>();
  readonly inputStream: RedisStreamMessageQueue;
  readonly outputStream: RedisStreamMessageQueue;
  private executionStarted = false;
  private executionFinished = false;
  private cancelled = false;

  constructor(private readonly runner: TaskRunner) {
    this.inputStream = new RedisStreamMessageQueue(`task:${runner.taskId}:input`);
    this.outputStream = new RedisStreamMessageQueue(`task:${runner.taskId}:output`);
    RedisStreamTask.registry.set(runner.taskId, this);
  }

  get id(): string {
    return this.runner.taskId;
  }

  /** 对齐 Python：未启动或已结束视为 done；执行中 done=false */
  get done(): boolean {
    if (this.cancelled) return true;
    if (!this.executionStarted) return false;
    return this.executionFinished;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  static create(runner: TaskRunner): RedisStreamTask {
    return new RedisStreamTask(runner);
  }

  static get(taskId: string): RedisStreamTask | undefined {
    return RedisStreamTask.registry.get(taskId);
  }

  static async destroy(): Promise<void> {
    RedisStreamTask.registry.clear();
  }

  async run(): Promise<void> {
    if (this.executionStarted && !this.executionFinished) return;
    if (this.cancelled) return;

    this.executionStarted = true;
    this.executionFinished = false;
    void this.executeTask();
  }

  private async executeTask(): Promise<void> {
    try {
      await this.runner.invoke(this);
    } catch (e) {
      if (!(e instanceof TaskCancelledError)) {
        logger.error(`Task ${this.id} invoke error: ${(e as Error).message}`);
      }
    } finally {
      this.executionFinished = true;
      RedisStreamTask.registry.delete(this.id);
      await this.runner.onDone?.(this);
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.executionFinished = true;
    RedisStreamTask.registry.delete(this.id);
  }
}

/** Redis Stream 实现的 Task 工厂（对齐 Python Task.create / Task.get） */
export const RedisStreamTaskClass: AgentTaskClass = RedisStreamTask;
