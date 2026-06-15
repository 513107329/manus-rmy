import { v4 as uuidv4 } from 'uuid';
import { NotFoundException } from '../errors/AppException';
import { FileRecord, Session, SessionStatus } from '../domain/models';
import { DockerSandbox } from '../infrastructure/sandbox/docker-sandbox';
import { sessionRepository, SessionRepository } from '../repositories/session.repository';

export class SessionService {
  constructor(private readonly repo: SessionRepository = sessionRepository) {}

  async createSession(): Promise<Session> {
    const session: Session = {
      id: uuidv4(),
      title: '新对话',
      unread_msg_count: 0,
      latest_msg: '',
      latest_message_at: new Date(),
      events: [],
      files: [],
      memories: {},
      status: SessionStatus.PENDING,
      created_at: new Date(),
      updated_at: new Date(),
    };
    await this.repo.save(session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session> {
    const session = await this.repo.getById(sessionId);
    if (!session) throw new NotFoundException(`找不到此会话${sessionId}`);
    return session;
  }

  async getSessions(): Promise<Session[]> {
    return this.repo.getAll();
  }

  async clearUnreadMsgCount(sessionId: string): Promise<void> {
    await this.repo.updateUnreadMsgCount(sessionId, 0);
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.getSession(sessionId);
    await this.repo.delete(sessionId);
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<void> {
    await this.getSession(sessionId);
    await this.repo.updateTitle(sessionId, title);
  }

  async getSessionFiles(sessionId: string): Promise<FileRecord[]> {
    const session = await this.getSession(sessionId);
    return session.files;
  }

  async getSessionFile(sessionId: string, filepath: string) {
    const session = await this.getSession(sessionId);
    if (!session.sandbox_id) throw new NotFoundException('此会话未创建沙箱');
    const sandbox = await DockerSandbox.get(session.sandbox_id);
    if (!sandbox) throw new NotFoundException(`找不到或者销毁了此会话${sessionId}的沙箱`);
    const result = await sandbox.fileRead(filepath);
    if (!result.success) throw new NotFoundException(`读取文件失败:${result.message}`);
    return result.data;
  }

  async readShellOutput(sessionId: string, shellSessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session.sandbox_id) throw new NotFoundException('此会话未创建沙箱');
    const sandbox = await DockerSandbox.get(session.sandbox_id);
    if (!sandbox) throw new NotFoundException(`找不到或者销毁了此会话${sessionId}的沙箱`);
    const result = await sandbox.viewShell(shellSessionId, true);
    if (!result.success) throw new NotFoundException(`读取shell失败:${result.message}`);
    return result.data;
  }

  async getSandboxVncUrl(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session.sandbox_id) throw new NotFoundException('此会话未创建沙箱');
    const sandbox = await DockerSandbox.get(session.sandbox_id);
    if (!sandbox) throw new NotFoundException(`找不到或者销毁了此会话${sessionId}的沙箱`);
    return sandbox.vncUrl;
  }
}

export const sessionService = new SessionService();
