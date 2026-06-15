import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../database/prisma';
import { getSettings } from '../../config';
import { FileRecord } from '../../domain/models';
import { getTosClient } from '../storage/tos-client';
import { logger } from '../../utils/logger';
import { FileStorage } from './file-storage';

export class TosFileStorage implements FileStorage {
  private readonly bucket: string;

  constructor(bucket = getSettings().tosBucket) {
    this.bucket = bucket;
  }

  async uploadFile(file: Express.Multer.File): Promise<FileRecord> {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const tosKey = `${datePath}/${fileId}${ext}`;

    try {
      await getTosClient().putObject({
        bucket: this.bucket,
        key: tosKey,
        body: file.buffer,
        contentType: file.mimetype || undefined,
      });

      const record: FileRecord = {
        id: fileId,
        filename: file.originalname,
        filepath: '',
        key: tosKey,
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

      logger.info(`TOS upload success: ${tosKey}`);
      return record;
    } catch (e) {
      logger.error(`TOS upload failed: ${(e as Error).message}`);
      throw new Error('上传失败');
    }
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
    try {
      const { data } = await getTosClient().getObjectV2({
        bucket: this.bucket,
        key: file.key,
        dataType: 'buffer',
      });
      const buffer = data.content as Buffer;
      return { buffer, file };
    } catch (e) {
      logger.error(`TOS download failed: ${(e as Error).message}`);
      throw new Error('下载失败');
    }
  }
}
