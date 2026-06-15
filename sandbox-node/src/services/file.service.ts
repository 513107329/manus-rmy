import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { glob } from 'glob';
import { spawn } from 'child_process';
import os from 'os';
import { AppException, BadRequestException, NotFoundException } from '../errors/AppException';

export interface FileReadResult {
  filepath: string;
  content: string;
}

export interface FileWriteResult {
  filepath: string;
  bytes_written: number;
}

export interface FileReplaceResult {
  filepath: string;
  replace_count: number;
}

export interface FileSearchResult {
  filepath: string;
  matches: string[];
  line_numbers: number[];
}

export interface FileFindResult {
  dir_path: string;
  file_list: string[];
}

export interface FileUploadResult {
  filepath: string;
  success: boolean;
  file_size: number;
}

export interface FileExistsResult {
  filepath: string;
  exists: boolean;
}

export interface FileDeleteResult {
  filepath: string;
  success: boolean;
}

function runShell(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
  });
}

export class FileService {
  async readFile(
    filepath: string,
    startLine?: number | null,
    endLine?: number | null,
    sudo = false,
  ): Promise<FileReadResult> {
    try {
      if (!fsSync.existsSync(filepath)) {
        throw new NotFoundException(`文件 ${filepath} 不存在或者无权限`);
      }

      let content: string;
      if (sudo) {
        const { stdout, stderr, code } = await runShell(`sudo cat '${filepath.replace(/'/g, "'\\''")}'`);
        if (code !== 0) throw new AppException(`读取文件失败: ${stderr}`);
        content = stdout;
      } else {
        content = await fs.readFile(filepath, 'utf-8');
      }

      if (startLine != null || endLine != null) {
        const lines = content.split('\n');
        const start = startLine ?? 0;
        const end = endLine ?? lines.length;
        content = lines.slice(start, end).join('\n');
      }

      return { filepath, content };
    } catch (e) {
      if (e instanceof AppException || e instanceof NotFoundException) throw e;
      throw new AppException(`读取文件失败: ${(e as Error).message}`);
    }
  }

  async writeFile(
    filepath: string,
    content: string,
    append: boolean,
    leadingNewline: boolean,
    trailingNewline: boolean,
    sudo: boolean,
  ): Promise<FileWriteResult> {
    try {
      if (leadingNewline) content = '\n' + content;
      if (trailingNewline) content = content + '\n';

      if (sudo) {
        const tempFile = `/tmp/file_write_${process.pid}.tmp`;
        await fs.writeFile(tempFile, content, 'utf-8');
        const bytesWritten = Buffer.byteLength(content, 'utf-8');
        const mode = append ? '>>' : '>';
        const { stderr, code } = await runShell(
          `sudo bash -c "cat ${tempFile} ${mode} '${filepath.replace(/'/g, "'\\''")}'"`,
        );
        await fs.unlink(tempFile).catch(() => undefined);
        if (code !== 0) throw new BadRequestException(`写入文件失败: ${stderr}`);
        return { filepath, bytes_written: bytesWritten };
      }

      await fs.mkdir(path.dirname(filepath), { recursive: true });
      const bytesWritten = append
        ? (await fs.appendFile(filepath, content, 'utf-8'), Buffer.byteLength(content, 'utf-8'))
        : (await fs.writeFile(filepath, content, 'utf-8'), Buffer.byteLength(content, 'utf-8'));
      return { filepath, bytes_written: bytesWritten };
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new AppException(`写入文件失败: ${(e as Error).message}`);
    }
  }

  async replaceInFile(
    filepath: string,
    oldContent: string,
    newContent: string,
    sudo = false,
  ): Promise<FileReplaceResult> {
    const result = await this.readFile(filepath, null, null, sudo);
    const replaceCount = result.content.split(oldContent).length - 1;
    if (replaceCount === 0) return { filepath, replace_count: 0 };
    const content = result.content.replaceAll(oldContent, newContent);
    await this.writeFile(filepath, content, false, false, false, sudo);
    return { filepath, replace_count: replaceCount };
  }

  async searchInFile(filepath: string, regex: string, sudo = false): Promise<FileSearchResult> {
    const result = await this.readFile(filepath, null, null, sudo);
    const pattern = new RegExp(regex);
    const matches: string[] = [];
    const lineNumbers: number[] = [];
    result.content.split('\n').forEach((line, idx) => {
      if (pattern.test(line)) {
        matches.push(line);
        lineNumbers.push(idx);
      }
    });
    return { filepath, matches, line_numbers: lineNumbers };
  }

  async findFiles(dirPath: string, globPattern: string): Promise<FileFindResult> {
    if (!fsSync.existsSync(dirPath)) {
      throw new NotFoundException(`目录 ${dirPath} 不存在`);
    }
    const searchPattern = path.join(dirPath, globPattern);
    const files = await glob(searchPattern, { nodir: true, windowsPathsNoEscape: os.platform() === 'win32' });
    return { dir_path: dirPath, file_list: files };
  }

  async uploadFile(buffer: Buffer, filepath: string): Promise<FileUploadResult> {
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, buffer);
    return { filepath, success: true, file_size: buffer.length };
  }

  async ensureFileExists(filepath: string): Promise<void> {
    if (!fsSync.existsSync(filepath)) {
      throw new NotFoundException(`文件 ${filepath} 不存在`);
    }
  }

  async checkFileExists(filepath: string): Promise<FileExistsResult> {
    return { filepath, exists: fsSync.existsSync(filepath) };
  }

  async deleteFile(filepath: string, sudo = false): Promise<FileDeleteResult> {
    await this.ensureFileExists(filepath);
    if (sudo) {
      const { stderr, code } = await runShell(`sudo rm '${filepath.replace(/'/g, "'\\''")}'`);
      if (code !== 0) throw new BadRequestException(`删除文件失败: ${stderr}`);
    } else {
      await fs.unlink(filepath);
    }
    return { filepath, success: true };
  }
}

export const fileService = new FileService();
