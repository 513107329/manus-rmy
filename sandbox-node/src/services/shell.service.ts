import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AppException, BadRequestException, NotFoundException } from '../errors/AppException';
import { logger } from '../utils/logger';

export interface ConsoleRecord {
  ps1: string;
  command: string;
  output: string;
}

export interface ShellSession {
  process: ChildProcessWithoutNullStreams;
  execDir: string;
  output: string;
  consoleRecords: ConsoleRecord[];
}

export interface ShellExecResult {
  session_id: string;
  command: string;
  status: 'completed' | 'running';
  returncode?: number | null;
  stdout?: string;
  stderr?: string;
}

export interface ShellViewResult {
  session_id: string;
  output: string;
  console_records: ConsoleRecord[];
}

export interface WaitProcessResult {
  returncode: number | null;
}

export interface WriteToProcessResult {
  session_id: string;
  command: string;
  status: string;
  returncode: number | null;
  stdout: string;
  stderr: string;
}

export interface ShellKillResult {
  status: 'terminated' | 'already_terminated';
  returncode: number | null;
}

const ANSI_ESCAPE = /\x1B(?:[@-Z\\-_]|\[[0-9?]*[0-9;]*[A-PR-Z])/g;

export class ShellService {
  private activeShells = new Map<string, ShellSession>();

  createSessionId(): string {
    return uuidv4();
  }

  private getDisplayPath(execDir: string): string {
    const homeDir = os.homedir();
    if (execDir.startsWith(homeDir)) {
      return execDir.replace(homeDir, '~');
    }
    return execDir;
  }

  private formatPs1(execDir: string): string {
    const username = os.userInfo().username;
    const hostname = os.hostname();
    return `${username}@${hostname}:${this.getDisplayPath(execDir)}`;
  }

  private removeAnsi(text: string): string {
    return text.replace(ANSI_ESCAPE, '');
  }

  private createProcess(execDir: string, command: string): ChildProcessWithoutNullStreams {
    return spawn('/bin/bash', ['-c', command], {
      cwd: execDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
  }

  private readOutput(sessionId: string, proc: ChildProcessWithoutNullStreams): void {
    const shell = this.activeShells.get(sessionId);
    if (!shell) return;

    proc.stdout.on('data', (chunk: Buffer) => {
      const code = chunk.toString('utf-8');
      shell.output += code;
      const last = shell.consoleRecords[shell.consoleRecords.length - 1];
      if (last) last.output += code;
    });
  }

  private getConsoleRecords(sessionId: string): ConsoleRecord[] {
    const shell = this.activeShells.get(sessionId);
    if (!shell) return [];
    return shell.consoleRecords.map((r) => ({
      ps1: r.ps1,
      command: r.command,
      output: this.removeAnsi(r.output),
    }));
  }

  async waitForProcess(sessionId: string, seconds: number): Promise<WaitProcessResult> {
    const shell = this.activeShells.get(sessionId);
    if (!shell) throw new NotFoundException('会话不存在');

    const timeoutMs = (seconds <= 0 ? 60 : seconds) * 1000;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new BadRequestException('shell会话进程等待超时')), timeoutMs);
      shell.process.on('close', (code) => {
        clearTimeout(timer);
        resolve({ returncode: code });
      });
      shell.process.on('error', () => {
        clearTimeout(timer);
        reject(new AppException('等待shell进程失败'));
      });
      if (shell.process.exitCode !== null) {
        clearTimeout(timer);
        resolve({ returncode: shell.process.exitCode });
      }
    });
  }

  async viewShell(sessionId: string, console = false): Promise<ShellViewResult> {
    const shell = this.activeShells.get(sessionId);
    if (!shell) throw new NotFoundException('会话不存在');
    return {
      session_id: sessionId,
      output: this.removeAnsi(shell.output),
      console_records: console ? this.getConsoleRecords(sessionId) : [],
    };
  }

  async execCommand(sessionId: string, command: string, execDir: string): Promise<ShellExecResult> {
    const dir = execDir || os.homedir();
    if (!fs.existsSync(dir)) {
      throw new BadRequestException(`目录 ${dir} 不存在`);
    }

    const ps1 = this.formatPs1(dir);

    if (!this.activeShells.has(sessionId)) {
      const proc = this.createProcess(dir, command);
      this.activeShells.set(sessionId, {
        process: proc,
        execDir: dir,
        output: '',
        consoleRecords: [{ ps1, command, output: '' }],
      });
      this.readOutput(sessionId, proc);
    } else {
      const shell = this.activeShells.get(sessionId)!;
      if (shell.process.exitCode === null) {
        shell.process.kill('SIGTERM');
      }
      const proc = this.createProcess(dir, command);
      shell.process = proc;
      shell.output = '';
      shell.consoleRecords.push({ ps1, command, output: '' });
      this.readOutput(sessionId, proc);
    }

    try {
      const waitResult = await this.waitForProcess(sessionId, 5);
      if (waitResult.returncode !== null) {
        const view = await this.viewShell(sessionId, false);
        return {
          session_id: sessionId,
          command,
          status: 'completed',
          returncode: waitResult.returncode,
          stdout: view.output,
          stderr: '',
        };
      }
    } catch {
      return { session_id: sessionId, command, status: 'running' };
    }

    return { session_id: sessionId, command, status: 'running' };
  }

  async writeToProcess(sessionId: string, data: string, enter = true): Promise<WriteToProcessResult> {
    const shell = this.activeShells.get(sessionId);
    if (!shell) throw new NotFoundException('会话不存在');
    if (shell.process.exitCode !== null) {
      throw new AppException('会话已结束，无法写入输入');
    }

    const text = enter ? data + '\n' : data;
    shell.output += enter ? data + '\n' : data;
    const last = shell.consoleRecords[shell.consoleRecords.length - 1];
    if (last) last.output += enter ? data + '\n' : data;

    if (shell.process.stdin) {
      shell.process.stdin.write(text);
    }

    return {
      session_id: sessionId,
      command: data,
      status: 'completed',
      returncode: shell.process.exitCode,
      stdout: shell.output,
      stderr: '',
    };
  }

  async killProcess(sessionId: string): Promise<ShellKillResult> {
    const shell = this.activeShells.get(sessionId);
    if (!shell) throw new NotFoundException('会话不存在');

    if (shell.process.exitCode === null) {
      shell.process.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        shell.process.once('close', () => resolve());
        setTimeout(() => {
          if (shell.process.exitCode === null) shell.process.kill('SIGKILL');
          resolve();
        }, 3000);
      });
      logger.info(`进程已终止: 返回代码为${shell.process.exitCode}`);
      return { status: 'terminated', returncode: shell.process.exitCode };
    }

    return { status: 'already_terminated', returncode: shell.process.exitCode };
  }
}

export const shellService = new ShellService();
