'use server';

import { authActionClient } from '@/lib/safe-action';
import {
  generateCredentialReqSchema,
  saveUploadedFileReqSchema,
} from '@/schemas/upload-file-schema';
import { getUploadFileTempCredential } from '@/services/cos-service';
import { saveUploadedFile } from '@/services/upload-file-service';

export const generateCredentialAction = authActionClient
  .inputSchema(generateCredentialReqSchema)
  .metadata({
    actionName: 'generateCredential',
  })
  .action(async ({ parsedInput: { fileName, fileSize } }) => {
    return getUploadFileTempCredential(fileName, fileSize);
  });

export const saveUploadedFileAction = authActionClient
  .inputSchema(saveUploadedFileReqSchema)
  .metadata({
    actionName: 'saveUploadedFile',
  })
  .action(async ({ parsedInput, ctx: { userId } }) => {
    return saveUploadedFile(parsedInput, userId);
  });
