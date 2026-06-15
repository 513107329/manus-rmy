import axios, { AxiosInstance } from 'axios';
import Docker from 'dockerode';
import fs from 'fs';
import dns from 'dns/promises';
import { v4 as uuidv4 } from 'uuid';
import { getSettings } from '../../config';
import { logger } from '../../utils/logger';

export interface ToolResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

function fromSandboxResponse<T>(body: { code?: number; message?: string; data?: T }): ToolResult<T> {
  const success = body.code === 200;
  return {
    success,
    message: body.message,
    data: body.data,
    error: success ? undefined : body.message,
  };
}

function isRunningInDocker(): boolean {
  try {
    return fs.existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

function createDockerClient(): Docker {
  const dockerHost = process.env.DOCKER_HOST;
  if (dockerHost) {
    if (dockerHost.startsWith('unix://')) {
      return new Docker({ socketPath: dockerHost.slice('unix://'.length) });
    }
    if (dockerHost.startsWith('npipe://')) {
      return new Docker({ socketPath: dockerHost.slice('npipe://'.length) });
    }
    return new Docker({ host: dockerHost });
  }
  if (process.platform === 'win32') {
    return new Docker({ socketPath: '//./pipe/docker_engine' });
  }
  return new Docker({ socketPath: '/var/run/docker.sock' });
}

function getDockerSocketPath(): string {
  const dockerHost = process.env.DOCKER_HOST;
  if (dockerHost?.startsWith('unix://')) return dockerHost.slice('unix://'.length);
  if (dockerHost?.startsWith('npipe://')) return dockerHost.slice('npipe://'.length);
  if (process.platform === 'win32') return '//./pipe/docker_engine';
  return '/var/run/docker.sock';
}

function wrapDockerError(err: unknown): Error {
  const message = err instanceof Error ? err.message : String(err);
  const code = err instanceof Error && 'code' in err ? String((err as NodeJS.ErrnoException).code) : '';

  if (code === 'ENOENT' && message.includes('docker.sock')) {
    return new Error(
      '无法连接 Docker 守护进程。动态创建沙箱需要 Docker 可用：\n'
      + '- 容器内运行 api-node 时挂载：-v /var/run/docker.sock:/var/run/docker.sock\n'
      + '- 本地 npm run dev 时确保 Docker Desktop 已启动',
    );
  }
  if (message.includes('No such image') || message.includes('pull access denied')) {
    return new Error(
      `沙箱镜像不存在或无法拉取，请先构建：docker build -t <SANDBOX_IMAGE> ./sandbox-node`,
    );
  }
  if (err instanceof Error) return err;
  return new Error(message);
}

function assertDynamicCreateReady(): void {
  const settings = getSettings();
  const socketPath = getDockerSocketPath();
  if (!fs.existsSync(socketPath)) {
    throw wrapDockerError(Object.assign(new Error(`connect ENOENT ${socketPath}`), { code: 'ENOENT' }));
  }
  if (isRunningInDocker() && !settings.sandboxNetwork) {
    throw new Error(
      '容器内动态创建沙箱必须设置 SANDBOX_NETWORK（与 api-node 相同，如 manus-network-dev），'
      + '否则新建的沙箱无法被 api-node 访问。',
    );
  }
}

export class DockerSandbox {
  private client: AxiosInstance;
  private readonly containerName: string | null;

  constructor(
    private readonly ip: string,
    containerName: string | null = null,
  ) {
    this.containerName = containerName;
    this.client = axios.create({
      baseURL: `http://${ip}:8000`,
      timeout: 600_000,
    });
  }

  get id(): string {
    return this.containerName ?? 'manus-sandbox';
  }

  get cdpUrl(): string {
    return `http://${this.ip}:9222`;
  }

  get vncUrl(): string {
    return `ws://${this.ip}:5901`;
  }

  private static getContainerIp(container: {
    NetworkSettings?: { IPAddress?: string; Networks?: Record<string, { IPAddress?: string }> };
  }): string | null {
    const networks = container.NetworkSettings?.Networks ?? {};
    for (const net of Object.values(networks)) {
      if (net?.IPAddress) return net.IPAddress;
    }
    return container.NetworkSettings?.IPAddress || null;
  }

  private static async resolveHostname(hostname: string): Promise<string> {
    try {
      return (await dns.lookup(hostname, { family: 4 })).address;
    } catch {
      return hostname;
    }
  }

  private static createContainer(): Promise<DockerSandbox> {
    assertDynamicCreateReady();

    const settings = getSettings();
    const docker = createDockerClient();
    const containerName = `${settings.sandboxNamePrefix}-${uuidv4()}`;
    const image = settings.sandboxImage ?? 'manus-sandbox-node';

    const hostConfig: Record<string, unknown> = {
      AutoRemove: true,
      Binds: ['/dev/shm:/dev/shm'],
    };
    if (settings.sandboxNetwork) {
      hostConfig.NetworkMode = settings.sandboxNetwork;
    }

    const config: Record<string, unknown> = {
      Image: image,
      name: containerName,
      HostConfig: hostConfig,
      Env: [
        `SERVICE_TIMEOUT_MINUTES=${settings.sandboxTtlMinutes}`,
        `CHROME_ARGS=${settings.sandboxChromeArgs ?? ''}`,
        `HTTPS_PROXY=${settings.sandboxHttpsProxy ?? ''}`,
        `HTTP_PROXY=${settings.sandboxHttpProxy ?? ''}`,
        `NO_PROXY=${settings.sandboxNoProxy ?? ''}`,
      ],
    };

    return new Promise((resolve, reject) => {
      docker
        .createContainer(config)
        .then((container) =>
          container
            .start()
            .then(() => container.inspect())
            .then((info) => {
              const ip = DockerSandbox.getContainerIp(info);
              if (!ip) {
                return reject(new Error(`Sandbox container ${containerName} has no IP`));
              }
              logger.info(`Sandbox container ${containerName} created at ${ip}`);
              resolve(new DockerSandbox(ip, containerName));
            }),
        )
        .catch((err) => reject(wrapDockerError(err)));
    });
  }

  static async create(): Promise<DockerSandbox> {
    const settings = getSettings();
    if (settings.sandboxAddress) {
      const ip = await DockerSandbox.resolveHostname(settings.sandboxAddress);
      return new DockerSandbox(ip, settings.sandboxNamePrefix);
    }
    return DockerSandbox.createContainer();
  }

  static async get(id: string): Promise<DockerSandbox | null> {
    const settings = getSettings();
    if (settings.sandboxAddress) {
      try {
        const ip = await DockerSandbox.resolveHostname(settings.sandboxAddress);
        return new DockerSandbox(ip, settings.sandboxNamePrefix);
      } catch (e) {
        logger.error(`Failed to get sandbox: ${e}`);
        return null;
      }
    }
    try {
      const docker = createDockerClient();
      const container = docker.getContainer(id);
      const info = await container.inspect();
      if (info.State?.Running !== true) {
        logger.error(`Sandbox container ${id} is not running`);
        return null;
      }
      const ip = DockerSandbox.getContainerIp(info);
      if (!ip) {
        logger.error(`Sandbox container ${id} has no IP`);
        return null;
      }
      return new DockerSandbox(ip, id);
    } catch (e) {
      logger.error(`Failed to get sandbox ${id}: ${e}`);
      return null;
    }
  }

  async destroy(): Promise<boolean> {
    if (!this.containerName) return true;
    try {
      const docker = createDockerClient();
      const container = docker.getContainer(this.containerName);
      await container.stop({ t: 5 });
      await container.remove({ force: true });
      return true;
    } catch (e) {
      throw new Error(`Failed to destroy sandbox: ${e}`);
    }
  }

  async ensureSandboxExists(): Promise<void> {
    const maxRetries = 30;
    const retryIntervalMs = 2000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await this.client.get('/api/supervisor/status');
        const result = fromSandboxResponse(res.data);

        if (!result.success) {
          logger.warn(`Sandbox supervisor status check failed: ${result.message}`);
          await new Promise((r) => setTimeout(r, retryIntervalMs));
          continue;
        }

        const services = result.data;
        if (!Array.isArray(services) || services.length === 0) {
          logger.warn('Sandbox supervisor returned no services');
          await new Promise((r) => setTimeout(r, retryIntervalMs));
          continue;
        }

        const notRunning = services.filter((s: { statename?: string }) => s.statename !== 'RUNNING');
        if (notRunning.length > 0) {
          logger.warn(
            `Sandbox services not ready: ${notRunning.map((s: { name?: string }) => s.name).join(', ')}`,
          );
          await new Promise((r) => setTimeout(r, retryIntervalMs));
          continue;
        }

        return;
      } catch (e) {
        if (attempt === maxRetries - 1) {
          throw new Error(`Failed to ensure sandbox is ready: ${(e as Error).message}`);
        }
        await new Promise((r) => setTimeout(r, retryIntervalMs));
      }
    }
    throw new Error('Failed to ensure sandbox is ready');
  }

  async fileRead(filepath: string, startLine?: number, endLine?: number, sudo = false) {
    const res = await this.client.post('/api/file/read-file', {
      filepath,
      start_line: startLine,
      end_line: endLine,
      sudo,
    });
    return fromSandboxResponse(res.data);
  }

  async fileWrite(
    filepath: string,
    content: string,
    append = false,
    leadingNewline = false,
    trailingNewline = false,
    sudo = false,
  ) {
    const res = await this.client.post('/api/file/write-file', {
      filepath,
      content,
      append,
      leading_newline: leadingNewline,
      trailing_newline: trailingNewline,
      sudo,
    });
    return fromSandboxResponse(res.data);
  }

  async viewShell(sessionId: string, console = false) {
    const res = await this.client.post('/api/shell/view_shell', {
      session_id: sessionId,
      console,
    });
    return fromSandboxResponse(res.data);
  }

  async execCommand(sessionId: string, command: string, execDir: string) {
    const res = await this.client.post('/api/shell/exec-command', {
      session_id: sessionId,
      command,
      exec_dir: execDir,
    });
    return fromSandboxResponse(res.data);
  }

  async fileReplace(filepath: string, oldStr: string, newStr: string, sudo = false) {
    const res = await this.client.post('/api/file/replace-in-file', {
      filepath,
      old_content: oldStr,
      new_content: newStr,
      sudo,
    });
    return fromSandboxResponse(res.data);
  }

  async fileSearch(filepath: string, regex: string, sudo = false) {
    const res = await this.client.post('/api/file/search-in-file', {
      filepath,
      regex,
      sudo,
    });
    return fromSandboxResponse(res.data);
  }

  async fileFind(dirpath: string, globPattern: string) {
    const res = await this.client.post('/api/file/find-files', {
      dir_path: dirpath,
      glob: globPattern,
    });
    return fromSandboxResponse(res.data);
  }

  async fileList(dirpath: string) {
    return this.fileFind(dirpath, '*');
  }

  async fileUpload(fileData: Buffer, filepath: string, filename: string) {
    const form = new FormData();
    form.append('file', new Blob([fileData]), filename);
    form.append('filepath', filepath);
    const res = await this.client.post('/api/file/upload-file', form);
    return fromSandboxResponse(res.data);
  }

  async checkFileExists(filepath: string) {
    const res = await this.client.post('/api/file/check-file-exists', { filepath });
    return fromSandboxResponse(res.data);
  }

  async fileDelete(filepath: string, sudo = false) {
    const res = await this.client.post('/api/file/delete-file', { filepath, sudo });
    return fromSandboxResponse(res.data);
  }

  async fileDownload(filepath: string, sudo = false): Promise<Buffer> {
    const res = await this.client.get('/api/file/download-file', {
      params: { filepath },
      responseType: 'arraybuffer',
    });
    return Buffer.from(res.data);
  }

  async waitForProcess(sessionId: string, seconds?: string) {
    const res = await this.client.post('/api/shell/wait_for_process', {
      session_id: sessionId,
      seconds,
    });
    return fromSandboxResponse(res.data);
  }

  async writeToProcess(sessionId: string, inputText: string, pressEnter = false) {
    const res = await this.client.post('/api/shell/write-to-process', {
      session_id: sessionId,
      inputText,
      enter: pressEnter,
    });
    return fromSandboxResponse(res.data);
  }

  async killProcess(sessionId: string) {
    const res = await this.client.post('/api/shell/kill-process', { session_id: sessionId });
    return fromSandboxResponse(res.data);
  }
}
