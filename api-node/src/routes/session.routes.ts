import { Router, Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import WebSocketLib from 'ws';
import { sessionService } from '../services/session.service';
import { agentService } from '../services/agent.service';
import { success } from '../utils/response';
import { EventMapper, formatSse } from '../utils/event-mapper';
import { logger } from '../utils/logger';

export const sessionRouter = Router();

sessionRouter.post('/', async (_req, res: Response) => {
  const session = await sessionService.createSession();
  res.json(success('创建任务会话成功', { session_id: session.id }));
});

sessionRouter.get('/stream', async (req, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = async () => {
    const sessions = await sessionService.getSessions();
    const payload = {
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        unread_msg_count: s.unread_msg_count,
        latest_msg: s.latest_msg,
        latest_message_at: s.latest_message_at,
        status: s.status,
      })),
    };
    res.write(formatSse({ event: 'sessions', data: payload as unknown as Record<string, unknown> }));
  };

  await send();
  const timer = setInterval(send, 5000);
  req.on('close', () => clearInterval(timer));
});

sessionRouter.get('/', async (_req, res) => {
  const sessions = await sessionService.getSessions();
  res.json(
    success('获取任务会话列表成功', {
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        unread_msg_count: s.unread_msg_count,
        latest_msg: s.latest_msg,
        latest_message_at: s.latest_message_at,
        status: s.status,
      })),
    }),
  );
});

sessionRouter.get('/:sessionId', async (req, res) => {
  const session = await sessionService.getSession(req.params.sessionId);
  res.json(
    success('获取任务会话详情成功', {
      id: session.id,
      title: session.title,
      unread_msg_count: session.unread_msg_count,
      latest_msg: session.latest_msg,
      latest_message_at: session.latest_message_at,
      status: session.status,
    }),
  );
});

sessionRouter.post('/:sessionId/clear-unread-session-message', async (req, res) => {
  await sessionService.clearUnreadMsgCount(req.params.sessionId);
  res.json(success('清空未读消息成功'));
});

sessionRouter.post('/:sessionId/delete', async (req, res) => {
  await sessionService.deleteSession(req.params.sessionId);
  res.json(success('删除会话成功'));
});

sessionRouter.post('/:sessionId/update-title', async (req, res) => {
  await sessionService.updateSessionTitle(req.params.sessionId, req.query.title as string);
  res.json(success('更新会话标题成功'));
});

sessionRouter.post('/:sessionId/chat', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const { message, attachments, event_id: eventId } = req.body ?? {};
  const sessionId = req.params.sessionId;

  try {
    for await (const event of agentService.chat(sessionId, message, attachments, eventId)) {
      if (res.writableEnded || res.destroyed) break;
      const sse = EventMapper.eventToSseEvent(event);
      res.write(formatSse(sse));
    }
  } catch (e) {
    if (!res.writableEnded) {
      logger.error(`Session ${sessionId} chat SSE error: ${(e as Error).message}`);
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

sessionRouter.get('/:sessionId/messages', async (req, res) => {
  const session = await sessionService.getSession(req.params.sessionId);
  res.json(
    success('获取会话消息成功', {
      session_id: session.id,
      title: session.title,
      events: EventMapper.eventsToSseEvents(session.events),
      status: session.status,
    }),
  );
});

sessionRouter.post('/:sessionId/stop', async (req, res) => {
  await agentService.stopSession(req.params.sessionId);
  res.json(success('停止会话成功'));
});

sessionRouter.get('/:sessionId/files', async (req, res) => {
  const files = await sessionService.getSessionFiles(req.params.sessionId);
  res.json(success('获取会话文件成功', { session_id: req.params.sessionId, files }));
});

sessionRouter.post('/:sessionId/file', async (req, res) => {
  const data = await sessionService.getSessionFile(req.params.sessionId, req.body.filepath);
  res.json(success('获取会话文件成功', data));
});

sessionRouter.post('/:sessionId/shell', async (req, res) => {
  const data = await sessionService.readShellOutput(req.params.sessionId, req.body.session_id);
  res.json(success('获取会话shell成功', data));
});

function decodeClientVncPayload(data: WebSocketLib.RawData, protocol: string): Buffer {
  if (protocol === 'base64') {
    const text = typeof data === 'string' ? data : Buffer.from(data as Buffer).toString('utf8');
    return Buffer.from(text, 'base64');
  }
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

function encodeSandboxVncPayload(data: WebSocketLib.RawData, protocol: string): Buffer | string {
  const buf = Buffer.isBuffer(data)
    ? data
    : Array.isArray(data)
      ? Buffer.concat(data)
      : Buffer.from(data);
  return protocol === 'base64' ? buf.toString('base64') : buf;
}

export function attachVncWebSocket(server: Server): void {
  const wss = new WebSocketServer({
    noServer: true,
    handleProtocols(protocols) {
      if (protocols.has('binary')) return 'binary';
      if (protocols.has('base64')) return 'base64';
      return false;
    },
  });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const match = url.pathname.match(/^\/api\/sessions\/([^/]+)\/vnc$/);
    if (!match) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, async (ws) => {
      const sessionId = match[1];
      const clientProtocol = ws.protocol || 'binary';
      try {
        const vncUrl = await sessionService.getSandboxVncUrl(sessionId);
        logger.info(`Connecting VNC upstream: ${vncUrl} (client protocol: ${clientProtocol})`);
        // 对齐 Python：沙箱 websockify 不接受 binary/base64 子协议
        const sandboxWs = new WebSocketLib(vncUrl);

        sandboxWs.on('open', () => {
          ws.on('message', (data) => {
            if (sandboxWs.readyState === WebSocketLib.OPEN) {
              sandboxWs.send(decodeClientVncPayload(data, clientProtocol));
            }
          });
          sandboxWs.on('message', (data) => {
            if (ws.readyState === WebSocketLib.OPEN) {
              ws.send(encodeSandboxVncPayload(data, clientProtocol));
            }
          });
        });

        ws.on('close', () => sandboxWs.close());
        sandboxWs.on('close', () => ws.close());
        ws.on('error', (e) => {
          logger.error(`VNC client error: ${e.message}`);
          sandboxWs.close();
        });
        sandboxWs.on('error', (e) => {
          logger.error(`VNC upstream error: ${e.message}`);
          ws.close(1011, '连接沙箱环境失败');
        });
      } catch (e) {
        logger.error(`VNC WebSocket failed: ${(e as Error).message}`);
        ws.close(1011, `连接沙箱环境失败：${(e as Error).message}`);
      }
    });
  });
}
