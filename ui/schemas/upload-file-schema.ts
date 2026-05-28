import { z } from 'zod';

export const generateCredentialReqSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
});

export const saveUploadedFileReqSchema = z.array(
  z.object({
    name: z.string().min(1),
    key: z.string().min(1),
    size: z.number().positive(),
    extension: z.string().min(1),
    mimeType: z.string().min(1),
    hash: z.string().min(1),
  }),
);
