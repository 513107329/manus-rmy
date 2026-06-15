import { Router, Request, Response } from 'express';
import multer from 'multer';
import { fileService } from '../services/file.service';
import { success } from '../utils/response';

const upload = multer({ storage: multer.memoryStorage() });
export const fileRouter = Router();

fileRouter.post('/upload-file', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json(success('缺少文件'));
    return;
  }
  const result = await fileService.uploadFile(file);
  res.json(success('success', result));
});

fileRouter.get('/:fileId', async (req, res) => {
  const result = await fileService.getFileInfo(req.params.fileId);
  res.json(success('success', result));
});

fileRouter.get('/:fileId/download', async (req, res) => {
  const { buffer, file } = await fileService.downloadFile(req.params.fileId);
  res.setHeader('Content-Type', file.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
  res.setHeader('Content-Length', String(file.size));
  res.send(buffer);
});
