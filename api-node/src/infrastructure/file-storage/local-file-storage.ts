import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../database/prisma';
import { FileRecord } from '../../domain/models';
import { FileStorage } from './file-storage';

export class LocalFileStorage implements FileStorage {
  constructor(private readonly uploadDir = path.resolve(process.cwd(), 'uploads')) {}

  async uploadFile(file: Express.Multer.File): Promise<FileRecord> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    const key = `${id}${ext}`;
    const filepath = path.join(this.uploadDir, key);
    await fs.writeFile(filepath, file.buffer);
    const record: FileRecord = {
      id,
      filename: file.originalname,
      filepath,
      key,
      extension: ext.replace('.', ''),
      mime_type: file.mimetype,
      size: file.size,
    };
    await getPrisma().file.create({
      data: {
        id: record.id,
        filename: record.filename,
        filepath: record.filepath,
        key: record.key,
        extension: record.extension,
        mimeType: record.mime_type,
        size: record.size,
      },
    });
    return record;
  }

  async getFileInfo(fileId: string): Promise<FileRecord> {
    const file = await getPrisma().file.findUnique({ where: { id: fileId } });
    if (!file) throw new Error('找不到此文件');
    return {
      id: file.id,
      filename: file.filename,
      filepath: file.filepath,
      key: file.key,
      extension: file.extension,
      mime_type: file.mimeType,
      size: file.size,
    };
  }

  async downloadFile(fileId: string): Promise<{ buffer: Buffer; file: FileRecord }> {
    const file = await this.getFileInfo(fileId);
    const buffer = await fs.readFile(file.filepath);
    return { buffer, file };
  }
}
