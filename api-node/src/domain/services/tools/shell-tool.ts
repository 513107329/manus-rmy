import { DockerSandbox } from '../../../infrastructure/sandbox/docker-sandbox';
import { BaseTool, toolSchema } from './base-tool';

export class ShellTool extends BaseTool {
  readonly name = 'shell';

  constructor(private readonly sandbox: DockerSandbox) {
    super();
    this.registerTools();
  }

  private registerTools(): void {
    this.registerTool(
      toolSchema(
        'shell_exec',
        '在沙箱执行 Shell 命令',
        {
          session_id: { type: 'string', description: '会话 ID' },
          command: { type: 'string', description: '命令' },
          exec_dir: { type: 'string', description: '工作目录' },
        },
        ['session_id', 'command', 'exec_dir'],
      ),
      (args) =>
        this.sandbox.execCommand(
          String(args.session_id),
          String(args.command),
          String(args.exec_dir ?? '/home/ubuntu'),
        ),
    );

    this.registerTool(
      toolSchema(
        'shell_view',
        '查看 Shell 输出',
        {
          session_id: { type: 'string', description: '会话 ID' },
          console: { type: 'boolean', description: '控制台模式' },
        },
        ['session_id'],
      ),
      (args) => this.sandbox.viewShell(String(args.session_id), Boolean(args.console)),
    );

    this.registerTool(
      toolSchema(
        'shell_wait',
        '等待进程',
        {
          session_id: { type: 'string', description: '会话 ID' },
          seconds: { type: 'string', description: '秒数' },
        },
        ['session_id'],
      ),
      (args) => this.sandbox.waitForProcess(String(args.session_id), args.seconds as string | undefined),
    );

    this.registerTool(
      toolSchema(
        'shell_write_to_process',
        '向进程写入',
        {
          session_id: { type: 'string', description: '会话 ID' },
          inputText: { type: 'string', description: '输入' },
          enter: { type: 'boolean', description: '回车' },
        },
        ['session_id', 'inputText'],
      ),
      (args) =>
        this.sandbox.writeToProcess(
          String(args.session_id),
          String(args.inputText),
          Boolean(args.enter),
        ),
    );

    this.registerTool(
      toolSchema(
        'shell_kill_process',
        '终止进程',
        { session_id: { type: 'string', description: '会话 ID' } },
        ['session_id'],
      ),
      (args) => this.sandbox.killProcess(String(args.session_id)),
    );
  }
}
