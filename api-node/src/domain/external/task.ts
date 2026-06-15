/** TaskRunner 与 Task 契约（对齐 Python app/domain/external/task.py） */

export interface TaskMessageQueue {
  put(message: string): Promise<string>;
  get(startId: string, blockMs: number): Promise<[string | null, string | null]>;
  pop(): Promise<[string | null, string | null]>;
  isEmpty(): Promise<boolean>;
}

export interface AgentTaskHandle {
  readonly id: string;
  readonly done: boolean;
  readonly inputStream: TaskMessageQueue;
  readonly outputStream: TaskMessageQueue;
  isCancelled(): boolean;
  run(): Promise<void>;
  cancel(): void;
}

export interface TaskRunner {
  readonly taskId: string;
  invoke(task: AgentTaskHandle): Promise<void>;
  destroy?(): Promise<void>;
  onDone?(task: AgentTaskHandle): Promise<void>;
}

export interface AgentTaskClass {
  create(runner: TaskRunner): AgentTaskHandle;
  get(taskId: string): AgentTaskHandle | undefined;
  destroy(): Promise<void>;
}
