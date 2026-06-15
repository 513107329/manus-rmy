import { Readable } from 'stream';
import { getSettings } from '../config';
import { FileRecord } from '../domain/models';
import { LocalFileStorage } from '../infrastructure/file-storage/local-file-storage';
import { TosFileStorage } from '../infrastructure/file-storage/tos-file-storage';
import { FileStorage } from '../infrastructure/file-storage/file-storage';

function createStorage(): FileStorage {
  const mode = getSettings().storageMode;
  if (mode === 'tos') {
    return new TosFileStorage();
  }
  return new LocalFileStorage();
}

export class FileService {
  private storage: FileStorage;

  constructor(storage?: FileStorage) {
    this.storage = storage ?? createStorage();
  }

  async uploadFile(file: Express.Multer.File): Promise<FileRecord> {
    return this.storage.uploadFile(file);
  }

  async getFileInfo(fileId: string): Promise<FileRecord> {
    return this.storage.getFileInfo(fileId);
  }

  async downloadFile(fileId: string): Promise<{ buffer: Buffer; file: FileRecord }> {
    return this.storage.downloadFile(fileId);
  }

  async uploadBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<FileRecord> {
    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: filename,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      stream: Readable.from(buffer),
      destination: '',
      filename,
      path: '',
    };
    return this.uploadFile(file);
  }
}

export const fileService = new FileService();
