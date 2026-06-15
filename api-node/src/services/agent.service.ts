import { v4 as uuidv4 } from 'uuid';
import { Event, ErrorEvent, MessageEvent, SessionStatus } from '../domain/models';
import { sessionRepository } from '../repositories/session.repository';
import { AgentTaskRunner } from '../domain/services/agent-task-runner';
import { AgentTaskHandle } from '../domain/external/task';
import { RedisStreamTask } from './redis-stream-task';
import { logger } from '../utils/logger';

export { RedisStreamMessageQueue, RedisStreamTask } from './redis-stream-task';
export { AgentTaskRunner } from '../domain/services/agent-task-runner';

const TERMINAL_EVENT_TYPES = new Set(['done', 'error', 'wait']);
const DRAIN_IDLE_LIMIT = 30;
const DRAIN_IDLE_MS = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function* pollTaskOutput(
  task: AgentTaskHandle,
  sessionId: string,
  startCursor: string,
): AsyncGenerator<Event> {
  let cursor = startCursor;
  let receivedTerminal = false;
  let idleAfterDone = 0;

  while (true) {
    const blockMs = task.done ? 0 : 200;
    const [id, data] = await task.outputStream.get(cursor === '0' ? '0' : cursor, blockMs);

    if (id && data) {
      idleAfterDone = 0;
      cursor = id;
      const event = JSON.parse(data) as Event;
      event.id = id;
      await sessionRepository.updateUnreadMsgCount(sessionId, 0);
      yield event;

      if (TERMINAL_EVENT_TYPES.has(event.type)) {
        receivedTerminal = true;
      }
      continue;
    }

    if (receivedTerminal) break;

    if (task.done) {
      idleAfterDone += 1;
      if (idleAfterDone >= DRAIN_IDLE_LIMIT) {
        logger.warn(`Session ${sessionId} output drain ended without terminal event`);
        break;
      }
      await sleep(DRAIN_IDLE_MS);
      continue;
    }
  }
}

export class AgentService {
  private getTask(session: { task_id?: string | null }) {
    return session.task_id ? RedisStreamTask.get(session.task_id) : undefined;
  }

  async *chat(
    sessionId: string,
    message?: string,
    attachments?: string[],
    latestEventId?: string,
  ): AsyncGenerator<Event> {
    try {
      const session = await sessionRepository.getById(sessionId);
      if (!session) throw new Error(`会话${sessionId}不存在`);

      let task = this.getTask(session);
      if (message) {
        if (session.status !== SessionStatus.RUNNING || !task) {
          const runner = new AgentTaskRunner(sessionId);
          task = RedisStreamTask.create(runner);
          session.task_id = task.id;
          session.status = SessionStatus.RUNNING;
          await sessionRepository.save(session);
        }

        await sessionRepository.updateLatestMessage(sessionId, message, new Date());
        const messageEvent: MessageEvent = {
          id: uuidv4(),
          type: 'message',
          role: 'user',
          message,
          attachments: attachments?.map((id) => ({ id, filename: '', filepath: '', key: '', extension: '', mime_type: '', size: 0 })) ?? [],
          created_at: Date.now(),
        };
        const eventId = await task.inputStream.put(JSON.stringify(messageEvent));
        messageEvent.id = eventId;
        await sessionRepository.addEvent(sessionId, messageEvent);

        await task.run();

        const cursor = latestEventId ?? '0';
        yield* pollTaskOutput(task, sessionId, cursor);
      }
    } catch (e) {
      yield {
        id: uuidv4(),
        type: 'error',
        error: (e as Error).message,
        created_at: Date.now(),
      } as ErrorEvent;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = await sessionRepository.getById(sessionId);
    if (!session) throw new Error(`会话${sessionId}不存在`);
    const task = this.getTask(session);
    if (!task) throw new Error(`会话${sessionId}的任务不存在`);
    task.cancel();
  }
}

export const agentService = new AgentService();
