import { FileRecord } from '../../domain/models';

export interface FileStorage {
  uploadFile(file: Express.Multer.File): Promise<FileRecord>;
  getFileInfo(fileId: string): Promise<FileRecord>;
  downloadFile(fileId: string): Promise<{ buffer: Buffer; file: FileRecord }>;
}
