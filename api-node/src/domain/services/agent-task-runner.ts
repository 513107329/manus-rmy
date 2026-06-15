import { v4 as uuidv4 } from 'uuid';
import { getSettings } from '../../config';
import { appConfigService } from '../../services/app-config.service';
import { fileService } from '../../services/file.service';
import { sessionRepository } from '../../repositories/session.repository';
import { DockerSandbox } from '../../infrastructure/sandbox/docker-sandbox';
import { OpenAILLM } from '../../infrastructure/llm/openai-llm';
import { repairJsonParser } from '../../infrastructure/json-parser/repair-json-parser';
import { PlaywrightBrowser } from '../../infrastructure/browser/playwright-browser';
import { bingSearchEngine } from '../../infrastructure/search/bing-search';
import { PlannerReactFlow } from '../../domain/services/flows/planner-react-flow';
import { McpTool } from '../../domain/services/tools/mcp-tool';
import { A2ATool } from '../../domain/services/tools/a2a-tool';
import {
  AgentEvent,
  A2AToolContent,
  BrowserToolContent,
  DoneEvent,
  ErrorEvent,
  FileToolContent,
  MCPToolContent,
  MessageEvent,
  SearchToolContent,
  ShellToolContent,
  TitleEvent,
  ToolEvent,
  ToolEventStatus,
  WaitEvent,
} from '../../domain/events';
import { AgentMessage } from '../../domain/message';
import { FileRecord, SessionStatus } from '../../domain/models';
import { AgentTaskHandle, TaskRunner } from '../../domain/external/task';
import { getPrisma } from '../../infrastructure/database/prisma';
import { logger } from '../../utils/logger';

export class TaskCancelledError extends Error {
  constructor(message = 'Task cancelled') {
    super(message);
    this.name = 'TaskCancelledError';
  }
}

export class AgentTaskRunner implements TaskRunner {
  readonly taskId = uuidv4();
  private sandbox: DockerSandbox | null = null;
  private browser: PlaywrightBrowser | null = null;
  private readonly mcpTool = new McpTool();
  private readonly a2aTool = new A2ATool();
  private flow: PlannerReactFlow | null = null;

  constructor(private readonly sessionId: string) {}

  private async ensureSandbox(): Promise<DockerSandbox> {
    if (this.sandbox) return this.sandbox;
    const session = await sessionRepository.getById(this.sessionId);
    if (session?.sandbox_id) {
      this.sandbox = await DockerSandbox.get(session.sandbox_id);
    }
    if (!this.sandbox) {
      this.sandbox = await DockerSandbox.create();
      if (session) {
        session.sandbox_id = this.sandbox.id;
        session.status = SessionStatus.RUNNING;
        await sessionRepository.save(session);
      }
    }
    await this.sandbox.ensureSandboxExists();
    return this.sandbox;
  }

  private async ensureBrowser(): Promise<PlaywrightBrowser> {
    const sandbox = await this.ensureSandbox();
    if (!this.browser) {
      const llm = new OpenAILLM(appConfigService.getLlmConfig());
      this.browser = new PlaywrightBrowser(sandbox.cdpUrl, llm);
      await this.browser.initialize();
    }
    return this.browser;
  }

  private async buildFlow(): Promise<PlannerReactFlow> {
    const sandbox = await this.ensureSandbox();
    const browser = await this.ensureBrowser();
    const llm = new OpenAILLM(appConfigService.getLlmConfig());
    return new PlannerReactFlow(
      this.sessionId,
      llm,
      appConfigService.getAgentConfig(),
      repairJsonParser,
      sandbox,
      browser,
      bingSearchEngine,
      this.mcpTool,
      this.a2aTool,
    );
  }

  private async putAndAddEvent(task: AgentTaskHandle, event: AgentEvent): Promise<void> {
    const eventId = await task.outputStream.put(JSON.stringify(event));
    event.id = eventId;
    await sessionRepository.addEvent(this.sessionId, event);
  }

  private async popEvent(task: AgentTaskHandle): Promise<MessageEvent | null> {
    const [, eventStr] = await task.inputStream.pop();
    if (!eventStr) {
      logger.warn('AgentTaskRunner接收到空消息');
      return null;
    }
    const event = JSON.parse(eventStr) as MessageEvent;
    return event;
  }

  private resolveFileId(attachment: string | FileRecord): string {
    return typeof attachment === 'string' ? attachment : attachment.id;
  }

  private async syncAttachmentToSandbox(fileId: string): Promise<FileRecord | null> {
    if (!this.sandbox) return null;
    try {
      const { buffer, file } = await fileService.downloadFile(fileId);
      const filepath = `/home/ubuntu/upload/${file.filename}`;
      const result = await this.sandbox.fileUpload(buffer, filepath, file.filename);
      if (!result.success) {
        logger.error(`同步沙箱附件失败: ${result.error}`);
        return null;
      }
      file.filepath = filepath;
      await getPrisma().file.update({ where: { id: file.id }, data: { filepath } }).catch(() => undefined);
      return file;
    } catch (e) {
      logger.error(`同步沙箱附件失败: ${(e as Error).message}`);
      return null;
    }
  }

  private async syncMessageAttachmentsToSandbox(event: MessageEvent): Promise<void> {
    const synced: FileRecord[] = [];
    try {
      if (event.attachments?.length) {
        for (const attachment of event.attachments) {
          const fileId = this.resolveFileId(attachment);
          const file = await this.syncAttachmentToSandbox(fileId);
          if (file) {
            synced.push(file);
            await sessionRepository.addFile(this.sessionId, file);
          }
        }
      }
      event.attachments = synced;
    } catch (e) {
      logger.error(`同步沙箱附件失败: ${(e as Error).message}`);
    }
  }

  private async syncAttachmentToStorage(filepath: string): Promise<FileRecord | null> {
    if (!this.sandbox) return null;
    try {
      const existing = await sessionRepository.getFileByPath(this.sessionId, filepath);
      const fileData = await this.sandbox.fileDownload(filepath);
      if (existing) await sessionRepository.removeFile(this.sessionId, existing.id);
      const filename = filepath.split('/').pop() ?? 'file';
      const file = await fileService.uploadBuffer(fileData, filename, 'application/octet-stream');
      file.filepath = filepath;
      await sessionRepository.addFile(this.sessionId, file);
      return file;
    } catch (e) {
      logger.error(`同步存储桶附件失败: ${(e as Error).message}`);
      return null;
    }
  }

  private async syncMessageAttachmentsToStorage(event: MessageEvent): Promise<void> {
    const synced: FileRecord[] = [];
    try {
      if (event.attachments?.length) {
        for (const attachment of event.attachments) {
          const filepath = typeof attachment === 'string' ? attachment : attachment.filepath;
          if (!filepath) continue;
          const file = await this.syncAttachmentToStorage(filepath);
          if (file) synced.push(file);
        }
      }
      event.attachments = synced;
    } catch (e) {
      logger.error(`同步存储桶附件失败: ${(e as Error).message}`);
    }
  }

  private async getBrowserScreenshotUrl(): Promise<string> {
    try {
      const browser = await this.ensureBrowser();
      const screenshot = await browser.screenshot(true);
      const file = await fileService.uploadBuffer(screenshot, `${uuidv4()}.png`, 'image/png');
      const settings = getSettings();
      if (settings.storageMode === 'tos' && settings.tosBucket && settings.tosEndpoint) {
        return `https://${settings.tosBucket}.${settings.tosEndpoint}/${file.key}`;
      }
      return `/api/files/${file.id}/download`;
    } catch (e) {
      logger.error(`获取浏览器截图失败: ${(e as Error).message}`);
      return '';
    }
  }

  private async handleToolEvent(event: ToolEvent): Promise<void> {
    if (event.status !== ToolEventStatus.CALLED || !this.sandbox) return;
    try {
      if (event.tool_name === 'browser') {
        event.tool_content = {
          screenshot: await this.getBrowserScreenshotUrl(),
        } as BrowserToolContent;
      } else if (event.tool_name === 'search') {
        const searchResults = event.function_result;
        const data = searchResults?.data as { results?: SearchToolContent['results'] } | undefined;
        event.tool_content = { results: data?.results ?? [] } as SearchToolContent;
      } else if (event.tool_name === 'shell') {
        if (event.function_args.session_id) {
          const shellResult = await this.sandbox.viewShell(String(event.function_args.session_id), true);
          event.tool_content = {
            console: (shellResult.data as { console_records?: unknown })?.console_records ?? [],
          } as ShellToolContent;
        } else {
          event.tool_content = { content: '(No Console)' } as ShellToolContent;
        }
      } else if (event.tool_name === 'file') {
        if (event.function_args.filepath) {
          const filepath = String(event.function_args.filepath);
          const fileResult = await this.sandbox.fileRead(filepath);
          const data = fileResult.data as { content?: string };
          event.tool_content = { content: data?.content ?? '' } as FileToolContent;
          await this.syncAttachmentToStorage(filepath);
        } else {
          event.tool_content = { content: '(No Content)' } as FileToolContent;
        }
      } else if (event.tool_name === 'mcp' || event.tool_name === 'a2a') {
        const result = event.function_result;
        if (result?.data) {
          event.tool_content =
            event.tool_name === 'mcp'
              ? ({ result: result.data } as MCPToolContent)
              : ({ a2a_result: result.data } as A2AToolContent);
        } else if (result?.success) {
          const payload = result;
          event.tool_content =
            event.tool_name === 'mcp'
              ? ({ result: payload } as MCPToolContent)
              : ({ a2a_result: payload } as A2AToolContent);
        } else if (result) {
          event.tool_content =
            event.tool_name === 'mcp'
              ? ({ result: String(result) } as MCPToolContent)
              : ({ a2a_result: String(result) } as A2AToolContent);
        } else {
          event.tool_content =
            event.tool_name === 'mcp'
              ? ({ result: '(No Content)' } as MCPToolContent)
              : ({ a2a_result: '(No Content)' } as A2AToolContent);
        }
      }
    } catch (e) {
      logger.error(`处理工具事件失败: ${(e as Error).message}`);
    }
  }

  private async *runFlow(messageObj: AgentMessage): AsyncGenerator<AgentEvent> {
    if (!messageObj.message) {
      logger.warn('AgentTaskRunner接收到空消息');
      yield {
        id: uuidv4(),
        type: 'error',
        error: 'AgentTaskRunner接收到空消息',
        created_at: Date.now(),
      } as ErrorEvent;
      return;
    }
    if (!this.flow) throw new Error('PlannerReactFlow 未初始化');
    for await (const event of this.flow.invoke(messageObj)) {
      if (event.type === 'tool') {
        await this.handleToolEvent(event as ToolEvent);
      } else if (event.type === 'message') {
        await this.syncMessageAttachmentsToStorage(event as MessageEvent);
      }
      yield event;
    }
  }

  private async handleFlowEventSideEffects(event: AgentEvent): Promise<boolean> {
    if (event.type === 'title') {
      await sessionRepository.updateTitle(this.sessionId, (event as TitleEvent).title);
    } else if (event.type === 'message') {
      const msg = event as MessageEvent;
      await sessionRepository.updateLatestMessage(
        this.sessionId,
        msg.message,
        new Date(event.created_at ?? Date.now()),
      );
      await sessionRepository.incrementUnreadMsgCount(this.sessionId);
    } else if (event.type === 'wait') {
      await sessionRepository.updateStatus(this.sessionId, SessionStatus.WAITING);
      return true;
    }
    return false;
  }

  private assertNotCancelled(task: AgentTaskHandle): void {
    if (task.isCancelled()) {
      throw new TaskCancelledError();
    }
  }

  async invoke(task: AgentTaskHandle): Promise<void> {
    try {
      logger.debug('开始调用 agent 任务执行器');
      await this.ensureSandbox();
      await this.mcpTool.initialize(appConfigService.getMcpConfig());
      await this.a2aTool.initialize(appConfigService.getA2aConfig());
      this.flow = await this.buildFlow();

      while (!(await task.inputStream.isEmpty())) {
        this.assertNotCancelled(task);
        const event = await this.popEvent(task);
        if (!event || event.type !== 'message') continue;

        const message = event.message ?? '';
        await this.syncMessageAttachmentsToSandbox(event);

        const messageObj: AgentMessage = {
          message,
          attachments: (event.attachments ?? []).map((a) =>
            typeof a === 'string' ? a : a.filepath,
          ),
        };

        logger.info(`开始跑流程，message_obj: ${JSON.stringify(messageObj)}`);
        for await (const flowEvent of this.runFlow(messageObj)) {
          this.assertNotCancelled(task);
          await this.putAndAddEvent(task, flowEvent);
          const shouldStop = await this.handleFlowEventSideEffects(flowEvent);
          if (shouldStop) return;
        }

        if (await task.inputStream.isEmpty()) break;
      }

      await sessionRepository.updateStatus(this.sessionId, SessionStatus.COMPLETED);
    } catch (e) {
      if (e instanceof TaskCancelledError) {
        logger.info(`任务被取消: ${task.id}`);
        await this.putAndAddEvent(task, {
          id: uuidv4(),
          type: 'done',
          created_at: Date.now(),
        } as DoneEvent);
        await sessionRepository.updateStatus(this.sessionId, SessionStatus.COMPLETED);
        throw e;
      }
      logger.error(`任务执行失败: ${task.id}`, e);
      await this.putAndAddEvent(task, {
        id: uuidv4(),
        type: 'error',
        error: `AgentTaskRunner.invoke error: ${(e as Error).message}`,
        created_at: Date.now(),
      } as ErrorEvent);
      await sessionRepository.updateStatus(this.sessionId, SessionStatus.COMPLETED);
    } finally {
      await this.cleanupTools();
    }
  }

  async destroy(): Promise<void> {
    logger.info(`销毁任务执行器: ${this.sessionId}`);
    if (this.sandbox) {
      await this.sandbox.destroy();
    }
    await this.cleanupTools();
  }

  private async cleanupTools(): Promise<void> {
    await this.mcpTool.cleanup();
    await this.a2aTool.cleanup();
  }

  async onDone(task: AgentTaskHandle): Promise<void> {
    logger.info(`任务执行完成: ${task.id}`);
  }
}
