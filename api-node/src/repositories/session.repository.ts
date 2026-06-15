import { Prisma } from '@prisma/client';
import { getPrisma } from '../infrastructure/database/prisma';
import { Memory } from '../domain/memory';
import { Event, FileRecord, Session, SessionStatus } from '../domain/models';

function toDomain(record: {
  id: string;
  sandboxId: string | null;
  taskId: string | null;
  title: string;
  unreadMsgCount: number;
  latestMsg: string;
  latestMessageAt: Date | null;
  events: unknown;
  files: unknown;
  memories: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Session {
  return {
    id: record.id,
    sandbox_id: record.sandboxId,
    task_id: record.taskId,
    title: record.title,
    unread_msg_count: record.unreadMsgCount,
    latest_msg: record.latestMsg,
    latest_message_at: record.latestMessageAt,
    events: (record.events as Event[]) ?? [],
    files: (record.files as FileRecord[]) ?? [],
    memories: (record.memories as Record<string, unknown>) ?? {},
    status: record.status as SessionStatus,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export class SessionRepository {
  constructor(private readonly prisma = getPrisma()) {}

  async save(session: Session): Promise<void> {
    await this.prisma.session.upsert({
      where: { id: session.id },
      create: {
        id: session.id,
        sandboxId: session.sandbox_id ?? null,
        taskId: session.task_id ?? null,
        title: session.title,
        unreadMsgCount: session.unread_msg_count,
        latestMsg: session.latest_msg,
        latestMessageAt: session.latest_message_at ?? new Date(),
        events: session.events as unknown as Prisma.InputJsonValue,
        files: session.files as unknown as Prisma.InputJsonValue,
        memories: session.memories as unknown as Prisma.InputJsonValue,
        status: session.status,
      },
      update: {
        sandboxId: session.sandbox_id ?? null,
        taskId: session.task_id ?? null,
        title: session.title,
        unreadMsgCount: session.unread_msg_count,
        latestMsg: session.latest_msg,
        latestMessageAt: session.latest_message_at ?? undefined,
        events: session.events as unknown as Prisma.InputJsonValue,
        files: session.files as unknown as Prisma.InputJsonValue,
        memories: session.memories as unknown as Prisma.InputJsonValue,
        status: session.status,
      },
    });
  }

  async getAll(): Promise<Session[]> {
    const records = await this.prisma.session.findMany({ orderBy: { latestMessageAt: 'desc' } });
    return records.map(toDomain);
  }

  async getById(id: string): Promise<Session | null> {
    const record = await this.prisma.session.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await this.prisma.session.update({ where: { id }, data: { title } });
  }

  async updateLatestMessage(id: string, latestMessage: string, timestamp: Date): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { latestMsg: latestMessage, latestMessageAt: timestamp },
    });
  }

  async updateUnreadMsgCount(id: string, count: number): Promise<void> {
    await this.prisma.session.update({ where: { id }, data: { unreadMsgCount: count } });
  }

  async updateStatus(id: string, status: SessionStatus): Promise<void> {
    await this.prisma.session.update({ where: { id }, data: { status } });
  }

  async addEvent(id: string, event: Event): Promise<void> {
    const session = await this.getById(id);
    if (!session) throw new Error(`会话 ${id} 不存在`);
    session.events.push(event);
    await this.save(session);
  }

  async getMemory(sessionId: string, agentName: string): Promise<Memory> {
    const session = await this.getById(sessionId);
    if (!session) return new Memory();
    const raw = session.memories?.[agentName];
    return Memory.fromJSON(raw);
  }

  async saveMemory(sessionId: string, agentName: string, memory: Memory): Promise<void> {
    const session = await this.getById(sessionId);
    if (!session) return;
    session.memories = { ...session.memories, [agentName]: memory.toJSON() };
    await this.save(session);
  }

  async incrementUnreadMsgCount(id: string): Promise<void> {
    const session = await this.getById(id);
    if (!session) return;
    await this.updateUnreadMsgCount(id, session.unread_msg_count + 1);
  }

  async addFile(id: string, file: FileRecord): Promise<void> {
    const session = await this.getById(id);
    if (!session) return;
    session.files.push(file);
    await this.save(session);
  }

  async getFileByPath(sessionId: string, filepath: string): Promise<FileRecord | null> {
    const session = await this.getById(sessionId);
    if (!session) return null;
    return session.files.find((f) => f.filepath === filepath) ?? null;
  }

  async removeFile(sessionId: string, fileId: string): Promise<void> {
    const session = await this.getById(sessionId);
    if (!session) return;
    session.files = session.files.filter((f) => f.id !== fileId);
    await this.save(session);
  }
}

export const sessionRepository = new SessionRepository();
