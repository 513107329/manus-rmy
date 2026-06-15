import { DockerSandbox } from '../../../infrastructure/sandbox/docker-sandbox';
import { BaseTool, toolSchema } from './base-tool';

export class FileTool extends BaseTool {
  readonly name = 'file';

  constructor(private readonly sandbox: DockerSandbox) {
    super();
    this.registerTools();
  }

  private registerTools(): void {
    this.registerTool(
      toolSchema(
        'file_write',
        '向沙箱写入文件',
        {
          filepath: { type: 'string', description: '文件路径' },
          content: { type: 'string', description: '内容' },
          append: { type: 'boolean', description: '是否追加' },
          leading_newline: { type: 'boolean', description: '前导换行' },
          trailing_newline: { type: 'boolean', description: '尾随换行' },
          sudo: { type: 'boolean', description: 'sudo' },
        },
        ['filepath', 'content'],
      ),
      (args) =>
        this.sandbox.fileWrite(
          String(args.filepath),
          String(args.content),
          Boolean(args.append),
          Boolean(args.leading_newline),
          Boolean(args.trailing_newline),
          Boolean(args.sudo),
        ),
    );

    this.registerTool(
      toolSchema(
        'file_read',
        '从沙箱读取文件',
        {
          filepath: { type: 'string', description: '文件路径' },
          start_line: { type: 'integer', description: '起始行' },
          end_line: { type: 'integer', description: '结束行' },
          sudo: { type: 'boolean', description: 'sudo' },
        },
        ['filepath'],
      ),
      (args) =>
        this.sandbox.fileRead(
          String(args.filepath),
          args.start_line != null ? Number(args.start_line) : undefined,
          args.end_line != null ? Number(args.end_line) : undefined,
          Boolean(args.sudo),
        ),
    );

    this.registerTool(
      toolSchema(
        'file_str_replace',
        '替换文件内容',
        {
          filepath: { type: 'string', description: '文件路径' },
          old_str: { type: 'string', description: '旧内容' },
          new_str: { type: 'string', description: '新内容' },
          sudo: { type: 'boolean', description: 'sudo' },
        },
        ['filepath', 'old_str', 'new_str'],
      ),
      (args) =>
        this.sandbox.fileReplace(
          String(args.filepath),
          String(args.old_str),
          String(args.new_str),
          Boolean(args.sudo),
        ),
    );

    this.registerTool(
      toolSchema(
        'file_find_in_content',
        '在文件中搜索',
        {
          filepath: { type: 'string', description: '文件路径' },
          regex: { type: 'string', description: '正则' },
          sudo: { type: 'boolean', description: 'sudo' },
        },
        ['filepath', 'regex'],
      ),
      (args) =>
        this.sandbox.fileSearch(String(args.filepath), String(args.regex), Boolean(args.sudo)),
    );

    this.registerTool(
      toolSchema(
        'file_find_in_name',
        '按名称查找文件',
        {
          dir_path: { type: 'string', description: '目录' },
          glob_pattern: { type: 'string', description: 'glob' },
        },
        ['dir_path', 'glob_pattern'],
      ),
      (args) => this.sandbox.fileFind(String(args.dir_path), String(args.glob_pattern)),
    );

    this.registerTool(
      toolSchema(
        'file_list',
        '列出目录文件',
        { dir_path: { type: 'string', description: '目录' } },
        ['dir_path'],
      ),
      (args) => this.sandbox.fileList(String(args.dir_path)),
    );
  }
}
