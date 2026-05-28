'use client';

import { uploadFileWithProgress } from '@repo/tencent-cos/browser';
import { FileBox, UploadIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  generateCredentialAction,
  saveUploadedFileAction,
} from '@/actions/upload-file-action';
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/shadcn-io/dropzone';
import { createParallelTask } from '@/lib/task';

type UploadFileResult = {
  name: string;
  key: string;
  size: number;
  extension: string;
  mimeType: string;
  hash: string;
};

const uploadFile = async (
  file: File,
  onProgress: (progress: number) => void,
) => {
  const res = await generateCredentialAction({
    fileName: file.name,
    fileSize: file.size,
  });

  if (!res?.data) {
    throw new Error('Upload Failed');
  }

  const { credential, key, bucket } = res.data;

  return uploadFileWithProgress(
    credential,
    {
      bucket: bucket.name,
      region: bucket.region,
      key: key,
      file: file,
    },
    onProgress,
  );
};

type Props = {
  onActionStart: () => void;
  onActionEnd: () => void;
  onActionSuccess: (fileIds: string[]) => void;
};

const UploadDocument = ({
  onActionStart,
  onActionEnd,
  onActionSuccess,
}: Props) => {
  const [files, setFiles] = useState<File[] | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [percentages, setPercentages] = useState<number[]>([]);

  const handleDrop = async (files: File[]) => {
    setFiles(files);
    setIsUploading(true);
    onActionStart();
    setPercentages(files.map(() => 0));

    try {
      const tasks = createParallelTask(2);
      files.forEach((file, index) => {
        tasks.addTask(() =>
          uploadFile(file, (progress) => {
            setPercentages((prev) => {
              const newPercentages = [...prev];
              newPercentages[index] = progress * 100;
              return newPercentages;
            });
          }),
        );
      });

      const results = await tasks.run();
      const failedResults = results.filter((result) => !result.success);
      if (failedResults.length > 0) {
        toast.error('Some files upload failed');
      } else {
        toast.success('Upload successful');
      }

      const res = await saveUploadedFileAction(
        results
          .filter((result) => result.success)
          .map((result) => result.value as UploadFileResult),
      );

      console.log(res);
      if (!res?.data) {
        toast.error('Save uploaded file failed');
        return;
      }
      onActionSuccess(res.data);
    } finally {
      onActionEnd();
    }
  };

  const handleError = (_: Error) => {
    toast.error(
      'Only support text files, PDF, Word, Excel, PowerPoint. Max 10 files. Each file size should be less than 10MB.',
    );
  };

  return (
    <div className="space-y-6">
      <Dropzone
        accept={{
          // All text files
          'text/*': [],
          // Specific MIME types for common text files
          'text/x-python': ['.py'],
          'text/x-java': ['.java'],
          'text/html': ['.html', '.htm'],
          'text/css': ['.css'],
          'text/xml': ['.xml'],
          'text/yaml': ['.yaml', '.yml'],
          'text/markdown': ['.md', '.markdown'],
          'text/x-shellscript': ['.sh', '.bash', '.zsh'],
          'text/x-c': ['.c'],
          'text/x-c++': ['.cpp', '.hpp'],
          'text/x-chdr': ['.h'],
          'text/x-ruby': ['.rb'],
          'text/x-php': ['.php'],
          'text/x-sql': ['.sql'],
          'text/x-lua': ['.lua'],
          'text/x-perl': ['.pl'],
          'text/x-vim': ['.vim'],
          'text/csv': ['.csv'],
          'text/tab-separated-values': ['.tsv'],
          'application/javascript': ['.js', '.mjs'],
          'application/typescript': ['.ts'],
          'application/json': ['.json'],
          'application/x-go': ['.go'],
          'application/x-rust': ['.rs'],
          'application/x-swift': ['.swift'],
          'application/x-kotlin': ['.kt'],
          'application/x-scala': ['.scala'],
          'application/x-r': ['.r'],
          'application/x-objective-c': ['.m'],
          // PDF
          'application/pdf': ['.pdf'],
          // Word
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            ['.docx'],
          // Excel
          'application/vnd.ms-excel': ['.xls'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
            '.xlsx',
          ],
          // PowerPoint
          'application/vnd.ms-powerpoint': ['.ppt'],
          'application/vnd.openxmlformats-officedocument.presentationml.presentation':
            ['.pptx'],
          // Support octet-stream type (some systems may return this type)
          'application/octet-stream': [
            '.pdf',
            '.doc',
            '.docx',
            '.xls',
            '.xlsx',
            '.ppt',
            '.pptx',
          ],
        }}
        maxFiles={10}
        maxSize={1024 * 1024 * 10}
        onDrop={handleDrop}
        onError={handleError}
        disabled={isUploading}
        src={files}
      >
        <DropzoneEmptyState>
          <div className="flex flex-col items-center justify-center">
            <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <UploadIcon size={16} />
            </div>
            <p className="my-2 w-full truncate text-wrap font-medium text-sm">
              Upload files
            </p>
            <p className="w-full truncate text-wrap text-muted-foreground text-xs">
              Drag and drop or click to upload
            </p>
            <p className="text-wrap text-muted-foreground text-xs">
              Support text files, PDF, Word, Excel, PowerPoint. Max 10 files.
            </p>
          </div>
        </DropzoneEmptyState>
        <DropzoneContent />
      </Dropzone>
      <div className="space-y-3">
        {files?.map((file, index) => (
          <div key={file.name} className="w-full h-9 flex items-center gap-2">
            <p className="bg-accent grow flex items-center h-full pl-3 gap-1 text-sm">
              <FileBox size={16} />
              {file.name}
            </p>
            <p className="shrink-0">{percentages[index]}%</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadDocument;
