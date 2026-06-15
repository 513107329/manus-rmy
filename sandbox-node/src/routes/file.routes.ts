import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileService } from '../services/file.service';
import { success } from '../utils/response';
import { validateBody, validateQuery } from '../middlewares/validate';
import {
  readFileSchema,
  writeFileSchema,
  replaceInFileSchema,
  searchInFileSchema,
  findFilesSchema,
  fileExistsSchema,
  deleteFileSchema,
} from '../schemas';

const upload = multer({ storage: multer.memoryStorage() });
export const fileRouter = Router();

fileRouter.post('/read-file', validateBody(readFileSchema), async (req: Request, res: Response) => {
  const result = await fileService.readFile(
    req.body.filepath,
    req.body.start_line,
    req.body.end_line,
    req.body.sudo,
  );
  res.json(success('success', result));
});

fileRouter.post('/write-file', validateBody(writeFileSchema), async (req: Request, res: Response) => {
  const result = await fileService.writeFile(
    req.body.filepath,
    req.body.content,
    req.body.append,
    req.body.leading_newline,
    req.body.trailing_newline,
    req.body.sudo,
  );
  res.json(success('success', result));
});

fileRouter.post('/replace-in-file', validateBody(replaceInFileSchema), async (req: Request, res: Response) => {
  const result = await fileService.replaceInFile(
    req.body.filepath,
    req.body.old_content,
    req.body.new_content,
    req.body.sudo,
  );
  res.json(success(`替换${result.replace_count}处内容成功`, result));
});

fileRouter.post('/search-in-file', validateBody(searchInFileSchema), async (req: Request, res: Response) => {
  const result = await fileService.searchInFile(req.body.filepath, req.body.regex, req.body.sudo);
  res.json(success('搜索内容成功', result));
});

fileRouter.post('/find-files', validateBody(findFilesSchema), async (req: Request, res: Response) => {
  const result = await fileService.findFiles(req.body.dir_path, req.body.glob);
  res.json(success('搜索文件列表成功', result));
});

fileRouter.post('/upload-file', upload.single('file'), async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    res.status(400).json(success('缺少文件'));
    return;
  }
  const filepath = (req.body.filepath as string) || `/tmp/${file.originalname}`;
  const result = await fileService.uploadFile(file.buffer, filepath);
  res.json(success('上传文件成功', result));
});

fileRouter.get('/download-file', validateQuery(fileExistsSchema.pick({ filepath: true })), async (req, res) => {
  const filepath = req.query.filepath as string;
  await fileService.ensureFileExists(filepath);
  res.download(filepath, path.basename(filepath));
});

fileRouter.post('/check-file-exists', validateBody(fileExistsSchema), async (req, res) => {
  const result = await fileService.checkFileExists(req.body.filepath);
  res.json(success('success', result));
});

fileRouter.post('/delete-file', validateBody(deleteFileSchema), async (req, res) => {
  const result = await fileService.deleteFile(req.body.filepath, req.body.sudo);
  res.json(success('success', result));
});
