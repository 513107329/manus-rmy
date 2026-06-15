import xmlrpc from 'xmlrpc';
import fs from 'fs';
import { getSettings } from '../config';
import { BadRequestException } from '../errors/AppException';
import { logger } from '../utils/logger';

export interface ProcessInfo {
  name: string;
  group: string;
  description: string;
  start: number;
  stop: number;
  now: number;
  state: number;
  statename: string;
  spawnerr: string;
  exitstatus: string;
  logfile: string;
  stdout_logfile: string;
  stderr_logfile: string;
  pid: number;
}

export interface SupervisorActionResult {
  status: string;
  stop_result?: boolean;
  start_result?: boolean;
  shutdown_result?: boolean;
}

export interface SupervisorTimeout {
  status?: string;
  active: boolean;
  shutdown_time?: string | null;
  timeout_minutes?: number;
  remaining_seconds?: number;
}

function createRpcClient(): xmlrpc.Client {
  const socketPath = '/tmp/supervisor.sock';
  if (!fs.existsSync(socketPath)) {
    throw new Error(`Supervisor socket not found: ${socketPath}`);
  }
  return xmlrpc.createClient({ socketPath, path: '/RPC2' } as Record<string, unknown>);
}

function callRpc<T>(method: string, ...args: unknown[]): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const client = createRpcClient();
      client.methodCall(method, args, (err: object | null, value: T) => {
        if (err) reject(err);
        else resolve(value);
      });
    } catch (e) {
      reject(e);
    }
  });
}

export class SupervisorService {
  private timeoutActive = false;
  private shutdownTime: Date | null = null;
  private shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  private expandEnabled = true;

  constructor() {
    const settings = getSettings();
    if (settings.serverTimeoutMinutes != null) {
      this.timeoutActive = true;
      this.shutdownTime = new Date(Date.now() + settings.serverTimeoutMinutes * 60 * 1000);
      this.setupTimer(settings.serverTimeoutMinutes);
    }
  }

  get expand_enabled(): boolean {
    return this.expandEnabled;
  }

  enableExpand(): void {
    this.expandEnabled = true;
  }

  disableExpand(): void {
    this.expandEnabled = false;
  }

  private setupTimer(minutes: number): void {
    if (this.shutdownTimer) clearTimeout(this.shutdownTimer);
    this.shutdownTimer = setTimeout(() => {
      this.shutdown().catch((e) => logger.error(`Auto shutdown failed: ${e}`));
    }, minutes * 60 * 1000);
  }

  async getAllStatus(): Promise<ProcessInfo[]> {
    return callRpc<ProcessInfo[]>('supervisor.getAllProcessInfo');
  }

  async stopAllProcess(): Promise<SupervisorActionResult> {
    const result = await callRpc<boolean>('supervisor.stopAllProcesses');
    return { status: 'stopped', stop_result: result };
  }

  async startAllProcess(): Promise<SupervisorActionResult> {
    const result = await callRpc<boolean>('supervisor.startAllProcesses');
    return { status: 'started', start_result: result };
  }

  async shutdown(): Promise<SupervisorActionResult> {
    const result = await callRpc<boolean>('supervisor.shutdown');
    return { status: 'shutdown', shutdown_result: result };
  }

  async restart(): Promise<SupervisorActionResult> {
    const stopResult = await callRpc<boolean>('supervisor.stopAllProcesses');
    const startResult = await callRpc<boolean>('supervisor.startAllProcesses');
    return { status: 'restarted', stop_result: stopResult, start_result: startResult };
  }

  async activeTimeout(minutes?: number): Promise<SupervisorTimeout> {
    const settings = getSettings();
    const timeoutMinutes = minutes ?? settings.serverTimeoutMinutes;
    if (timeoutMinutes == null) {
      throw new BadRequestException('超时时间未设置，并且未读取到系统默认的超时时间');
    }
    this.timeoutActive = true;
    this.shutdownTime = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    this.setupTimer(timeoutMinutes);
    return this.buildTimeout('timeout_activited', timeoutMinutes);
  }

  async extendTimeout(minutes: number): Promise<SupervisorTimeout> {
    if (minutes == null) {
      throw new BadRequestException('超时时间未设置，并且未读取到系统默认的超时时间');
    }
    const remaining = this.shutdownTime
      ? Math.max(0, (this.shutdownTime.getTime() - Date.now()) / 60000)
      : 0;
    const timeoutMinutes = Math.round(remaining) + minutes;
    this.timeoutActive = true;
    this.shutdownTime = new Date(Date.now() + timeoutMinutes * 60 * 1000);
    this.setupTimer(timeoutMinutes);
    return this.buildTimeout('timeout_extended', timeoutMinutes);
  }

  async cancelTimeout(): Promise<SupervisorTimeout> {
    if (!this.timeoutActive) {
      return { status: 'no_timeout_active', active: false };
    }
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }
    this.timeoutActive = false;
    this.shutdownTime = null;
    this.expandEnabled = true;
    return { status: 'timeout_cancelled', active: false };
  }

  async getTimeoutStatus(): Promise<SupervisorTimeout> {
    if (!this.timeoutActive) return { active: false };
    const remainingSeconds = this.shutdownTime
      ? Math.max(0, (this.shutdownTime.getTime() - Date.now()) / 1000)
      : 0;
    return {
      active: this.timeoutActive,
      shutdown_time: this.shutdownTime?.toISOString() ?? null,
      remaining_seconds: remainingSeconds,
    };
  }

  private buildTimeout(status: string, timeoutMinutes: number): SupervisorTimeout {
    const remainingSeconds = this.shutdownTime
      ? Math.max(0, (this.shutdownTime.getTime() - Date.now()) / 1000)
      : 0;
    return {
      status,
      active: true,
      shutdown_time: this.shutdownTime?.toISOString(),
      timeout_minutes: timeoutMinutes,
      remaining_seconds: remainingSeconds,
    };
  }
}

let supervisorServiceInstance: SupervisorService | null = null;

export function getSupervisorService(): SupervisorService {
  if (!supervisorServiceInstance) {
    supervisorServiceInstance = new SupervisorService();
  }
  return supervisorServiceInstance;
}

export function resetSupervisorService(): void {
  supervisorServiceInstance = null;
}
